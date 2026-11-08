# Quickstart: validating the 3D map view

Prerequisites: Node and npm; run from `frontend/`.

1. `npm install` (after the dependency change).
2. Automated checks: `npm run lint`, `npm test`, `npm run test:coverage` (at least 80%), `npm run build`.
3. Manual: `npm run dev`, open the Multiverse Map.
   - Toggle to 3D: markers appear for every location; drag rotates, wheel/pinch zooms.
   - Click a marker: the location details and residents open, same as 2D.
   - Tab to the location list: activate every entry with Enter/Space.
   - A location with no dimension reads "Unknown dimension".
   - Toggle back to 2D: the map behaves as before.
   - Disable WebGL in the browser: a message appears and the list still works.
   - Enable reduced motion in the OS: the scene does not move on its own.
4. Mobile: repeat rotate/pinch/tap in a mobile viewport.
