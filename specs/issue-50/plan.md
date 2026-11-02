# Implementation Plan: 3D Multiverse Globe Map (issue #50)

**Spec**: [spec.md](./spec.md) — acceptance criteria live in its *Success Criteria* and *Acceptance Scenarios* sections; they are not restated here.
**Base**: `2015fc542544c5a0c4737b28b8dad5ee69fe34ff` (main). **Status**: PLANNED — ready for human review, **not approved**.

## 1. Verified facts (observed in repo at base)

- Frontend is React + Vite + Vitest; no 3D library present (`frontend/package.json`).
- Feature flags use a strategy chain: environment (`VITE_FEATURE_*`, build-time) → static defaults (`frontend/src/services/featureFlags/index.ts`); `FeatureFlagKey` is in `frontend/src/types/featureFlag.ts`; flags are built in `main.tsx` and read via `useFeatureFlag`.
- `MultiverseMapView.tsx` already loads all location pages and renders `LoadingPortal`/`ErrorState`/`EmptyState`/`LocationDetailPanel` around the 2D `MultiverseMap`. `View` includes `'multiverse-map'`.
- `frontend/Dockerfile` bakes flags at build time and serves via nginx (ports 8080/8443, TLS at 8443; ingress targets container port).
- `infra/main.bicep` is a single file: Container App in `Multiple` revision mode, bootstrap traffic param. `infra/appservice.bicep` exists but is unreferenced (App Service plan; not used by this work).
- `cd.yml` builds/pushes to GHCR, deploys a 0%-traffic `canary`-labelled revision and smoke tests it. `infra.yml` deploys `infra/main.bicep`. `docs/canary-deployment.md` documents canary and references a "Canary Traffic" workflow that does not exist in the repo.
- No `frontend/public/` directory exists yet.

## 2. Decisions (from requester comments) and planner recommendations

| # | Decision | Source |
|---|----------|--------|
| D1 | Flag source is `.env`-style `FEATURE_*` variables | requester |
| D2 | Azure Container Apps (revision labels `blue`/`green`) | requester |
| D3 | `three` + `@react-three/fiber` + `@react-three/drei`; NASA Blue Marble texture | requester confirmed |
| D4 | Delete existing canary workflow/deploy flow; replace with Blue/Green | requester |
| D5 | Runtime `FEATURE_*` read at container start → `/config.json`; confirmed incl. limitation (env change = new revision, fast but not instant) | requester ("yes") |
| D6 | Workflows: `cd.yml` rewrite, `bluegreen-swap.yml`, `set-feature-flag.yml` | requester ("yes") |
| D7 | Create Bicep with **modules** (`infra/modules/**`); `main.bicep` composes them | requester |

Planner recommendations (assumptions, reviewable): 2D/3D toggle (segmented control) lives inside `MultiverseMapView`, shown only when flag on; 3D code in a `React.lazy` chunk; markers use a Fibonacci-sphere/golden-angle placement keyed by location id (pure function, `frontend/src/utils/globeLayout.ts`); reduced-motion disables auto-rotation; texture ≤ 2k px, served from `frontend/public/textures/`, requested only by the lazy chunk.

## 3. Design

### Frontend
- `utils/globeLayout.ts` (+ test): `locationToGlobePoint(id, index?) -> {lat, lon}` and `latLonToVector3`; deterministic from id only, never random, safe for odd ids.
- `components/MultiverseGlobe.tsx` (lazy default export; Canvas, texture sphere, atmosphere shader/glow, stars, markers, OrbitControls with rotate/zoom/tilt, touch pinch, damping, polar limits) and `MultiverseGlobeFallback.tsx` (WebGL-unavailable, `role="status"`/alert text + button to switch to 2D). `webgl` detection helper.
- `MultiverseMapView.tsx`: add mode state `2d|3d`; when `useFeatureFlag('globe3d')` is on, render toggle; 3D branch wrapped in `Suspense` (reuse `LoadingPortal`) + error boundary; data/loading/error/empty/selection logic unchanged and shared. 2D markup unchanged.
- Flags: add `globe3d` to `FeatureFlagKey`, defaults (`false`), env strategy mapping. New `runtimeFeatureFlagStrategy` backed by `/config.json` loaded before render in `main.tsx` (`fetch` with timeout; any failure → empty config → falls through to defaults = off). Chain: runtime → environment → static.
- Container runtime config: `docker-entrypoint` script (new `frontend/docker/` scripts) renders `config.json` from `FEATURE_*` env at start (whitelisted keys, boolean-validated, no secrets), served by nginx with `Cache-Control: no-store`. Dockerfile/nginx updated accordingly.
- Tests: layout (determinism, bounds, edge ids), runtime strategy (valid/invalid/missing/network failure), globe view states, toggle, WebGL fallback, flag-off regression; R3F mocked in jsdom.
- Attribution: `THIRD_PARTY_NOTICES.md` (NASA Blue Marble, three, r3f, drei licenses).
- PR must justify the dependency (size, maintenance, license, alternatives: raw three, globe.gl, CesiumJS/MapLibre globe) and report bundle sizes before/after.

