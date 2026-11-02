# Feature Specification: 3D Multiverse Globe Map

**Feature Branch**: `agent-plan/issue-50`

**Created**: 2026-11-02

**Status**: Draft (planned, awaiting human review)

**Input**: Issue #50 — "a 3D map of the dimensions, the look must be like Earth in Google Earth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore locations on a 3D globe (Priority: P1)

A visitor opens the 3D map and sees a realistic Earth-like globe, with an
atmosphere glow and a starry background, with every loaded location shown as a
marker. They rotate, zoom and tilt it, pick a marker, and read the location's details.

**Why this priority**: This is the feature itself.

**Independent Test**: With the 3D flag on, open the 3D map, interact with the globe, select a marker and see the location detail panel.

**Acceptance Scenarios**:

1. **Given** the flag is on and locations load, **When** the user opens the 3D map, **Then** a textured globe with atmosphere and starfield is shown with one marker per location.
2. **Given** the globe is shown, **When** the user drags/scrolls with a mouse or drags/pinches by touch, **Then** the globe rotates, zooms and tilts.
3. **Given** the globe is shown, **When** the user selects a marker, **Then** `LocationDetailPanel` opens for that location and can be closed.
4. **Given** the same location data, **When** the globe is opened repeatedly or on different devices, **Then** every location appears at the same position.
5. **Given** locations are loading, fail to load, or are empty, **When** the 3D map is opened, **Then** `LoadingPortal`, `ErrorState` (with retry) or `EmptyState` is shown respectively.

---

### User Story 2 - Switch between 2D and 3D maps (Priority: P1)

A visitor can move between the existing 2D map and the 3D globe without leaving the Multiverse Map view; the 2D map is unchanged.

**Independent Test**: Toggle between the two and confirm the 2D map renders exactly as before.

**Acceptance Scenarios**:

1. **Given** the flag is on, **When** the user is on the Multiverse Map view, **Then** an accessible 2D/3D switch is offered and works by mouse, touch and keyboard.
2. **Given** the flag is off, **When** the user uses the app, **Then** no 3D control, 3D code request or 3D asset request occurs and behavior is identical to today.

---

### User Story 3 - Degrade gracefully without WebGL (Priority: P2)

A visitor whose browser lacks WebGL sees an accessible explanation and the 2D map remains reachable.

**Acceptance Scenarios**:

1. **Given** WebGL is unavailable, **When** the user opens the 3D map, **Then** an accessible message (screen-reader announced) is shown with a way to use the 2D map, and no crash occurs.

---

### User Story 4 - Release safely with Blue/Green and a runtime flag (Priority: P1)

A maintainer ships the code to the inactive Blue/Green environment with the flag off, verifies it, swaps traffic, and later turns the flag on (or off) without rebuilding or redeploying the image. Rollback is a traffic swap.

**Acceptance Scenarios**:

1. **Given** a merged change, **When** the CD workflow runs, **Then** it deploys to the inactive environment, verifies it, and only then swaps traffic (manual approval-gated).
2. **Given** a bad release, **When** the maintainer runs the swap again, **Then** traffic returns to the previous environment.
3. **Given** the deployed image, **When** the flag variable is changed through the flag workflow, **Then** the 3D feature turns on/off with no image rebuild; a missing or invalid value means off.
4. **Given** the procedures, **When** a maintainer reads the docs, **Then** the Blue/Green, flag activation and rollback steps are documented.

### Edge Cases

