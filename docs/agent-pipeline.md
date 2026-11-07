# Agent pipeline and trigger labels

## Starting from a discussion

1. Create a discussion in **Ask the BA**. A repository writer's discussion or comment starts BA Chat.
2. The BA reads the matching feature or bug form in `.github/ISSUE_TEMPLATE/`. It asks questions in the discussion when required fields or other details are unclear. Reply there; no label is needed for discussion replies.
3. Once the required answers are complete and no clarification is open, the BA creates one issue with the template's title prefix and input headings, in template order. Unanswered optional fields use `_No response_`. The issue includes the discussion URL as `Source:`.
4. The issue is created with **planning**, plus **bug** for bugs. It does not receive **analysis**: discussion intake already completed that step. The label event starts the Planner directly.
5. The Planner creates a draft PR marked **planning-output** and moves the issue to **spec-review**. A human reviews the plan and adds **ready-for-dev to the issue** to approve implementation.
6. The Agent Orchestrator runs Coder and, when needed, Infra, then Reviewer. Reviewer findings return to the Planner; a revised plan requires human approval again. A passing review leaves **needs-review** for the human merge decision.

## Starting from an issue form

The feature and bug forms retain their **analysis** label. This starts the issue BA, which asks any questions on the issue and uses **needs-clarification** while waiting. A human reply resumes BA only when its latest bot-authored result is waiting for clarification; that label alone does not mean the BA owns another agent's questions.

When analysis is complete, BA publishes its result, removes **analysis** and resolved **needs-clarification**, and adds **planning**. That label starts the Planner. BA does not also call the Planner directly.

## Label reference

| Label | Applied to | Purpose / trigger |
|---|---|---|
| `analysis` | Issue | Starts issue BA when added; included by the issue forms |
| `planning` | Issue | Starts Planner when added, including completed BA Chat issues |
| `spec-review` | Issue | Plan awaits human review; does not start implementation |
| `ready-for-dev` | Issue | Human approval; starts Agent Orchestrator, which calls Coder, optional Infra, and Reviewer |
| `needs-clarification` | Issue | An agent needs human input; BA questions resume on a reply, Planner questions require re-adding `planning`, implementation blockers require re-adding `ready-for-dev` after resolution |
| `needs-review` | Issue | Reviewer passed; human decides whether to merge |
| `planning-output` | Pull request | Identifies the Planner's delivery PR and permits downstream branch updates; not an issue trigger |
| `bug` | Issue | Classification used with `analysis` or `planning`; not a standalone trigger |

Coder, Infra, and Reviewer do not have separate label triggers. The orchestrator owns their order. Labels such as `agent:planning`, `agent:implementing`, and `po:idea` are not triggers for these workflows.

## Token and access setup

The repository needs all labels in the table and an Actions secret named `BA_ISSUE_TOKEN`. Use a user PAT with access to this repository and **Issues: read and write**, owned by a user with repository write access so the existing role checks admit its label events. Do not put its value in a workflow or issue.

Only BA Chat's `create-issue` and issue BA's `add-labels` outputs use that token. Result comments continue using the default workflow token and remain authored by `github-actions[bot]`. The ordinary `GITHUB_TOKEN` does not start another workflow from an issue-label event, so substituting it would break the label handoff.

BA Chat retains `min-integrity: none`; BA, Planner, Coder, Infra, and Reviewer retain `approved`. This change does not broaden their MCP access. A downstream integrity rejection remains a separate failure to investigate.

The orchestrator still calls Planner directly after review changes because it adds its replan label with `GITHUB_TOKEN`; that path does not produce a second standalone Planner run.

## Validation after merge

- In a new Ask the BA discussion, leave one required form field unclear. Verify BA asks a question and does not create an issue. Answer it and verify the resulting issue has exact template headings, `planning`, and `bug` only when appropriate, and starts Planner once.
- Submit an issue form with `analysis`. Verify the BA can clarify it, publishes its result before handoff, and starts Planner through `planning` without a direct workflow call.
- Confirm `spec-review` does not start Coder. Add `ready-for-dev` only after approving the plan, then confirm the orchestrator runs the required agents.
- Resolve Planner clarification and re-add `planning`; verify stale clarification/review labels are removed as the state changes.

These checks create real issues and agent runs. Compilation validates configuration, not successful live agent behavior.

## GitHub documentation

- [Triggering a workflow from a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow): custom tokens for downstream events.
- [Agentic workflow triggers](https://github.github.com/gh-aw/reference/triggers/): label filters and role checks.
- [Safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/): per-output token configuration and label operations.
