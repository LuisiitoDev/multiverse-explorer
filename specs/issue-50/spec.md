# Feature Specification: 3D Multiverse Globe Map with Blue/Green Release

**Feature Branch**: `issue-50-3d-globe-map`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Add a 3D map view of the multiverse dimensions. It must look like Earth in Google Earth: a spherical globe with a real Earth texture that the user can rotate, zoom, and explore, with the dimensions/locations placed on it." Source: GitHub issue #50 and the requester's clarification comments (flag source = `.env`-style runtime configuration; Blue/Green on Azure Container Apps; library and texture confirmed; the existing canary workflow will be deleted).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore locations on a 3D globe (Priority: P1)

A visitor opens the 3D map and sees a spherical Earth-textured globe with an atmosphere glow against a starry background. Every location from the same data as the 2D map appears as a marker. They rotate, zoom and tilt the globe and select a marker to read the location's details.

**Why this priority**: This is the feature itself.

**Independent Test**: With the 3D view enabled, open it, drag/zoom/tilt, select a marker and confirm the location detail panel opens.

**Acceptance Scenarios**:

1. **Given** the 3D view is enabled and locations have loaded, **When** the visitor opens it, **Then** a globe with a real Earth texture, atmosphere glow and starry background is shown with one marker per location.
2. **Given** the globe is shown, **When** the visitor drags or scrolls with a mouse, **Then** the globe rotates and zooms; tilting is also possible.
3. **Given** the globe is shown on a touch device, **When** the visitor drags and pinches, **Then** the globe rotates and zooms.
4. **Given** the globe is shown, **When** the visitor selects a marker, **Then** the existing location detail panel opens for that location.
5. **Given** the same set of locations, **When** the view is opened on different occasions or devices, **Then** every location appears at the same position on the globe.
6. **Given** locations are loading, fail to load, or none exist, **When** the view is open, **Then** the existing loading, error (with retry) and empty states are shown respectively.

---

### User Story 2 - Switch between 2D and 3D maps (Priority: P2)

A visitor can move between the existing 2D Multiverse Map and the new 3D map. The 2D map is unchanged.

**Why this priority**: The 3D view must coexist with, not replace, the current map.

**Independent Test**: With the flag on, switch 2D → 3D → 2D and confirm the 2D map behaves exactly as before.

**Acceptance Scenarios**:

1. **Given** the 3D feature is enabled, **When** the visitor is on the Multiverse Map, **Then** a control lets them switch between 2D and 3D.
2. **Given** the visitor switches back to 2D, **Then** the 2D map renders and behaves exactly as it does today.
3. **Given** the 3D feature is disabled, **Then** no 3D control, 3D code or 3D assets are reachable and the app behaves exactly as it does today.

---

### User Story 3 - Graceful fallback without WebGL (Priority: P2)

A visitor whose browser or device cannot render 3D graphics still gets a usable, accessible experience.

**Why this priority**: Prevents a broken or blank page for unsupported devices.

**Independent Test**: Simulate missing WebGL; confirm an accessible message with a path to the 2D map is shown.

**Acceptance Scenarios**:

1. **Given** WebGL is unavailable, **When** the 3D view is opened, **Then** an accessible message explains that 3D is unavailable and offers the 2D map.
2. **Given** the 3D view fails while rendering, **Then** the same fallback is shown rather than a blank or crashed page.

---

### User Story 4 - Release the feature dark via Blue/Green and a flag (Priority: P1)

A maintainer ships the code to production using a Blue/Green deployment with the feature flag off, verifies the new environment, swaps traffic, and later turns the flag on independently of any deployment. The flag can be turned off immediately as a rollback, and a bad deployment is rolled back by swapping traffic again.

**Why this priority**: The requester made controlled release a hard requirement; the infrastructure and workflows do not exist today.

**Independent Test**: Run the deploy workflow to the inactive environment, confirm verification passes, swap, confirm production serves the new version with the flag off; flip the flag on and off without a deployment; swap back and confirm rollback.

**Acceptance Scenarios**:

1. **Given** one environment is live, **When** the deploy workflow runs, **Then** the new version is deployed only to the inactive environment, which receives no production traffic.
2. **Given** the inactive environment is deployed, **When** verification fails, **Then** traffic is not swapped and the live environment is unaffected.
3. **Given** verification passes and a human triggers the swap, **Then** production traffic moves to the new environment and the previous one remains available.
4. **Given** a swap has happened, **When** the maintainer swaps again, **Then** traffic returns to the previous environment.
5. **Given** the code is live with the flag off, **When** the maintainer turns the flag on (or off), **Then** the 3D view appears (or disappears) without building or deploying a new image.
6. **Given** the procedure is documented, **Then** the Blue/Green steps, flag activation and rollback steps are described next to the existing deployment docs.

---

### Edge Cases

