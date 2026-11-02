# Implementation Plan: 3D Multiverse Globe Map (Issue #50)

**Spec**: [spec.md](./spec.md) — acceptance criteria are the spec's *Success Criteria* and *Acceptance Scenarios*; they are referenced here, not restated.
**Issue snapshot**: `specs/issue-50/issue-snapshot.json`
**Status**: Ready for human review. This plan is not an approval.

## 1. Verified facts (observed in repo at base commit)

- Frontend is React + TypeScript + Vite; `frontend/package.json` has no 3D library. Tests: `npm test` (vitest), lint `npm run lint`, build `npm run build`.
- 2D map: `frontend/src/components/MultiverseMapView.tsx` loads all location pages, and already reuses `LoadingPortal`, `ErrorState`, `EmptyState`, `LocationDetailPanel`; layout in `frontend/src/utils/multiverseLayout.ts` (+ test). `View` in `frontend/src/types/view.ts` already has `'multiverse-map'`.
- Feature flags: strategy pattern in `frontend/src/services/featureFlags/` (`environment`, `static`, `composite`), keys in `types/featureFlag.ts` (`characterModalV2`, `myMultiverse`), read from build-time `VITE_FEATURE_*` (`frontend/.env.example`, `frontend/Dockerfile` build args).
- Infra: `infra/main.bicep` is an Azure Container App (`activeRevisionsMode: 'Multiple'`, bootstrap traffic param); `infra/appservice.bicep` exists but is unused by CD. `.github/workflows/cd.yml` publishes to GHCR, deploys a 0%-traffic labelled `canary` revision, smoke-tests it. `docs/canary-deployment.md` is the existing runbook. `infra.yml` deploys the Bicep.
- No Blue/Green workflow exists.

## 2. Human decisions (issue comments, 2026-11-02)

1. Runtime flag source: **`.env` file**.
2. Blue/Green platform: **Azure Container Apps**.
3. 3D library and NASA texture: **confirmed**.

## 3. Assumptions and deviations (flagged for the reviewer)

- **A1 (interpretation of decision 1)**: Existing `.env` flags are build-time, which cannot satisfy spec FR-013/SC-008 (flip without new image). The plan keeps `.env`-style variables as the *source of truth* but reads them at **container start**: the same variable names (`FEATURE_*`) in a `.env` file locally (docker compose `env_file`) and as Container App environment variables in Azure; the Nginx container entrypoint renders them into `/config.json`; the app fetches it at startup via a new runtime strategy placed first in the composite. Build-time `VITE_FEATURE_*` remains as fallback. If the human meant build-time only, FR-013/SC-008 cannot be met — reviewer please confirm.
- **A2**: Acceptance criteria added/reworded beyond the issue text (also in handoff notes): reduced-motion, keyboard access/list alternative, unparseable flag = off, SC-008 flip-without-rebuild, SC-004 verifiable lazy loading, 2D-restoring rollback evidenced in a non-production run.
- **A3**: The issue lists `infra/appservice.bicep`; because the platform is Container Apps it is expected to stay **untouched** (scope narrowed).
- **A4**: Blue/Green on Container Apps is realised with two revision labels (`blue`, `green`) on `Multiple`-revision mode; the live label receives 100% traffic and the other 0%. Swap = weight change. This coexists with (and the new workflow supersedes for releases) the existing canary flow; `cd.yml` is not removed (decision for reviewer: keep canary as is, or retire).
- **A5 (library)**: `three` + `@react-three/fiber` + `@react-three/drei` (OrbitControls: mouse drag/wheel/tilt and touch drag/pinch built in; MIT). Alternative considered: `globe.gl`/`react-globe.gl` (less control over atmosphere and marker interaction). Lazy-loaded via `React.lazy` + dynamic import, in its own chunk.
- **A6 (texture)**: NASA Blue Marble (public domain) at ≤2k px, stored in `frontend/public/textures/`; attribution in `docs/third-party-assets.md`. Starfield and atmosphere are procedural (no extra asset). Exact source URL/licence statement to be recorded by implementer from the NASA page; no asset is fetched by the planner.

## 4. Approach

