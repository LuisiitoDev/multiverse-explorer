<!--
One template for the whole life of a PR. Humans fill all of it. In the agent pipeline:
  Planner  opens the PR as a draft and fills "Spec review".
  Coder    replaces the body once implemented: keeps "Spec review" and fills "Implementation".
  Infra    does not edit this body; it reports in its issue comment.
  Reviewer does not edit this body; it checks it and reports gaps as findings.
Keep every heading. Write "N/A" or "None" instead of deleting a section. Delete these comments.
-->

Closes #<issue-number>

## Type

<!-- Mark one. -->
- [ ] Feature
- [ ] Bug fix
- [ ] Infra (`infra/`)
- [ ] Docs / chore

## Summary

<!-- Two to four sentences: what changes and why (features), or root cause and fix (bugs). Written for someone who has not read the issue. -->

## Acceptance criteria

<!--
Planner lists them, copied from the plan, never invented: features from the acceptance scenarios, functional requirements and success criteria in spec.md; bugs from the acceptance criteria in assessment.md.
Coder ticks a box only when the code and a passing test for it exist, and fills the Code and Test columns.
Reviewer verifies each row independently and reports mismatches as findings.
-->

| # | Criterion | Source | Code | Test | Met |
|---|-----------|--------|------|------|-----|
| AC1 | | `spec.md` US1 scenario 1 | | | [ ] |

**Criteria not met or not verifiable:** <!-- Each one with the reason, or "None". -->

## Spec review

<!-- Planner section. Filled while the PR is a draft. Humans review the plan here. -->

**Plan artifacts:** [spec.md](specs/<feature-dir>/spec.md) · [plan.md](specs/<feature-dir>/plan.md) · [tasks.md](specs/<feature-dir>/tasks.md) <!-- bugs: [assessment.md](.specify/bugs/<slug>/assessment.md) -->

**Review focus:** <!-- Key decisions to confirm, each with its source: a human's answer, a file path in the codebase, or a constitution exception. Nothing may rest on an assumption. -->

- 

**Scope:** <!-- Features: task count per story and MVP. Bugs: verdict, severity, root cause, confidence, files to change. -->

**Open analysis findings / risks:** <!-- speckit-analyze MEDIUM/LOW findings still open, or "None". -->

## Implementation

<!-- Coder section. "Pending" until the Coder has run. -->

**What was implemented:** <!-- Per user story or per fix. Reference task IDs (T001...). -->

**Tasks:** <!-- `<done>/<total>` ticked in tasks.md, or N/A for bugs. -->

**Handed off to Infra:** <!-- Tasks left for the Infra agent (label `ready-for-infra`), or "None". -->

**Deviations from the plan:** <!-- Anything not done as planned, with evidence, or "None". -->

## Verification

<!-- Mark only checks that were actually run, and paste the outcome. A check that was not run stays unmarked with the reason. -->

| Area | Check | Result |
|------|-------|--------|
| Frontend | `npm run lint` | |
| Frontend | `npm test` | |
| Frontend | `npm run build` | |
| Backend | `dotnet build --configuration Release` | |
| Backend | unit + integration tests | |
| Infra | `az bicep build` / `az bicep lint` | |

**Not run, and why:** <!-- or "None". -->

## Risk checklist

- [ ] No changes outside the allowed paths for the author (agents: `frontend/**`, `backend/**`, `docker-compose.yml`, `specs/**`, `.specify/bugs/**`, `docs/**`; Infra: `infra/**`, `specs/**`)
- [ ] No secrets, keys or subscription IDs added
- [ ] No new dependencies, or each one is named by a task
- [ ] Database changes use `Database.Migrate()` behind the existing feature flag (no separate migrator)
- [ ] No new role assignments, public exposure or SKU upgrades, or they are called out in the Summary
- [ ] Changes to workflows or `CODEOWNERS` are flagged for owner review

## Notes for reviewers

<!-- Anything a reviewer should look at first, suggested follow-ups, screenshots. Or "None". -->
