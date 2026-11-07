# Implementation Plan: 3D Dimension Map

**Branch**: `spec/120-3d-dimension-map` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-3d-dimension-map/spec.md`

## Summary

Add a 3D view of the existing Multiverse Map (same locations and connections, with depth; rotate, zoom, select) next to the unchanged 2D map. 3D is the default when supported, visitors can toggle views, 2D is the automatic fallback, and selection persists across a switch. The view is frontend-only: positions get a deterministic depth coordinate, rendering uses `three` (WebGL), and every location is also exposed as a real focusable `<button>` overlay so keyboard, screen reader and touch use follow the 2D map's pattern. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript, React (latest per `frontend/package.json`), Vite

**Primary Dependencies**: existing React, Vite, react-icons; new `three` and `@types/three` (see research.md R1)

**Storage**: N/A (view mode is in-memory component state; no backend or persistence change)

**Testing**: Vitest + Testing Library (jsdom) via `npm test`; coverage via `npm run test:coverage`

**Target Platform**: Modern desktop and mobile browsers; static container served by nginx (`frontend/Dockerfile`, `frontend/nginx.conf`)

**Project Type**: web application (frontend-only change; `backend/` and `infra/` untouched)

**Performance Goals**: Interactive rotation with no visible stutter at the current location count (SC-006); render only on demand/interaction

**Constraints**: Respect `prefers-reduced-motion`; 2D map behavior unchanged; jsdom has no WebGL, so capability detection must be injectable for tests; coverage must stay at or above 80%

**Scale/Scope**: All locations loaded by `MultiverseMapView` (every page of the locations API)

## Constitution Check

*GATE: passes before research and after design.* Source: `.specify/memory/constitution.md` v2.0.1.

| Principle | Result |
|-----------|--------|
| I. Layered boundaries | Pass: presentation and view state only in the frontend; no backend change. |
| II. Explicit contracts and states | Pass: typed props ([contracts/map-view-contracts.md](./contracts/map-view-contracts.md)); existing loading/empty/error states retained (FR-013); unsupported 3D shows a visible notice, not a silent fallback (FR-007). |
| III. Verify behavior | Pass: component and util tests planned; lint, test, build and 80% coverage gates apply. |
| IV. Secure defaults | Pass: no secrets, no new network calls. |
| V. Reproducible delivery | Pass: no deployment change; lockfile updated with the new dependency. |

No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-3d-dimension-map/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/map-view-contracts.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── package.json                         # add three, @types/three (+ package-lock.json)
└── src/
    ├── components/
    │   ├── MultiverseMapView.tsx        # owns viewMode; lifts nothing else; passes selection to both maps
    │   ├── MultiverseMap.tsx            # existing 2D map, unchanged behavior
    │   ├── MultiverseMap3D.tsx          # new: three scene + overlay buttons + controls
    │   └── MapViewToggle.tsx            # new: 2D/3D switch + unavailable notice
    ├── utils/
    │   ├── multiverseLayout.ts          # add depth (z) layout helper for 3D
    │   ├── multiverseLayout.test.ts     # extend
    │   └── webglSupport.ts              # new: capability detection
    ├── MultiverseMap.test.tsx           # extend (toggle, fallback, persistence)
    └── styles.css                       # 3D map and toggle styles
```

**Structure Decision**: Frontend-only change inside the existing `frontend/src` component/util layout (existing files verified under `frontend/src/components` and `frontend/src/utils`).

## Complexity Tracking

None.
