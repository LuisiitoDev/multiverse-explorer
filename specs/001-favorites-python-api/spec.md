# Feature Specification: Favorites service on Python (behavior-preserving migration)

**Feature Branch**: `001-favorites-python-api`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "migrar la api de favoritos de .Net a Python usando fastapi" (migrate the Favorites API from .NET to Python using FastAPI). Epic: LuisiitoDev/multiverse-explorer#132.

## User Scenarios & Testing *(mandatory)*

This is a migration. A visitor must not notice it, except that everyone signs in once more at the switch. Each story below is a slice of the behavior that exists today, so each one can be built, tested and shown on its own.

### User Story 1 - Manage my favorites exactly as today (Priority: P1)

A signed-in visitor saves characters, episodes and locations as favorites, lists them (all, or one kind), and removes them.

**Why this priority**: It is the reason the service exists. Without it nothing else has value.

**Independent Test**: With a test session, list, add and remove favorites through the service and through the existing web app. The results match what the current service returns for the same steps.

**Acceptance Scenarios**:

1. **Given** I am signed in and have no favorites, **When** I add the character 1, **Then** the answer says it was created, tells me where to find it, and my list shows it once.
2. **Given** the character 1 is already my favorite, **When** I add it again, **Then** I get a "conflict" answer and my list still shows it once, even if two requests arrive at the same moment.
3. **Given** I have favorites of every kind, **When** I list with the filter `Location` (any letter case), **Then** I see only locations.
4. **Given** I am signed in, **When** I list with a filter that is not character, episode or location, **Then** I get a "bad request" answer that says which values are valid.
5. **Given** I add a favorite of type `Episode`, **When** I list, **Then** its type is shown in lower case: `episode`.
6. **Given** I add a favorite with a resource number of zero or less, **Then** I get a "bad request" answer.
7. **Given** I have a favorite, **When** I remove it, **Then** the answer is "no content" and it is gone from my list.
8. **Given** a favorite belongs to someone else or does not exist, **When** I remove it, **Then** I get "not found" and nothing changes.

---

### User Story 2 - Stay protected (Priority: P1)

Only a signed-in visitor can read or change their favorites, and a third-party site cannot change them on my behalf.

**Why this priority**: The same protections exist today, and the constitution (Principle IV) requires them to survive any change to the API.

**Independent Test**: Call every favorites operation with no session, with a tampered session, with an expired session, and with and without the CSRF proof.

**Acceptance Scenarios**:

1. **Given** I have no valid session, **When** I call any favorites operation, **Then** I get "unauthorized", never a redirect to a login page.
2. **Given** I am signed in, **When** I add or remove a favorite without the CSRF proof, or with a wrong one, **Then** I get "bad request" with the message "Invalid or missing CSRF token." and nothing changes.
3. **Given** I am signed in, **When** I read my favorites, **Then** the service gives my browser the readable CSRF value to send back on the next change.
4. **Given** my session cookie was altered, **When** I call the service, **Then** I get "unauthorized".

---

### User Story 3 - Sign in, see who I am, sign out (Priority: P2)

A visitor signs in with Google, Microsoft or Facebook, can see their profile, refresh the session, and sign out.

**Why this priority**: Favorites need a signed-in user. It is built after the favorites operations because those can be tested with a test session first.

**Independent Test**: Run the sign-in flow against a fake provider for each of the three, then check "who am I", refresh and sign-out.

**Acceptance Scenarios**:

1. **Given** a provider has no credentials configured, **When** the list of providers is requested, **Then** that provider is not offered.
2. **Given** a provider is enabled but has no credentials, **When** the service starts outside development, **Then** it refuses to start with a message that names the provider.
3. **Given** I sign in for the first time, **When** the provider confirms who I am, **Then** an account is created for me and a session starts.
4. **Given** I have signed in before with the same provider account, **When** I sign in again, **Then** I get my existing account, not a new one.
5. **Given** the sign-in asks to send me back to a page on another site, **When** it finishes, **Then** I am sent to a page on this site instead.
6. **Given** I am signed in, **When** I ask who I am, refresh, or sign out, **Then** the answers and the session change as they do today.

