# Tasks: 3D Dimension Map

**Input**: Design documents in `specs/001-3d-dimension-map/`
**Tests**: Included. The constitution (principle III) requires tests for changed behavior and at least 80% frontend coverage.
**Scope**: Frontend only (`frontend/`). No `backend/` or `infra/` tasks.

## Phase 1: Setup

- [ ] T001 Add `three` and `@types/three` to `frontend/package.json` and update `frontend/package-lock.json` (run `npm install three && npm install -D @types/three` in `frontend/`)

## Phase 2: Foundational (blocks all stories)

- [ ] T002 [P] Add deterministic depth layout helper (`z` from `hashToUnitInterval(id)`) and 3D nearest-earlier-neighbour connections (same pair count as 2D) in `frontend/src/utils/multiverseLayout.ts`
- [ ] T003 [P] Add unit tests for stable `z` per id/index and connection count = nodes − 1 in `frontend/src/utils/multiverseLayout.test.ts`
- [ ] T004 [P] Create WebGL capability detection function in `frontend/src/utils/webglSupport.ts` (returns false when no context can be created)
- [ ] T005 [P] Add unit tests for `frontend/src/utils/webglSupport.ts` in `frontend/src/utils/webglSupport.test.ts` (new file)
- [ ] T006 Extract the `describeLocation` text helper and tooltip content from `frontend/src/components/MultiverseMap.tsx` so 3D reuses them (FR-011, FR-012); 2D behavior unchanged

## Phase 3: User Story 1 - Explore the map in 3D (P1) 🎯 MVP

**Goal**: 3D map with the same locations and connections; rotate, zoom, select opens details.
**Independent Test**: With 3D supported, rotate, zoom, select a location, and the details panel opens.

- [ ] T007 [US1] Create `frontend/src/components/MultiverseMap3D.tsx` per `contracts/map-view-contracts.md`: three scene with node spheres and connection lines from T002, orbit rotate and zoom within near/far limits, render on demand, dispose renderer and geometries on unmount, no auto-rotation (FR-001, FR-002, FR-014, FR-015)
- [ ] T008 [US1] In `frontend/src/components/MultiverseMap3D.tsx`, project each node to screen space and overlay a real `<button>` per location with the 2D label, `aria-pressed` and tooltip; clicking calls `onSelectLocation` (FR-003, FR-011, FR-012)
- [ ] T009 [US1] Add a Reset map view control in `frontend/src/components/MultiverseMap3D.tsx` returning the camera to its start (FR-016)
- [ ] T010 [US1] Render `MultiverseMap3D` in `frontend/src/components/MultiverseMapView.tsx` when 3D is supported, keeping the existing loading, empty and error states (FR-005, FR-013)
- [ ] T011 [US1] Add 3D map and node-overlay styles in `frontend/src/styles.css`
- [ ] T012 [US1] Add component tests in `frontend/src/MultiverseMap.test.tsx` (scene module mocked, jsdom has no WebGL): all locations present as buttons, selection opens the detail panel, loading/empty/error states still shown

## Phase 4: User Story 2 - Switch between 2D and 3D (P2)

**Goal**: Manual toggle, automatic 2D fallback, selection persistence.
**Independent Test**: Toggle 3D↔2D with a location selected and the selection stays; with 3D unsupported the 2D map shows with a notice.

- [ ] T013 [P] [US2] Create `frontend/src/components/MapViewToggle.tsx` per contract (two `aria-pressed` buttons, 3D disabled when unavailable, `role="status"` notice) (FR-006, FR-007)
- [ ] T014 [US2] Add `viewMode` state to `frontend/src/components/MultiverseMapView.tsx` (initial `'3d'` if supported else `'2d'` with notice), render `MultiverseMap` or `MultiverseMap3D`, keep `selectedLocation` untouched on switch (FR-004, FR-008)
- [ ] T015 [US2] Handle `onUnavailable` (3D start failure or context loss) in `frontend/src/components/MultiverseMapView.tsx`: switch to 2D with the notice and keep the selection
- [ ] T016 [US2] Add tests in `frontend/src/MultiverseMap.test.tsx`: 3D default, toggle both ways, unsupported device shows 2D plus notice, context loss falls back, selection and open details persist across a switch

## Phase 5: User Story 3 - Keyboard and touch (P2)

**Goal**: Keyboard operation on computers, touch on mobile.
**Independent Test**: Rotate, zoom and select with keyboard only; drag, pinch and tap on touch.

- [ ] T017 [US3] Add keyboard controls to `frontend/src/components/MultiverseMap3D.tsx`: arrows rotate, `+`/`-` zoom, `0` reset on the focusable map region, plus labelled rotate/zoom/reset buttons; Tab/Enter reach and select node buttons (FR-009, FR-011)
- [ ] T018 [US3] Add touch gestures in `frontend/src/components/MultiverseMap3D.tsx`: one-finger drag rotates, pinch zooms, tap selects; set `touch-action` appropriately in `frontend/src/styles.css` (FR-010)
- [ ] T019 [US3] Add tests in `frontend/src/MultiverseMap.test.tsx`: keyboard shortcuts and control buttons change the camera (mock asserts), Enter on a focused node selects it, focus is visible and labels match 2D

## Phase 6: Polish

- [ ] T020 Verify the reduced-motion edge case (no animation on its own) and add a test in `frontend/src/MultiverseMap.test.tsx`
- [ ] T021 Run `npm run lint`, `npm test`, `npm run test:coverage` (at least 80%) and `npm run build` in `frontend/`; fix failures
- [ ] T022 Walk through `specs/001-3d-dimension-map/quickstart.md` manually (desktop, touch emulation, WebGL disabled)

## Dependencies

- T001 → T007. T002, T004, T006 → T007/T010. T003 after T002; T005 after T004.
- US1 (T007–T012) is the MVP. US2 depends on US1 (T010 file). US3 depends on T007/T008.
- Polish after all stories.

## Parallel examples

- T002, T003, T004, T005 can run together (different files).
- T013 can run alongside T011.

## Strategy

MVP is US1; then US2 (fallback and toggle), then US3. 22 tasks total: Setup 1, Foundational 5, US1 6, US2 4, US3 3, Polish 3.
