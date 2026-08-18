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

Two wrap PRs that did not modify the failing paths have now received unexpected **401** from hosted Command API. Treat this as **auth/session-state nondeterminism** on the live probe, not a one-off CI glitch.

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

**Escalation:** a third unexpected hosted 401 on a wrap PR that did not change the failing route is enough to open a dedicated hosted-auth investigation (token issuance, MFA/tenant-selection, whether `command-api` revision matches the PR, session expiry during the smoke).

Related (do not conflate): push-workflow tenant-isolation on `phase0/reproducibility` has 401’d on Org A job-execution reads (`c605e33` and later). That is the **push** job, not these PR probes.

**Do not close TI-401** until either consecutive wrap PRs complete tenant-isolation without unexpected 401s, or the hosted cause is identified and fixed with a regression test.

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

**Fix:** pin `supabase/setup-cli` to an explicit CLI version (separate PR from wrap batches). Until that lands, a storage-isolation fail at setup-cli is tooling, not a tenant-storage proof failure.

---

Do not mix these items into Batch 05 or later wrap PRs.
