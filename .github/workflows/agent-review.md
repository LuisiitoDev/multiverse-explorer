---
on:
  label_command:
    name: agent-implementation
    events: [pull_request]
    remove_label: false

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read

engine:
  id: copilot
  agent: reviewer

tools:
  github:
    toolsets: [default]

network: defaults

concurrency:
  job-discriminator: "${{ github.run_id }}"

safe-outputs:
  push-to-pull-request-branch:
    allowed-files:
      - "specs/**"
  submit-pull-request-review:
    max: 1
    allowed-events: [APPROVE, COMMENT, REQUEST_CHANGES]
  add-comment:
    max: 1
---

# Reviewer stage

Follow `.github/agents/reviewer.agent.md` exactly. Pull request
`${{ github.event.pull_request.number }}` in this repository is the implementer's output.
Read the originating issue, `specs/<feature-dir>/spec.md`, `plan.md`, `planner-handoff.json`,
`approval.json`, `implementation-handoff.json`, the diff, and the CI run for this exact head SHA
(`${{ github.event.pull_request.head.sha }}`) before forming a verdict. Push
`specs/<feature-dir>/review-handoff.json` onto this PR's branch, then submit your review decision
and post the full findings as a comment.
