# Plan: 3D Multiverse Globe Map (Issue #50)

Acceptance criteria live in `spec.md` (Success Criteria SC-001..SC-007, Acceptance Scenarios per story); not restated here.

## Verified facts (base `5754a3545a327f73a2070de3442b9e8eca9af4f9`)
- `View` union in `frontend/src/types/view.ts` includes `multiverse-map`; `App.tsx` uses a `viewRegistry` and `useFeatureFlag`.
- Flags: `frontend/src/types/featureFlag.ts` (`characterModalV2`, `myMultiverse`), env strategy reads `VITE_FEATURE_*` at **build time**; defaults in `featureFlags/index.ts`.
- `MultiverseMapView.tsx` already loads all locations and reuses `LoadingPortal`/`ErrorState`/`EmptyState`/`LocationDetailPanel`.
- `frontend/public/` does not exist. No `three` dependency. `react` is `latest`.
- Infra: `infra/main.bicep` = Azure Container Apps (multiple revision mode, canary via `cd.yml`); `infra/appservice.bicep` = App Service plan/site (no slots). Workflows: `cd.yml`, `infra.yml`, `ci.yml`. `docs/canary-deployment.md` exists.

## Recommendations
- **Library**: `three` + `@react-three/fiber` + `@react-three/drei` (OrbitControls gives mouse/touch rotate, zoom, tilt; MIT). Alternative: `three` + `three-globe` (less React-idiomatic). Lazy-loaded via `React.lazy` in a new `MultiverseGlobeView` chunk.
- **Texture**: NASA Blue Marble (public domain) at 2k resolution, stored as `frontend/public/textures/earth.jpg` (or optimized `.webp`); attribution in `docs/third-party-assets.md`. License verified at implementation time.
- **Layout**: `frontend/src/utils/globeLayout.ts` — pure `locationToLatLon(location)` using a stable hash of `location.id` (golden-angle/Fibonacci-style spread fallback optional) → `latLonToVector3`. Tests in `globeLayout.test.ts`.
- **Switch**: 2D/3D toggle inside `MultiverseMapView` shown only when new flag `multiverseGlobe` is on; default view 2D.
- **Flag**: add `multiverseGlobe` (`VITE_FEATURE_MULTIVERSE_GLOBE`), default `false`.
- **Fallback**: WebGL capability check before mounting Canvas; `role="status"` message + button to 2D; also handle `webglcontextlost`.
- **Accessibility**: keyboard-reachable marker list alongside canvas; respect `prefers-reduced-motion`.

## Blue/Green design (pending D2)
- If Container Apps (recommended, matches existing infra): two labels `blue`/`green` on revisions in `Multiple` mode; deploy new revision to the inactive label with 0% traffic, smoke test via label URL, then shift 100% traffic to it; rollback = shift back. Extend/refactor `cd.yml` rather than adding a parallel pipeline; add `blue-green.yml` (manual swap/rollback, `workflow_dispatch`) and Bicep parameters in `infra/main.bicep`.
- If App Service: add `staging` slot in `infra/appservice.bicep` and `az webapp deployment slot swap`.
- Auth via existing OIDC `vars.AZURE_*`; no secrets committed.

## Open human decisions
- **D1 flag runtime**: Build-time `VITE_*` flags cannot be flipped without a redeploy, contradicting the criterion "turned on later, independently of deployment, and turned off immediately". Options: (a) runtime `/config.json` served by the container (edited via Container App env var + restart/new revision, no image rebuild) read by a new `runtimeFeatureFlagStrategy` in the composite chain; (b) remote flag service (Azure App Configuration). Recommend (a) as smallest.
- **D2 platform**: Container Apps vs App Service for Blue/Green (see above).
- **D3**: Confirm 3D library choice (R3F/drei) and texture source.

## Allowed paths (implementer)
`frontend/src/components/MultiverseGlobe*.tsx`, `frontend/src/components/MultiverseMapView.tsx`, `frontend/src/utils/globeLayout*.ts`, `frontend/src/types/view.ts`, `frontend/src/types/featureFlag.ts`, `frontend/src/App.tsx` (only if needed), `frontend/src/styles.css`, `frontend/src/services/featureFlags/**`, `frontend/public/textures/**`, `frontend/package.json`, `frontend/package-lock.json`, frontend tests, `infra/**`, `.github/workflows/{cd,infra,blue-green}.yml`, `docs/**`.
Denied: `backend/**`, `.github/agents/**`, `.specify/**`, agent workflow `*.lock.yml`/`agent-*.md`, secrets, any other path.

## Tests / validation
`npm run lint`, `npm test`, `npm run build` (frontend); check main chunk excludes `three`; `az bicep build` on changed files; actionlint/YAML validation for workflows; secret scan.

## Risks
Bundle size (mitigated by lazy load); WebGL in jsdom tests (mock Canvas); texture licensing; incorrect traffic swap affecting production (mitigate with smoke check and manual approval environment); flag source change touches all flags (keep composite order: runtime → env → defaults).

## Rollback
Frontend: turn flag off (runtime) or revert PR. Infra: swap traffic back to previous label/slot; Bicep changes are additive.

## Assumptions / deviations from issue text
- Added SC-001/SC-002/SC-004/SC-006 measurability, a keyboard-accessible marker list, reduced-motion and context-loss edge cases, and texture-failure fallback beyond the issue's literal text.
- Added the D1 conflict (build-time flags vs. runtime toggle) as a human decision.