- Locations whose identifiers are missing, duplicate or non-finite must not crash the layout; they must still get a valid, deterministic position or be reported (not silently dropped).
- Very large location sets must remain navigable and selectable (markers not unusably overlapping).
- The flag value is missing, malformed or unreachable: the feature stays off.
- Reduced-motion preference: auto-rotation or animated effects must respect it.
- Keyboard-only and screen-reader users must have a non-pointer way to reach location details (for example the existing location list/2D map).
- Texture fails to load: a visible error/fallback state, not a blank sphere.
- Flag turned off while a visitor is on the 3D view: next load shows the unchanged app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a 3D globe view with a real Earth texture, atmosphere/glow and starry background.
- **FR-002**: Users MUST be able to rotate, zoom and tilt the globe with mouse (drag/wheel) and touch (drag/pinch).
- **FR-003**: The system MUST show one marker per loaded location, placed by a pure, deterministic function of the location's stable data, with unit tests.
- **FR-004**: Selecting a marker MUST open the existing location detail panel.
- **FR-005**: The view MUST reuse the existing loading, error and empty states.
- **FR-006**: Users MUST be able to switch between the 2D and 3D maps; the 2D map MUST remain unchanged.
- **FR-007**: The 3D view MUST be controlled by a feature flag that is off by default; with it off, behavior MUST be identical to today.
- **FR-008**: The flag MUST be changeable via `.env`-style configuration without rebuilding the application image, so it can be turned on and off independently of a deployment.
- **FR-009**: The system MUST show an accessible fallback when WebGL is unavailable or rendering fails.
- **FR-010**: The Earth texture and any other new assets MUST have a compatible free license, with attribution documented.
- **FR-011**: The 3D rendering dependency MUST be justified and loaded only when the 3D view is used, so it does not enlarge the initial bundle.
- **FR-012**: Blue/Green infrastructure MUST be defined as code in `infra/` on Azure Container Apps with two environments (blue/green) and a traffic-swap mechanism.
- **FR-013**: Workflows MUST deploy to the inactive environment, verify it, and then swap traffic; rollback MUST be a swap back.
- **FR-014**: The existing canary deployment workflow, infrastructure and documentation MUST be removed/replaced by the Blue/Green equivalents (requester decision), without breaking the CI pipeline.
- **FR-015**: Blue/Green procedure, flag activation and flag rollback MUST be documented.
- **FR-016**: Infrastructure changes MUST be validated and MUST NOT introduce secrets into the repository.
- **FR-017**: No backend changes are made; location data comes from the same source as the 2D map.

### Key Entities

- **Location**: Existing entity (id, name, type, dimension, residents); the source of each marker.
- **Globe marker**: A location paired with a deterministic surface position (latitude/longitude).
- **Feature flag**: A named on/off switch for the 3D view, default off, sourced from runtime configuration.
- **Deployment environment (blue/green)**: One of two interchangeable production-capable environments; exactly one receives production traffic at a time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the flag on, 100% of loaded locations appear as selectable markers, and selecting any one opens its detail panel.
- **SC-002**: Marker positions for the same input are identical across repeated runs (verified by automated unit tests, including empty, single, large and duplicate-input cases).
- **SC-003**: Rotate, zoom and tilt work with mouse and with touch on a mobile viewport (verified manually on a touch device or emulation; interaction wiring covered by automated tests where feasible).
- **SC-004**: With the flag off (default), the production bundle's initial load includes no 3D library code and no Earth texture request, and existing frontend tests pass unchanged.
- **SC-005**: With WebGL unavailable, the fallback message is shown and the 2D map is reachable within one interaction (automated test).
- **SC-006**: Loading, error and empty states are each demonstrated by automated tests.
- **SC-007**: Toggling the flag on/off takes effect with zero image rebuilds, and the 3D view is hidden again after turning it off.
- **SC-008**: A Blue/Green deploy never routes production traffic to an unverified environment, and a swap-back restores the previous version (demonstrated by workflow run evidence or documented dry run).
- **SC-009**: The infrastructure templates compile without errors (`az bicep build`) and a secret scan of the diff finds no credentials.
- **SC-010**: Frontend lint, tests and production build pass; attribution for each new asset is present in documentation.

## Assumptions

- **A1**: "`.env` file" is interpreted as `.env`-style `FEATURE_*` variables read when the container starts and exposed to the browser at runtime, because build-time `VITE_*` values cannot be changed without a rebuild and so cannot meet FR-008 (confirm in review).
- **A2**: The 3D view shares the 2D map's location data source; there are no backend or API contract changes.
- **A3**: The 2D/3D switch lives inside the Multiverse Map view (planner decision).
- **A4**: The existing canary workflow/docs are deleted and replaced, per the requester's comment.
- **A5**: Azure Container Apps, the confirmed 3D library and a public-domain Earth texture are used, as confirmed by the requester.
- **A6**: Location-to-globe placement is an arbitrary but stable mapping (the Rick and Morty data has no real geographic coordinates).
