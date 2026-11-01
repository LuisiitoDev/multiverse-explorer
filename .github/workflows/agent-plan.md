---
on:
  label_command:
    name: agent-lab

permissions:
  contents: read
  issues: read
  pull-requests: read

engine:
  id: copilot
  agent: planner

tools:
  github:
    toolsets: [default]

network: defaults

concurrency:
  job-discriminator: "${{ github.run_id }}"

safe-outputs:
  create-pull-request:
    title-prefix: "[Agent Lab] "
    labels: ["agent-plan"]
    allowed-labels: ["agent-plan"]
    allowed-files:
      - "specs/**"
      - ".specify/feature.json"
    draft: true
  add-comment:
    max: 1
---

# Planner stage

Follow `.github/agents/planner.agent.md` exactly. The triggering issue is
`${{ github.event.issue.number }}` in this repository — read it in full, including every
`.github/ISSUE_TEMPLATE/agent-handoff.yml` field, before doing anything else.