---

### User Story 4 - Connect more than one provider (Priority: P3)

A signed-in visitor links a second provider to their account, sees which are linked, and unlinks one.

**Why this priority**: Used less than sign-in, and it only makes sense after sign-in works.

**Independent Test**: With the fake provider, link, list and unlink, including the refusals.

**Acceptance Scenarios**:

1. **Given** I am signed in, **When** I link another provider, **Then** it appears in my list of linked providers.
2. **Given** that provider account is already linked to someone else, **When** I try to link it, **Then** I get "conflict" and nothing changes.
3. **Given** I have only one way to sign in, **When** I unlink it, **Then** I get "conflict" and it stays linked.
4. **Given** a provider is not linked to my account, **When** I unlink it, **Then** I get "not found".

---

### User Story 5 - Switch safely, and go back if needed (Priority: P2)

The owner runs the new service next to the old one, switches visitors to it, and can switch them back.

**Why this priority**: A migration that cannot be reversed puts the product at risk. The constitution (Principle V) requires a candidate environment, validation, and a rollback target.

**Independent Test**: Start both services against the same data, run the smoke checks on the new one, switch, then switch back, and compare each user's favorites before and after.

**Acceptance Scenarios**:

1. **Given** both services run on the same data, **When** a favorite is added through one, **Then** the other shows it.
2. **Given** the new service passes the smoke checks, **When** the owner switches, **Then** the web app uses it without any change to the web app.
3. **Given** the switch has happened, **When** the owner switches back, **Then** the old service serves visitors again and no favorite is lost.
4. **Given** the switch has happened, **When** a visitor opens the app, **Then** they must sign in once more, and the runbook says so beforehand.

---

### Edge Cases

