# Data Model: 3D Map View of Dimensions

No persisted data and no API change.

## Location (existing, `frontend/src/types/location.ts`)

Unchanged: id, name, type, dimension, residents.

## Position3D (new, client-only)

| Field | Meaning |
|-------|---------|
| x, y, z | Marker coordinates on a sphere of fixed radius, rounded to 2 decimals |

Rules: derived only from `(location.id, index, total)`; same input gives the same output; no randomness.

## MapNode3D (new)

`{ item: Location } & Position3D`, produced by `layoutNodes3d(locations)`, order preserved.

## ViewMode (new, client state)

`'2d' | '3d'`, default `'2d'`, held in `MultiverseMapView`; not persisted.

## Derived label

Dimension label = `location.dimension || 'Unknown dimension'` (same rule as `MultiverseMap.tsx`).
