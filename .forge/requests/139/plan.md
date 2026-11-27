# Plan: sign-in with Google, Microsoft and Facebook (#139)

Read with [spec.md](spec.md). Tasks are in [tasks.md](tasks.md). Everything is under `backend/favorites-api-py/`.

## Approach

Build the sign-in in the layers the service already uses (`api` → `application` → `domain`, with `infrastructure` behind ports):

1. **Ports first.** Add a `UserRepository` and an `ExternalLoginRepository` port and an `IdentityProvider` port (start a login, exchange a callback for an `ExternalIdentity`). Domain gets `User`, `ExternalLogin` and `ExternalIdentity`.
2. **Provisioning is a pure use case** (`application/provisioning.py`) over those ports. Its rules are the `UserProvisioningService` rules in `spec.md`, tested with in-memory fakes and no database and no OAuth.
3. **OAuth lives in one adapter** (`infrastructure/oauth/authlib_client.py`) that implements `IdentityProvider` with Authlib's Starlette client. Authlib is the only place that talks to a provider. Tests replace it with a fake provider (`tests/fake_oauth.py`) that implements the same port, so no test reaches a provider. A separate unit test drives the Authlib adapter through an `httpx.MockTransport`, so that also needs no network.
4. **Routes** in `api/auth.py` mirror `AuthEndpoints.cs`. The return address check is a port of `RedirectSafety.cs` in `api/redirects.py`, kept apart so #140 can reuse it.
5. **Configuration** is read in `config.py` with the .NET names, and checked at start-up in `app.py` with the same rule as `AuthenticationSetup.cs`.

## Decisions

