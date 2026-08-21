# PROD-1 — CI reliability register

**Status:** Open — track, do not mix into wrap PRs  
**Opened:** 17 August 2026  
**Authority:** [veyvio-production-readiness-blueprint.md](./veyvio-production-readiness-blueprint.md) PR-05 / PR-09

These are **security-gate reliability** items. They are not wrap regressions and must not be “fixed” by loosening tenant-isolation assertions.

Programme counter stays at the last **merged** wrap. A wrap PR that is open, that failed required gates, or whose tenant-isolation job was **cancelled before the smoke ran** does not move the importer count.

**Do not** add retries inside the tenant-isolation smoke, treat 401 as transient, or weaken expected `200` / `403` responses.

Batch 11 is **closed** at `aa02c19`. TI-401 stays open. CI-CANCEL-001 stays separate. Do not mix TI-401 into wrap PRs. **Wave 3F is LOCKED** (Gate A engineering on `prod1/gate-a-engineering-close` / `be78bd9+`); next programme merge is Gate A release SHA onto the production authority branch — not Batch 12 wrap.

---

## TI-401 — unexpected hosted 401 / auth-state nondeterminism

**Class:** hosted Command API smoke (tenant-isolation job)  
**Not:** wrap-batch regressions. Do not reopen wrap PRs for these.

Five CI runs that did not modify the failing paths have now received unexpected **401** from hosted Command API. Treat this as **auth/session-state nondeterminism** on the live probe, not a wrap defect. **Hosted-auth investigation is open** (see below).

### Incident A — yard mutation company-mismatch (`401` vs expected `403`)

| Field | Value |
|-------|--------|
| First seen | PR #8 CI run `32072240459`, job `95517786018` (first pass) |
| SHA under test | `097638b7a058a99667b394276b0fecfc2a4da4e5` (Batch 04 `vehicle-reports`) |
| Probe | `POST /yard/mutations` as Org B with `companyId` = Org A |
| Expected | `403` + `code: company_mismatch` |
| Actual | `401` |
| Retry | Failed-job rerun, same run, no code change: **PASS** in 5m59s |
| Hosted vs PR | Live Command API. PR #8 did not touch `yard-mutation-handlers`. |

### Incident B — Org B vehicle list (`401` vs expected `200`)

| Field | Value |
|-------|--------|
| First seen | PR #9 CI run `32101846411`, job `95603738559` |
| SHA under test | `035349452228e138145181571f28836447b7117d` (Batch 05 `driver-activation-release`) |
| Probe | `GET /vehicles/profiles` as Org B (`tenant-isolation-smoke.mjs`: `Org B vehicle list failed`) |
| Expected | `200` |
| Actual | `401` |
| Hosted vs PR | Live Command API. PR #9 did not touch vehicle list / `command-api` vehicle routes. |

Incident B is **not** the same assertion as Incident A. Same class of failure: authenticated Org session received 401 on a path the wrap PR did not change.

### Incident C — Org B defects hub (`401` vs expected `200`)

| Field | Value |
|-------|--------|
| First seen | PR #10 CI run `32103102137`, job `95607293406` |
| SHA under test | `f85b0985c95bd0155826b7cdc8067f98b05d9849` (docs-only reliability register) |
| Probe | `GET /defects/hub` as Org B (`tenant-isolation-smoke.mjs`: `defects hub failed`) |
| Expected | `200` |
| Actual | `401` |
| Same-run context | Smoke had already passed Org B login, own-vehicle read, and vehicle list (Incident B’s assertion). Failure was ~60s after job start. |
| Retry | Failed-job rerun, same SHA, no code change: **PASS** in 5m40s (job `95608155690`) |
| Hosted vs PR | Live Command API. PR #10 changed only this reliability doc. |

### Incident D — Org A own vehicle (`401` vs expected `200`)

| Field | Value |
|-------|--------|
| First seen | PR #11 CI run `32103131978`, job `95607374998` |
| SHA under test | `b522b2cd693f2f5bb1ce860c004a24b4540f37ef` (Supabase CLI pin only) |
| Probe | `GET /vehicles/{id}/profile` as Org A (`Org A should read own vehicle`) |
| Expected | `200` |
| Actual | `401` |
| Same-run context | Login had succeeded (`accessToken` present); the first authenticated Command API read then returned 401. |
| Hosted vs PR | Live Command API. PR #11 does not touch auth or vehicle routes. Overlapped Incident C’s first pass and its rerun. |

### Incident E — command admin yard hub (`401` vs expected `200`)

| Field | Value |
|-------|--------|
| First seen | PR #12 CI run `32103918752`, job `95609562983` |
| SHA under test | `9eec7e92603c48baa84ce786f351d08cb0602436` (docs-only TI-401 investigation) |
| Probe | `GET /yard/hub` as Org A (`tenant-isolation-smoke.mjs`: `command admin should reach yard/hub`) |
| Expected | `200` |
| Actual | `401` |
| Hosted vs PR | Live Command API. PR #12 changed only this reliability doc. |

Incident E is a **fifth** distinct assertion. It strengthens hosted 401/auth-state nondeterminism. It does **not** by itself prove the concurrency hypothesis.

A–E are **five different assertions**. Do not treat this as a single mismatched 403.

### Hosted-auth investigation (open)

