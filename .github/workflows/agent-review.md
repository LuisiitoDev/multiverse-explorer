---
name: Reviewer stage
run-name: 'reviewer issue #${{ inputs.issue_number }} / ${{ inputs.transition_id }}'
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
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
engine:
  id: copilot
  agent: reviewer
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
  bash: false
network:
  allowed:
  - defaults
concurrency:
  group: agent-reviewer-${{ inputs.issue_number }}
  cancel-in-progress: false
steps:
- name: Install trusted handoff validator dependencies
  run: python3 -m pip install --disable-pip-version-check --target "$RUNNER_TEMP/agent-deps" -r scripts/requirements-agent-orchestration.txt
- name: Validate coordinator intent and check out pinned PR head
  env:
    GH_TOKEN: ${{ github.token }}
    PYTHONPATH: ${{ runner.temp }}/agent-deps
    AGENT_WORKER: reviewer
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
post-steps:
- name: Publish exact-revision review evidence
  uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9
  with:
    name: agent-review
    path: /tmp/gh-aw/review-handoff.json
    if-no-files-found: error
    retention-days: 30
safe-outputs:
  submit-pull-request-review:
    target: ${{ inputs.pr_number }}
    max: 1
    allowed-events:
    - COMMENT
    - REQUEST_CHANGES
  add-comment:
    target: ${{ inputs.issue_number }}
    max: 1
---

# Reviewer stage

Follow `.github/agents/reviewer.agent.md`. Read `/tmp/gh-aw/agent-context.json`
and `/tmp/gh-aw/approval.json`. The expected remote PR head is pinned in context.
Read the originating issue, approved spec/plan, planner and implementation
handoffs, complete diff and CI evidence for that exact remote head through MCP.
The controller only dispatches after the repository's CI jobs passed; verify
that evidence independently and stop if the remote head has changed.

Write `/tmp/gh-aw/review-handoff.json` following
`docs/agent-handoffs/review.schema.json`: schema_version, status REVIEWED,
transition_id, issue_number, pr_number, reviewed_head_sha, decision, findings
and evidence. Decisions are PASS, REQUEST_CHANGES, BLOCKED or ESCALATED.
PASS is a recommendation, never a GitHub approval. Each finding includes id,
severity, path, description and evidence. The report is uploaded as a workflow
artifact; never commit/push it onto the branch being reviewed.

Submit COMMENT for PASS/BLOCKED/ESCALATED or REQUEST_CHANGES for defects, anchored
to context.expected_head_sha, then post a concise issue summary. Never execute
commands, modify source, approve, merge or deploy. The controller owns the one
bounded remediation dispatch and validates the resulting report against the
current remote head before routing further work.
