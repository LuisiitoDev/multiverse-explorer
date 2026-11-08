# Research: 3D Map View of Dimensions

## D1: Rendering library

- **Decision**: Use `three` directly (WebGL renderer, `OrbitControls`) inside one util module `multiverseScene.ts`; no React wrapper library.
- **Rationale**: The repo has no 3D or canvas library (`frontend/package.json`; no matches for webgl/three in `frontend/src`). three.js's `OrbitControls` provides rotate and zoom for mouse and touch (one-finger rotate, pinch zoom) out of the box, matching FR-003. Using it directly adds one runtime dependency instead of three or more.
- **Alternatives considered**: react-three-fiber + drei (more dependencies, ties to React version `latest`); hand-written CSS 3D transforms (no real touch/zoom controls, poor with hundreds of markers); `globe.gl` (globe-specific, geographic framing the issue excludes).
- **Open for humans**: adding a dependency is a decision for the reviewer; flagged in the PR.

## D2: Deterministic 3D positions

- **Decision**: New pure function mirroring `positionForNode` in `frontend/src/utils/multiverseLayout.ts`: a Fibonacci-sphere distribution from index and total with small per-id jitter from the existing exported `hashToUnitInterval`.
- **Rationale**: Reuses the existing deterministic hash and the same "no randomness" principle (header of `multiverseLayout.ts`); the API has no coordinates.
- **Alternatives considered**: `Math.random` (not deterministic, violates FR-005); grouping by dimension (explicitly a follow-up in the issue).

## D3: Accessibility and fallback

- **Decision**: The canvas is `aria-hidden`; the keyboard list of all locations is the accessible interface, reusing the label text of the 2D map (`describeLocation`, "Unknown dimension"). If a WebGL context cannot be created, show a visible message and keep the list. When `prefers-reduced-motion: reduce` matches, no auto-rotation; the scene renders only on user input. The 2D map already respects reduced motion (`frontend/src/styles.css:1851`, `:2302`).
- **Rationale**: Constitution II (explicit failure states) and the issue requirement for a keyboard-reachable list.
- **Alternatives considered**: Making each marker a focusable DOM element over the canvas (costly with hundreds of markers and 3D projection).

## D4: Testing in jsdom

- **Decision**: All `three` usage lives in `multiverseScene.ts` behind a small interface (create scene with locations, active id, select callback; dispose). Component tests mock this module; layout tests are pure. The scene module is covered by at least a test with a stubbed renderer factory where feasible; coverage is measured by `npm run test:coverage` (`frontend/package.json`) and must stay at least 80% overall (constitution III).
- **Alternatives considered**: Excluding the scene file from coverage; not chosen unless coverage fails, and that change to `vite.config.ts` would need human approval.

## D5: Selection and picking

- **Decision**: Pointer click without drag raycasts against marker meshes and calls the same `onSelectLocation` handler as the 2D map; the active marker is highlighted. Selection state stays in `MultiverseMapView` so it survives the toggle (spec User Story 2, scenario 3).
