# Implementation Plan: 3D Multiverse Globe Map with Blue/Green Release

**Issue**: #50 · **Spec**: [spec.md](./spec.md) (Success Criteria SC-001..SC-010, Acceptance Scenarios per user story are the authoritative acceptance criteria) · **Base**: `345fd655fd1be2fa97d6679e2f8eb77ecaad4198`

## Verified facts (repository evidence at base)

- `frontend/src/types/view.ts` defines `View`; `multiverse-map` renders `MultiverseMapView` via the registry in `frontend/src/App.tsx`. 2D layout lives in `frontend/src/utils/multiverseLayout.ts` (+ test).
- Feature flags: strategy pattern in `frontend/src/services/featureFlags/` (`environment`, `static`, `composite`), keys in `frontend/src/types/featureFlag.ts` (`characterModalV2`, `myMultiverse`). The environment strategy reads build-time `VITE_FEATURE_*`; `frontend/Dockerfile` passes them as build args. Build-time values cannot change without an image build.
- Container: nginx serving `/usr/share/nginx/html`, ports 8080/8443 (`frontend/nginx.conf`).
- Infra: `infra/main.bicep` is one Azure Container App (`activeRevisionsMode: 'Multiple'`, managed environment, identity). `infra/appservice.bicep` exists but is App Service-based and unused by CD; it is out of scope.
- Workflows: `cd.yml` (publish image to GHCR, deploy 0% canary revision labelled `canary`), `infra.yml` (validate + deploy `infra/main.bicep`), `ci.yml`. Canary runbook: `docs/canary-deployment.md`.
- `three`, `@react-three/*` are not yet dependencies. No Blue/Green infra exists.

## Human decisions applied (issue comments)

1. Flag source: `.env`-style variables, runtime — accepted ("yes"): `FEATURE_*` env vars read at container start and served as `/config.json`.
2. Platform: Azure Container Apps revision labels (`blue`/`green`).
3. Library `three` + `@react-three/fiber` + `@react-three/drei`; NASA Blue Marble texture (public domain) — confirmed.
4. Canary workflow and runbook are deleted and replaced.
5. Workflow names accepted: `cd.yml` rewrite, `bluegreen-swap.yml`, `set-feature-flag.yml`.
6. Create Bicep modules; `infra/appservice.bicep` is not touched.

## Design

### Frontend
- `utils/globeLayout.ts` (+ `.test.ts`): pure `locationToLatLng(location)` → `{lat,lng}` from a stable hash of `id` (fall back to name), and `latLngToVector3`. Same input → same output; bounded lat (avoid poles clustering via area-uniform mapping).
- `components/MultiverseGlobe.tsx` (lazy via `React.lazy` in `MultiverseMapView`): R3F `Canvas` with textured sphere, atmosphere shader/glow mesh, drei `Stars`, `OrbitControls` (rotate/zoom/tilt; touch drag/pinch built in; damping, zoom limits), markers as selectable meshes with accessible labels. Selecting a marker calls the existing selection handler → `LocationDetailPanel`.
- `MultiverseMapView.tsx`: when flag on, a 2D/3D toggle (default 2D); 2D path unchanged. Reuse `LoadingPortal`, `ErrorState`, `EmptyState`. WebGL detection helper renders a text fallback with a button to the 2D map; also an error boundary for texture/context failure.
- `frontend/public/textures/earth-blue-marble.jpg` (compressed) + `frontend/public/textures/ATTRIBUTION.md` (NASA Visible Earth, public domain) and a short note in docs.
- Feature flag `multiverseGlobe` added to `FeatureFlagKey`; default off.
- Runtime config: new `runtimeConfigFeatureFlagStrategy` reading `window.__APP_CONFIG__`/fetched `/config.json` (`FEATURE_MULTIVERSE_GLOBE`, etc.), loaded before first render in `main.tsx` with a short timeout; missing/malformed → abstain → default off. Composite order: runtime config > build env > static defaults. Parsing reuses the existing truthy/falsy rules.
- `frontend/docker-entrypoint.sh` (or nginx `/docker-entrypoint.d/` script) renders `/usr/share/nginx/html/config.json` from `FEATURE_*` env vars (whitelist only, JSON-escaped); nginx serves it with `Cache-Control: no-store`.
- Styles in `styles.css`. Add deps to `package.json`/lock.

### Infra (Bicep modules)
- `infra/modules/containerApp.bicep` (app, ingress, `Multiple` revisions, env vars including `FEATURE_*`), `infra/modules/environment.bicep`, `infra/modules/identity.bicep`; `main.bicep` composes them. Blue/Green is represented by two revisions with labels `blue` and `green`; production ingress traffic goes 100% to the active label; the inactive label is reachable at its label URL for verification. Parameters hold the active color and image refs; no secrets.
- Validate with `az bicep build` for `main.bicep` and modules.

### Workflows
- `cd.yml` (rewritten): build/push image, determine inactive color, deploy revision with suffix and label for that color at 0% traffic, smoke test the label URL, publish summary. Flag value inherited from the current app configuration (off by default).
- `bluegreen-swap.yml`: manual (`workflow_dispatch`) with environment approval; shifts 100% traffic to the verified color; rollback = run again to swap back.
- `set-feature-flag.yml`: manual; sets `FEATURE_MULTIVERSE_GLOBE` on the app via `az containerapp update --set-env-vars` (creates a new revision; fast, not strictly instant), then verifies `/config.json`.
- Delete the canary workflow job/inputs and `docs/canary-deployment.md`; update `infra.yml` for modules and new parameters.
- Docs: `docs/blue-green-deployment.md` (procedure, flag activation/rollback, limitations).

## Allowed / denied paths for implementation
- Allowed: `frontend/src/**`, `frontend/public/**`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/docker-entrypoint*`, `infra/main.bicep`, `infra/modules/**`, `.github/workflows/{cd,infra,bluegreen-swap,set-feature-flag}.yml`, `docs/blue-green-deployment.md`, delete `docs/canary-deployment.md`.
- Denied: `backend/**`, `infra/appservice.bicep`, `.github/agents/**`, `.github/workflows/*.lock.yml`, `agent-*.md`, secrets, `.specify/memory/**`.

## Tests and validation
- Vitest: `globeLayout` determinism/bounds/uniqueness; flag strategy (runtime config precedence, malformed → off); `MultiverseMapView` toggle, states, no-WebGL fallback (mock `three`/R3F); existing `MultiverseMap.test.tsx` unchanged and passing.
- `npm run lint`, `npm test`, `npm run build` in `frontend/`; verify 3D chunk is separate and absent from initial bundle with flag off.
- `az bicep build` on `infra/main.bicep`; workflow YAML lint; secret scan.

## Risks and rollback
- Container Apps env-var change creates a new revision, so the flag flip is fast, not instant (documented). Texture size on mobile (compress, ≤2K). Two-label traffic and sticky sessions need a real-environment run; first Blue/Green bootstrap needs human-approved infra deploy.
- Rollback: code → swap traffic back; feature → set flag off; plan changes → revert PR.

## Assumptions / deviations from the issue text
- A1: "Immediate" flag rollback is implemented as a no-build env flip (new revision), not a true instant toggle.
- A2: Spec tightened SC-003/SC-007 to make "no bloat" and "immediate rollback" measurable; no issue criterion dropped.
- A3: `infra/appservice.bicep` listed in the issue is not modified (App Service is not used).
- A4: Canary workflow removal is per the requester.

## Unresolved human decisions
None. Human review of the exact spec/plan hashes is still required; this plan is not an approval.
