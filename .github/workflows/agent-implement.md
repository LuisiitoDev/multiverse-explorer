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
  # Exact diagnostics; no general-purpose node or npm permission.
  - node --version
  - node -v
  - npm --version
  - npm -v
  - 'npm view:*'
  - npm ci
  - 'npm ci:*'
  - npm install
  - 'npm install:*'
  - npm run
  - 'npm run:*'
  - npm test
  - 'npm test:*'
  - dotnet restore
  - 'dotnet restore:*'
  - dotnet build
  - 'dotnet build:*'
  - dotnet test
  - 'dotnet test:*'
  # Standalone Bicep CLI installed by the trusted step below (no az, no Azure credentials).
  - bicep --version
  - 'bicep build:*'
  - 'bicep lint:*'
network:
  allowed:
  - defaults
  - node
  - dotnet
timeout-minutes: 45
steps:
- name: Set up Node.js
  uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
  with:
    node-version: '22'
- name: Set up .NET
  uses: actions/setup-dotnet@67a3573c9a986a3f9c594539f4ab511d57bb3ce9
  with:
    dotnet-version: '10.0.x'
- name: Install standalone Bicep CLI
  # Trusted step outside the agent sandbox; the agent only runs `bicep build/lint`.
  run: |
    az bicep install
    sudo install -m 0755 "$HOME/.azure/bin/bicep" /usr/local/bin/bicep
    bicep --version
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
    - THIRD_PARTY_NOTICES.md
    - docs/blue-green-deployment.md
    - docs/canary-deployment.md
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
Never create, edit, delete, rename or publish files under `.github/workflows/`.
The plan's `## Human follow-ups` (workflow files, external assets such as
texture images) are done by a human on this PR after you. Do not attempt them
and do not download external assets. Record each one in the handoff
`deviations` as `MANUAL FOLLOW-UP: <path> — <change>`, and make your code work
safely before they exist (for example a fallback material when a texture file
is missing). Follow-ups do not make your work PARTIAL: return IMPLEMENTED when
every agent-owned task and required local check passes. Never remove
acceptance criteria to bypass work.
If context.attempt is 1, fix only context.remediation findings within that scope.

Add only the npm dependencies that plan.md explicitly names, with `npm install`
(pin the version the plan states) inside the approved package directory, and
commit the resulting package.json and package-lock.json. Never install anything
else, globally, or with lifecycle scripts beyond npm's defaults; list every added
package in the handoff's deviations if the plan did not name an exact version.

## Shell execution contract

The runner is unattended. Use only the configured command stems; their `:*`
rules permit the arguments needed for packages, scripts and project paths.
For frontend work from the repository root, invoke separate calls such as:

```bash
npm view three version
npm install three @react-three/fiber @react-three/drei --prefix frontend
npm install --save-dev @types/three --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend -- --run
npm run build --prefix frontend
```

These are command-shape examples, not authorization to install those packages
for another issue. Install only dependencies named in the approved plan, with
its required versions and dependency classification. Use `npm ci --prefix
frontend` when restoring an existing lockfile. Backend calls take the explicit
approved project, for example `dotnet test backend/test/<project>/<project>.csproj`.
Validate Bicep with the preinstalled standalone CLI, one file per call, for
example `bicep build infra/main.bicep --stdout` (this replaces `az bicep build`;
`--stdout` keeps generated JSON out of the repository). `az` is not available.
Read source with the native file/search tools. Run one task operation per call;
do not mix optional diagnostics, source dumps and required checks into a long
shell command. Do not wrap commands in `env`, another shell or arbitrary Node
code, and never change the permission configuration yourself.

`node --version`, `node -v`, `npm --version`, `npm -v`, and package metadata
through `npm view <approved-package> ...` are the supported optional diagnostics.
An optional diagnostic is not a required build/test and cannot establish that
all npm operations are unavailable. Record the exact attempted command and
denial; never claim an install or test failed if it was not attempted. Stop if
a required operation is actually denied; do not try aliases or executable paths
to bypass that denial. An unsupported optional probe may simply be omitted;
it does not grant permission to run another form of the denied probe.

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
The push tool records an intent; its immediate success response is not evidence
that the later safe-output job applied it. Report "publication requested" until
the workflow verifies a returned remote push SHA. Do not claim the PR was updated
from a local commit or a queued safe-output response. Never remove required
files from the approved plan merely to make a rejected publication pass.
Return IMPLEMENTED only when local required checks pass; otherwise PARTIAL or
BLOCKED with the failed/missing evidence, and report incomplete as appropriate.
