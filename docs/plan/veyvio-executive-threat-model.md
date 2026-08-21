# Veyvio Executive — threat model (Phase 11 / SEC-1101)

**Version:** 1.0  
**Date:** 31 July 2026  
**Scope:** Veyvio Executive app (BFF/Worker) + Command `command-api` Executive surface + Supabase tenant data for Executive classifications.  
**Method:** STRIDE on trust boundaries; aligned to Combined Blueprint Hard Rules F-01–F-35 and `veyvio-executive-security-blueprint.md`.

## Assets

| Asset | Classification | Notes |
|---|---|---|
| Executive session cookies / session secret | Highly restricted | `__Host-` cookies; Worker-only secret |
| MFA / recovery material | Highly restricted | Never logged; recovery codes one-time |
| Board packs / highly restricted documents | Highly restricted | Private bucket; short-lived signed URLs |
| Restricted exports | Highly restricted | Two-person sensitive action |
| Company financial / policy records | Restricted | RLS + AAL2 + role matrix |
| Audit / security event logs | Restricted | Append-only; Executive AAL2 read |
| Tenant `company_id` isolation boundary | Critical integrity | Cross-tenant leakage is stop-ship |

## Trust boundaries

1. **Browser → Executive Worker/BFF** — untrusted client; CSRF, CSP, host allowlist, rate limits.
2. **Executive BFF → Command API** — server-side only; publishable/anon + session; never service-role in browser.
3. **Command API → Postgres/Storage** — service-role writers; RLS for authenticated reads; JWT `active_company_id`.
4. **Platform admin → backups/PITR** — outside Executive tenant roles (Phase 10).
5. **Support grants** — time-boxed; logged; never silent elevation.

## Actors

| Actor | Intent |
|---|---|
| External attacker | Credential stuffing, session theft, XSS, CSRF, IDOR, tenant hopping |
| Malicious / compromised insider (CEO, admin, support) | Privilege abuse, bulk download, purge without approval |
| Confused deputy / buggy client | Over-broad reads, cached authenticated pages |
| Supply-chain | Malicious npm dependency, leaked CI secret |

## STRIDE summary

| Threat | Example | Mitigations already in Phases 1–10 | Residual |
|---|---|---|---|
| **S**poofing | Stolen password without MFA | AAL2 for Executive; recovery codes; concurrent session limit | Passkeys preferred long-term; SEC-0311 two-person MFA reset open |
| **T**ampering | Alter security_events / soft-delete evidence | Append-only triggers; service-role writes | Platform DB owner still privileged |
| **R**epudiation | Deny export/download | Document access events + security_events | Alert UI/pager residual |
| **I**nformation disclosure | CDN caches authenticated HTML; signed URL leak | `no-store` CDN headers; ≤90s signed URLs; CSP | Sites publish of Worker build; durable WAF |
| **D**enial of service | Auth brute force | Worker rate limit 20/15m | Durable Cloudflare rate rules residual |
| **E**levation of privilege | Direct Command call bypassing BFF | Deny-by-default Executive authorisation; RLS; sensitive-action two-person | Client is untrusted (F-32) — always re-check server-side |

## Top abuse cases (must remain covered by automated tests)

1. Cross-tenant document download / export.
2. Password-only Executive session (no AAL2).
3. Sensitive action self-approval.
4. Restricted export via Command settings bypass.
5. Authenticated page/API cached at CDN.
6. Service-role or session secret in client bundle.
7. Retention purge without independent approval / under legal hold.
8. Ordinary Executive role administering platform backups.

## Data-flow diagram (logical)

```text
[Browser]
   | HTTPS + CSP + CSRF
[Executive Worker / BFF]
   | Bearer + x-veyvio-session-id (server)
[command-api]
   | service role (server)
[Postgres + executive-documents bucket]
```

## Review

| Role | Status |
|---|---|
| Technical Owner | Draft accepted for Phase 11 — 31 July 2026 |
| Security Owner | Required before highly restricted production data |
| Independent tester | Uses this model as engagement input (see pen-test pack) |

Update this model after material architecture changes (new auth path, new storage, new privileged action).
