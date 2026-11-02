# Plan: 3D Multiverse Globe Map with Blue/Green Release (issue #50)

Acceptance criteria live in [spec.md](./spec.md) → *Success Criteria* (SC-001…SC-010) and the *Acceptance Scenarios* of User Stories 1–4. This plan does not restate them.

Issue snapshot: `specs/issue-50/issue-snapshot.json`. Base commit: see `planner-handoff.json`.

## 1. 4R packet

**Requirements** — issue #50 plus requester answers: flag from a `.env` file; Azure Container Apps; 3D library + NASA texture confirmed; the existing canary workflow "will be deleted". Requester asked "Suggestions?" on the `.env` interpretation (answered in §3, A1).

**Repository evidence (verified by reading files)**
- `frontend/src/types/view.ts`: `View` already has `'multiverse-map'`; `App.tsx` renders `<MultiverseMapView />` from a `viewRegistry`; `Header.tsx` has a "Multiverse Map" nav button.
- `frontend/src/components/MultiverseMapView.tsx` owns data loading (all `fetchLocations` pages), selection, and uses `LoadingPortal`, `ErrorState`, `EmptyState`, `LocationDetailPanel`, `MultiverseMap` (2D).
- `frontend/src/utils/multiverseLayout.ts` (+ test): deterministic phyllotaxis 2D layout (reusable approach for globe layout).
- Feature flags: `types/featureFlag.ts` (`'characterModalV2' | 'myMultiverse'`), strategy pattern in `services/featureFlags/*` (`environment`, `static`, `composite`), `hooks/useFeatureFlag.ts`, `context/FeatureFlagsProvider.tsx`, composed in `main.tsx` via `createDefaultFeatureFlagStrategy()`. The environment strategy reads Vite build-time `VITE_FEATURE_*`; `frontend/Dockerfile` passes them as build args.
- `frontend/Dockerfile`: multi-stage, final `nginx:1.27-alpine`, serves `/usr/share/nginx/html`, port 8080 (`/health`), 8443 TLS. No `frontend/public/` directory yet.
- `infra/main.bicep`: Container App, `activeRevisionsMode: 'Multiple'`, `routeTrafficToLatestRevision` bootstrap param; `infra/appservice.bicep` is **not** in the repo (the issue's path guess is stale; only `main.bicep` exists).
- `.github/workflows/cd.yml`: publishes image to GHCR, deploys a 0%-traffic revision, labels it `canary`, smoke-tests. `infra.yml`: validates/deploys `main.bicep`, preserving the running image. `ci.yml` exists. The "Canary Traffic" workflow described in `docs/canary-deployment.md` is **not** present in `.github/workflows/`.
- Canary references exist only in `cd.yml`, `infra/main.bicep` (comments/param docs) and `docs/canary-deployment.md`.

**Rules** — `.specify/memory/constitution.md`: tests + build must pass (III), secrets never committed (II), settings configurable not hard-coded, CI/deploy workflow changes checked without exposing credentials, spec-first, agents never approve/merge/deploy (VII). Planner write scope: `specs/**` only.

**Results expected** — see spec SC-001…SC-010.

## 2. Verified facts vs assumptions vs recommendations

**Verified**: items in §1 above.
**Assumptions** (A-numbers match spec.md): A1 runtime flag mechanism; A2 shared data; A3 switch inside Multiverse Map; A4 delete canary; A5 confirmed library/texture; A6 arbitrary stable placement. A7 (new): the GitHub `production` environment and Azure OIDC variables already used by `cd.yml`/`infra.yml` remain available; no new secrets are needed.
**Recommendations**: below.

## 3. Design

### 3.1 Frontend (3D view)
- **Library** (confirmed): `three` + `@react-three/fiber` + `@react-three/drei` (OrbitControls gives mouse + touch rotate/zoom/tilt out of the box). Justification goes in the PR: no maintained lighter alternative provides orbit controls + touch; cost contained by lazy loading.
- `React.lazy` + `Suspense` for `MultiverseGlobe` so the 3D chunk and texture load only when the 3D view is opened (SC-004). Verify with `vite build` output / chunk inspection.
- `frontend/src/utils/globeLayout.ts` (+ `globeLayout.test.ts`): pure `locationToGlobePosition(id, index?)` → `{lat, lng}` using a Fibonacci-sphere distribution keyed on a stable integer hash of `id` (reuse the hash idea in `multiverseLayout.ts`; do not depend on page index so position survives re-fetch ordering), plus `latLngToVector3`. Tests: determinism, range bounds, uniqueness for distinct ids, empty/duplicate/NaN inputs, large sets.
- `MultiverseGlobe.tsx` (scene: textured sphere, atmosphere shader/glow, starfield, markers, OrbitControls with damping, reduced-motion respected), `MultiverseGlobeFallback.tsx` (WebGL missing/error: accessible `role="status"` text + button to 2D), a WebGL-capability helper and error boundary.
- `MultiverseMapView.tsx`: keep existing loading/error/empty/detail logic; add a 2D/3D toggle (only when the flag is on) that swaps the `MultiverseMap` child for the lazy globe, sharing `locations`/`selectedLocation`. 2D rendering path remains byte-for-byte equivalent when flag is off.
- Flag: add `'multiverseGlobe'` to `FeatureFlagKey`; map it in the environment strategy; default off in the default composite.
- Texture: NASA Blue Marble (public domain) placed at `frontend/public/textures/earth-blue-marble.jpg` (≈ 2k, size-budgeted, ≤ ~500 KB), attribution in `docs/third-party-assets.md` and an in-app credit. Planner cannot add binaries; the implementer must fetch from the NASA source URL and record it.
- Tests: Vitest with a mocked/stubbed globe component (jsdom has no WebGL): flag-off → no toggle; flag-on → toggle, lazy load, marker select opens `LocationDetailPanel`; WebGL-unavailable fallback; loading/error/empty. Existing `MultiverseMap.test.tsx` and all current tests unchanged.

### 3.2 Runtime flag from `.env` (answer to "Suggestions?")
**Recommendation (A1).** Vite inlines `VITE_*` at build time, so a `.env` consumed by `vite build` cannot flip without a new image. Instead:
1. Add `frontend/docker-entrypoint.d/40-runtime-config.sh` (nginx image runs `/docker-entrypoint.d/*.sh` at start). It writes `/usr/share/nginx/html/config.json` from `FEATURE_*` env vars using an allow-list of known flag names (values validated to true/false; never dumps the whole environment).
2. Add an `runtimeFeatureFlagStrategy` that fetches `/config.json` once at startup (`cache: 'no-store'`), failing closed (flag off on any error/malformed value), placed first in the composite; `VITE_*` and defaults remain fallbacks. `main.tsx` awaits/handles the load without blocking render beyond a short timeout.
3. nginx: serve `/config.json` with `Cache-Control: no-store`.
4. Locally, `docker run --env-file .env` or compose `env_file` supplies `FEATURE_MULTIVERSE_GLOBE=true`; in Azure the same variable is a Container App env var (non-secret). Provide `.env.example`; real `.env` stays git-ignored (verify `.gitignore`).
5. A small `Set feature flag` workflow (`workflow_dispatch`, input flag + on/off, `production` environment approval) runs `az containerapp update --set-env-vars FEATURE_MULTIVERSE_GLOBE=…` on the live revision, i.e. no image build/CI. **Known limitation to confirm:** in Multiple-revisions mode an env-var change creates a new revision; the workflow must therefore re-label and re-point traffic (a mini Blue/Green swap on the same image), taking seconds–a-minute, not strictly instantaneous. If truly instant, build-independent toggling is required, the alternative is Azure App Configuration (runtime fetch) — more infra and a different decision than the requester's `.env` choice, so it is documented as a future option, not planned.

### 3.3 Blue/Green on Azure Container Apps (revision labels)
- Keep one Container App in `Multiple` mode. Two labels, `blue` and `green`, point to two revisions. Production ingress weights: 100% to the label currently marked live; the other label is reachable at `https://<app>---<label>.<env-domain>` for verification at 0%.
- `infra/main.bicep`: remove canary wording; parameterize `liveLabel` (`blue|green`), set `ingress.traffic` with `label` entries (weights 100/0) and a tag recording the live color. Bootstrap flag (`routeTrafficToLatestRevision`) retired or renamed with docs. Keep identity/environment resources unchanged. Optional: `infra/` split into modules only if needed.
- `.github/workflows/cd.yml` (rewritten; replaces canary): after CI success on `main` → publish image → determine inactive label (read current traffic via `az containerapp ingress traffic show`) → `az containerapp update --revision-suffix` new revision → `az containerapp revision label add` to the inactive label (moving it) → smoke test inactive URL (`/health` and `/` and `/config.json` shape) → stop with summary. **No traffic change**, flag value copied unchanged from live (defaults off).
- New `.github/workflows/bluegreen-swap.yml` (`workflow_dispatch`, `production` environment for human approval): re-checks inactive smoke test, then `az containerapp ingress traffic set --label-weight <new>=100 <old>=0`; rollback is the same workflow run again (swap back). Concurrency group prevents parallel swaps.
- Delete canary pieces: `docs/canary-deployment.md` (replaced by `docs/blue-green-deployment.md`), canary label/steps in `cd.yml`, canary text in `main.bicep`. `infra.yml` updated for new params and made to preserve current labels/traffic (must not reset traffic on infra deploys); add an `az bicep build infra/main.bicep` step to validate (CI or infra workflow).
- No secrets in repo: reuse `vars.AZURE_*` + OIDC; all new values are non-secret.

### 3.4 Docs
`docs/blue-green-deployment.md` (deploy, verify, swap, rollback, one-time bootstrap, Azure CLI check commands), flag section (turn on/off, `.env`/env-var names, limitation above), `docs/third-party-assets.md` (texture + library licences: three MIT, r3f MIT, drei MIT, NASA public domain).

## 4. Paths and operations

**Allowed (implementation stage, not this planner run)**
- `frontend/src/components/MultiverseGlobe*.tsx`, `MultiverseMapView.tsx`, `Header.tsx` (only if needed), `frontend/src/utils/globeLayout*.ts`, `frontend/src/types/featureFlag.ts`, `frontend/src/services/featureFlags/**`, `frontend/src/main.tsx`, `frontend/src/App.tsx` (only if needed), `frontend/src/styles.css`, tests alongside, `frontend/public/**`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/docker-entrypoint.d/**`, `frontend/package.json`, `frontend/package-lock.json`, `.env.example`
- `infra/main.bicep` (the issue's `infra/appservice.bicep` does not exist)
- `.github/workflows/cd.yml`, `infra.yml`, new `bluegreen-swap.yml`, new `set-feature-flag.yml`; `ci.yml` only if a Bicep build step is added there
- `docs/blue-green-deployment.md`, `docs/third-party-assets.md`, deletion of `docs/canary-deployment.md`

**Denied**: `backend/**`; `.github/agents/**`, `.github/workflows/agent-*.{md,yml}`; `.specify/**`; any secret/credential files; changes to the 2D map files (`MultiverseMap.tsx`, `multiverseLayout.ts`) beyond import-neutral wiring; auto-merge/deploy/approval actions; unrelated dependency upgrades.

**Dependencies to add**: `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` (dev). Pin versions compatible with the installed React major (the repo uses `latest` for React — verify peer-dependency compatibility with `npm ls` before adopting; if incompatible, pin the React-compatible release).

## 5. Validation (to run in the implementation stage)
`npm run lint`, `npm test`, `npm run build` in `frontend/`; inspect build output to confirm the 3D chunk is separate; `az bicep build --file infra/main.bicep`; workflow lint (`actionlint` if available); `docker build` + `docker run -e FEATURE_MULTIVERSE_GLOBE=true` curl `/config.json`; secret scan of diff; manual touch/mobile check. Anything not runnable must be stated in the PR.

## 6. Risks and rollback
| Risk | Mitigation |
|---|---|
| Env-var change creates a new revision (flag not instant) | Documented; Set-flag workflow automates label re-point; App Configuration listed as future option |
| Traffic reset by `infra.yml`/Bicep redeploy | Bicep reads/sets live label explicitly; infra workflow resolves current live label first; documented bootstrap |
| Deleting canary breaks pipeline | Rewrite CD and swap workflow in the same change; dry-run via `workflow_dispatch` on a non-prod app name if available |
| WebGL/perf on low-end mobile | Capped texture size, marker count budget, fallback, reduced motion |
| Bundle bloat | Lazy chunk; check build output |
| React `latest` peer-dep mismatch with r3f | Verify before adding; pin |
| Cannot test Azure flows from CI sandbox | State in PR; human runs first deploy/swap |
**Rollback**: flag off (Set-flag workflow or remove env var) → swap traffic back to the previous label → revert PR. The 2D map is unaffected throughout.

## 7. Assumptions / deviations from the issue (for the reviewer)
- Spec tightened beyond the issue's literal text: SC-002 adds duplicate/empty/large unit-test cases; SC-004 adds "no 3D code/texture requested with flag off" (measurable form of "lazy-loaded / off by default"); SC-005 "2D reachable within one interaction"; edge cases for reduced motion, keyboard/screen-reader, texture failure and malformed flag (fail closed); FR-014 records the requester's comment that the canary workflow is deleted.
- Issue path `infra/appservice.bicep` does not exist; only `infra/main.bicep` is in scope.
- A1 interpretation (runtime `FEATURE_*` env rendered to `/config.json`) is a planner recommendation; it deviates from a literal build-time `.env` because that cannot satisfy "flag turned on independently of deployment".
- The flag flip via env var creates a new revision (see §3.2 limitation).

## 8. Human review required
Confirm: (1) A1 runtime `.env`/env-var mechanism and its non-instant limitation; (2) deletion of canary assets (A4) and the replacement workflow names; (3) approval of the exact spec/plan hashes in `planner-handoff.json` before implementation. This plan is not an approval.