- Duplicate or very many locations (all pages are loaded): markers stay distinct enough to select; performance remains usable.
- Locations with missing/odd ids: placement stays deterministic and never produces NaN.
- Texture fails to load: the globe degrades to an error/fallback state instead of a blank canvas.
- `/config.json` missing, malformed or unreachable: all flags fall back to off.
- Reduced-motion preference: no auto-rotation.
- Small touch screens: gestures do not trap page scrolling outside the globe.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a 3D globe view with a real Earth texture, atmosphere/glow and starry background.
- **FR-002**: The user MUST be able to rotate, zoom and tilt the globe by mouse (drag/wheel) and touch (drag/pinch).
- **FR-003**: Each loaded location MUST appear as a marker at a position computed by a pure, deterministic function of stable location data (covered by unit tests).
- **FR-004**: Selecting a marker MUST open `LocationDetailPanel` for that location.
- **FR-005**: The view MUST reuse `LoadingPortal`, `ErrorState` and `EmptyState` for loading, error and empty states, using the same location data as the 2D map.
- **FR-006**: Users MUST be able to switch between 2D and 3D maps; the 2D map MUST remain unchanged.
- **FR-007**: The 3D view MUST be controlled by a feature flag that is off by default; with it off, behavior MUST be identical to today.
- **FR-008**: The flag MUST be changeable at runtime, independently of an image build/deploy, MUST fail closed, and MUST accept `.env`-style `FEATURE_*` variables as the source (decision of the requester).
- **FR-009**: The 3D library and Earth texture MUST be loaded lazily, only when the 3D view is opened, so the initial bundle does not grow materially.
- **FR-010**: An accessible fallback MUST be shown when WebGL is unavailable.
- **FR-011**: Texture and other assets MUST carry a compatible free license; attribution MUST be documented in the repo.
- **FR-012**: Blue/Green infrastructure on Azure Container Apps MUST be defined in `infra/` as Bicep **modules**, with two environments (blue, green) and a traffic-swap mechanism.
- **FR-013**: Workflows MUST deploy to the inactive environment, verify it, then swap traffic; rollback MUST be a repeat swap. The existing canary deployment workflow is removed and replaced (requester decision).
- **FR-014**: Code MUST ship with the flag off; a workflow MUST allow turning the flag on or off independently of deployment.
- **FR-015**: Blue/Green, flag activation and rollback procedures MUST be documented, replacing/superseding `docs/canary-deployment.md`.
- **FR-016**: `infra/` changes MUST be validated (`az bicep build`) and MUST NOT contain secrets.
- **FR-017**: The 3D dependency choice MUST be justified in the PR.
- **FR-018**: No backend changes are made.

### Key Entities

- **Location**: existing entity from the Rick and Morty API (id, name, type, dimension, residents); source of markers.
- **Globe marker**: a location plus its deterministic spherical position (latitude/longitude).
- **Feature flag**: named boolean (new: 3D globe) resolved from runtime config with a fail-closed default.
- **Deployment slot**: blue or green revision of the container app; exactly one is live.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the flag on, a user reaches the 3D globe from the Multiverse Map view and opens a location's detail by selecting a marker, using mouse or touch.
- **SC-002**: For identical inputs the position function returns identical output across runs; unit tests cover determinism, bounds (valid lat/lon, unit-sphere points), distinctness for distinct ids and edge ids.
- **SC-003**: With the flag off, no 3D chunk or texture is requested and existing frontend tests pass unchanged.
- **SC-004**: The initial JS bundle size does not increase by more than the small switching code; the 3D library lives in a separate lazy chunk (verified from build output).
- **SC-005**: `npm run lint`, `npm test` and `npm run build` in `frontend/` pass; new tests cover the position function, runtime flag strategy (valid, invalid, missing config), WebGL fallback, view switching and the three data states.
- **SC-006**: `az bicep build` succeeds for `infra/main.bicep` and its modules, and a secret scan of the diff finds none.
- **SC-007**: The deploy workflow performs deploy-to-inactive → smoke test → swap, and a repeat swap restores the previous environment; both are demonstrated in documentation of a runbook.
- **SC-008**: Flipping the flag via workflow changes behavior without a new image build; an invalid value results in the feature being off.
- **SC-009**: Docs list Blue/Green, flag-on and flag-off/rollback steps, and a third-party attributions file names the texture's source and license.

## Assumptions

- Same location data and fetching as the 2D map; no backend change (from issue).
- Library: `three` + `@react-three/fiber` + `@react-three/drei`; texture: NASA Blue Marble (public domain) — confirmed by the requester.
- Platform: Azure Container Apps with revision labels `blue`/`green` — confirmed by requester.
- Flag source: `.env`-style `FEATURE_*` variables read at container start and served as `/config.json`; flipping them on Container Apps creates a new revision, so it is fast but not strictly instant — confirmed by requester.
- The existing canary workflow/runbook is deleted and replaced — requester decision.
- Switch placement (2D/3D toggle inside the Multiverse Map view) is a planner decision, subject to review.

## Reconciliation with issue acceptance criteria

All issue criteria are carried into the Functional Requirements and Success Criteria above. Additions beyond the issue's literal text (flagged for reviewer): SC-004 makes the "does not bloat the bundle" criterion measurable; reduced-motion and texture-failure edge cases; fail-closed flag behavior; replacement of the canary workflow and docs (from issue comments).
