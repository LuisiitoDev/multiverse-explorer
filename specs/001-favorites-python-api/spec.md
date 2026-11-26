# Spec (lite): Favorites service on Python

**Epic**: #132 · **Tier**: 3 (see [docs/sdd-lite.md](../../docs/sdd-lite.md)) · **Status**: Draft · **Created**: 2026-11-26

**Request**: "migrar la api de favoritos de .Net a Python usando fastapi".

## Goal
Replace `backend/src/Favorites.Api` (.NET) with a Python service on FastAPI. Visitors and the web app notice nothing, except that everyone signs in once more at the switch.

## The rule: parity
The new service behaves like the .NET one at the contract: same URLs, payloads, status codes, cookie and header names, same data. The .NET service and its tests (`FavoriteEndpointsTests`, `ApiErrorTests`, `AuthorizationWiringTests`, the validators' tests) are the reference. If the .NET behavior looks odd, copy it and list it below; do not fix it during the migration.

## Where the acceptance criteria live
They live in the issues, once. This file does not repeat them.

| Area | Issue | Sprint |
|---|---|---|
| Stack choice | #133 | 1 |
| Project, Docker, CI | #134 | 1 |
| Data access on the existing schema | #135 | 1 |
| Session cookie and CSRF | #136 | 1 |
| Favorites endpoints | #137 | 1 |
| Tests and contract check | #138 | 1 |
| Sign-in (Google, Microsoft, Facebook) | #139 | 2 |
| Account linking | #140 | 2 |
| Switch and runbook | #141 | 2 |
| Remove the .NET service | #142 | after cutover |

## Behavior checked in the .NET code
Things the issues must not get wrong. Each one was read in the source, not assumed.
- Validation errors come back as **one** message: all problems joined with a space, status 400.
- Favorites are unique per (user, type, resource) through a unique index; two simultaneous adds end in one row and one "conflict".
- The resource type is stored in lower case; the filter is case-insensitive; valid values are `character`, `episode`, `location`.
- A failed CSRF check answers 400 with the detail "Invalid or missing CSRF token."; a missing user in the session answers 401.
- The return address after sign-in is accepted only when it is a relative path (starts with `/`, not `//` or `/\`); otherwise a default is used.
- Linking: "conflict" if the provider account belongs to another user or is already linked here, or if unlinking would leave no way to sign in; "not found" if the provider is not linked; "bad request" for an unsupported provider.
- Deleting a user deletes their favorites and linked providers (foreign keys with cascade).
- The e-mail index on users is **unique for non-empty e-mails** (a filtered unique index, migration `UniqueNonEmptyUserEmail`); an empty e-mail may repeat. The first migration made it non-unique; the second changed it.

## Decisions
| Decision | Why | Revisit if |
|---|---|---|
| Everyone signs in again at the switch | The .NET session cookie is encrypted with ASP.NET Data Protection; Python cannot read it | The product cannot accept one forced sign-in |
| SQL Server and the current schema stay; EF Core migrations own the schema until the .NET service is removed | One change at a time: language, not database | A schema change is needed before the cutover |
| Both services may use the same database during the parallel run; only one gets production traffic | Lets us compare and roll back without copying data | The data is found to differ in a way the services cannot share |
| The cutover is Blue/Green: Python is Green, .NET stays Blue | Constitution, Principle V | n/a |
| Constitution exception 2.1.0 (PR #144) | The constitution names .NET as the backend | n/a |

## Open questions (owner)
Answers are needed before sprint 2; sprint 1 does not depend on them.
1. Is one forced sign-in for everyone acceptable at the switch? (Assumed yes.)
2. Rollback target: 15 minutes? (Assumed yes.)
3. Remove the .NET service after 14 days of production use without a rollback? (Assumed yes.)

## Out of scope
New features, visual changes, changing the database engine, any service other than Favorites.

## Done when
All child issues are Done, the cutover is verified in production, a rollback was rehearsed once, and the constitution exception is removed (#142).
