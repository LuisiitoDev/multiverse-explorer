# Agent orchestration lab

One issue has one canonical draft PR throughout planning, implementation and
remediation. A normal GitHub Actions controller owns routing and durable state;
the three gh-aw workers perform isolated AI executions. No worker merges or deploys.

## Compile before merging

The source-only PR intentionally leaves the existing `.lock.yml` files unchanged
because compilation is being performed by the repository owner. **Do not merge
the source changes until all three production lock files have been regenerated.**
Otherwise the old label-triggered workers and new controller could both activate.

From this branch, with your selected gh-aw compiler:

```bash
gh aw version
gh aw compile agent-plan
gh aw compile agent-implement
gh aw compile agent-review
git diff -- .github/workflows
```

Commit the regenerated normal locks to this same branch. Compilation and a live
Actions run are different checks; no hosted run was dispatched while authoring
this change. Confirm expression-valued safe-output targets resolve to the
validated PR/issue numbers in the generated locks before enabling the flows.

## Repository controls

- Keep the existing `implementation-approval` environment configured with a
  required human reviewer. An environment name without protection rules is not
  an approval control. The controller separately verifies a human approval comment or approving PR
  review for the exact planning revision and records the spec/plan hashes.
- The controller's `GITHUB_TOKEN` needs contents/issues/pull-requests/actions
  write permissions. The workers retain read-only API credentials; publication
  uses gh-aw safe outputs in separate jobs. All API destinations are fixed to
  this repository on api.github.com. No new external services or secrets.
- Ensure `agent-plan` is an existing repository label. Existing agent PRs already
  use it. Keep the `[Agent Lab] ` title prefix and planning branch prefix.
- Retain CI and CODEOWNER protections. Protected workflow-file publishing may
  still require operator attention; this change does not bypass those controls.
- State is saved on `agent-orchestration-state` at `.agent-state/issue-N.json`,
  never on main or the implementation branch. Each write uses the prior blob SHA
  as a compare-and-swap lease. State contains references/decisions, not secrets.

## Start or resume

Apply `agent-lab` to an issue, or comment `/agent plan` as a repository writer.
The controller adopts the only matching open agent PR. If none exists, it creates
a stable `agent-plan/issue-N` branch and a draft PR with a small data-only
`specs/issue-N/task.json` seed. This permits creating the PR before planning
without prefetching the issue's requirements. The Planner still reads the issue
and every comments page using GitHub MCP.

If several planning PRs already exist, the controller blocks rather than guessing.
On the originating issue, choose one explicitly:

```text
/agent adopt 71
```

Then comment `/agent plan`. The chosen existing branch, including its random
suffix, is preserved. No other PRs are automatically closed or modified.

The initial bootstrap is intentionally fail-closed. If a GitHub API failure
leaves a branch but no PR, inspect that branch and finish creating/adopting its
draft PR before retrying. Never force-delete/recreate it automatically.

## Human input and approval

When the phase is NEEDS_CLARIFICATION, a new human repository-writer comment on
the originating issue starts a new Planner execution on the same PR. Comments
while an execution is active do not launch another worker. If human decisions
change during planning, that result is blocked; `/agent plan` reconciles them.

When the Planner reports PLANNED, the controller verifies schemas, saved byte
hashes, current issue fields and main baseline, then waits in AWAITING_APPROVAL.
The controller posts an exact `/agent approve <head SHA> <plan SHA-256>` command.
After reviewing the documents, post that command on the originating issue as a
repository writer. Its author, exact body and identity are rechecked independently.
This works while the PR is still draft and survives automatic dismissal of PR
reviews when implementation commits arrive. Editing/deleting the approval comment
revokes it. Control commands are excluded from the requirement-comment digest;
ordinary human comments still invalidate stale planning decisions.

An approving PR review for the exact head is also supported, but if branch
protection automatically dismisses that review on new commits, use the explicit
issue approval command instead. Do not relax branch protection for the lab.
The approval dispatches the Implementer, whose `implementation-approval` environment is an additional gate.
The worker rechecks everything after that gate opens. A label or generated file
never grants implementation approval.

