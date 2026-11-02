---
name: Implementer stage
'on':
  workflow_call:
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
        description: Pipeline-generated identity of this worker invocation
        required: true
        type: string
      attempt:
        description: Pipeline iteration (1, or 2 for the single bounded remediation)
        required: false
        type: string
        default: '1'
      approval_json:
        description: Hash-bound human approval record built by the pipeline approve job
        required: false
        type: string
        default: ''
      remediation_json:
        description: Reviewer findings for the bounded remediation attempt
        required: false
        type: string
        default: '[]'
imports:
- shared/agent-prepare.md
env:
  AGENT_WORKER: implementer
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
  - npm install
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
steps:
- name: Set up Node.js
  uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
  with:
    node-version: '22'
- name: Set up .NET
  uses: actions/setup-dotnet@67a3573c9a986a3f9c594539f4ab511d57bb3ce9
  with:
    dotnet-version: '10.0.x'
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
native human review of the implementation-approval environment for this pipeline
run, bound to the exact approved spec/plan hashes, PR revision and baseline.
No approval issue comment is required. Never manufacture approval.json.

The canonical PR head is already checked out. Read originating issue/comments
through native GitHub MCP, constitution, spec.md, plan.md and planner-handoff.json.
Use the approved execution_scope; metadata writes are limited to this issue's
tasks.md and implementation-handoff.json. Do not edit approved planning files.
If context.attempt is 1, fix only context.remediation findings within that scope.

Add only the npm dependencies that plan.md explicitly names, with `npm install`
(pin the version the plan states) inside the approved package directory, and
commit the resulting package.json and package-lock.json. Never install anything
else, globally, or with lifecycle scripts beyond npm's defaults; list every added
package in the handoff's deviations if the plan did not name an exact version.

Implement and run the planned checks with the available runner tooling. Record
local evidence honestly. CI runs in the pipeline **after** publication;
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
