# Feature Specification: 3D Dimension Map

**Feature Branch**: `spec/120-3d-dimension-map`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "3D Dimension map. The existing Multiverse Map itself should become 3D: the same locations and connections, but with depth, so visitors can rotate and zoom it. Visitors can rotate and zoom the map, and still select a location to open its details. The 2D map must remain available (for people who prefer it or whose device cannot show 3D)." (Issue #120)

## Clarifications

### Session 2026-11-07

- Q: Which view is the default, and can visitors switch between 2D and 3D manually? → A: 3D is the default, visitors can switch manually between 2D and 3D, and the 2D map is shown automatically when 3D is unsupported (issue #120 comment, "Q1: Yes" accepting recommended option A).
- Q: Should the selection and open details persist across a 2D/3D switch? → A: Persist (issue #120 comment, "Q2: Yes" accepting recommended option A).
- Q: Must the 3D map offer keyboard-operable rotate, zoom and location selection? → A: Keyboard on computers, touch on mobile (issue #120 comment, "Q3: Keyboard for computer, touch for mobile").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore the map in 3D (Priority: P1)

A visitor opens the Multiverse Map and sees the same locations and connections as today, now arranged with depth. They rotate the map to look at it from different angles and zoom in and out, and they can select a location to open its details.

**Why this priority**: This is the whole request: a more immersive map with the same content.

**Independent Test**: Open the Multiverse Map on a device that supports 3D, rotate and zoom it, select a location, and confirm the location details open.

**Acceptance Scenarios**:

1. **Given** the Multiverse Map has loaded and the device supports 3D, **When** the visitor opens it, **Then** the map is shown in 3D with every location and every connection that the 2D map shows.
2. **Given** the 3D map is shown, **When** the visitor rotates it, **Then** the view turns around the map so locations are seen from different angles.
3. **Given** the 3D map is shown, **When** the visitor zooms in or out, **Then** the map appears closer or farther, within limits.
4. **Given** the 3D map is shown, **When** the visitor selects a location, **Then** the location details open, the same details as from the 2D map.

---

### User Story 2 - Switch between 2D and 3D (Priority: P2)

A visitor who prefers the flat map, or who wants to compare, switches between the 3D and 2D views at any time. If the device cannot show 3D, the 2D map is shown automatically.

**Why this priority**: The issue requires the 2D map to remain available, for people who prefer it or whose device cannot show 3D.

**Independent Test**: Switch from 3D to 2D and back using the view control; on a device without 3D support confirm the 2D map is shown.

**Acceptance Scenarios**:

1. **Given** the device supports 3D, **When** the Multiverse Map opens, **Then** the 3D view is the default.
2. **Given** the 3D view is shown, **When** the visitor chooses the 2D view, **Then** the existing 2D map is shown with its current behavior.
3. **Given** the 2D view is shown, **When** the visitor chooses the 3D view, **Then** the 3D map is shown.
4. **Given** the device cannot show 3D, **When** the Multiverse Map opens, **Then** the 2D map is shown automatically and the visitor is told that 3D is unavailable.
5. **Given** a location is selected and its details are open, **When** the visitor switches views, **Then** the same location stays selected, the details stay open, and the location is shown as selected in the new view.

---

### User Story 3 - Operate the 3D map with keyboard and touch (Priority: P2)

A visitor on a computer rotates, zooms and selects locations in the 3D map using the keyboard. A visitor on a mobile device does the same by touch.

**Why this priority**: The 3D map must be usable on the devices visitors actually use, and the 2D map already exposes every location to keyboard users.

**Independent Test**: With only a keyboard, rotate, zoom and select a location in the 3D map. On a touch device, do the same by touch gestures.

**Acceptance Scenarios**:

1. **Given** the 3D map is shown on a computer, **When** the visitor uses the keyboard, **Then** they can rotate, zoom and select a location and open its details without a pointing device.
2. **Given** the 3D map is shown on a touch device, **When** the visitor drags, pinches and taps, **Then** the map rotates, zooms and selects a location.
3. **Given** the 3D map is shown, **When** the visitor tabs through it, **Then** the keyboard focus is visible and the focused location is announced with the same description the 2D map gives.

---

### Edge Cases

- The Multiverse Map is loading, empty or failed: the existing loading, empty and error states are shown, for both views.
- 3D becomes unavailable while the 3D view is shown (for example the graphics context is lost): the 2D map is shown with a notice, and the selection is kept.
- A visitor prefers reduced motion: the 3D map does not rotate on its own and avoids animated camera moves.
- Very many locations make nodes overlap or hide behind others: every location remains selectable, and the visitor can rotate or zoom to reach it.
- Zoom cannot go beyond the defined near and far limits, and a reset returns the map to its starting view.
- A location is selected in 3D and the visitor switches to 2D: the selection and open details persist.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Multiverse Map MUST be available as a 3D view showing the same locations and the same connections between them as the 2D map.
- **FR-002**: Visitors MUST be able to rotate the 3D map and zoom it in and out within defined limits.
- **FR-003**: Visitors MUST be able to select a location in the 3D map to open the same location details that the 2D map opens.
- **FR-004**: The 2D map MUST remain available and keep its current behavior.
- **FR-005**: The 3D view MUST be the default when the device supports 3D.
- **FR-006**: Visitors MUST be able to switch manually between the 2D and 3D views at any time.
- **FR-007**: When the device cannot show 3D, the system MUST show the 2D map automatically and tell the visitor that 3D is unavailable.
- **FR-008**: The selected location and the open details MUST persist when the visitor switches between views.
- **FR-009**: On computers, visitors MUST be able to rotate, zoom and select locations in the 3D map using the keyboard alone.
- **FR-010**: On mobile devices, visitors MUST be able to rotate, zoom and select locations in the 3D map by touch.
- **FR-011**: Each location in the 3D map MUST have the same accessible description as in the 2D map, and the focused location MUST be visibly indicated.
- **FR-012**: Each location in the 3D map MUST show its name and the same summary (type, dimension, resident count) that the 2D map shows on hover or focus.
- **FR-013**: The system MUST show the existing loading, empty and error states regardless of the view.
- **FR-014**: The 3D map MUST respect the visitor's reduced-motion preference by not animating on its own.
- **FR-015**: The 3D map MUST give each location a stable position, so a location appears in the same place on every visit with the same data.
- **FR-016**: The visitor MUST be able to reset the 3D view to its starting position.

### Key Entities *(include if feature involves data)*

- **Location**: An existing map location with name, type, dimension and residents; unchanged by this feature.
- **Connection**: An existing link between two locations drawn on the map; unchanged by this feature.
- **Map View Mode**: The visitor's current choice of 2D or 3D view; it affects only presentation, not data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the 3D view, 100% of the locations and connections shown in the 2D view are present.
- **SC-002**: A visitor can rotate, zoom and open a location's details in the 3D view in under 30 seconds on first use.
- **SC-003**: A visitor can complete rotate, zoom and select using only the keyboard on a computer, and using only touch on a mobile device.
- **SC-004**: On a device without 3D support, 100% of visitors see the working 2D map without an error.
- **SC-005**: Switching between views keeps the selected location in 100% of cases.
- **SC-006**: The 3D map stays interactive, with no visible stutter while rotating, at the current number of locations on a typical laptop and a recent phone.

## Assumptions

- The locations and connections come from the existing Multiverse Map data; no data or backend change is needed.
- The 3D positions are derived from the existing deterministic layout, extended with a depth coordinate (source: `frontend/src/utils/multiverseLayout.ts`).
- The "current number of locations" is the full set the map view already loads (`frontend/src/components/MultiverseMapView.tsx`).
- The priority of the issue is P3 (nice to have).
