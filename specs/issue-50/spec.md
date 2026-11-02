# Feature Specification: 3D Multiverse Globe Map with Blue/Green Release

**Feature Branch**: `issue-50-3d-globe`

**Created**: 2026-11-02

**Status**: Draft

**Input**: Issue #50 — "Add a 3D map view of the multiverse dimensions. It must look like Earth in Google Earth: a spherical globe with a real Earth texture that the user can rotate, zoom, and explore, with the dimensions/locations placed on it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore locations on a 3D globe (Priority: P1)

A user opens the 3D map and sees a spherical Earth-like globe with a real Earth texture, an atmospheric glow and a starry background. Each loaded location is a marker on the globe. The user rotates, zooms and tilts the globe, then selects a marker to read the location's details.

**Why this priority**: This is the feature itself.

**Independent Test**: With the feature enabled, open the 3D map with location data loaded; verify the globe, markers, navigation and detail panel.

**Acceptance Scenarios**:

1. **Given** the feature is enabled and locations are loaded, **When** the user opens the 3D map, **Then** a globe with a real Earth texture, atmosphere glow and starry background is shown with one marker per loaded location.
2. **Given** the globe is shown, **When** the user drags or scrolls the mouse wheel, **Then** the globe rotates and zooms; tilting is also possible.
3. **Given** a touch device, **When** the user drags with one finger or pinches, **Then** the globe rotates or zooms respectively.
4. **Given** the same location, **When** the view is rendered on different visits or devices, **Then** its marker is always at the same position on the globe.
5. **Given** a marker, **When** the user selects it, **Then** the existing location detail panel opens for that location.

---

### User Story 2 - Switch between 2D and 3D maps (Priority: P2)

A user can move between the existing 2D multiverse map and the 3D globe. The 2D map is unchanged.

**Why this priority**: The two views must coexist; the 3D view is additive.

**Independent Test**: With the feature enabled, switch 2D → 3D → 2D and verify the 2D map behaves as before.

**Acceptance Scenarios**:

1. **Given** the feature is enabled, **When** the user opens the multiverse map, **Then** a control lets them choose 2D or 3D.
2. **Given** the user chose 2D, **Then** the 2D map is identical to today's.

---

### User Story 3 - Graceful loading, error, empty and no-WebGL states (Priority: P2)

The 3D view shows loading, error and empty states consistent with the rest of the app, and an accessible fallback when WebGL is unavailable.

**Why this priority**: Constitution principle V requires understandable failures.

**Independent Test**: Simulate pending, failing and empty data and a missing WebGL context.

**Acceptance Scenarios**:

1. **Given** data is loading / fails / is empty, **Then** the existing loading, error and empty states are shown.
2. **Given** WebGL is unavailable, **Then** an accessible text fallback is shown that explains the situation and offers the 2D map.

---

### User Story 4 - Release safely with Blue/Green and a feature flag (Priority: P1)

An operator ships the code through a Blue/Green deployment with the feature off, verifies the new environment, swaps traffic, and later turns the feature on (and off again) without a new build or deployment of code. A rollback swaps traffic back.

**Why this priority**: The requester made Blue/Green plus a feature flag the required release mechanism, and none exists today.

**Independent Test**: Run the deploy workflow against the inactive environment, verify, swap, then flip the flag on and off.

**Acceptance Scenarios**:

1. **Given** the flag is off (default), **Then** the app behaves exactly as it does today, with no 3D UI and no 3D code downloaded.
2. **Given** a new version, **When** the deploy workflow runs, **Then** it deploys to the inactive environment, verifies it, and only then swaps traffic.
3. **Given** a bad release, **When** the operator swaps again, **Then** traffic returns to the previous environment.
4. **Given** the code is live with the flag off, **When** the operator turns the flag on or off, **Then** the behavior changes without building a new image; turning it off is the immediate rollback for the feature.

### Edge Cases

