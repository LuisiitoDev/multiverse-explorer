# Implementation Plan: 3D Map View of Dimensions

**Branch**: `spec/126-3d-dimension-map` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-3d-dimension-map/spec.md`

## Summary

Add a 3D view of locations next to the existing 2D Multiverse Map, with a 2D/3D toggle. `MultiverseMapView` keeps owning data, loading/empty/error states and selection; it gains a view-mode state and renders either the unchanged `MultiverseMap` or a new `MultiverseMap3D`. The 3D scene (three.js, drawn on a canvas with orbit rotate/zoom for mouse and touch) shows one marker per location at a deterministic 3D position computed by a new pure layout function. A keyboard-reachable list of all locations (the accessible path) selects locations exactly like marker clicks. Selection opens the existing `LocationDetailPanel`. Frontend only; no backend, data or infra change.

## Technical Context

**Language/Version**: TypeScript with React (versions `latest` in `frontend/package.json`), built with Vite.

**Primary Dependencies**: existing React, react-icons; new: `three` (+ `@types/three`) for the scene and orbit controls (see [research.md](./research.md) D1; the choice is flagged for human confirmation).

**Storage**: N/A (view mode is in-memory client state; no persistence).

**Testing**: Vitest + Testing Library in jsdom (`frontend/vite.config.ts`, `frontend/src/test/setup.ts`). jsdom has no WebGL, so the three.js scene is isolated behind one module that tests mock.

**Target Platform**: Browsers on desktop and mobile; static container served by nginx (`frontend/nginx.conf` sets no Content-Security-Policy, so no header change is needed).

**Project Type**: Web application, frontend change only.

**Performance Goals**: View switch under 2 s after load (SC-004); render on demand rather than a continuous animation loop where possible.

**Constraints**: Frontend coverage must stay at least 80% (constitution III); WebGL-dependent code is kept thin and excluded only if the team agrees (see research D4); 2D map tests unchanged (SC-005).

**Scale/Scope**: All pages of locations (hundreds) as markers; one new view, one pure layout function, one list component.

## Constitution Check

*GATE: passes before Phase 0 and after Phase 1.*

| Principle | Assessment |
|-----------|------------|
| I. Layered boundaries | Presentation and view state stay in the frontend; layout math is a pure util beside `multiverseLayout.ts`; no service or backend change. Pass. |
| II. Explicit contracts and user states | Loading, empty and error handling remain in `MultiverseMapView` and are shared by both views; WebGL-unavailable is an explicit visible state (FR-012). No API change. Pass. |
| III. Verify at the right boundary | Unit tests for layout, component tests for toggle, list, selection, unknown dimension and the fallback; scene module mocked in jsdom. 80% frontend threshold must hold. Pass (risk noted R1). |
| IV. Secure defaults | No secrets, no new endpoints, no network from the scene. Pass. |
| V. Reproducible delivery | Dependency pinned through `package-lock.json`; no deployment change. Pass. |

No violations; Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-3d-dimension-map/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── package.json                                  # add three, @types/three
└── src/
    ├── components/
    │   ├── MultiverseMapView.tsx                 # add view mode state + toggle
    │   ├── MultiverseMap3D.tsx                   # new: scene host, fallback, list
    │   ├── MultiverseLocationList.tsx            # new: keyboard-reachable list
    │   └── MultiverseMapModeToggle.tsx           # new: 2D/3D toggle
    ├── utils/
    │   ├── multiverseLayout3d.ts                 # new: deterministic 3D positions
    │   ├── multiverseLayout3d.test.ts
    │   ├── multiverseScene.ts                    # new: only module importing three
    │   └── describeLocation.ts                   # shared label helper ("Unknown dimension")
    ├── styles.css                                # toggle, canvas, list styles
    └── MultiverseMap3D.test.tsx                  # new: component tests (scene mocked)
```

**Structure Decision**: Frontend-only change in the existing `frontend/src` layout, following the component/util split used by the 2D map (`frontend/src/components/MultiverseMap.tsx`, `frontend/src/utils/multiverseLayout.ts`). `describeLocation` currently lives privately in `MultiverseMap.tsx`; it is extracted to a shared util without changing 2D output.

## Complexity Tracking

None.
