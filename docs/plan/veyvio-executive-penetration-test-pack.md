# Veyvio Executive — penetration test pack & assurance schedule (Phase 11 / SEC-1108–1110)

## Commissioning record (SEC-1108)

| Field | Value |
|---|---|
| **Commissioned** | 31 July 2026 |
| **Commissioned by** | Technical Owner (engineering) on behalf of Security Owner |
| **Status** | **Engagement pack ready** — independent tester / firm **not yet executed**; **report outstanding** (launch-gate blocker until complete) |
| **Prerequisite** | No real highly restricted board/bank data in production until report accepted |
| **Input artefacts** | Threat model, ASVS mapping, this SoW, production gates Phases 1–10 evidence |

### Statement of work (minimum scope)

1. **Authentication & session** — password, MFA, recovery codes, idle/absolute timeout, cookie flags, concurrent sessions.
2. **Authorisation / tenancy** — cross-tenant IDOR on Executive documents, sensitive actions, exports; role matrix bypass attempts.
3. **BFF / Worker** — CSRF, CORS, CSP bypass, host header, cache poisoning / CDN caching of authenticated responses.
4. **Sensitive actions** — self-approval, race conditions, replay.
5. **Documents** — signed URL theft window, classification bypass, malware gate bypass, retention purge without approval.
6. **Secrets** — client bundle, Worker config, referrer leakage.
7. **Support / platform** — support grant abuse; backup admin separation.
8. **API negative tests** — unauthenticated, wrong company JWT, missing `x-veyvio-session-id`.

**Out of scope (unless added):** physical office, social engineering of personal devices, destructive production PITR restore.

**Deliverables:** Written report with severity, reproduction, and retest notes; critical/high must be closed or formally accepted (SEC-1109).

## Finding resolution & acceptance (SEC-1109)

Process:

1. Critical/high → fix or compensating control before highly restricted data.
2. Medium → fix or time-boxed acceptance with owner + date.
3. Low/info → backlog.

Current **pre-pen-test** accepted residuals (own scans / design): see `veyvio-executive-risk-acceptance.md`.

## Schedule (SEC-1110)

| Trigger | Cadence |
|---|---|
| Initial independent test | **Before** first real highly restricted Executive data (launch gate) |
| Periodic retest | **At least annually** (calendar: target **July** each year) |
| Material change retest | After MFA redesign, new privileged action types, storage/provider change, auth gateway rewrite, or major dependency CVE in auth stack |

Owners: Security Owner (commission), Technical Owner (remediate), CEO (accept residual risk for launch).

## Retest checklist (post-fix)

- [ ] Critical/high closed or accepted in risk register  
- [ ] Automated regression tests added where applicable  
- [ ] Threat model updated if new trust boundary found  