Legacy planner handoffs can still validate against contract-v1. They must be
replanned to add machine-readable execution_scope before implementation. Scope
accepts exact paths and terminal directory/** prefixes; denied paths win.
Approved spec, plan, issue snapshot and planner handoff bytes remain frozen.
If main advances beyond the PR's ancestry, use GitHub's controlled branch-update
operation before replanning. The controller blocks instead of merely claiming a
new baseline while leaving the worker on an older tree.

## Publication, CI and review

Workers use dispatch inputs for issue/PR identity instead of assuming a
pull_request event. A trusted pre-step validates the durable dispatch intent,
workflow source SHA, run identity, expected remote head and human decisions
before checking out the canonical PR head. Inputs are metadata; issue content
is not prefetched. Duplicate runs of the same transition, including re-run jobs,
are rejected. First run ownership is selected from Actions metadata.

Planner and Implementer make local commits and publish only through
push-to-pull-request-branch targeted to the validated PR number. The fallback
that creates another PR is disabled. The controller also checks the published
diff; these post-publication scope checks are not a claim that the LLM's local
file-editing tools constitute a filesystem sandbox.

Implementation completion records honest local checks, then the controller waits
for CI on the final **remote** PR head. Signed publication can change commit SHAs;
local Git hashes are not used as CI authority. CI must show successful build,
backend and SonarCloud jobs. If bot-generated pushes need approval to run CI,
approve the run in Actions; missing CI keeps the controller in WAITING_CI.

The Reviewer writes only `/tmp/gh-aw/review-handoff.json`, uploaded as the
`agent-review` artifact and pinned to reviewed_head_sha. It may COMMENT or
REQUEST_CHANGES, never APPROVE. It does not push evidence onto the branch it
reviewed. The controller validates artifact layout/size/provenance and current
head, and treats all artifact content as data. PASS is a human-review
recommendation. One remediation attempt is allowed within approved paths;
out-of-scope findings or a second rejection escalate.

## Recovery and state

`/agent reconcile` rechecks waiting CI or invalidates a stale review. The
orchestrator can also be run manually with an issue number and action.
No periodic polling or AI runs are scheduled.

Dispatch intent is persisted **before** calling GitHub. If the dispatch response
is lost, use `/agent recover`: it searches existing runs by transition ID and
processes their completion. It does not blindly dispatch again. If no unique
run exists, inspect Actions and the state branch before resetting the intent.
This deliberately favors avoiding duplicate work over speculative retries.

State history retains the latest 50 transitions and 100 event IDs. One active
dispatch and the retained transition identity prevent duplicate completed-run
callbacks from advancing the flow. Do not manually rerun worker jobs: use the
controller so it can issue a new validated transition.

The short controller runs serialize state writes independently from worker
concurrency groups, avoiding approval-wait deadlocks. Events arriving after a
worker or CI completes reconcile state from GitHub instead of an in-memory
conversation. Explicit workflow_dispatch calls connect workers; labels are
human entry points, not the inter-agent transport.

## Local checks

```bash
python3 -m pip install -r scripts/requirements-agent-orchestration.txt
python3 -m unittest discover -s scripts/tests -v
python3 scripts/validate_agent_handoff.py 50
```

The last command requires the issue's artifacts checked out locally. It verifies
schema and byte hashes only; live freshness/approval checks remain separate.
Unit tests use fake APIs: they never contact GitHub, mutate branches or start AI
runs. Hosted MCP, environment protection and gh-aw-generated publication are
integration checks to perform after compilation.

## Diagnosing native MCP exposure and missed callbacks

Run 41375187898 connected to GitHub MCP successfully, and the backend advertised
issue_read. Its Copilot model-facing tool fingerprint nevertheless contained
only local tools and safeoutputs MCP tools, with no GitHub tools. This isolates
the failure to the native tool-exposure/selection boundary rather than issue
permissions, Spec Kit, hashing or PR publication. Backend connectivity alone is
not proof of the model's available tool set.

Profiles now include concrete CLI-native names such as github-issue_read in
addition to the cross-host github/* selectors, matching the workflow's existing
read allowlist. This is a targeted exposure correction; its success still needs
a hosted trace showing actual issue_read get/get_comments calls. It does not
enable CLI fallback, all-tools wildcards, broader GitHub permissions, new MCP
servers or additional shell commands. The CLI-ignored applyTo field was removed;
planning-file scope remains explicit in the profile and safe-output allowlist.

The same run also exposed an independent coordinator bug: run.name contained
the evaluated run-name, not Planner stage, and the fixed-name workflow_run
filter never activated a callback. The controller now selects both static names
and evaluated worker run-name patterns, plus the CI name variants. It excludes
its own name and independently admits only the three worker paths or ci.yml. Code verifies the
producer path, event, branch, source SHA and durable transition title without
using the mutable display name as workflow identity. The controller's own path
is excluded from the privileged job as well. Failed known workers release their
lease without trusting missing artifacts; duplicate callbacks stay inert.

After installing the correction, an already-stuck transition requires a human
`/agent recover` command on its issue. This processes the existing failed run and
clears the lease; it does not rerun the worker. Before `/agent plan`, update the
canonical PR branch with current main if its baseline has advanced. Neither the
repair command nor a new hosted run is sent automatically by this patch.

Only profiles, the plain Actions controller and Python tests/code changed for
this repair; the gh-aw worker Markdown/lock pairs are unchanged. No gh-aw
recompilation is needed solely for these profile/controller edits. Hosted tool
exposure remains an integration check, not a result established by unit tests.
