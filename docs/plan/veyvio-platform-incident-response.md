# Veyvio platform incident response (Command / Yard / Driver)

Companion to Executive-only IR (`docs/plan/veyvio-executive-incident-response.md`).  
Scope: shared tenancy platform used by controlled pilot.

## Severity

| Level | Meaning | Response |
|-------|---------|----------|
| **SEV-1** | Cross-tenant leak, auth broken for all tenants, data loss risk | Page owner immediately; freeze deploys; consider Edge rollback |
| **SEV-2** | Single-tenant outage, duty/sign-on blocked, Yard hub down | Same-day fix; communicate to pilot ops |
| **SEV-3** | Degraded (TI flake, elevated 5xx, slow sync) | Next business day; open evidence note |
| **SEV-4** | Cosmetic / non-operational | Backlog |

## Signal → runbook

| Signal | Severity hint | First actions |
|--------|---------------|---------------|
| `/health` not 200 or missing `deploymentSha` | SEV-1/2 | `npm run test:platform-health`; check Supabase status; Edge rollback per `docs/deploy/command-rollback-continuity.md` |
| Hosted tenant-isolation unexpected **401** (TI-401 class) | SEV-3 | Re-run TI with `.gate1-secrets.local.env` only; do not loosen assertions; see `docs/plan/prod-1-ci-reliability.md` |
| Cross-tenant deny fails (200 with foreign data) | **SEV-1** | Freeze; revoke sessions; investigate RLS / capability path |
| Yard `/api/v1/yard/health` `mode: dev-stub` in production | SEV-2 | Redeploy Yard build with `PROD`; verify assert-yard-deploy |
| Driver production build contains `example.supabase.co` | SEV-1 | Halt AAB/IPA; assert-release-config must fail closed |
| Backup probe `FREE_OR_NO_SCHEDULED_BACKUPS_PITR_OFF` | SEV-2 (acceptance) | Billing owner: upgrade Pro + PITR; re-run `test:backup-pitr-status` |
| Bad frontend deploy | SEV-2 | Redeploy previous git SHA; keep `VITE_MOCK_API` unset |

## Roles

| Role | Owns |
|------|------|
| Platform engineer | Edge + migrations + TI |
| Pilot ops | Driver/Yard operational impact, handset checks |
| Billing / ops | Supabase plan + PITR |

## Evidence to capture

- `docs/plan/evidence/gate-a-platform-health.json`
- `docs/plan/evidence/gate-a-command-continuity-drill.json`
- `docs/plan/evidence/gate-a-backup-pitr-status.json`
- GitHub Actions run URL + `deploymentSha` from `/health`

## Do not

- Edit released migrations
- Treat `CI=true` as production
- Purchase PITR/compute from unattended automation without billing owner approval
- Weaken TI expected statuses to “pass” a flake
