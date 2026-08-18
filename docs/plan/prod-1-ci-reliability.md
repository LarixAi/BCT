# PROD-1 — CI reliability register

**Status:** Open — track, do not mix into wrap PRs  
**Opened:** 17 August 2026  
**Authority:** [veyvio-production-readiness-blueprint.md](./veyvio-production-readiness-blueprint.md) PR-05 / PR-09

These are **security-gate reliability** items. They are not wrap regressions and must not be “fixed” by loosening tenant-isolation assertions.

---

## TI-401 — hosted yard mutation company-mismatch returned 401 instead of 403

| Field | Value |
|-------|--------|
| First seen | PR #8 CI run `32072240459`, job `95517786018` (first pass) |
| SHA under test | `097638b7a058a99667b394276b0fecfc2a4da4e5` (Batch 04 `vehicle-reports` wrap) |
| Probe | `POST /yard/mutations` as Org B with `companyId` = Org A |
| Expected | `403` + `code: company_mismatch` (`tenant-isolation-smoke.mjs`) |
| Actual (first pass) | `401` |
| Retry | Failed-job rerun on the same run: **PASS** in 5m59s, no code change |
| Hosted vs PR | Live Command API smoke. PR #8 did not touch `yard-mutation-handlers`. |
| Verdict | Not a Batch 04 regression. Do not reopen PR #8. |

**Escalation:** if the same `401 !== 403` company-mismatch appears again on an unchanged wrap PR, treat it as evidence of **nondeterministic hosted auth / session state**, not a one-off CI anomaly. Then investigate token issuance, support-session handling, and whether `command-api` was serving a different revision than the PR.

Related (do not conflate): push-workflow tenant-isolation on `phase0/reproducibility` has separately 401’d on Org A job-execution reads (`c605e33` and later). That is the push job, not this PR probe. Still hosted-live, still not a wrap defect.

---

Do not close this item until either:

- the 401/403 mismatch has not recurred across several consecutive PR CI runs, or
- the hosted cause is identified and fixed with a regression test.
