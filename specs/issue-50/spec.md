# Feature Specification: 3D Multiverse Globe Map

**Feature Branch**: `issue-50-3d-globe`
**Created**: 2026-11-02
**Status**: Draft (awaiting human review)
**Input**: Issue #50 — "a 3D map of the dimensions, the look must be like Earth in Google Earth."

## User Scenarios & Testing

### User Story 1 - Explore locations on a 3D globe (Priority: P1)

A visitor opens the 3D map and sees a spherical globe with a real Earth texture, atmosphere glow and a starry background. Every loaded location is a marker on the globe. Selecting a marker opens the existing location detail panel.

**Why this priority**: Core value of the request.
**Independent Test**: Open the 3D view with mocked location data; markers render and selecting one opens `LocationDetailPanel`.

**Acceptance Scenarios**:
1. **Given** locations are loaded, **When** the 3D view opens, **Then** one marker per location is shown at a deterministic position (same location → same position on every load).
2. **Given** a marker, **When** the user selects it, **Then** `LocationDetailPanel` opens for that location.
3. **Given** data is loading / failed / empty, **Then** `LoadingPortal` / `ErrorState` (with retry) / `EmptyState` are shown.

### User Story 2 - Navigate with mouse and touch (Priority: P1)

**Acceptance Scenarios**:
1. **Given** a desktop browser, **When** the user drags / scrolls / tilts, **Then** the globe rotates / zooms / tilts.
2. **Given** a touch device, **When** the user drags / pinches, **Then** the globe rotates / zooms.

### User Story 3 - Switch between 2D and 3D (Priority: P2)

**Acceptance Scenarios**:
1. **Given** the 3D flag is on, **When** the user uses the 2D/3D switch on the Multiverse Map view, **Then** the chosen view is shown; the 2D map is unchanged.
2. **Given** the flag is off (default), **Then** no 3D control, code path or network request for 3D assets exists and the app behaves exactly as today.

### User Story 4 - Graceful fallback (Priority: P2)

**Acceptance Scenarios**:
1. **Given** WebGL is unavailable, **Then** an accessible message (text, role/aria) is shown with a way back to the 2D map.

### User Story 5 - Safe release via Blue/Green and flag (Priority: P1)

**Acceptance Scenarios**:
1. **Given** the code is merged, **Then** it is deployed to the inactive Blue/Green environment, verified, then traffic is swapped; rollback is another swap.
2. **Given** the release shipped with the flag off, **Then** the flag can be turned on later without a redeploy of code and turned off immediately (see Open Decision D1).
3. **Given** the procedure, **Then** it is documented beside `docs/canary-deployment.md`.

### Edge Cases
- Zero / one / thousands of locations; duplicate ids; locations with missing fields.
- Context loss or WebGL init failure at runtime (not only at start).
- `prefers-reduced-motion`: no auto-rotation.
- Texture fails to load: globe falls back to a flat-colour sphere, markers still work.
- Keyboard users: markers reachable through an accessible list/alternative (no pointer-only interaction).

## Requirements

### Functional Requirements
- **FR-001**: Render a 3D globe with real Earth texture, atmosphere glow and starfield.
- **FR-002**: Support rotate, zoom and tilt via mouse and touch.
- **FR-003**: Place one marker per location using a pure deterministic function (id → lat/lon → 3D point) with unit tests.
- **FR-004**: Selecting a marker opens `LocationDetailPanel`.
- **FR-005**: Reuse `LoadingPortal`, `ErrorState`, `EmptyState`.
- **FR-006**: Provide 2D/3D switching without modifying 2D map behaviour.
- **FR-007**: Gate the 3D view behind a feature flag, default off, via the existing feature-flag strategy chain.
- **FR-008**: Show an accessible WebGL-unavailable fallback.
- **FR-009**: Lazy-load the 3D library and texture so the initial bundle is unaffected.
- **FR-010**: Use only freely licensed texture/assets; document attribution.
- **FR-011**: Define Blue/Green infrastructure in `infra/` (Bicep) and deploy/verify/swap/rollback workflows in `.github/workflows/`; no secrets committed.
- **FR-012**: Document Blue/Green and flag activation/rollback.

### Key Entities
- **Location**: existing type (`frontend/src/types/location.ts`); no change.
- **GlobePoint**: derived `{lat, lon, position}`; not persisted.

## Success Criteria
- **SC-001**: With the flag off, existing frontend tests pass unchanged and the main bundle does not include the 3D library.
- **SC-002**: Marker position function returns identical output for identical input and finite, on-sphere points for all inputs (unit-tested).
- **SC-003**: Frontend `npm run lint`, `npm test` and `npm run build` pass.
- **SC-004**: With the flag on, 100% of loaded locations are represented and selectable.
- **SC-005**: `az bicep build` succeeds for every changed Bicep file; secret scan finds nothing new.
- **SC-006**: A Blue/Green run deploys to the inactive environment, passes a smoke check, swaps traffic; a second swap restores the prior state.
- **SC-007**: Texture/library licenses are listed with attribution in the docs.

## Assumptions
- Same location data as the 2D map; no backend changes.
- Switch is an in-view 2D/3D toggle inside the Multiverse Map view (planner choice).
- Texture: NASA Blue Marble / Natural Earth-style public-domain imagery (to be license-verified at implementation).

## Open Decisions (see plan.md)
- **D1**: The existing flag mechanism is build-time (`VITE_FEATURE_*`), so flipping it needs a rebuild/redeploy, which conflicts with "turn on independently of deployment, off immediately". A runtime flag source is needed.
- **D2**: The repo deploys to Azure Container Apps (`infra/main.bicep`, `cd.yml`); `infra/appservice.bicep` is a separate file named in scope. Which platform hosts Blue/Green?
