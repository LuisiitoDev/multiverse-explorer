# Feature Specification: 3D Map View of Dimensions

**Feature Branch**: `spec/126-3d-dimension-map`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: GitHub issue #126 "[Feature]: Add a 3D map view of dimensions alongside the 2D Multiverse Map" (requirements clarified with the author: Q1 A, Q2 A, Q3 A, Q4 A, Q5 A).

## Clarifications

### Session 2026-11-08

- Q: Which existing behavior must the 3D view reproduce? → A: Selecting a marker opens the same location details and residents as the 2D map (source: issue #126, acceptance criteria; existing behavior in `frontend/src/components/LocationDetailPanel.tsx`).
- Q: Where do 3D positions come from? → A: The API provides no coordinates, so positions are generated deterministically (source: issue #126; `frontend/src/utils/multiverseLayout.ts` header comment).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore locations in a 3D scene (Priority: P1)

A visitor on the Multiverse Map page switches to a 3D view, like a globe or space scene, where every location is a marker. They rotate and zoom the scene with mouse or touch and select a marker to see the location and its residents.

**Why this priority**: This is the core immersive experience the issue asks for.

**Independent Test**: Open the Multiverse Map, switch to 3D, rotate/zoom, select a marker and confirm the location details and residents appear.

**Acceptance Scenarios**:

1. **Given** locations are loaded, **When** the visitor switches to the 3D view, **Then** the same locations as the 2D map appear as markers in a 3D scene.
2. **Given** the 3D view is shown, **When** the visitor drags with a mouse or one finger, **Then** the scene rotates.
3. **Given** the 3D view is shown, **When** the visitor uses the mouse wheel or a pinch gesture, **Then** the scene zooms in and out.
4. **Given** the 3D view is shown, **When** the visitor selects a marker, **Then** the same location details and residents are shown as when selecting a node on the 2D map.
5. **Given** the same set of locations, **When** the 3D view is opened again or the page is reloaded, **Then** each marker is at the same position as before.

---

### User Story 2 - Toggle between 2D and 3D (Priority: P2)

A visitor switches between the 2D map and the 3D view with a toggle, seeing the same locations in both. The 2D map behaves as before.

**Why this priority**: The 3D view is a second view next to the 2D map, not a replacement.

**Independent Test**: Toggle 2D to 3D and back; confirm the same locations are present and every existing 2D map behavior still works.

**Acceptance Scenarios**:

1. **Given** the 2D map is shown, **When** the visitor chooses 3D, **Then** the 3D view replaces it and the toggle shows 3D as active.
2. **Given** the 3D view is shown, **When** the visitor chooses 2D, **Then** the 2D map is shown with its existing zoom, scrolling, node selection and details behavior unchanged.
3. **Given** a location is selected, **When** the visitor toggles the view, **Then** the toggle does not break the selection or the details display.

---

### User Story 3 - Reach every location from a keyboard-reachable list (Priority: P2)

A visitor who cannot use a pointer, or who finds markers hard to target on a touch screen, picks any location from a list that is reachable by keyboard, and it is selected as if its marker had been selected.

**Why this priority**: A 3D scene is not keyboard-accessible by itself; the list guarantees every location can be reached.

**Independent Test**: Using only the keyboard, tab to the list in the 3D view, choose each location and confirm its details open.

**Acceptance Scenarios**:

1. **Given** the 3D view is shown, **When** the visitor tabs through the page, **Then** the list of all locations can be reached and every location in it can be activated by keyboard.
2. **Given** a location is activated from the list, **When** it is selected, **Then** the same location details and residents are shown as for a marker selection and the marker is shown as active.

---

### User Story 4 - Clear handling of missing data and failures (Priority: P3)

A visitor sees understandable information for locations without a dimension, and the same loading, empty and error states as the 2D map.

**Why this priority**: Completeness and consistency with the existing view.

**Independent Test**: Provide locations with an empty dimension, an empty result and a failed request; compare with the 2D map.

**Acceptance Scenarios**:

1. **Given** a location has no `dimension` value, **When** it is shown in the 3D view (marker label, list), **Then** its marker and list labels read "Unknown dimension".
2. **Given** the locations are loading, empty, or failed to load, **When** the visitor is on the Multiverse Map, **Then** the loading, empty and error states (including retry) are the same as for the 2D map, in either view.

---

### Edge Cases

- Very large number of locations (all pages are loaded on the 2D map): all remain selectable via the markers and the list.
- A device or browser that cannot display the 3D scene: see FR-012.
- Visitor with a preference for reduced motion: see FR-013.
- Selecting a location, closing the details, and selecting another: works the same as 2D.
- Window resize or device rotation while the 3D view is shown: the scene resizes without losing the current view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Multiverse Map page MUST offer a 2D/3D toggle that switches between the existing 2D map and a new 3D view.
- **FR-002**: The 3D view MUST show every location shown on the 2D map as a marker in a 3D scene.
- **FR-003**: Visitors MUST be able to rotate and zoom the 3D scene with both mouse and touch input.
- **FR-004**: Selecting a marker MUST show the same location details and residents as selecting a node on the 2D map.
- **FR-005**: Marker positions MUST be generated deterministically from the location data, since the API provides no coordinates; the same locations MUST always produce the same positions.
- **FR-006**: The 3D view MUST provide a list of all locations that is reachable and operable by keyboard, and selecting a location from it MUST behave like selecting its marker.
- **FR-007**: A location without a `dimension` MUST display "Unknown dimension" in the 3D view's marker and list labels; the location details are the existing shared panel, which is unchanged (it shows "Unknown" for the dimension row, `frontend/src/components/LocationDetailPanel.tsx`).
- **FR-008**: Loading, empty and error states (including retry) MUST match the 2D map.
- **FR-009**: The 2D map MUST keep working as before.
- **FR-010**: The same set of locations MUST be used by both views.
- **FR-011**: The 3D view MUST work on desktop and mobile.
- **FR-012**: If the 3D scene cannot be displayed on the visitor's device, the visitor MUST be told so and MUST still be able to reach every location through the keyboard-reachable list.
- **FR-013**: The 3D view MUST respect the visitor's reduced-motion preference by not animating the scene on its own.

### Key Entities

- **Location**: Existing entity with name, type, dimension and resident links; unchanged.
- **3D marker**: A location's representation in the 3D scene with a deterministic position, an accessible name and an active state.
- **View mode**: Which of the 2D map or 3D view is shown; client-side view state only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the locations shown on the 2D map are present as markers in the 3D view and in its list.
- **SC-002**: A visitor can go from the Multiverse Map to a selected location's details in the 3D view in under 30 seconds on desktop and on mobile.
- **SC-003**: 100% of locations can be selected using only the keyboard.
- **SC-004**: Switching between 2D and 3D shows the new view in under 2 seconds on a typical desktop connection once locations are loaded.
- **SC-005**: All existing 2D map behavior passes its existing tests without modification.
- **SC-006**: The same locations produce identical marker positions across reloads.

## Assumptions

- The Multiverse Map page keeps loading all locations once and both views share them (source: `frontend/src/components/MultiverseMapView.tsx`).
- Location details and residents come from the existing detail panel (source: `frontend/src/components/LocationDetailPanel.tsx`).
- Out of scope per the issue: real-world geographic imagery, replacing the 2D map, backend or data changes. Possible follow-up: grouping markers by dimension.
- FR-012 and FR-013 are accessibility and robustness requirements derived from the constitution's explicit user-state principle (Principle II: loading, empty and failure outcomes) and are listed for human confirmation in the PR review focus.