| Decision | Why | Revisit if |
|---|---|---|
| Credentials use the .NET variable names: `Authentication__Google__ClientId`, `Authentication__Google__ClientSecret`, `Authentication__Microsoft__ClientId`, `Authentication__Microsoft__ClientSecret`, `Authentication__Facebook__AppId`, `Authentication__Facebook__AppSecret` | The two services may share one configuration during the parallel run, as `ConnectionStrings__FavoritesDb` already does (`config.py`) | The .NET service is removed (#142) |
| The provider list and `TrustEmail` values are in code, copied from `appsettings.json` (Google false, Microsoft true, Facebook true). A provider is off only if `Authentication__<Name>__Enabled` is `false`; default on | Keeps parity without a settings file. The `Enabled` switch keeps the .NET capability | The configuration moves to a file |
| OAuth state and the return address are kept in the Starlette session during the flow. The callback reads them, then calls `start_session`, which clears everything | Reuses the session from #136. `start_session` already prevents session fixation. Avoids a second cookie as .NET does | Authlib's state handling differs from the expected behaviour in tests |
| Facebook and Microsoft use `TrustEmail` (no `email_verified` claim) | Same as the .NET appsettings | A provider starts sending `email_verified` |
| The e-mail trust check and the rules live in the application layer, not in the adapter | Testable without OAuth; the adapter only maps claims to `ExternalIdentity` | n/a |
| Uniqueness is by the database: `IX_ExternalLogins_Provider_ProviderUserId` (unique) and the filtered unique index on `Users.Email` (non-empty) | Both exist in `tests/integration/schema.sql`. A violation is detected by reading the row again, as `SqlFavoriteRepository.try_add` does, never by parsing the message | n/a |
| `/api/auth/providers` answers camelCase JSON (`name`, `displayName`, `createAt`) | ASP.NET's default; the web app reads these names (`frontend/src/services/authApi.ts`) | n/a |
| Redirect URIs stay `/api/auth/callback/{provider}` | Same paths as .NET, so the providers' registered URIs need no change | The Python service is served under another path |

## Files and components affected

Paths are the Coder's whole write scope (see `tasks.md`).

- `pyproject.toml`, `uv.lock`: `authlib` added and pinned.
- `README.md`: the sign-in variables, the provider list, and the start-up rule.
- `src/favorites_api/config.py`: provider credentials, enabled switch, `TrustEmail`, the start-up check.
- `src/favorites_api/app.py`: wire the routes, the adapter and the provisioning use case; run the start-up check.
- `src/favorites_api/domain/models.py`: `User`, `ExternalLogin`, `ExternalIdentity`.
- `src/favorites_api/application/ports.py`: `UserRepository` (find by id, by e-mail, create), `ExternalLoginRepository` (find user by login, try add), `IdentityProvider`.
- `src/favorites_api/application/provisioning.py` (new): the provisioning use case.
- `src/favorites_api/infrastructure/oauth/providers.py` (new): the provider table and credential checks.
- `src/favorites_api/infrastructure/oauth/authlib_client.py` (new): the Authlib adapter.
- `src/favorites_api/infrastructure/persistence/repositories.py`: SQL for `Users` and `ExternalLogins`.
- `src/favorites_api/api/redirects.py` (new): `safe_return_url`.
- `src/favorites_api/api/auth.py` (new): the six routes.
- `tests/fakes.py`: in-memory users and external logins.
- `tests/fake_oauth.py` (new): fake `IdentityProvider`, with the provider's claims as data.
- `tests/test_config.py`, `tests/test_auth_providers.py` (new), `tests/test_auth_login.py` (new), `tests/test_redirect_safety.py` (new), `tests/test_user_provisioning.py` (new), `tests/test_auth_session.py` (new).
- `tests/integration/test_user_repository.py`, `tests/integration/test_external_login_repository.py` (new).

## Key behaviours and how they are verified

Each acceptance criterion in #139 maps to at least one task and one check.

| Criterion | Task | Verification |
|---|---|---|
| Providers list only configured ones | T4 | `test_auth_providers.py`: only providers with credentials; display name fallback to name |
| Enabled provider without credentials stops start outside Development | T2 | `test_config.py`: raises in Production and Staging, message names the provider and no secret; skipped in Development |
| Login starts the flow; unknown provider is 400 | T5 | `test_auth_login.py` with the fake provider; 302 to the fake authorize URL; 400 problem for an unknown name |
| Callback finishes the flow and sets the session cookie | T7 | `test_auth_login.py`: after callback the `__Host-favorites.session` cookie is set and `GET /me` works |
| Redirect cannot leave the site | T5 | `test_redirect_safety.py` with the cases of `RedirectSafety.cs` (`//`, `/\`, `https://`, empty, plain path) |
| New person gets a `Users` row and an `ExternalLogins` row | T6, T8 | `test_user_provisioning.py` (fakes); `test_external_login_repository.py` and `test_user_repository.py` (SQL Server, integration marker) |
| Existing person found by (provider, provider user id) | T6 | `test_user_provisioning.py` |
| E-mail trust follows `UserProvisioningService` | T6, T5 | `test_user_provisioning.py`: unverified match is conflict; verified match links; `test_auth_login.py` for `email_verified` parsing and `TrustEmail` defaults |
| `me`, `logout`, `refresh` behave like .NET | T9 | `test_auth_session.py`: 401 without session, 404 when user missing, 204 logout, 400 without CSRF, refresh re-signs |
| Tests use a fake provider only | T5, T10 | `tests/fake_oauth.py`; a fixture disables socket connections to other hosts for the auth tests; `httpx.MockTransport` for the adapter |
| Authlib pinned | T1 | `uv lock --check`; the version in `pyproject.toml` is exact (`==`) |

Coverage: the existing `fail_under = 80` gate continues to apply. The new modules are covered by the tests above.

## Risks and open points

1. **Provider details not run here.** The planner had no network and no credentials. Before merge, the Coder must check against the .NET package defaults (in `AuthenticationSetup.cs` and the NuGet packages used) and the providers' documentation: the Microsoft endpoints (the .NET package uses the `common` tenant and Microsoft Graph `/me`), the Microsoft claim names for `id`, `displayName`, `mail` and `userPrincipalName`, Facebook's Graph version and its `id`, `name` and `email` fields, and Google's `sub` and `email_verified`. Record what is confirmed in the PR. This is the spike's "to verify" list for #139.
2. **HTTPS behind a proxy.** Authlib builds the redirect URI from the request. If the service sees `http` behind the load balancer, the redirect URI will not match the registered one. Must be checked in the deployment (a person's task); the code should honour the forwarded scheme only if the proxy is trusted. Decision for the Coder: use the configured public base URL if one is set, otherwise the request URL, and say which in the PR.
3. **Unique e-mail race.** The `Users.Email` unique index is filtered (migration `UniqueNonEmptyUserEmail`). The Python repository must report a unique-e-mail violation on insert as a distinct result (by re-reading, as `try_add` does), so rule 4 can run. The .NET code catches it around the save in `LinkAsync`/`ResolveAsync`; the Coder should confirm this against `ExternalLoginRepository.cs` and `UserRepository.cs` before writing the Python version.
4. **Session fixation and state.** The state must be checked by Authlib before `start_session` clears the session. The order in the callback is fixed in T7 and tested.
5. **Size.** The eight points in the issue are more than one pull request may hold (`AGENTS.md`: aim for 300 changed lines, never more than 500). Expect at least three pull requests: A (T1–T4), B (T5–T7), C (T8, T9), and D (T10) if it needs a separate one. Use `Part of #139` in A–C and `Closes #139` in the last. The estimate is not a promise; the Coder measures it.
6. **Dependencies.** #135 and #136 are present in the repository (`api/session.py`, `api/csrf.py`, `infrastructure/persistence/repositories.py`). The issue's assumption that they are merged is consistent with the files here.

## Out of scope (a person does it)

- Create OAuth applications at Google, Microsoft and Facebook, and register the callback URLs `https://<public host>/api/auth/callback/{google|microsoft|facebook}` for the Python service. Confirm the Facebook application requests `email`.
- Store the six `Authentication__…` values as secrets in the deployment of the Python service (and decide whether local `docker-compose.yml` needs them; that is configuration owned by a person, not planned here).
- Confirm that the public base URL and the forwarded scheme reach the service (risk 2).

No infrastructure, pipeline, or CI change is planned. The Coder touches no file outside the paths listed in `tasks.md`.

## Verification of the plan itself

- Every acceptance criterion maps to a task and a verification (table above).
- Every task has owner `app` and a path list.
- No task falls outside the request: linking (#140), the session cookie (#136) and the .NET service are untouched.
