# Veyvio Executive — secure development (Phase 11)

Links: threat model · ASVS mapping · pen-test pack · risk acceptance · security blueprint.

## Code review (SEC-1104)

Paths that change **auth, RLS, permissions, cryptography, sessions, or edge policy** require human review before merge to `main`:

| Path | Why |
|---|---|
| `veyvio-executive/app/security/**` | Session, CSP, CSRF, gateway |
| `veyvio-executive/app/api/auth/**` | Login / MFA / company select |
| `veyvio-executive/worker/**` | Edge enforcement |
| `Veyvio admin /supabase/migrations/**` | RLS / triggers |
| `Veyvio admin /supabase/functions/_shared/tenant-auth.ts` | Auth events / MFA |
| `Veyvio admin /supabase/functions/_shared/executive-*.ts` | Authz, sensitive actions, docs |
| `Veyvio admin /supabase/functions/_shared/security-*.ts` | Monitoring / redaction |

Enforcement:

- `veyvio-executive/CODEOWNERS` + PR template.
- Monorepo `CODEOWNERS` for Admin Supabase paths.
- **Owner action:** enable GitHub branch protection → **Require review from Code Owners** on `main` (residual if not yet toggled in org settings).

## Automated security tests (SEC-1105)

| Layer | Location |
|---|---|
| Unit (policy) | `veyvio-executive/tests/*-policy.test.mjs`, `edge-protection`, `authorisation-boundary`, `documents-boundary` |
| Unit (Command) | Admin scripts: authorisation, sensitive actions, documents, security-monitoring, continuity |
| Negative | Cross-tenant / CSRF / CORS / secret scan / cache `no-store` |
| E2E | `login-flow.e2e.mjs`, Admin Executive e2e scripts (sensitive actions, annual budget) |
| CI | `veyvio-executive/.github/workflows/ci.yml` runs lint, secret scan, build+tests, audit, SBOM |

## Dependency & static analysis (SEC-1106)

- `npm run security:audit` — critical fail; documented high allowlist only.
- `npm run security:scan:source` + build secret scan.
- `npm run sbom` — artifact uploaded in CI.
- ESLint on Executive sources.

## Authenticated CDN caching (SEC-1107)

Policy in `edge-protection.mjs` / Worker:

- `Cache-Control: private, no-store, max-age=0, must-revalidate`
- `CDN-Cache-Control: no-store`
- `Cloudflare-CDN-Cache-Control: no-store`
- `Surrogate-Control: no-store`

Verified by `tests/gateway-policy.test.mjs` and `tests/rendered-html.test.mjs`.

## Independent assurance (SEC-1108–1110)

See `docs/plan/veyvio-executive-penetration-test-pack.md` and risk acceptance register.
