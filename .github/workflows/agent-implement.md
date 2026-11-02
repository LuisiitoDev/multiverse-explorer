---
name: Implementer stage
run-name: 'implementer issue #${{ inputs.issue_number }} / ${{ inputs.transition_id }}'
'on':
  workflow_dispatch:
    inputs:
      issue_number:
        description: Originating issue number
        required: true
        type: string
      pr_number:
        description: Validated canonical PR number
        required: true
        type: string
      expected_head_sha:
        description: Exact remote PR head to process
        required: true
        type: string
      transition_id:
        description: Durable coordinator dispatch identity
        required: true
        type: string
  manual-approval: implementation-approval
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
engine:
  id: copilot
  agent: implementer
checkout:
  ref: ${{ github.sha }}
  fetch-depth: 1
tools:
  cli-proxy: false
  edit: null
  github:
    mode: local
    toolsets:
    - repos
    - issues
    - pull_requests
    - actions
    allowed:
    - issue_read
    - pull_request_read
    - get_file_contents
    - actions_get
    - actions_list
    allowed-repos:
    - luisiitodev/multiverse-explorer
    min-integrity: approved
  bash:
  - git status
  - git diff
  - git rev-parse
  - git add
  - git commit
  - date -u
  - sha256sum
  - mkdir
  - npm ci
  - npm run
  - npm test
  - dotnet restore
  - dotnet build
  - dotnet test
network:
  allowed:
  - defaults
  - node
  - dotnet
concurrency:
  group: agent-implementer-${{ inputs.issue_number }}
  cancel-in-progress: false
steps:
- name: Set up Node.js
  uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
  with:
    node-version: '22'
- name: Set up .NET
  uses: actions/setup-dotnet@67a3573c9a986a3f9c594539f4ab511d57bb3ce9
  with:
    dotnet-version: '10.0.x'
- name: Install trusted handoff validator dependencies
  run: python3 -m pip install --disable-pip-version-check --target "$RUNNER_TEMP/agent-deps" -r scripts/requirements-agent-orchestration.txt
- name: Validate coordinator intent and check out pinned PR head
  env:
    GH_TOKEN: ${{ github.token }}
    PYTHONPATH: ${{ runner.temp }}/agent-deps
    AGENT_WORKER: implementer
    ISSUE_NUMBER: ${{ inputs.issue_number }}
    PR_NUMBER: ${{ inputs.pr_number }}
    EXPECTED_HEAD_SHA: ${{ inputs.expected_head_sha }}
    TRANSITION_ID: ${{ inputs.transition_id }}
  run: python3 scripts/prepare_agent_run.py
- name: Preserve validated dispatch metadata
  uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9
  with:
    name: agent-context
    path: /tmp/gh-aw/agent-context.json
    if-no-files-found: error
    retention-days: 30
safe-outputs:
  push-to-pull-request-branch:
    target: ${{ inputs.pr_number }}
    required-title-prefix: '[Agent Lab] '
    required-labels:
    - agent-plan
    allowed-files:
    - specs/**
    - frontend/**
    - backend/**
    - infra/**
    - .github/workflows/**
    fallback-as-pull-request: false
  update-pull-request:
    target: ${{ inputs.pr_number }}
    required-title-prefix: '[Agent Lab] '
    required-labels:
    - agent-plan
  add-comment:
    target: ${{ inputs.issue_number }}
    max: 1
---

# Implementer stage

Follow `.github/agents/implementer.agent.md`. Read `/tmp/gh-aw/agent-context.json`
and `/tmp/gh-aw/approval.json`; trusted preparation independently verified the
human approval comment or PR review, exact approved spec/plan hashes, baseline and current issue.
The implementation-approval environment is an additional gate; it does not
replace or create approval evidence. Never manufacture approval.json.

The canonical PR head is already checked out. Read originating issue/comments
through native GitHub MCP, constitution, spec.md, plan.md and planner-handoff.json.
Use the approved execution_scope; metadata writes are limited to this issue's
tasks.md and implementation-handoff.json. Do not edit approved planning files.
If context.attempt is 1, fix only context.remediation findings within that scope.

Implement and run the planned checks with the available runner tooling. Record
local evidence honestly. CI is checked by the controller **after** publication;
do not wait for CI or claim that local commands are CI evidence.

Write specs/issue-<issue_number>/implementation-handoff.json according to
`docs/agent-handoffs/implementation.schema.json`, including context.transition_id,
issue/PR identity, approved plan hash, baseline, changed files, requirements,
local_validation and deviations. Local validation is not CI verification.
Commit only approved changes on the existing branch and publish exclusively
through `push_to_pull_request_branch`. Never open another PR, git push, approve,
merge or deploy. Use Related issue until implementation has been human-reviewed.
Return IMPLEMENTED only when local required checks pass; otherwise PARTIAL or
BLOCKED with the failed/missing evidence, and report incomplete as appropriate.