### Infra (Bicep modules)
- `infra/main.bicep` rewritten to compose modules; parameters unchanged where possible; outputs FQDN.
- `infra/modules/environment.bicep` (managed environment, identity), `infra/modules/containerapp.bicep` (app, `Multiple` revisions, ingress, labels, `FEATURE_*` env params defaulting to off, no secrets).
- Blue/Green via revision labels `blue` and `green`; production traffic weights 100/0 on labels; swap = move 100% weight between labels. `infra/appservice.bicep` untouched.
- Validate with `az bicep build` (and `az deployment group validate` in workflow).

### Workflows
- `cd.yml` (rewritten): build/push image, determine inactive label, deploy new revision to it (flag env unchanged), smoke-test inactive label URL (including `/config.json`), **stop before swap**.
- `bluegreen-swap.yml` (new, `workflow_dispatch`, `production` environment approval): swaps 100% traffic between labels; rerun = rollback.
- `set-feature-flag.yml` (new, `workflow_dispatch`): sets `FEATURE_GLOBE_3D=true|false` on the app (new revision keeps the active label), verifies `/config.json`.
- `infra.yml`: add bicep build step and updated parameters; keep OIDC auth, no secrets in repo.
- Delete the canary steps/labels and `docs/canary-deployment.md` (superseded by `docs/blue-green-deployment.md`, with flag activation and rollback runbook).

## 4. Allowed and denied scope

**Allowed paths** (implementation stage): `frontend/src/**`, `frontend/public/**`, `frontend/docker/**`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/package.json`, `frontend/package-lock.json`, `infra/main.bicep`, `infra/modules/**`, `.github/workflows/cd.yml`, `.github/workflows/infra.yml`, `.github/workflows/bluegreen-swap.yml`, `.github/workflows/set-feature-flag.yml`, `docs/blue-green-deployment.md`, `docs/canary-deployment.md` (deletion), `THIRD_PARTY_NOTICES.md`.

**Denied paths**: `backend/**`, `infra/appservice.bicep`, `.github/agents/**`, `.github/skills/**`, `.specify/**`, `docs/agent-handoffs/**`, `.github/workflows/agent-*`, `.github/workflows/ci.yml`, `.github/workflows/copilot-setup-steps.yml`, `.github/workflows/shared/**`, `specs/**`. No secrets, no new repo/environment variable values committed; no production deployment or merge by an agent.

## 5. Dependencies, tests, risks, rollback

- New npm deps: `three`, `@react-three/fiber`, `@react-three/drei` (and `@types/three`). Check React version compatibility with r3f; pin versions.
- Validation: `npm run lint`, `npm test`, `npm run build` (check separate lazy chunk), `az bicep build --file infra/main.bicep`, actionlint-style review of workflows, secret scan.
- Risks: (1) Container Apps env change creates a new revision, so the flag flip is not instant (accepted, D5); (2) revision labels require `Multiple` mode and label/traffic handling is easy to misconfigure — the first rollout needs a documented bootstrap; (3) `/config.json` must never be cached; (4) texture size on mobile; (5) r3f with the project's `latest` React pinning; (6) deleting canary removes the existing release path — replacement must land in the same PR; (7) jsdom has no WebGL, so tests mock the canvas.
- Rollback: feature → set flag off via workflow; deployment → rerun swap; code → revert PR (flag defaults off).

## 6. Corrections to earlier plan versions / deviations

- `infra/appservice.bicep` now exists at base but is unrelated to Container Apps; it is explicitly denied rather than used.
- The issue's path guess `frontend/src/utils/globeLayout*.ts` etc. is kept; scope was widened to include Docker/nginx runtime config and workflow files because D1/D5 require them.
- Criteria tightened beyond the issue text (flagged for reviewers): measurable bundle criterion (SC-004), fail-closed flag, reduced-motion, texture-failure handling.

## 7. Open human decisions

None. Review items: confirm the recommendations in section 2 and the scope in section 4.
