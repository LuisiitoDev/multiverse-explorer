# Tasks: sign-in with Google, Microsoft and Facebook (#139)

All tasks: owner `app`. Paths are relative to the repository root. Each task ends when its verification passes, with `uv run ruff check`, `uv run mypy` and `uv run pytest` run in `backend/favorites-api-py/` (integration tests need `FAVORITES_TEST_DB_ADMIN`, see the README).

Suggested pull requests (`AGENTS.md`): **A** = T1–T4, **B** = T5–T7, **C** = T8–T9, **D** = T10 if it is not already in C. `Part of #139` in A–C, `Closes #139` in the last.

- [ ] **T1 · app · Pin Authlib.** Add `authlib==<version>` to the dependencies, exact pin, and lock it.
  - Paths: `backend/favorites-api-py/pyproject.toml`, `backend/favorites-api-py/uv.lock`
  - Verify: `uv lock --check` passes; `python -c "import authlib"` works in the project environment.

- [ ] **T2 · app · Provider credentials and the start-up rule.** Read `Authentication__<Name>__…` values and the `Enabled` switch in `Settings`. Add a start-up check: an enabled provider without credentials raises `ConfigurationError` outside Development, naming the provider and no secret. In Development it is left out and logged.
  - Paths: `backend/favorites-api-py/src/favorites_api/config.py`, `backend/favorites-api-py/src/favorites_api/infrastructure/oauth/__init__.py` (new), `backend/favorites-api-py/src/favorites_api/infrastructure/oauth/providers.py` (new), `backend/favorites-api-py/tests/test_config.py`
  - Verify: `test_config.py` covers Production and Staging (raises, names the provider, no secret in the message), Development (skipped), and a complete configuration (passes).

- [ ] **T3 · app · Domain types and ports.** Add `User`, `ExternalLogin` and `ExternalIdentity` to the domain. Add the ports `UserRepository` (find by id, find by e-mail, create), `ExternalLoginRepository` (find user by login, try add, reporting "added" or "already there") and `IdentityProvider` (start a login with a redirect URI; exchange a callback for an `ExternalIdentity`).
  - Paths: `backend/favorites-api-py/src/favorites_api/domain/models.py`, `backend/favorites-api-py/src/favorites_api/application/ports.py`
  - Verify: `mypy --strict` passes on `src` and `tests`; the existing `SqlUserRepository.exists` still satisfies its port.

- [ ] **T4 · app · `GET /api/auth/providers`.** Registry of the three providers (name, display name, scheme, `TrustEmail` default); the list returns only providers with credentials, as `{name, displayName}` in camelCase, display name falling back to the name. Mount the router in `app.py`.
  - Paths: `backend/favorites-api-py/src/favorites_api/api/auth.py` (new), `backend/favorites-api-py/src/favorites_api/app.py`, `backend/favorites-api-py/tests/test_auth_providers.py` (new)
  - Verify: `test_auth_providers.py`: no provider without credentials; an empty list when none; order is Google, Microsoft, Facebook; the JSON keys are `name` and `displayName`.

