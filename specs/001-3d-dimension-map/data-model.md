# Data Model: 3D Dimension Map

No persisted or API data changes.

- **Location** (existing, `frontend/src/types/location.ts`): unchanged.
- **MapPosition3D** (new, derived, not stored): `{ x, y, z }`; `x`,`y` equal the existing 2D percentages, `z` is a deterministic depth from the location id. Same id and index give the same position.
- **Connection** (existing concept): pair of nodes; in 3D the same pairs as 2D are linked (count = nodes − 1).
- **MapViewMode** (new, view state in `MultiverseMapView`): `'3d' | '2d'`.
  - Initial: `'3d'` if WebGL is supported, else `'2d'` with `threeDUnavailable = true`.
  - Transitions: user toggle (3d↔2d, only to 3d when supported); runtime context loss (3d→2d, `threeDUnavailable = true`).
  - `selectedLocation` is independent of the mode and is never cleared by a transition.
