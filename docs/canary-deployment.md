# Canary deployment runbook

Deploying and releasing become two separate actions. A push creates a **revision**
that exists but takes no traffic; a human decides when traffic moves to it.

```
Deploy   ->  revision exists at 0% traffic     (automatic, on merge)
Release  ->  traffic dial moves to it          (manual, this runbook)
```

Work through the steps in order. **Each step has a check — don't move on until
the check passes.**

---

## Step 0 — Record the starting state

```bash
RG=<your resource group>       # vars.AZURE_RESOURCE_GROUP
APP=<your app name>            # vars.APP_NAME

az containerapp show -n "$APP" -g "$RG" \
  --query properties.configuration.activeRevisionsMode -o tsv

az containerapp revision list -n "$APP" -g "$RG" -o table
```

**Check:** mode prints `Single`, and exactly one revision is active. Write that
revision's name down — Step 3 needs it.

Also open the production URL in a browser and note what `/` returns. See
[Known issue: ingress port](#known-issue-ingress-port) before assuming a 404 is
your fault.

---

## Step 1 — Deploy the Bicep changes

`infra/main.bicep` now sets `activeRevisionsMode: 'Multiple'` and enables sticky
sessions. Run the **Deploy Infraestructure** workflow, leaving
`routeTrafficToLatestRevision` at its default of `false`… *except on the very
first run after this change*, where it must be `true` — see below.

Because no revision has traffic pinned to it yet at this point, run it once with
`routeTrafficToLatestRevision = true` so the app keeps serving during the mode
switch.

```
Actions -> Deploy Infraestructure -> Run workflow
  routeTrafficToLatestRevision: true
```

**Check:**

```bash
az containerapp show -n "$APP" -g "$RG" \
  --query properties.configuration.activeRevisionsMode -o tsv
```

prints `Multiple`, and the app still loads in a browser.

> The workflow no longer hardcodes the hello-world image — it reads whatever
> image is currently running and redeploys that, so infrastructure changes never
> replace the application.

---

## Step 2 — Hand traffic control to the pipeline

Traffic currently follows "latest", which means the next deploy would still take
100% instantly. Pin it to the revision name from Step 0:

```bash
STABLE=$(az containerapp revision list -n "$APP" -g "$RG" \
  --query "[?properties.active].name | [0]" -o tsv)

az containerapp ingress traffic set -n "$APP" -g "$RG" \
  --revision-weight "$STABLE=100"
```

**Check:**

```bash
az containerapp ingress traffic show -n "$APP" -g "$RG" -o table
```

shows one row with your revision **name** and weight 100 — *not* the word
`latest`. This is the step that arms the canary: from here on, new revisions are
born at 0%.

From now on always run the infrastructure workflow with
`routeTrafficToLatestRevision = false` (the default), so it stops redeclaring
weights.

---

## Step 3 — Deploy a candidate

Merge anything to `main`. CI runs, then CD publishes the image and creates a
revision named `<app>--c<short-sha>-<run-number>`.

**Check:** the CD run summary shows `Traffic: 0%` and a candidate URL, and:

```bash
az containerapp revision list -n "$APP" -g "$RG" -o table
```

lists **two** active revisions — the old one at 100%, the new one at 0%. Your
production URL still serves the old version. That is a successful canary deploy:
deployed, not released.

---

## Step 4 — Look at the candidate

CD labels the new revision `canary`, giving it its own hostname:

```
https://<app>---canary.<region>.azurecontainerapps.io
```

CD already smoke-tests that this returns 200 and fails the job if not. Open it
yourself and click through the change.

**Check:** the candidate URL shows the new version while the production URL still
shows the old one. Two versions live at once.

---

## Step 5 — Shift a little traffic

```
Actions -> Canary Traffic -> Run workflow
  action: shift
  percent: 10
```

The job runs in the `Production` environment, so it waits for approval if
you configured a required reviewer (recommended — see
[Setup](#one-time-setup) below).

**Check:** the run summary prints the resulting split (canary 10 / stable 90).
Load the production URL in several **fresh incognito windows** — roughly one in
ten shows the new version. Plain refreshes will not work: sticky sessions pin you
to one revision once you land.

---

## Step 6 — Practise the rollback

Do this once deliberately, before you ever need it.

```
Actions -> Canary Traffic -> Run workflow
  action: rollback
```

**Check:** production is 100% old version again within seconds, with no rebuild.
A rollback path you have never executed is not a rollback path.

---

## Step 7 — Promote

When you are satisfied, either raise the percentage in stages (25 → 50 → 100) or
promote directly:

```
Actions -> Canary Traffic -> Run workflow
  action: promote
```

This sets the canary to 100% and **deactivates** (does not delete) the old
revision, so reactivating is faster than rebuilding if something surfaces later.

**Check:** `az containerapp ingress traffic show` lists the canary at 100%, and
`az containerapp revision list` shows the old revision as inactive.

---

## One-time setup

**Required reviewer.** Create a GitHub Environment named `Production`
(Settings → Environments) and add yourself as a required reviewer. Without it the
Canary Traffic workflow shifts traffic the moment it is dispatched.

**Gate CD on `main`.** `ci.yml` triggers on `pull_request` and `cd.yml` listens to
`workflow_run` with no branch filter, so today *any* green PR deploys. Add a
branch condition before relying on this, or your candidate could be someone's
half-finished branch. Not changed here because it alters when deploys happen,
which is a decision worth making on purpose.

---

## What "healthy" means

Right now the only automated signal is the CD smoke test: does the candidate
return 200. That is a liveness check, not a quality signal — it would not catch a
raised error rate or a latency regression.

A real canary decision needs error-rate and latency comparison between revisions,
from Container Apps metrics or Application Insights. Until that exists, Step 5's
check is *you looking at it*. Worth being honest about which one you are
demonstrating.

---

## Known issue: ingress port

`containerPort` defaults to `8080`, so ingress targets 8080 — but in
`frontend/nginx.conf` port 8080 serves only `/health` and returns **404 for `/`**
(the app is served on 8443). Confirm what production actually returns at `/`
before building expectations on the smoke test, otherwise you cannot tell "bad
candidate" from "always been this way".

Left unchanged here because fixing it changes how the app is served, which
belongs in its own change rather than buried in a canary PR.

---

## Cost

Two revisions running at once doubles compute while the canary is open, but
`minReplicas: 0` means idle revisions cost nothing, and the Container Apps
Consumption plan includes a monthly free grant (180,000 vCPU-seconds /
360,000 GiB-seconds). At 0.25 vCPU and 0.5 GiB that is roughly 200 hours of a
single replica per month — a canary window of minutes is far inside it. Traffic
splitting itself is a configuration setting and costs nothing.

Do not raise `minReplicas` above 0 without rechecking that maths.