- [ ] **T5 · app · Return address check and login start.** Port `RedirectSafety.cs` to `safe_return_url` (relative paths only; `//` and `/\` refused; default `/`). `GET /api/auth/login/{provider}` stores the safe return address in the session and redirects to the provider through the `IdentityProvider` port. The Authlib adapter implements the port. Unknown provider: 400 problem `Unsupported provider '<name>'.`. Add the fake provider for tests.
  - Paths: `backend/favorites-api-py/src/favorites_api/api/redirects.py` (new), `backend/favorites-api-py/src/favorites_api/infrastructure/oauth/authlib_client.py` (new), `backend/favorites-api-py/src/favorites_api/api/auth.py`, `backend/favorites-api-py/tests/fake_oauth.py` (new), `backend/favorites-api-py/tests/test_redirect_safety.py` (new), `backend/favorites-api-py/tests/test_auth_login.py` (new)
  - Verify: `test_redirect_safety.py` runs every case of `RedirectSafety.cs` (`/a`, `//x`, `/\x`, `https://x`, empty, missing, whitespace). `test_auth_login.py`: 302 to the fake provider with a state; unknown provider 400; the return address is kept in the session. A socket guard fixture fails any test that connects to a non-local host.

- [ ] **T6 · app · Provisioning use case.** Implement the rules of `UserProvisioningService` (spec, section "Provisioning rules"): existing pair; e-mail match with trust check (conflict when not verified); creation; re-resolution after a race. Return a result that the callback maps to `email_conflict` or `external_login_failed`.
  - Paths: `backend/favorites-api-py/src/favorites_api/application/provisioning.py` (new), `backend/favorites-api-py/tests/fakes.py`, `backend/favorites-api-py/tests/test_user_provisioning.py` (new)
  - Verify: `test_user_provisioning.py` with in-memory fakes: new person (one user, one login); existing pair; verified e-mail links; unverified e-mail conflicts; empty e-mail creates a user with display name or `User`; the race path (login exists after a failed add; unique e-mail violation then verified or not).

- [ ] **T7 · app · Callback.** `GET /api/auth/callback/{provider}`: exchange the code through the port (the state is checked there, before anything else); read the return address from the session; build the `ExternalIdentity` (`email_verified` claim parsed case-insensitively, else `TrustEmail`, and only with a non-empty e-mail); redirect `/?error=missing_provider_identifier` when the id is empty; run provisioning; then `start_session` (which clears the session) and redirect. Error redirects exactly as in the spec table.
  - Paths: `backend/favorites-api-py/src/favorites_api/api/auth.py`, `backend/favorites-api-py/src/favorites_api/infrastructure/oauth/authlib_client.py`, `backend/favorites-api-py/tests/test_auth_login.py`
  - Verify: `test_auth_login.py` with the fake provider: success sets `__Host-favorites.session` and `GET /api/favorites` answers as signed in; failed state → `/?error=external_login_failed`; missing id → `/?error=missing_provider_identifier`; conflict → `<returnUrl>?error=email_conflict`; `email_verified` parsing and `TrustEmail` defaults for Google, Microsoft and Facebook; the session no longer holds the OAuth state after success.

- [ ] **T8 · app · SQL repositories for `Users` and `ExternalLogins`.** Implement the new ports on the existing mapping in `tables.py` (no schema change). Read the row again after an integrity error, as `try_add` does; report a unique-e-mail violation so provisioning can re-resolve.
  - Paths: `backend/favorites-api-py/src/favorites_api/infrastructure/persistence/repositories.py`, `backend/favorites-api-py/tests/integration/test_user_repository.py`, `backend/favorites-api-py/tests/integration/test_external_login_repository.py` (new)
  - Verify (integration marker, SQL Server): new user and login rows; duplicate (provider, provider user id) reported as "already there"; duplicate non-empty e-mail reported as the e-mail violation; empty e-mails may repeat; `test_schema_mapping.py` still passes.

- [ ] **T9 · app · `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/refresh`.** Same statuses, bodies and order of checks as the spec table: session dependency first (401), then CSRF on the POST routes (400). `refresh` re-reads the user; if gone, end the session and 401; otherwise re-sign and 200 with `{id, displayName, email, createAt}`.
  - Paths: `backend/favorites-api-py/src/favorites_api/api/auth.py`, `backend/favorites-api-py/tests/test_auth_session.py` (new)
  - Verify: `test_auth_session.py`: `me` 401 without session, 404 `User was not found.` when the row is gone, 200 with the payload; `logout` 401 without session, 400 without CSRF, 204 with both; `refresh` 401 when the user is gone and the cookie is cleared, 200 otherwise.

- [ ] **T10 · app · Documentation.** Describe the sign-in variables, the provider list, the start-up rule, the redirect URIs and the test rule (no provider calls) in the service README.
  - Paths: `backend/favorites-api-py/README.md`
  - Verify: README names each `Authentication__…` variable exactly as the code reads it (check by grep in the PR).
