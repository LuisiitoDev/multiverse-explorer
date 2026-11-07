# Research: 3D Dimension Map

## Codebase findings

- 2D map: `frontend/src/components/MultiverseMap.tsx` renders an SVG for paths and one real `<button>` per location with `aria-label` from `describeLocation`, `aria-pressed`, and a tooltip. It has its own zoom state.
- Selection state lives in `frontend/src/components/MultiverseMapView.tsx` (`selectedLocation`), which also renders `LocationDetailPanel`. Because the state is above the map, it already survives a view switch if both maps are children of this view.
- Layout: `frontend/src/utils/multiverseLayout.ts` gives deterministic `x`/`y` percentages (`positionForNode`, `layoutNodes`) and nearest-earlier-neighbour links (`connectionsBetween`).
- No 3D code, WebGL dependency or 3D mention exists in `frontend/src`, `frontend/package.json` or `docs/` (searched).
- Tests run under jsdom (`frontend/src/test/setup.ts`), which has no WebGL.

## Decisions

### R1: Rendering library
- **Decision**: `three` (plain, no React wrapper), with `OrbitControls`-style interaction written against the library's own camera API or its bundled controls.
- **Rationale**: Mature, standard WebGL library; supports orbit/zoom and touch gestures; avoids adding a React renderer layer for one component.
- **Alternatives**: `@react-three/fiber` + `drei` (more dependencies and abstraction for a single scene); CSS 3D transforms (no true depth sorting or line rendering, poor with many nodes); hand-written WebGL (high cost).
- **Review flag**: the issue does not name a library; the Reviewer/human should confirm adding `three` (constitution: dependency changes must keep lockfiles and pass CI).

### R2: Accessible, selectable nodes
- **Decision**: Draw lines and node spheres in the canvas, and project each node's 3D position to screen coordinates every frame to position the same kind of real `<button>` used in 2D (same `describeLocation` label, `aria-pressed`, tooltip content).
- **Rationale**: Gives keyboard focus, screen-reader naming and tap targets from the platform (FR-009, FR-010, FR-011, FR-012) and avoids ray-casting-only selection.
- **Alternatives**: Ray-cast picking only (not keyboard or screen reader accessible).

### R3: Keyboard and touch
- **Decision**: Keyboard: arrow keys rotate, `+`/`-` zoom, `0` resets, Tab/Enter reach and select node buttons; on-screen rotate/zoom/reset buttons mirror 2D `multiverse-map__controls`. Touch: one-finger drag rotates, pinch zooms, tap selects a node button.
- **Rationale**: Satisfies the issue author's answer "keyboard for computer, touch for mobile" (issue #120). Key bindings are a plan decision recorded here for review.

### R4: Support detection and fallback
- **Decision**: `webglSupport.ts` tries to create a WebGL context; the view falls back to 2D with a visible notice if it fails or if the context is lost while 3D is shown. Detection is a function that tests can mock.
- **Rationale**: FR-007 and the edge case; jsdom cannot create a context.

### R5: Depth layout
- **Decision**: Extend `multiverseLayout.ts` with a deterministic depth coordinate derived from `hashToUnitInterval(id)` so positions are stable (FR-015); connections reuse the existing nearest-earlier-neighbour logic extended to 3D distance, same count as 2D (FR-001, SC-001).

### R6: Motion and performance
- **Decision**: Render on demand (on interaction), no auto-rotation, so `prefers-reduced-motion` is respected by default (FR-014); dispose geometries and renderer on unmount.

### R7: Tests
- **Decision**: Unit-test the layout depth helper and support detection; component-test the toggle, fallback, selection persistence and keyboard controls with the 3D scene module mocked (jsdom has no WebGL).
