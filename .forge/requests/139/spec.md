# Spec: sign-in with Google, Microsoft and Facebook in the Python favorites API (#139)

**Issue**: #139 (tier 2, touches authentication) · **Epic**: #132 · **Epic spec**: [specs/001-favorites-python-api/spec.md](../../../specs/001-favorites-python-api/spec.md) · **Depends on**: #135 (data access), #136 (session cookie and CSRF)

## Problem

Visitors sign in today through the .NET service with Google, Microsoft or Facebook. The Python service at `backend/favorites-api-py` has a session cookie and CSRF protection (#136) and data access (#135), but no sign-in. Until it has one, nobody can keep favorites on the Python service, and the cutover (#141) cannot happen.

## Behaviour to deliver

The Python service signs visitors in through the three providers and keeps the same contract as the .NET service:

- `GET /api/auth/providers` lists the providers that have credentials configured, as `{ name, displayName }`.
- `GET /api/auth/login/{provider}?returnUrl=` starts the OAuth flow. An unknown provider is a 400 problem.
- `GET /api/auth/callback/{provider}` finishes the flow, provisions or finds the user, sets the session cookie `__Host-favorites.session` (via `start_session`), and redirects to the return address.
- `GET /api/auth/me`, `POST /api/auth/logout` and `POST /api/auth/refresh` behave as the .NET endpoints do (see "Behaviour copied from .NET").
- Startup: an enabled provider with no credentials stops the service from starting outside Development, and names the provider without printing any secret. In Development it is left out and logged as not configured.
- Tests use a fake OAuth provider. No test reaches Google, Microsoft or Facebook.
- `authlib` is pinned to an exact version in `pyproject.toml` and `uv.lock`.

## Behaviour copied from .NET (parity, do not improve)

Checked in the source, not assumed:

| Case | .NET behaviour (reference) |
|---|---|
| Unknown provider on login, start or callback | 400 problem, detail `Unsupported provider '<name>'.` |
| Return address | Used only if it starts with `/` and not with `//` or `/\` (`RedirectSafety.cs`); otherwise `/` |
| Provider failed or state invalid on callback | Redirect `/?error=external_login_failed` (root, not the return address) |
| No provider user id in the result | Redirect `/?error=missing_provider_identifier` |
| Provisioning conflict (unverified e-mail matches an existing account) | Redirect `<returnUrl>?error=email_conflict` |
| Other provisioning failure | Redirect `<returnUrl>?error=external_login_failed` |
| Success | Redirect `<returnUrl>` after signing in |
| `GET /me` without a session | 401 (never a redirect to a login page) |
| `GET /me` when the user row is gone | 404 problem, detail `User was not found.` |
| `POST /logout` | 204; needs a session (401 without) and a valid CSRF token (400 `Invalid or missing CSRF token.`) |
| `POST /refresh` | Reads the user again; if gone, ends the session and answers 401; otherwise re-signs the session and answers 200 with the user |
| User payload | `{ id, displayName, email, createAt }` |
| E-mail trust | Claim `email_verified` if present (parsed as a boolean, case-insensitive); otherwise the provider's `TrustEmail`; and only if the e-mail is not empty |
| Provider defaults (`appsettings.json`) | Google: `TrustEmail` false. Microsoft and Facebook: `TrustEmail` true |

## Provisioning rules (copied from `UserProvisioningService.cs`)

1. Existing (provider, provider user id) pair: sign in as that user.
2. Otherwise, if the e-mail is not empty and a user has it: if the identity's e-mail is not verified, conflict; if verified, link the new (provider, id) pair to that user.
3. Otherwise create the user (`DisplayName` = display name, else e-mail, else `User`; `Email` = e-mail or empty) and link the pair.
4. A concurrent first login: if the link fails because another request won, adopt that user. If the failure was a unique-e-mail violation (a race on `Users.Email`), look the user up again and apply rule 2 with the same verification check.

## Scope

- Python service only, under `backend/favorites-api-py/`.
- Google, Microsoft and Facebook, with the same provider names, routes and credential names as the .NET service (`Authentication__Google__ClientId` and so on; see the plan).

## Non-goals

- Linking and unlinking extra providers (`/api/auth/link/...`, `/api/auth/logins`): #140.
- Changing the session cookie or CSRF: #136.
- Any change to the .NET service or to the database schema.
- Registering OAuth applications at the providers, and storing secrets in deployment: a person does it (see the plan).

## Open questions

None block the plan. Provider-specific details that cannot be run here (real endpoints, Facebook's profile call, Microsoft's claim names) are listed as risks in `plan.md` and must be verified before the pull request is merged.

## Done when

All acceptance criteria in the issue hold, each has a test or a named check in `plan.md`, the .NET behaviour in the table above is covered by tests, and the change is delivered as small pull requests (see `plan.md`).
