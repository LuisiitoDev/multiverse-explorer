---
name: Reviewer stage
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
  AGENT_WORKER: reviewer
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
timeout-minutes: 30
post-steps:
- name: Publish exact-revision review evidence
  uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9
  with:
    name: agent-review-${{ inputs.transition_id }}
    path: /tmp/gh-aw/review-handoff.json
    if-no-files-found: error
    retention-days: 30
safe-outputs:
  submit-pull-request-review:
    target: ${{ inputs.pr_number }}
    max: 1
    # The PR author is github-actions[bot], the same identity as the safe-output
    # token; GitHub rejects REQUEST_CHANGES on your own PR. The decision lives in
    # the review artifact, which the pipeline routes on.
    allowed-events:
    - COMMENT
  add-comment:
    target: ${{ inputs.issue_number }}
    max: 1
---

# Reviewer stage

Follow `.github/agents/reviewer.agent.md`. Read `/tmp/gh-aw/agent-context.json`
and `/tmp/gh-aw/approval.json`. The expected remote PR head is pinned in context.
Read the originating issue, approved spec/plan, planner and implementation
handoffs, complete diff and CI evidence for that exact remote head through MCP.
The pipeline only calls this stage after the repository's CI jobs passed for
context.expected_head_sha; they ran earlier in this same workflow run
(context.run_id). Verify that evidence independently with the actions tools and
stop if the remote head has changed.

Write `/tmp/gh-aw/review-handoff.json` following
`docs/agent-handoffs/review.schema.json`: schema_version, status REVIEWED,
transition_id, issue_number, pr_number, reviewed_head_sha, decision, findings
and evidence. Decisions are PASS, REQUEST_CHANGES, BLOCKED or ESCALATED.
PASS is a recommendation, never a GitHub approval. Each finding includes id,
severity, path, description and evidence. The report is uploaded as a workflow
artifact; never commit/push it onto the branch being reviewed.

Always submit the GitHub review with event COMMENT (never REQUEST_CHANGES or
APPROVE), anchored to context.expected_head_sha and starting with the decision,
then post a concise issue summary. The decision itself is the artifact's
`decision`. Items in the approved plan's `## Human follow-ups` (and matching
`MANUAL FOLLOW-UP:` deviations) are expected open work for a human, not
defects: mention them, but never use them to justify REQUEST_CHANGES. Never execute
commands, modify source, approve, merge or deploy. The pipeline owns the one
bounded remediation iteration and validates the resulting report against the
current remote head before routing further work.