### Frontend
1. `utils/globeLayout.ts` — pure `locationToGlobePosition(location)` → `{lat, lon}` via existing `hashToUnitInterval` (seeded by `location.id`; lat uniformly over sphere via `asin(2u-1)`, lon = `2πv`), plus `latLonToVector3`. Unit tests: determinism, range, distinctness over id 1..N, no NaN.
2. `components/MultiverseGlobe.tsx` (lazy chunk) — Canvas, textured sphere, atmosphere shader/glow mesh, starfield, markers (accessible keyboard-focusable list alternative), OrbitControls (damping, zoom limits, no auto-rotate when `prefers-reduced-motion`).
3. `components/MultiverseGlobeFallback.tsx` — WebGL detection; accessible message with link to 2D and a location list.
4. `MultiverseMapView.tsx` — minimal change: hold `mode: '2d' | '3d'` (default 2D) and a toggle shown only when flag on; reuse existing loading/error/empty/detail logic; 2D rendering path untouched.
5. Flag `multiverseGlobe` added to `FeatureFlagKey`, defaults off in `DEFAULT_FEATURE_FLAGS`; new `runtimeConfigFeatureFlagStrategy` (reads `/config.json`; failure/absence → no opinion → falls to build-time/default off); `main.tsx` composes `runtime > environment > defaults` and waits (bounded timeout) for the config before rendering.
6. Styles in `styles.css`; tests for toggle (flag on/off), states, fallback, strategy, layout. Three.js is mocked in jsdom tests.
7. `frontend/package.json`/`package-lock.json`: add the three libraries (justified in PR).

### Container / config
8. `frontend/Dockerfile` + `nginx.conf` + a small entrypoint script: render `FEATURE_MULTIVERSE_GLOBE` (etc.) into `/usr/share/nginx/html/config.json` (`Cache-Control: no-store`). Only whitelisted non-secret flags are emitted. `.env.example` documented; `.env` stays git-ignored.

### Infra (Bicep, `infra/main.bicep`)
9. Add parameters for env vars (`featureMultiverseGlobe`, default `false`) in container `env`, and a Blue/Green traffic parameterisation (`activeLabel` = `blue`|`green`, weights by label) so infra deployment never resets traffic. No secrets; validate with `az bicep build`.

### Workflows
10. `.github/workflows/bluegreen-deploy.yml`: build/push (reuse CI success + GHCR image), determine inactive label, deploy revision with that label at 0%, smoke test via label URL (`/` and `/config.json`), then a gated (environment approval) swap step setting 100/0 weights.
11. `.github/workflows/bluegreen-swap.yml` (manual `workflow_dispatch`): swap labels again = rollback.
12. `.github/workflows/set-feature-flag.yml` (manual): updates the Container App env var and creates a new revision without a new image; documents flag-off rollback. Production-affecting steps use a protected GitHub Environment (human approval).
13. OIDC login as in `cd.yml`; no secrets in repo.

### Docs
14. `docs/blue-green-deployment.md` (procedure, checks, rollback, flag on/off) and `docs/third-party-assets.md` (licence/attribution); cross-link from `docs/canary-deployment.md`.

## 5. Scope

**Allowed paths**: `frontend/src/**`, `frontend/public/textures/**`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/docker-entrypoint.d/**` (new), `frontend/.env.example`, `infra/main.bicep`, `.github/workflows/bluegreen-*.yml`, `.github/workflows/set-feature-flag.yml`, `docs/**`.
**Denied**: `backend/**`, `infra/appservice.bicep`, `.github/agents/**`, `.github/workflows/*.lock.yml`/`agent-*.md`, `.specify/**` constitution, any secret/credential file, existing 2D map behaviour changes.
**Denied operations**: deploying, merging, swapping traffic or changing production flags by an agent; committing secrets.

## 6. Dependencies, tests and validation

- New npm deps: `three`, `@react-three/fiber`, `@react-three/drei` (+ `@types/three`).
- Validation: `npm run lint`, `npm test`, `npm run build` (confirm 3D chunk separate from entry chunk, SC-004); `az bicep build --file infra/main.bicep`; workflow YAML lint (actionlint if available); local docker run with `.env` flip → `/config.json` changes without rebuild (SC-008).
- Map to spec: US1/US2 → SC-001,002,005,006; US3 → SC-003; US4 → SC-007,008; assets → SC-009.

## 7. Risks and rollback

| Risk | Mitigation |
|---|---|
| Bundle bloat | `React.lazy`, separate chunk, size check in PR |
| WebGL absent / low-end mobile | Fallback, ≤2k texture, capped pixel ratio |
| Config fetch delay/failure | Bounded timeout, default off |
| Traffic swap mistakes | Verify-before-swap, protected Environment, swap-again rollback |
| Swap interacts with existing canary labels | Distinct `blue`/`green` labels; documented |
| Flag change creates a revision | Documented; flag-off is also available as swap rollback |

**Rollback**: turn flag off (`set-feature-flag`), or swap traffic back; code rollback = revert PR.

## 8. Constitution check

I (focused scope), II (no secrets, non-secret flags only), III (tests + build), IV (flag/config contract explicit), V (loading/error/empty/fallback), VI (spec-first), VII (agent makes no infra/app changes; human approval gates on production). No violations; the infra/workflow changes are high-impact and require human review before implementation.

## 9. Unresolved human decisions

None blocking. Please confirm A1 (runtime read of `.env`-style variables at container start) and A4 (keep canary workflow alongside Blue/Green).
