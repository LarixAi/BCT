# Platform observability (Gate A / PROD-8)

Basic observability without a paid APM. Full Sentry/OTel remains FIX-P1-043.

## Live signals

| Signal | Where | Owner | Severity if bad | Runbook |
|--------|-------|-------|-----------------|---------|
| Command `/health` | `…/command-api/health` | Platform | SEV-1/2 | `veyvio-platform-incident-response.md` |
| `deploymentSha` | Edge secret `VEYVIO_DEPLOYMENT_SHA` | Platform | SEV-2 if stale/unknown | `backend:deploy` / `set-deployment-sha.mjs` |
| Continuity drill | `npm run test:command-continuity-drill` | Platform | SEV-2 | `command-rollback-continuity.md` |
| Backup/PITR probe | `npm run test:backup-pitr-status` | Ops/billing | SEV-2 for Gate A GO | residual register |
| Composite probe | `npm run test:platform-health` | Platform | SEV-2 | this doc |
| Yard health | `/api/v1/yard/health` (`mode: live` in PROD) | Platform | SEV-2 if `dev-stub` in prod | Yard deploy |
| Tenant isolation | `npm run test:tenant-isolation` | Platform | SEV-1 if cross-tenant fail | `prod-1-ci-reliability.md` |
| Driver release assert | AAB / IPA workflows | Mobile | SEV-1 | `assert-release-config` |

## Repeatable commands

```bash
cd "Veyvio admin "
npm run test:platform-health
npm run test:command-continuity-drill
npm run test:backup-pitr-status
npm run test:tenant-isolation   # use .gate1-secrets.local.env
```

CI (trusted triggers): job **Platform health + continuity (PROD-8)** runs health + continuity and uploads evidence artifacts. `PLATFORM_HEALTH_OK_BACKUP_NOT_READY` is an accepted pass while the org remains on Free.

Evidence lands under `docs/plan/evidence/`.

## Escalation

See `docs/plan/veyvio-platform-incident-response.md`.
