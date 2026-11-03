# Blue/Green deployment and feature flags

This replaces the former canary runbook. The app runs on Azure Container Apps in
`Multiple` revision mode. Two revision labels, `blue` and `green`, exist; exactly one
holds 100% of production traffic.

## Release

1. CD builds the image and deploys a new revision to the **inactive** label (flags unchanged).
2. Smoke-test the inactive label URL, including `/config.json` and `/health`.
3. A maintainer approves the swap (`production` environment); 100% of traffic moves to the
   new label.

Bootstrap: the first deployment uses an empty `activeLabel` in `infra/main.bicep`, which
routes traffic to the latest revision. Afterwards pass the live label as `activeLabel`.

## Rollback

Run the swap again: traffic returns to the previous label, whose revision is still running.

## Feature flags

Flags are `FEATURE_*` environment variables on the container (e.g. `FEATURE_GLOBE_3D`).
At container start `frontend/docker/40-runtime-config.sh` renders them into `/config.json`
(served with `Cache-Control: no-store`), and the frontend reads it before rendering. No
image rebuild is needed.

- Turn on: set `FEATURE_GLOBE_3D=true` on the app (a new revision is created on the active label).
- Turn off / rollback: set `FEATURE_GLOBE_3D=false`.
- Missing, malformed or unrecognised values mean **off**.
- The change is a new revision, so it is fast but not instant.

Flag precedence: `/config.json` > build-time `VITE_FEATURE_*` > default (off).

## Pending human follow-ups

The workflows `cd.yml`, `bluegreen-swap.yml`, `set-feature-flag.yml`, `infra.yml` and the
texture `frontend/public/textures/earth-blue-marble.jpg` are maintained by a human; see the
approved plan for details.