- Location data is empty or partially loaded.
- Many locations map to nearby points: markers remain individually selectable.
- Texture fails to load: the globe falls back gracefully and the user is informed.
- Configuration for the flag is missing or malformed: the flag is off.
- Low-end mobile devices: the view remains usable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a 3D globe view with a real Earth texture, atmosphere/glow and starry background.
- **FR-002**: The texture and any other new assets MUST carry a compatible free license, with attribution documented.
- **FR-003**: Users MUST be able to rotate, zoom and tilt the globe with mouse (drag/wheel) and touch (drag/pinch).
- **FR-004**: Each loaded location MUST appear as a marker at a deterministic position computed by a pure function covered by unit tests.
- **FR-005**: Selecting a marker MUST open the existing location detail panel.
- **FR-006**: The view MUST show the existing loading, error and empty states.
- **FR-007**: Users MUST be able to switch between 2D and 3D maps; the 2D map MUST remain unchanged.
- **FR-008**: The 3D view MUST be behind a feature flag that is off by default; with the flag off the app MUST behave exactly as today.
- **FR-009**: The flag MUST be changeable independently of the code release, without building a new image, and MUST be able to be turned off as a rollback.
- **FR-010**: An accessible fallback MUST be shown when WebGL is unavailable.
- **FR-011**: The 3D library MUST be lazy-loaded so the initial bundle does not grow.
- **FR-012**: Blue/Green infrastructure MUST be defined in `infra/` as Bicep, organized in modules, with two environments and a traffic-swap mechanism.
- **FR-013**: Workflows MUST deploy to the inactive environment, verify it, then swap traffic; rollback MUST be done by swapping again.
- **FR-014**: The existing canary workflow and its runbook are replaced by the Blue/Green workflows and documentation.
- **FR-015**: The Blue/Green procedure and the flag activation/rollback steps MUST be documented.
- **FR-016**: Infrastructure changes MUST be validated (Bicep build) and MUST NOT introduce secrets into the repository.
- **FR-017**: No backend changes; the same location data as the 2D map is used.

### Key Entities

- **Location**: Existing entity from the current 2D map data; gains a derived, deterministic globe position (latitude/longitude).
- **Feature flag**: A named on/off switch for the 3D view, default off.
- **Environment (Blue/Green)**: One of two deployable environments; one is live, the other inactive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the flag on, 100% of loaded locations are shown as markers, each at the same position across repeated renders (verified by unit tests).
- **SC-002**: Rotate, zoom and tilt work with mouse and touch on desktop and mobile.
- **SC-003**: With the flag off, the initial JavaScript bundle size does not increase and no 3D code is requested.
- **SC-004**: Selecting any marker opens its location detail.
- **SC-005**: Loading, error, empty and no-WebGL states are each demonstrably shown.
- **SC-006**: 2D ↔ 3D switching works and the 2D map's existing tests pass unchanged.
- **SC-007**: A release reaches production with the flag off; the flag is then flipped on and off without building a new image; rollback of code is a single traffic swap.
- **SC-008**: Bicep builds without errors, and no secrets are present in the repository.
- **SC-009**: Texture license and attribution are documented.
- **SC-010**: Frontend tests, lint and production build pass.

## Assumptions

- The flag is supplied as `.env`-style `FEATURE_*` variables read at container start (confirmed direction by the requester; "suggestions" requested and approved).
- Blue/Green runs on Azure Container Apps (confirmed).
- `three`, `@react-three/fiber` and `@react-three/drei` are acceptable (confirmed); the NASA Blue Marble texture is public domain (confirmed).
- The existing canary workflow is deleted (confirmed).
- Bicep is organized in modules (confirmed); `infra/appservice.bicep` is not part of this feature.
- Flag change is fast but not strictly instant, because a Container Apps env change creates a new revision.

## Issue Reconciliation

Criteria from the issue were kept. Tightened: "immediate rollback" is made measurable by SC-007 (no image build); "no bloat" is measurable by SC-003.