- Two requests add the same favorite at the same moment: exactly one is stored, the other gets "conflict".
- A user's account is deleted: their favorites and linked providers go with it.
- The resource number is zero, negative, or the type is empty: "bad request", with every problem listed.
- A session expires while the visitor is using the app: the next call gets "unauthorized".
- A required setting (database address, provider secret) is missing: the service fails to start and says which one; it never starts "successfully" in a broken state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The service MUST list the signed-in user's favorites, optionally filtered by one of `character`, `episode`, `location` (any letter case). Each item MUST carry its id, user id, resource type, resource number and creation time.
- **FR-002**: The service MUST add a favorite from a resource type and a resource number. It MUST store the type in lower case, require a number greater than zero, answer "not found" for an unknown user, and answer "conflict" for a duplicate, including a duplicate caused by simultaneous requests. A success MUST answer "created" with the location of the new favorite.
- **FR-003**: The service MUST remove a favorite by id only when it belongs to the signed-in user. It MUST answer "no content" on success, "not found" when it is absent or not theirs, and "bad request" when the id is not greater than zero.
- **FR-004**: Every error MUST be a problem document (`application/problem+json`) with a status and a detail. Validation errors MUST report every problem found, joined into the one detail text, not only the first.
- **FR-005**: A request without a valid session MUST get "unauthorized", never a redirect.
- **FR-006**: The session cookie MUST be named `__Host-favorites.session`, hidden from page scripts, sent only over a secure connection, restricted to same-site navigation, tamper-proof, and renewed on use. Its lifetime MUST be configurable in days.
- **FR-007**: Requests that change data MUST carry the CSRF proof in the header `X-CSRF-TOKEN`, matching the readable cookie `XSRF-TOKEN`. A missing or wrong proof MUST give "bad request" with the detail "Invalid or missing CSRF token."
- **FR-008**: The service MUST offer sign-in with each enabled provider (Google, Microsoft, Facebook) that has credentials, and MUST NOT list any other. A provider that is enabled without credentials MUST stop the service from starting outside development.
- **FR-009**: After sign-in the service MUST send the visitor only to a relative path of this site. A return address that is not a relative path (for example one that starts with `//` or `/\`, or names another site) MUST be replaced by the default page.
- **FR-010**: The service MUST create an account on first sign-in and recognize it on later sign-ins by provider and provider account. The rules for trusting the e-mail address of each provider MUST match the current ones.
- **FR-011**: The service MUST answer "who am I", refresh the session, and sign the visitor out, as the current service does.
- **FR-012**: The service MUST list, add and remove linked providers for the signed-in user. It MUST answer "conflict" when the provider account is already linked to a different user, when the provider is already linked to this account, and when removing it would leave no way to sign in. It MUST answer "not found" when removing a provider that is not linked, and "bad request" for an unsupported provider.
- **FR-013**: URLs, payload shapes, status codes, cookie names and header names MUST equal the current service's, so the web app needs no change.
- **FR-014**: The service MUST read and write the existing data store without changing its schema. Data written by the new service MUST be readable by the old one, and the other way round.
- **FR-015**: The service MUST publish a machine-readable contract of its operations, and for the favorites operations it MUST match the current one except for differences the owner has accepted in writing.
- **FR-016**: The switch MUST be reversible: a runbook MUST describe the steps, the smoke checks and the rollback, and the old service MUST stay deployable until the new one is verified in production.
- **FR-017**: Secrets MUST come only from configuration. A missing or invalid required setting MUST make the service fail visibly.
- **FR-018**: Automated tests MUST cover the scenarios above at the right boundary (constitution, Principle III), MUST run on every pull request, and MUST report at least 80% coverage for this service.

### Key Entities *(include if feature involves data)*

- **User**: a person with an account; has a display name and an e-mail address (searchable, but the current data does not require it to be unique).
- **Favorite**: a user's saved resource, identified by user, resource type and resource number (unique together), with a creation time.
- **Linked provider (external login)**: a provider account (provider and provider's id for the person) that belongs to one user; unique across all users.
- **Session**: the proof that a visitor signed in; carries the internal user id.
- **CSRF proof**: a value the browser must send back on every change, to show the request came from this app.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the behavior scenarios in the current favorites, error-handling and authorization tests (the `FavoriteEndpointsTests`, `ApiErrorTests` and `AuthorizationWiringTests` suites and the three validators' tests) pass against the new service.
- **SC-002**: A comparison of the old and new contracts for the favorites operations shows no difference that the owner has not accepted.
- **SC-003**: A visitor can add, list and remove a favorite in the web app, and the web app's favorites tests pass, with no change to the web app's favorites client code.
- **SC-004**: Across the switch, 0 favorites are lost or changed: the count per user before equals the count after.
- **SC-005**: Switching back to the old service takes under 15 minutes.
- **SC-006**: At the switch each visitor signs in once more, and never meets another visitor's data.
- **SC-007**: The new service's tests report at least 80% coverage.

## Assumptions

Items marked **To confirm** rest on an assumption, not on an answer from the owner, and need one before planning is approved.

- The target is Python with FastAPI; this comes from the request. Which libraries, drivers and tools to use is decided in the plan (research step), not here.
- **To confirm**: every visitor signs in again at the switch, because the old session cookie is encrypted with a mechanism the new service cannot read. This is accepted as the cost of the migration.
- The data store stays SQL Server with the current schema, and the schema stays owned by the current migrations until the old service is removed.
- Both services may point at the same database during the parallel run; only one receives production traffic at a time.
- **To confirm**: the rollback target is 15 minutes (SC-005).
- **To confirm**: the old service is removed only after the new one has served production for 14 days without a rollback.
- Scope split: the first sprint covers User Stories 1 and 2 (with a test session); the second covers 3, 4 and 5.
- Out of scope: new features, visual changes, changing the database engine, and any service other than Favorites.
- Dependencies: the constitution exception in pull request #144 must be approved before planning; a CI check for the new service is tracked in issue #143.
