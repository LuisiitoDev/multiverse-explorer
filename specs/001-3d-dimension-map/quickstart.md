# Quickstart: validating the 3D Dimension Map

Prerequisites: Node and npm; run from `frontend/` after `npm ci`.

1. Automated gates (constitution III): `npm run lint`, `npm test`, `npm run test:coverage` (at least 80%), `npm run build`.
2. Manual (`npm run dev`, open the Multiverse Map):
   - On a WebGL-capable browser the 3D view is shown by default with all locations and connections (SC-001).
   - Rotate and zoom by mouse; by keyboard (arrows, `+`, `-`, `0`); by touch on a phone or emulator (drag, pinch, tap).
   - Select a location: the details panel opens.
   - Switch to 2D and back: the same location stays selected and details stay open (FR-008).
   - Disable WebGL (browser flag) and reload: the 2D map shows with an "unavailable" notice (FR-007).
   - Enable reduced motion in the OS: nothing animates on its own (FR-014).