`defectsHub` / vehicle profile / `yardHub` use `authenticate()` → `auth.getUser(accessToken)` and map failure to `401` `unauthenticated`. Unexpected-401 assertion messages now include JSON `code`, `authStage`, correlation id, deployment SHA, and body shape (`command-api` vs non-command/gateway). Expected statuses are unchanged (`200` / `403`).

**Working hypothesis (not proven):** concurrent PR CI jobs share the same hosted Org A/B isolation users. Workflow concurrency is `ci-${{ github.workflow }}-${{ github.ref }}`, so **different PRs run the hosted smoke in parallel**. A second login can rotate/invalidate the first job’s session mid-probe. Incidents C and D overlapped in wall clock. Incident E is additional nondeterminism evidence, not a concurrency proof.

**Landed:** PR #13 merged `6f79bc8` — job-level `tenant-isolation-hosted-smoke` with `cancel-in-progress: false`. Fresh evidence must come from **new** runs whose merge ref includes that workflow, not reruns of pre-#13 jobs.

**First post-#13 required-gate run:** PR #11 head `7042272` / run `32167704405` — tenant-isolation, fresh-DB, and storage isolation **PASS**. That is consistent with serialization helping; it is not closure of TI-401.

**Instrumentation (this package):** `authStage` (`missing_bearer` / `getUser` / `membership` / `support` / `company`); `correlationId` on 401/403 JSON and `x-veyvio-request-id`; `/health` reports `deploymentSha` / `denoDeploymentId`; smoke logs hosted revision vs `GITHUB_SHA` (mismatch is a note, not a pass).

Serialization reduced one credible interference source. Incidents A–E still show a recurring hosted-auth 401 signature across unrelated assertions. **Concurrency is not declared the sole cause. TI-401 stays open.**

**Next (do not mix into wrap batches):**

1. ~~Serialize the tenant-isolation job across refs~~ — done, PR #13.
2. ~~Include JSON `code` in unexpected-401 assertion messages~~ — done (do **not** loosen expected statuses).
3. ~~Confirm deployed `command-api` revision vs the PR under test~~ — health/smoke compare SHA; hosted proof still requires deploy.
4. Unexpected 401 **after** serialization is in the merge ref → inspect GoTrue `getUser` / JWT issuance on the hosted project.

Related (do not conflate): push-workflow tenant-isolation on `phase0/reproducibility` has 401’d on Org A job-execution reads (`c605e33` and later). That is the **push** job, not these PR probes.

**Do not close TI-401** until either consecutive wrap PRs complete tenant-isolation without unexpected 401s, or the hosted cause is identified and fixed with a regression test. Do not merge wrap PRs on a failed tenant-isolation job. A cancelled job is not an unexpected 401 — see CI-CANCEL-001.

---

## CI-CLI-001 — `supabase/setup-cli@v1` `version: latest` rate-limit

**Class:** CI/tooling reliability  
**Not:** TI-401. **Not:** Batch 05.

| Field | Value |
|-------|--------|
| First seen | PR #9 CI run `32101846411`, job `95603738506` (Admin storage isolation) |
| Failure | `supabase/setup-cli@v1` could not resolve `latest` (`rate limit exceeded`) |
| Effect | Storage isolation never ran the storage JWT matrix |
| Contrast | Fresh-DB on the same run used the same action and passed |

Required security gates must not depend on GitHub resolving a floating CLI tag at job start.

**Fix:** pin `supabase/setup-cli` to **2.114.0**. Merged as PR #11 (`f1eb77f`) after a **fresh** required-gate run on the post-#13 merge ref (`7042272` / run `32167704405`): fresh-DB, storage isolation, and tenant-isolation all PASS. The earlier #11 tenant-isolation failure (Incident D) was on the pre-#13 workflow and is TI-401, not CI-CLI-001.

---

## CI-CANCEL-001 — hosted-smoke job cancelled before execution

**Class:** CI/tooling topology  
**Not:** TI-401. **Not:** wrap-batch regressions. **Not:** a pass.

| Field | Value |
|-------|--------|
| First seen | PR #9 run `32170376936` attempt 1, job `95819831931` |
| SHA under test | `22d5a44c98ffd531e6d03002db596c9099e1c979` (Batch 05 on post-#13/#11/#12 base) |
| Failure | Tenant-isolation job **cancelled** in 38s with empty steps; smoke never ran |
| Contrast | Fresh-DB and storage isolation on the same attempt **passed** |
| Retry | Attempt 2 on the **same** SHA after the queue cleared: tenant-isolation **PASS** in 8m14s |

Merging to `phase0/reproducibility` still fires **both** a `push` CI run and the phase0→main pull_request CI run. Both jobs use `tenant-isolation-hosted-smoke`. GitHub cancels a **previously pending** job in that group even when `cancel-in-progress: false` (that flag only protects the in-progress job).

**Mitigation (current):** keep `cancel-in-progress: false` on the global TI group; treat cancelled jobs as “gate not satisfied — requeue”, never as TI-401. Top-level workflow concurrency (`ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`) may still cancel a *superseded* run on the same ref (new push to the same PR) — intentional.

**Required outcome:** gate not satisfied; rerun under a clear queue. Do not invent a 401 incident from a cancellation. Do not add smoke-level retries. Do not weaken `200`/`403` assertions.

Batch 05 merged only after attempt 2 produced a real tenant-isolation execution.

---

Do not mix these items into wrap PRs. Wave 3F is LOCKED — do not reopen Batch 12 wraps for TI-401.
