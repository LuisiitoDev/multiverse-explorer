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
| Estimate | Single select | `1`, `2`, `3`, `5`, `8`, `13` (story points; above 8, split it) |
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
   - **Sprint board**: board, filter `sprint:@current`, columns by `Status`, show `Estimate`.
   - **Roadmap**: roadmap layout, group by `Milestone`, markers on `Sprint`.
   - **Planning**: table, filter `status:Ready -sprint:@current`, sum of `Estimate`, to pick the sprint.
3. **Project workflows** (Settings, Workflows): item added to the project sets `Status` to `Backlog`; item closed sets
   `Done`; pull request merged sets `Done`; auto-add issues from this repository.
4. **Discussions**: add a category `Retrospectives`. The repository already has discussion templates.
5. **Branch protection on `main`**: require the CI checks and one approving review.

Check the first run: the iteration field is created through GraphQL (`createProjectV2Field` with
`iterationConfiguration`) and is **To verify**; if it fails, create `Sprint` in the UI (Iteration, 2 weeks).

## 7. Open points

- The milestone names are placeholders. Replace them with the real roadmap and add due dates when a release is forecast.
- The feature-request template still carries the label `analysis` from the removed pipeline. Forge starts on `forge`.
- The Project is owned by the user account, not an organization. Organization-level Project workflows and issue types
  are not available there.
