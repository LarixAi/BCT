# PROD-1 — CI reliability register

**Status:** Open — track, do not mix into wrap PRs  
**Opened:** 17 August 2026  
**Authority:** [veyvio-production-readiness-blueprint.md](./veyvio-production-readiness-blueprint.md) PR-05 / PR-09

These are **security-gate reliability** items. They are not wrap regressions and must not be “fixed” by loosening tenant-isolation assertions.

Programme counter stays at the last **merged** wrap. A wrap PR that is open or that failed required gates does not move the importer count.

---

## TI-401 — unexpected hosted 401 / auth-state nondeterminism

**Class:** hosted Command API smoke (tenant-isolation job)  
**Not:** wrap-batch regressions. Do not reopen wrap PRs for these.

Four CI runs that did not modify the failing paths have now received unexpected **401** from hosted Command API. Treat this as **auth/session-state nondeterminism** on the live probe, not a wrap defect. **Hosted-auth investigation is open** (see below).

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

A, B, C, and D are **four different assertions**. Do not treat this as a single mismatched 403.

### Hosted-auth investigation (open)

`defectsHub` / vehicle profile use `authenticate()` → `auth.getUser(accessToken)` and map failure to `401` `unauthenticated`. The smoke currently asserts status only, so incident bodies were not captured.

**Working hypothesis (not proven):** concurrent PR CI jobs share the same hosted Org A/B isolation users. Workflow concurrency is `ci-${{ github.workflow }}-${{ github.ref }}`, so **different PRs run the hosted smoke in parallel**. A second login can rotate/invalidate the first job’s session mid-probe. Incidents C and D overlapped in wall clock.

**Next (separate PRs, do not mix into wrap batches):**

1. Serialize the tenant-isolation job across refs (`concurrency.group` for the hosted smoke, `cancel-in-progress: false`).
2. Include JSON `code` in unexpected-401 assertion messages (do **not** loosen expected statuses).
3. Confirm deployed `command-api` revision vs the PR under test.
4. Third wrap-PR 401 after serialization is in place → inspect GoTrue `getUser` / JWT issuance on the hosted project.

Related (do not conflate): push-workflow tenant-isolation on `phase0/reproducibility` has 401’d on Org A job-execution reads (`c605e33` and later). That is the **push** job, not these PR probes.

**Do not close TI-401** until either consecutive wrap PRs complete tenant-isolation without unexpected 401s, or the hosted cause is identified and fixed with a regression test. Do not merge wrap PRs on a failed tenant-isolation job.

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

**Fix:** pin `supabase/setup-cli` to an explicit CLI version (PR #11, `2.114.0`). Storage isolation on that PR **passed** the JWT matrix with the pin. Until #11 merges, a storage-isolation fail at setup-cli is tooling, not a tenant-storage proof failure. #11 tenant-isolation failure is TI-401 Incident D, not CI-CLI-001.

---

Do not mix these items into Batch 05 or later wrap PRs.
