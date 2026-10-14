# Branching strategy (GitFlow)

| Branch | Purpose | Branches from | Merges into |
|---|---|---|---|
| `main` | Production. Only branch that triggers CD and infra deployment. | - | - |
| `develop` | Integration branch. | `main` (created once) | - |
| `feature/*` | New work. | `develop` | `develop` (PR) |
| `release/<version>` | Release stabilization. | `develop` | `main` (PR), then `main` -> `develop` |
| `hotfix/*` | Urgent production fix. | `main` | `main` (PR), then `main` -> `develop` |

Release versions are tagged on `main` after the merge (e.g. `v1.2.0`), and production
deployments keep using the existing `production` environment approvals.

## CI / CD behaviour

- `ci.yml` runs on PRs targeting `develop`, `main` or `release/**`, and on pushes to `develop` and `main`.
  Feature, release and hotfix branches get CI through their PRs.
- `cd.yml` only deploys when CI succeeded from a **push to `main`** (`workflow_run` filter plus an explicit
  `head_branch == 'main'` / `event == 'push'` check). `develop`, `feature/*`, `release/*` and `hotfix/*` are never deployed.
- `infra.yml` deploys only on pushes to `main` that change `infra/**`.

## Exception: `feature/canary`

`feature/canary` is a deployment/pipeline branch for the canary workflow (see
[canary-deployment.md](canary-deployment.md)), not a regular GitFlow feature. Do not branch from or merge it as a normal feature.

## Manual GitHub setup (not done by code)

1. Create `develop` from `main`: `git switch main && git switch -c develop && git push -u origin develop`.
2. In Settings -> Branches (or Rulesets), protect `develop` and `main`:
   - require a pull request before merging, with at least 1 approval;
   - require status checks to pass (the CI jobs `build` and SonarCloud analysis);
   - block force pushes and deletions.
3. Optionally protect `release/**` the same way, and keep required reviewers on the `production` environment.
