# Feature Specification: 3D Multiverse Globe Map

**Feature Branch**: `issue-50`
**Created**: 2026-11-02
**Status**: Draft
**Input**: Issue #50 — "a 3D map of the dimensions, the look must be like Earth in Google Earth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore locations on a 3D globe (Priority: P1)

A visitor opens the 3D map and sees a spherical globe with a real Earth appearance, an atmospheric glow and a starry background. Every known location is shown as a marker on the globe. The visitor can rotate, zoom and tilt the globe, and select a marker to read the location's details.

**Why this priority**: This is the core value requested.

**Independent Test**: Open the 3D view with location data available; a globe with markers appears and a marker selection opens the location detail.

**Acceptance Scenarios**:

1. **Given** locations have loaded, **When** the 3D view opens, **Then** a globe with a real Earth texture, atmosphere glow and starry background is shown with one marker per location.
2. **Given** the globe is shown, **When** the user drags, scrolls the wheel or tilts with a mouse, **Then** the globe rotates, zooms and tilts.
3. **Given** a touch device, **When** the user drags and pinches, **Then** the globe rotates and zooms.
4. **Given** the same location, **When** the view is opened repeatedly or on different devices, **Then** its marker is always at the same position on the globe.
5. **Given** a marker, **When** the user selects it, **Then** the existing location detail panel opens for that location.

---

### User Story 2 - Resilient states and fallback (Priority: P1)

The visitor always gets an understandable outcome: loading, error (with retry), empty, and an accessible text alternative when the device cannot render 3D graphics.

**Independent Test**: Simulate slow, failing and empty data and a missing 3D capability; each shows the appropriate state.

**Acceptance Scenarios**:

1. **Given** data is loading, **When** the view is shown, **Then** the loading indicator is displayed.
2. **Given** loading fails, **Then** an error state with a retry action is shown.
3. **Given** no locations exist, **Then** the empty state is shown.
4. **Given** WebGL is unavailable, **Then** an accessible fallback message is shown that offers the 2D map and the location list is still reachable.

---

### User Story 3 - Switch between 2D and 3D (Priority: P2)

The visitor can switch between the existing 2D map and the new 3D map. The 2D map is unchanged.

**Independent Test**: With the flag on, switch 2D → 3D → 2D; the 2D map behaves as before.

**Acceptance Scenarios**:

1. **Given** the 3D feature is enabled, **When** the user opens the map section, **Then** a clearly labelled control lets them choose 2D or 3D.
2. **Given** the 3D feature is disabled (default), **Then** no 3D control, view or 3D asset download occurs and the app behaves exactly as before.

---

### User Story 4 - Controlled, reversible release (Priority: P1)

An operator ships the code to the inactive Blue/Green environment with the 3D feature off, verifies it, swaps traffic, and later turns the feature on independently of any deployment. The feature can be turned off immediately, and a bad release is rolled back by swapping traffic again.

**Independent Test**: Run the documented procedure on a non-production target; each step has an observable check.

**Acceptance Scenarios**:

1. **Given** a merge to main, **When** the release workflow runs, **Then** the new version is deployed to the inactive environment, verified, and only then traffic is swapped.
2. **Given** a released version, **When** the operator swaps traffic again, **Then** the previous version serves users.
3. **Given** the feature is off in production, **When** the operator turns it on through configuration, **Then** it becomes available without building a new application image.
4. **Given** the feature is on, **When** the operator turns it off, **Then** users stop seeing it without a code deployment.

### Edge Cases

- Location data has zero, one, or many (hundreds) of locations; markers must remain distinguishable and selectable.
- Locations with identical names/types still get distinct, stable positions.
- Texture or 3D module fails to load (network error): an error/fallback is shown, not a blank screen.
- Reduced-motion preference: no continuous auto-rotation.
- Flag value missing or unparseable: treated as off.
- Keyboard-only users can reach the 2D/3D control, the retry action and a list alternative of locations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a 3D globe view with a real Earth texture, atmosphere glow and starry background.
- **FR-002**: The texture and any other visual assets MUST carry a free licence compatible with the project, and attribution MUST be documented.
- **FR-003**: Users MUST be able to rotate, zoom and tilt the globe with mouse and with touch.
- **FR-004**: Every loaded location MUST be shown as a marker at a deterministic position computed by a pure function of the location's stable data, with unit tests.
- **FR-005**: Selecting a marker MUST open the existing location detail panel.
- **FR-006**: The view MUST show the existing loading, error and empty states.
- **FR-007**: The 2D map MUST remain unchanged and users MUST be able to switch between 2D and 3D when the feature is on.
- **FR-008**: The 3D view MUST be controlled by a feature flag that is off by default; with it off, behaviour MUST be identical to today.
- **FR-009**: An accessible fallback MUST be shown when 3D rendering is unavailable.
- **FR-010**: The 3D capability MUST NOT increase the initial page load; it is fetched only when the 3D view is requested.
- **FR-011**: Blue/Green infrastructure with two environments and a traffic-swap mechanism MUST be defined as code in `infra/`.
- **FR-012**: Workflows MUST deploy to the inactive environment, verify it, then swap traffic; rollback MUST be a traffic swap.
- **FR-013**: The flag MUST be changeable (on and off) independently of deploying a new version, using configuration supplied to the running environment from an environment (`.env`-style) file/variable, with no secrets committed.
- **FR-014**: The Blue/Green procedure and the flag activation/rollback steps MUST be documented next to the existing canary runbook.
- **FR-015**: Existing frontend tests and lint MUST continue to pass, and new behaviour MUST have tests.

### Key Entities

- **Location**: existing entity (id, name, type, dimension, residents); no changes.
- **Globe marker**: a location paired with a deterministic position on the globe surface.
- **Feature flag**: named on/off switch for the 3D view, off by default.
- **Deployment environment (Blue/Green)**: two interchangeable environments, one live, one inactive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the flag on, a user can open the 3D globe, rotate/zoom/tilt it with mouse and touch, and open any location's detail from its marker.
- **SC-002**: The marker position function returns identical output for identical input across repeated calls, and distinct positions for distinct locations in the full data set, verified by unit tests.
- **SC-003**: With the flag off (default), the production bundle's initial load and all existing UI behaviour are unchanged; existing tests pass without modification of their expectations.
- **SC-004**: The 3D code and texture are not requested until the 3D view is opened (verified in build output/network inspection).
- **SC-005**: When 3D rendering is unavailable, an accessible fallback is shown (tested).
- **SC-006**: Loading, error and empty states each have a passing test.
- **SC-007**: Infra files compile (`az bicep build`) and contain no secrets; the workflow deploys to the inactive environment, verifies and swaps; a second swap restores the previous version (documented and exercised in a non-production run).
- **SC-008**: The flag can be turned on and off in the deployed environment without building a new image.
- **SC-009**: Licence and attribution for each asset are documented in the repository.
- **SC-010**: Frontend lint, tests and production build pass.

## Assumptions

- The same location data as the 2D map is used; no backend changes.
- Earth texture from public-domain NASA imagery is acceptable (confirmed by requester).
- The requester confirmed: runtime flag source is an environment (`.env`) file; Blue/Green platform is Azure Container Apps; the proposed 3D library and texture choices are accepted.
- Mobile/touch support is required.
