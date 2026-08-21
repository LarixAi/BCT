# Veyvio Command / platform — backup, rollback and continuity (Gate A)

Companion to Executive continuity (`docs/deploy/executive-backup-continuity.md`).  
Gate A acceptance: production readiness blueprint §19.

## Scope

| Surface | Included |
|---------|----------|
| Postgres (Command + Driver + Yard shared tenancy) | Yes |
| Edge Functions (`command-api`, `finance-api`) | Yes |
| Admin / Driver / Yard frontends | Yes (redeploy previous SHA) |
| Executive-only document PITR drill | See Executive doc |

## Backups

| Layer | Control |
|-------|---------|
| Postgres | Supabase project `qeckgqjrfbdyxchuncdt` — requires **paid plan + daily backups**; enable **PITR** (Dashboard → Database → Backups, or Management API add-on) |
| Storage | Tenant buckets + service-only buckets; encrypted at rest |
| Edge | Immutable deploy by Supabase function version / Deno deployment id (record `deploymentSha` from `/health`) |
| Frontends | Immutable artifact per git SHA (CI build); never hot-edit production assets |

**Status probe (non-destructive):**

```bash
cd "Veyvio admin "
npm run test:backup-pitr-status
```

Writes `docs/plan/evidence/gate-a-backup-pitr-status.json`. As of 21 Aug 2026 probe: org plan=`free`, `pitr_enabled=false`, scheduled backups empty — **Gate A backup acceptance blocked until Pro (or higher) + PITR add-on**. Do not purchase add-ons from automation without billing owner approval.

## Rollback procedure (tested path)

### A. Edge Function rollback (preferred first response)

1. Identify last known-good: `GET …/command-api/health` → `deploymentSha` / Deno deployment id (TI smoke prints this).
2. Redeploy previous known-good tree:
   ```bash
   cd "Veyvio admin "
   git checkout <known-good-sha>
   npm run backend:deploy
   ```
3. Re-run `npm run test:tenant-isolation` against hosted.
4. Record drill: date, from-SHA, to-SHA, TI result.

### B. Migration rollback (do **not** edit released migrations)

Released migrations are immutable. If a bad migration lands:

1. **Forward-fix** with a new migration that restores safe behaviour (preferred).
2. Only if catastrophic: PITR / backup restore to a **staging** project first, verify tenant isolation + same-company forge, then promote.
3. Never rewrite `202608*` files that have already been applied on hosted.

### C. Frontend rollback

Redeploy previous CI artifact / Cloudflare (Yard) or hosting target for Admin/Driver pinned to previous git SHA. Keep `VITE_MOCK_API` unset/false.

## Application-level continuity drill (non-destructive)

Run locally or in CI with hosted credentials:

```bash
cd "Veyvio admin "
# loads .gate1-secrets.local.env when present via shell
node scripts/command-continuity-health.drill.mjs
```

Proves:

1. Hosted `command-api` health returns 200 + deployment identity  
2. Anon cannot call privileged paths  
3. Authenticated membership session can read own-tenant vehicles (or honest empty)  
4. Cross-tenant vehicle id returns empty / denied  

This is the Gate A **continuity drill** that agents can re-run without PITR credentials. Full database PITR requires a paid plan and remains an owner billing + Dashboard action after `test:backup-pitr-status` reports `PITR_ENABLED`.

## RPO / RTO (platform default until SaaS SLAs)

| Objective | RPO | RTO |
|-----------|-----|-----|
| Database | 60 minutes | 4 hours |
| Edge API | n/a (redeploy) | 30 minutes |
| Frontends | n/a (redeploy) | 30 minutes |

## Evidence

| Artefact | Purpose |
|----------|---------|
| `scripts/command-continuity-health.drill.mjs` | Repeatable non-destructive drill |
| `scripts/command-backup-pitr-status.mjs` | Management API backup/PITR truth |
| `npm run test:tenant-isolation` | Hosted cross-tenant smoke |
| `docs/plan/evidence/gate-a-residual-register-2026-08-21.md` | Gate A open/closed register |
| `docs/plan/evidence/gate-a-backup-pitr-status.json` | Latest PITR/backup probe |
| Supabase Dashboard after Pro+PITR | Human GO after probe shows `PITR_ENABLED` |
