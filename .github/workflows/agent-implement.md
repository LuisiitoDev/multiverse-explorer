---
on:
  label_command:
    name: agent-plan
    events: [pull_request]
    remove_label: false
  manual-approval: implementation-approval

permissions:
  contents: read
  issues: read
  pull-requests: read

engine:
  id: copilot
  agent: implementer

tools:
  github:
    toolsets: [default]

network: defaults

concurrency:
  job-discriminator: "${{ github.run_id }}"

safe-outputs:
  create-pull-request:
    title-prefix: "[Agent Lab] "
    labels: ["agent-implementation"]
    allowed-labels: ["agent-implementation"]
    draft: true
  add-comment:
    max: 1
---

# Implementer stage

Follow `.github/agents/implementer.agent.md` exactly. Pull request
`${{ github.event.pull_request.number }}` in this repository is the planner's output — it
contains `spec.md`, `plan.md`, and `planner-handoff.json` under `specs/<feature-dir>/`. Read it,
find the originating issue it closes, and run the Mandatory gate before any edit. This workflow
run itself required a human approval through the `implementation-approval` environment before
reaching this point — treat that approval event as the recorded human approval for
`approval.json`, and verify its plan/base hashes still match before proceeding.
