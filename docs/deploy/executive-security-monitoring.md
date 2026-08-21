# Veyvio Executive — security monitoring (Phase 9)

Canonical checklist: `docs/plan/veyvio-executive-security-blueprint.md` (SEC-0901–0911).  
Incident runbooks: `docs/plan/veyvio-executive-incident-response.md`.

## Event catalogue (SEC-0901)

Authoritative code: `Veyvio admin /supabase/functions/_shared/security-monitoring-core.ts` (`SECURITY_EVENT_CATALOG`).

| Event type | Default severity | Category |
|---|---|---|
| `auth.login_succeeded` / `auth.login_failed` | info / attention | authentication |
| `auth.mfa_challenge_*` / `auth.mfa_enabled` | info / attention | authentication |
| `auth.password_reset_*` | attention | authentication |
| `auth.session_revoked` / `auth.concurrent_session_limit` | attention | authentication |
| `access.role_changed` / `access.application_grant_changed` / `access.branch_scope_changed` | attention | authorisation |
| `executive.document_downloaded` | attention | data_access |
| `executive.export_fulfilled` | critical | data_access |
| `executive.sensitive_action_approved` | attention | approvals |
| `support.access_granted` / `used` / `revoked` | attention / info | support |

## Alert thresholds (SEC-0901 / SEC-0906)

| Code | Window | Count | Severity |
|---|---|---|---|
| `repeated_login_failures` | 15m | 8 | attention |
| `repeated_mfa_failures` | 15m | 5 | attention |
| `bulk_document_downloads` | 60m | 20 | critical |
| `privilege_escalation_burst` | 60m | 3 | critical |

Raised rows land in `public.security_alerts` (append-only delete blocked; close via status).

**Residual:** unusual geo/device alerting needs durable device fingerprint + trusted location signals — not shipped in Phase 9.

## Log protection (SEC-0907)

- Migration `202607310001_executive_security_monitoring.sql`
- `security_events` UPDATE/DELETE blocked by trigger
- SELECT limited to AAL2 + active Executive access for that `company_id`
- Ordinary Command members no longer have blanket `security_events` SELECT
- Writes via service role (`command-api`) only

## Redaction (SEC-0908)

`sanitizeSecurityMetadata` strips password/token/cookie/recovery/document-body keys and truncates long strings. Applied on every `recordSecurityEvent`.

## API

- `GET /executive/security-events` — AAL2 + `executive.audit.read`
- `GET /executive/security-alerts` — same

Headers: Bearer + `x-veyvio-session-id` (Executive step-up session).

## Deploy order

1. `npx supabase db push` (Admin linked project)
2. `npm run backend:deploy` (command-api)
3. Confirm health 200
