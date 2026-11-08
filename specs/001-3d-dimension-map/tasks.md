# Tasks: 3D Map View of Dimensions

**Input**: Design documents from `/specs/001-3d-dimension-map/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md
**Tests**: Required by constitution III (frontend coverage at least 80%).

## Phase 1: Setup

- [x] T001 Add `three` and `@types/three` dependencies and update `frontend/package-lock.json` (run `npm install three && npm install -D @types/three` in `frontend/`)
- [x] T002 [P] Extract the private `describeLocation` helper from `frontend/src/components/MultiverseMap.tsx` into `frontend/src/utils/describeLocation.ts` (output unchanged, including "Unknown dimension") and import it in `MultiverseMap.tsx`

## Phase 2: Foundational

- [x] T003 Add `ViewMode` (`'2d' | '3d'`, default `'2d'`) state to `frontend/src/components/MultiverseMapView.tsx`, keeping selection, loading, empty and error state in that component so both views share them

## Phase 3: User Story 1 - Explore locations in a 3D scene (P1) 🎯 MVP

**Goal**: A rotatable, zoomable 3D scene with one deterministic marker per location; selecting a marker opens the existing details.
**Independent Test**: Render `MultiverseMap3D` with locations and a mocked scene module; verify markers count, selection callback and deterministic positions.

- [x] T004 [P] [US1] Write failing tests in `frontend/src/utils/multiverseLayout3d.test.ts`: same input gives identical output (FR-005, SC-006), one node per location in order, positions finite and rounded to 2 decimals
- [x] T005 [US1] Implement `layoutNodes3d` / `positionForNode3d` (Fibonacci sphere plus per-id jitter via exported `hashToUnitInterval`) in `frontend/src/utils/multiverseLayout3d.ts`
- [x] T006 [US1] Implement `frontend/src/utils/multiverseScene.ts`, the only module importing `three`: create renderer, camera, `OrbitControls` (mouse and touch rotate/zoom), marker meshes, raycast click-without-drag to call a select callback, active-marker highlight, resize handling, render on demand (no auto-rotation under `prefers-reduced-motion: reduce`), and `dispose`
- [x] T007 [US1] Implement `frontend/src/components/MultiverseMap3D.tsx` hosting the scene in an `aria-hidden` canvas container with props `locations`, `activeLocationId`, `onSelectLocation`; create the scene in an effect and dispose on unmount
- [x] T008 [US1] Add component tests in `frontend/src/MultiverseMap3D.test.tsx` (mock `multiverseScene`): scene is created with every location, a scene select callback calls `onSelectLocation`, the scene is disposed on unmount, active id is passed through
- [x] T009 [US1] Add scene module tests in `frontend/src/utils/multiverseScene.test.ts` with stubbed WebGL renderer so coverage stays at least 80%

## Phase 4: User Story 2 - Toggle between 2D and 3D (P2)

**Goal**: Toggle between views with the same locations; 2D unchanged.
**Independent Test**: In `MultiverseMapView`, toggle to 3D and back; selection and 2D behavior still work.

- [x] T010 [P] [US2] Create `frontend/src/components/MultiverseMapModeToggle.tsx` (accessible two-option control with pressed state, labels "2D" and "3D")
- [x] T011 [US2] Render the toggle and conditionally `MultiverseMap` or `MultiverseMap3D` in `frontend/src/components/MultiverseMapView.tsx`, passing the same `locations`, `activeLocationId` and `handleSelect`
- [x] T012 [US2] Add toggle styles to `frontend/src/styles.css` (desktop and mobile)
- [x] T013 [US2] Extend `frontend/src/MultiverseMap.test.tsx` with toggle tests (2D default, switch to 3D and back, selection survives); existing 2D tests stay unmodified (SC-005)

## Phase 5: User Story 3 - Keyboard-reachable list (P2)

**Goal**: Every location can be selected from a keyboard-operable list.
**Independent Test**: Tab to the list and activate each entry with the keyboard.

- [x] T014 [P] [US3] Create `frontend/src/components/MultiverseLocationList.tsx`: a list of real `<button>` elements, one per location, using `describeLocation` labels, `aria-pressed` for the active location
- [x] T015 [US3] Render the list inside `frontend/src/components/MultiverseMap3D.tsx` and style it in `frontend/src/styles.css`
- [x] T016 [US3] Add tests in `frontend/src/MultiverseMap3D.test.tsx`: all locations listed, keyboard activation (Enter/Space) selects and opens `LocationDetailPanel` with residents

## Phase 6: User Story 4 - Missing data and failures (P3)

**Goal**: "Unknown dimension", shared states, WebGL fallback, reduced motion.
**Independent Test**: Locations with empty dimension; empty/error/loading in 3D mode; WebGL unavailable.

- [x] T017 [US4] Ensure marker and list labels for an empty `dimension` read "Unknown dimension" in `frontend/src/components/MultiverseLocationList.tsx` and `frontend/src/utils/describeLocation.ts`; do not change `LocationDetailPanel.tsx` (shared with 2D, shows "Unknown")
- [x] T018 [US4] Make `multiverseScene.ts` report failure when no WebGL context can be created, and have `frontend/src/components/MultiverseMap3D.tsx` show a visible message while keeping the list (FR-012)
- [x] T019 [US4] Add tests in `frontend/src/MultiverseMap3D.test.tsx` and `frontend/src/MultiverseMap.test.tsx`: unknown dimension text, loading/empty/error with retry while 3D is chosen (FR-008), WebGL-unavailable message plus list, reduced-motion flag passed to the scene (FR-013)

## Phase 7: Polish

- [x] T020 Run in `frontend/`: `npm run lint`, `npm test`, `npm run test:coverage` (at least 80%), `npm run build`; fix failures
- [ ] T021 Walk through `specs/001-3d-dimension-map/quickstart.md` manually and record results in the PR

## Dependencies

- T001 before T006. T002 before T014/T017. T003 before T011.
- US1 (T004-T009) is the MVP; US2 depends on T007; US3 depends on T007 and T002; US4 depends on US1 to US3.
- Parallel: T002 with T001; T004 with T006 prep; T010 with T014.

## Implementation Strategy

MVP is US1 (scene plus markers). Then toggle (US2), list (US3), edge states (US4). Frontend only; no `infra/` tasks.
