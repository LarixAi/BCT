# Veyvio Executive — OWASP ASVS mapping (Phase 11 / SEC-1102–1103)

**Baseline:** [OWASP ASVS](https://devguide.owasp.org/en/06-verification/01-guides/03-asvs/) **Level 2** for the Executive application.  
**Elevated:** Selected **Level 3** controls for authentication, authorisation, sensitive actions and audit (SEC-1103).

Status keys: **Met** (implemented + tested), **Partial**, **Planned / residual**.

## Level 2 baseline (representative coverage)

| ASVS area | Requirement theme | Veyvio control | Status |
|---|---|---|---|
| V1 Architecture | Trust boundaries documented | Threat model Phase 11 | Met |
| V2 Authentication | MFA for privileged apps | Executive AAL2 / MFA challenge | Met |
| V2 Authentication | Secure password handling | Supabase Auth; no password logging | Met |
| V3 Session | Secure cookie attributes | `__Host-`, Secure, HttpOnly, SameSite=Strict | Met |
| V3 Session | Idle / absolute timeout | 15m idle / 8h absolute Executive | Met |
| V4 Access control | Deny by default | `executive-authorisation.ts` | Met |
| V4 Access control | Function-level authz | BFF + command-api + RLS | Met |
| V5 Validation | File type/size independent of client | Executive upload magic-byte checks | Met |
| V6 Crypto | No secrets in client | Phase 7 secret scans | Met |
| V7 Error handling | Non-disclosing auth errors | Generic login failure messages | Met |
| V8 Data protection | Classification & retention | Phase 8 docs + Phase 10 purge jobs | Met |
| V9 Communication | TLS + HSTS | Worker HSTS on HTTPS | Met |
| V10 Malicious code | Dependency audit + SBOM | CI `security:audit` + `sbom` | Met |
| V11 Business logic | Two-person sensitive actions | Phase 5 typed approvals | Met |
| V12 Files | Private storage + short URLs | Phase 8 | Met |
| V13 API | CSRF / CORS deny foreign | Phase 6 edge policy | Met |
| V14 Config | Separate env credentials | Phase 7 | Met |

## Selected Level 3 controls (SEC-1103)

Applied specifically to auth, authorisation, sensitive actions and audit:

| ASVS L3 theme | Control in Veyvio | Evidence |
|---|---|---|
| Strong authenticator for privileged access | MFA/AAL2 mandatory for Executive session | Phase 3; session `auth_strength` |
| Re-authentication for sensitive operations | Fresh step-up (`stepUpFresh`) on downloads, approvals, restore, export fulfil | Phase 5/8/10 |
| Fine-grained authorisation matrix | Canonical Executive roles × actions | `executive-authorisation.ts` + unit tests |
| Independent dual control | Sensitive-action proposer ≠ approver | Phase 5 triggers / e2e |
| Tamper-evident audit | Append-only `security_events`, approval rows, document access events | Phases 5/8/9 |
| Privileged action logging | Login fail/success, downloads, exports, support grants | Phase 9 catalogue |
| Anti-automation on auth | Rate limit auth mutations | Phase 6 Worker |
| Session fixation / concurrent limits | Max 2 Executive sessions; revoke oldest | Phase 3 |

## Deliberate residuals (not claimed Met)

- Full ASVS L3 certification across all chapters — out of scope.
- Hardware-backed passkeys as sole authenticator — deferred (Supabase maturity).
- Independent pen-test report — see SEC-1108/1109 launch residuals.
- SEC-0311 two-person MFA reset workflow — still open from Phase 3.

## Ownership

Technical Owner maintains this mapping; Security Owner reviews when Executive threat model changes.
