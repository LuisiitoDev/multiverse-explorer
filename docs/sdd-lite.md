# Spec depth: between spec-driven development and Scrum

Spec Kit's full cycle (`specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`, with checklists) treats the spec as
the record of everything. Scrum treats the backlog item as the unit and wants a small increment every two weeks. Doing
the full cycle for every issue costs more than it saves. This document keeps what pays and drops the rest.

Evidence from the first epic (#132): the Spec Kit spec had 5 user stories, 18 requirements and 7 success criteria, and
repeated the acceptance criteria that the issues already had. Two copies drift. What did pay was checking the spec
against the existing code: it caught three wrong statements before anyone built on them.

## Rules

1. **One source of truth per story: the acceptance criteria in the issue.** Written as Given / When / Then, each one
   testable. There is no second copy in a spec file.
2. **Spec depth follows risk.** Pick a tier at Refinement with three questions:
   - Does it cross a contract (API, data schema, authentication)?
   - Is it hard to undo (migration, cutover, data change)?
   - Do several stories depend on the same decisions?
3. **Ground it before you write it.** Read the code, the data or the system you are copying or changing, and write down
   what you verified. This is the one habit of spec-driven development that always paid.
4. **Decisions are one line each**: Decision, Why, Revisit if. Not a document per decision.
5. **At most three open questions per item.** List them in the issue and answer them at Refinement. This replaces a
   separate clarify step.
6. **Update the spec in the PR that changes the behaviour.** No big-bang spec before the work, no spec rot after it.
7. **The constitution still binds.** Check the principles the change touches in the PR. If the change contradicts the
   constitution, fix that first with an amendment or exception PR, before the sprint that depends on it.

## Tiers

| Tier | When | What you write | Review |
|---|---|---|---|
| 1 | None of the three questions is "yes" | Acceptance criteria in the issue | Sprint Planning (`Ready`), then PR review |
| 2 | One "yes" | Acceptance criteria, plus the decisions (one line each) and the verified facts, in the issue | The same, and the decisions are read in the PR |
| 3 | Two or three "yes", or an epic | A one-page spec in `specs/NNN-name/spec.md`: goal, the rule, verified behaviour, decisions, open questions, out of scope, done when. It links to the issues; it does not copy their criteria | The owner reads the spec before the sprint starts |

Write the tier on the issue (a line `Spec tier: 1`, `2` or `3`). If you are unsure between two tiers, take the lower one
and raise it if the work shows more risk.

## What is skipped, and when to bring it back

| Skipped by default | Bring it back when |
|---|---|
| `tasks.md` | Never as a file. Tasks are a checklist in the issue, or sub-issues |
| `speckit-analyze`, quality checklists | A tier 3 spec that two or more people will build in parallel |
| `speckit-plan` as a separate document | A tier 3 where a spike's findings do not already hold the technical choices; the spike's note is the plan |
| Separate clarify step | Never: open questions are answered at Refinement |

## Spec Kit and Forge

- Use `speckit-specify` only for tier 3. Write it short (aim for two pages).
- Use the `forge` label from tier 2 up, where the plan review gate pays for itself. A tier 1 story is built directly from
  its acceptance criteria. This changes only when the label is added; the engine is untouched.
- The PR template stays as it is. For tier 1, "Spec review" can say "Tier 1: the issue's criteria".

## Limits

- This is a proposal for this repository; it has been applied once, to epic #132. Review it after the first two sprints.
- The tier questions are judgment calls. They exist to make the decision explicit, not to remove it.
