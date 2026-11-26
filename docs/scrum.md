# Scrum on GitHub

How this repository runs Scrum with GitHub Projects, milestones and [Agentic Forge](https://github.com/LuisiitoDev/agentic-forge).

> The scrum.org page "Implementing Scrum with GitHub Projects" is a webinar landing page with no written guide, so this
> setup follows the [Scrum Guide](https://scrumguides.org/) and GitHub's documented features. Items marked **To verify**
> have not been run against GitHub yet.

## 1. Mapping

| Scrum | GitHub |
|---|---|
| Product Goal | Description of the Project and of the current milestone |
| Product Backlog | Issues in the Project, ordered by the manual sort in the **Backlog** view |
| Sprint | Project field **Sprint** (Iteration, 2 weeks) |
| Sprint Goal | Description of the Sprint iteration, and the pinned issue `Sprint N goal` |
| Sprint Backlog | Items whose **Sprint** is the current iteration (view **Sprint board**) |
| Increment | Pull requests merged to `main` and deployed by `cd.yml` |
| Definition of Done | Section 4, enforced by CI and the PR template |
| Release / outcome | **Milestone** (`v0.1 Foundation`, `v0.2 Core`, `v1.0 GA`): placeholders, edit to the real roadmap |
| Impediment | Issue with label `impediment` |

Milestones group work by **outcome** (a release); sprints group it by **time**. An issue has one of each.

## 2. Project fields

| Field | Type | Values |
|---|---|---|
| Status | Single select (built in) | `Backlog`, `Ready`, `In progress`, `In review`, `Done` |
| Sprint | Iteration | 2 weeks, starts on a Monday |
| Estimate | Number | Story points: use `1`, `2`, `3`, `5`, `8` or `13` (above 8, split it). A number so the Project can sum it |
| Priority | Single select | `P0 Critical`, `P1 High`, `P2 Medium`, `P3 Low` |
| Milestone, Labels, Assignees, Linked pull requests | Built in | |

## 3. Labels

`type: story`, `type: bug`, `type: chore`, `type: spike`, `epic`, `tech-debt`, `impediment`. Forge's labels (`forge`,
`needs-clarification`, `planning`, `spec-review`, `ready-for-dev`, `clarified`, `retry`, `needs-review`, `blocked`) are
the engine's and are not reused for Scrum.

## 4. Definitions

**Definition of Ready** (a Product Backlog item may enter a sprint when):
- It has a user, a need and testable acceptance criteria.
- It is estimated (`Estimate` set, at most 8), and has a milestone.
- It has no open dependency, or the dependency is in the same sprint.

**Definition of Done** (an item is Done when):
- The PR is merged to `main` and closes the issue (`Closes #N`).
- CI is green: frontend lint, tests and build; backend build and tests; CodeQL.
- Every acceptance criterion is met and has a test, as the PR template's table shows.
- No secret, no unreviewed dependency, docs updated where behaviour changed.
- The Reviewer passed and a human approved the merge (Forge: `needs-review`, then merge).

## 5. Events

| Event | When | What happens in GitHub |
|---|---|---|
| Sprint Planning | Day 1 | Pick `Ready` items into the new **Sprint**; write the Sprint Goal; check capacity against `Estimate` totals |
| Daily Scrum | Daily, 15 min | **Sprint board**; raise `impediment` issues |
| Sprint Review | Last day | Show merged PRs and the deployed build; update the Product Backlog order |
| Sprint Retrospective | Last day | Discussion in the **Retrospectives** category; actions become issues (`type: chore`) in the next sprint |
| Refinement | Ongoing, mid-sprint | Split `epic`s, estimate, set milestone, move items to `Ready` |

### Using Forge in the sprint

Forge implements a **Sprint Backlog** item; it does not replace planning.

1. An item is `Ready` (Definition of Ready) and in the current Sprint.
2. The Product Owner or a developer adds the label `forge`. BA and Planner run; the plan PR is the Spec review.
3. A human who did not open the issue adds `ready-for-dev`: that is the team's go decision for implementation.
4. Coder and Reviewer run. The PR carries the Definition of Done table. A human merges.

Move `Status` by hand to `In progress` when `forge` is added and to `In review` when `needs-review` appears: Project workflows cannot react to labels.

## 6. Setup

Run once, from a machine with `gh` and `jq`, after `gh auth login` with the scopes `repo` and `project`:

```bash
scripts/scrum-setup.sh LuisiitoDev/multiverse-explorer
```

Or run the workflow **Scrum Setup** (Actions tab, Run workflow). It is **To verify**: it has not run successfully yet.

- Labels and milestones use a short-lived GitHub App token (`actions/create-github-app-token`). Set the variable
  `SCRUM_APP_ID` and the secret `SCRUM_APP_KEY` of an App installed on this repository with Issues: write. Use a
  dedicated App: anyone who can push a workflow here can read `SCRUM_APP_KEY`, so do not reuse the Forge engine's key.
- A GitHub App token cannot reach a Project owned by a user account. The Project steps run only if the optional secret
  `SCRUM_PROJECT_TOKEN` exists (a classic personal access token of the owner, scopes `repo` and `project`); otherwise the
  workflow skips them (`SKIP_PROJECT=1`) and you create the Project by running the script locally.

It creates the labels, the three milestones, the Project, the fields `Estimate`, `Priority` and `Sprint`, and links the
Project to the repository. It is idempotent. These steps have **no API** and are done by hand in the Project:

1. **Status options.** Settings, field `Status`: `Backlog`, `Ready`, `In progress`, `In review`, `Done`.
2. **Views.**
   - **Backlog**: table, filter `status:Backlog,Ready`, group by `Milestone`, sort manually (this is the order).
   - **Sprint board**: board, filter `sprint:@current`, columns by `Status`, show `Estimate`, column sum of `Estimate`.
   - **Roadmap**: roadmap layout, group by `Milestone`, markers on `Sprint`.
   - **Planning**: table, filter `status:Ready -sprint:@current`, group by `Priority`, sum of `Estimate` per group, to
     pick the sprint. A table only offers a field sum when it is grouped.
   - To rename a view, double-click its tab name, then select all and type. The menu entry "Rename view" did not work.
3. **Project workflows** (Settings, Workflows): item added to the project sets `Status` to `Backlog`; item closed sets
   `Done`; pull request merged sets `Done`; auto-add issues from this repository. The first three are on by default;
   auto-add needs the repository set to this one and the filter `is:issue is:open`.
4. **Discussions**: add a category `Retrospectives` (open-ended). The repository already has discussion templates.
5. **Branch protection on `main`**: see the decision in section 8. It is a ruleset, not classic branch protection.

The script ran from macOS (`gh` 2.92, bash 3.2) on 2026-11-26 and created everything, including the `Sprint` iteration
field through GraphQL (`createProjectV2Field` with `iterationConfiguration`). A second run changed nothing. The
**Scrum Setup** workflow has still not run successfully.

## 8. Setup log and decisions (2026-11-26)

Decisions taken while setting this up by hand. Each has its reason, so it can be reversed on purpose.

| Decision | Why |
|---|---|
| `Estimate` is a Number field, replaced after creation | A Project sums only number fields. As a single select, the "sum of Estimate" the Planning view needs was impossible. The Project had no items, so nothing was lost. The script now creates a Number. |
| `Planning` is grouped by `Priority` | A table shows a field sum only when grouped. `Priority` is the order in which work is pulled into a sprint, so the per-group totals are useful while picking. |
| `Retrospectives` is an open-ended category | A retrospective is a conversation, not a question with one right answer. Q&A would add "mark as answer" with no meaning. |
| Auto-add takes `is:issue is:open` from this repository only | The Product Backlog is made of issues, as section 1 says; pull requests are not backlog items. The workflow's default repository was `agentic-forge` and its default filter was `is:issue,pr is:open label:bug`, so both were changed. Add `pr` to the filter if pull requests should get cards too. |
| `main` ruleset: add required checks `Analyze (csharp)` and `Analyze (javascript-typescript)` (CodeQL) | The `CI` workflow is **disabled** (`disabled_manually`), so its checks `build` and `backend` never report on a pull request. Requiring them would block every merge. The CodeQL jobs run and pass on every pull request, including the ones Forge opens, so they are the working equivalent of "require the CI checks". Not set to "up to date with main", to avoid rebases. |
| `main` ruleset: approvals stay at `0` (not the `1` this document first said) | The ruleset has no bypass actors and the owner is the only maintainer. With one required approval, GitHub does not count the author's own approval, so the owner could not merge their own pull requests. The human approval of the Forge flow (`ready-for-dev`) already gates agent work. Raise it when a second maintainer exists. |
| `CI` workflow left disabled | It was disabled manually and the reason is not recorded here, so re-enabling it is a separate decision for the owner. When it is enabled, add `build` and `backend` to the ruleset's required checks. |

Rollback of the ruleset: the previous version (id `20899123`) had the rules `deletion`, `non_fast_forward`,
`pull_request` (squash only, code-owner review, 0 approvals), `code_quality` and `required_linear_history`. Remove the
`required_status_checks` rule to return to it.

## 7. Open points

- The milestone names are placeholders. Replace them with the real roadmap and add due dates when a release is forecast.
- The feature-request template still carries the label `analysis` from the removed pipeline. Forge starts on `forge`.
- The Project is owned by the user account, not an organization. Organization-level Project workflows and issue types
  are not available there.
