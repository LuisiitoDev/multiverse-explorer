# Agent pipeline and trigger labels

## Starting from an issue form

The feature and bug forms apply **planning**, which starts the Planner directly. The BA agent has been removed; clarification happens on the issue, and the Product Owner agent (see the constitution, Principle VI) owns feature intake.

1. The Planner creates a draft PR marked **planning-output** and moves the issue to **spec-review**. A human reviews the plan and adds **ready-for-dev** to approve implementation.
2. The Agent Orchestrator runs Coder and, when needed, Infra, then Reviewer. Reviewer findings return to the Planner; a revised plan requires human approval again. A passing review leaves **needs-review** for the human merge decision.

## Label reference

| Label | Applied to | Purpose / trigger |
|---|---|---|
| `planning` | Issue | Starts Planner when added; applied by the issue forms |
| `spec-review` | Issue | Plan awaits human review; does not start implementation |
| `ready-for-dev` | Issue | Human approval; starts Agent Orchestrator, which calls Coder, optional Infra, and Reviewer |
| `needs-clarification` | Issue | An agent needs human input; Planner questions require re-adding `planning`, implementation blockers require re-adding `ready-for-dev` after resolution |
| `needs-review` | Issue | Reviewer passed; human decides whether to merge |
| `planning-output` | Pull request | Identifies the Planner's delivery PR and permits downstream branch updates; not an issue trigger |
| `bug` | Issue | Classification used with `planning`; not a standalone trigger |

Coder, Infra, and Reviewer do not have separate label triggers. The orchestrator owns their order. Labels such as `agent:planning`, `agent:implementing`, and `po:idea` are not triggers for these workflows.

## Validation after merge

- Submit an issue form. Verify it starts the Planner once via `planning`.
- Confirm `spec-review` does not start Coder. Add `ready-for-dev` only after approving the plan, then confirm the orchestrator runs the required agents.
- Resolve Planner clarification and re-add `planning`; verify stale clarification/review labels are removed as the state changes.

These checks create real issues and agent runs. Compilation validates configuration, not successful live agent behavior.

## GitHub documentation

- [Triggering a workflow from a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow): custom tokens for downstream events.
- [Agentic workflow triggers](https://github.github.com/gh-aw/reference/triggers/): label filters and role checks.
- [Safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/): per-output token configuration and label operations.
