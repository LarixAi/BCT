# Veyvio Executive — incident response (Phase 9)

**Owners:** Security Owner (primary), Technical Owner (on-call).  
**Related:** `docs/deploy/executive-security-monitoring.md`, blueprint SEC-0909–0911.

## Severity, triage owner, response time (SEC-0909)

| Severity | Triage owner | First response | Examples |
|---|---|---|---|
| **critical** | Security Owner | **30 minutes** | Privilege-change burst, bulk restricted downloads, export fulfilment abuse, confirmed secret leak |
| **attention** | Security Owner or on-call Technical Owner | **4 hours** | Repeated login/MFA failures, support grant, password recovery surge |
| **info** | Technical Owner | **1 business day** | Successful login noise, MFA enabled, company selected |

Open alerts: `GET /executive/security-alerts` (AAL2 Executive auditor).  
Evidence events: `GET /executive/security-events`.

---

## Runbook A — Suspected account compromise (SEC-0910)

1. **Contain:** Revoke active Executive sessions for the user (force re-auth + MFA). Reset password via recovery only if attacker may still hold the password; prefer admin-initiated reset after identity check.
2. **Preserve:** Export recent `security_events` for the company (login failures, MFA fails, downloads, support grants). Do not delete or rewrite events (append-only).
3. **Scope:** List document downloads and export fulfilments in the same window. Place legal hold if restricted material may have left the tenant.
4. **Notify:** Security Owner → affected company directors; open ticket with correlation IDs from events.
5. **Recover:** Re-issue MFA; rotate any API keys the user could see; confirm concurrent session limit still 2 for Executive.
6. **Close:** Document timeline in the ticket; close matching `security_alerts` with status `closed`.

## Runbook B — Leaked secret (API key, service role, webhook, session cookie)

1. **Contain:** Rotate the secret immediately in Supabase / Cloudflare / Resend / store as applicable. Invalidate sessions if a refresh/access token was exposed.
2. **Hunt:** Search `security_events` and deploy logs for use of the leaked material after the suspected leak time.
3. **Scope:** Assume any tenant whose JWT/`active_company_id` could be minted with the secret is at risk until rotation completes.
4. **Notify:** Security Owner + Technical Owner; customer notification only if evidence shows tenant data access.
5. **Hardening:** Confirm secrets are not in git, browser bundles, or support chat. Update credential-rotation checklist.
6. **Close:** Record rotation time and verification (failed old credential, healthy new deploy).

## Runbook C — Data exposure (wrong tenant, bulk download, mis-shared export)

1. **Contain:** Soft-delete or legal-hold the exposed artefact; revoke signed URLs by rotating storage signing if needed; disable the actor’s Executive access if insider risk.
2. **Preserve:** Keep `executive_document_access_events` and `security_events` rows; capture export job IDs.
3. **Scope:** Which companies, classifications, and recipients. Cross-check Isolation A (no cross-tenant IDs in metadata).
4. **Notify:** Affected company directors; legal if highly restricted / personal data.
5. **Recover:** Fulfil retention dry-run; confirm Command `settings/data-export` still blocks restricted Executive types.
6. **Close:** Tabletop or post-incident note with residual controls.

---

## Tabletop exercise record (SEC-0911)

| Field | Value |
|---|---|
| **Date** | 31 July 2026 |
| **Facilitator** | Technical Owner (engineering) |
| **Participants** | Security Owner (desk), Technical Owner |
| **Scenario** | “Eight failed Executive logins in 12 minutes against one company, followed by a successful MFA login from a new user-agent and three highly restricted downloads within an hour.” |
| **Injects** | (1) `repeated_login_failures` alert opens; (2) downloads raise `bulk_document_downloads` below threshold but still visible in events; (3) support grant requested mid-incident. |
| **Decisions practised** | Contain via session revoke → preserve events → legal hold on retention category → notify directors → close alerts. |
| **Gaps found** | No pager/SIEM webhook yet; unusual-geo alert residual; alert acknowledgement UI not built (API list only). |
| **Follow-ups** | Wire optional webhook to Security Owner email; build acknowledge/close UI in Executive audit view; track unusual device in later phase. |
| **Verdict** | Process exercised end-to-end on paper against live catalogue/thresholds; **accepted for Phase 9** with residuals above. |

This tabletop is a controlled walkthrough against the shipped catalogue and runbooks. It is not a substitute for a live red-team or SIEM drill.
