# Veyvio Executive — backup, recovery and continuity (Phase 10)

Canonical checklist: `docs/plan/veyvio-executive-security-blueprint.md` (SEC-1001–1008).  
Offline contacts: `docs/plan/veyvio-executive-emergency-contacts.md` (print / store outside the app).

## Encrypted backups (SEC-1001)

| Layer | Control |
|---|---|
| Postgres | Supabase encrypts data at rest; daily backups enabled on the linked project (`qeckgqjrfbdyxchuncdt`). |
| PITR | Confirm Point-in-Time Recovery in Supabase Dashboard → Database → Backups (plan-dependent). |
| Documents | Private bucket `executive-documents`; storage encrypted at rest by Supabase/S3-compatible backend. |
| Application | Soft-delete + legal hold; hard storage wipe only after approved retention purge (soft-delete today). |

**Owner residual:** Dashboard confirmation screenshot that PITR is ON for production before highly restricted board data.

## Backup administration separation (SEC-1002)

- Backup/PITR credentials and restore operations: **Supabase project owner + `platform_admin` only**.
- Ordinary Executive roles (`chief_executive`, `company_administrator`, directors, auditors) **cannot** list platform backups or trigger PITR.
- API: `GET /platform/continuity` requires `platform_admin`.
- Executive sees objectives only: `GET /executive/continuity` (no backup secrets).

## RPO / RTO (SEC-1003)

Source of truth: `executive-continuity-policy.ts`.

| Objective | RPO | RTO |
|---|---|---|
| Database | 60 minutes | 4 hours |
| Documents | 60 minutes | 8 hours |
| Compromised CEO account | n/a (containment) | 60 minutes |

## Restore procedures

### Database (SEC-1004)

1. Platform admin opens Supabase Dashboard → Database → Backups.
2. Prefer PITR to a timestamp before the incident; otherwise restore latest daily backup to a **staging** project first.
3. Verify Isolation A row counts / Executive tables before promoting.
4. Record drill in `executive_continuity_drills` (`drill_type=database_restore`).

Application-level drill (canary): soft-delete / restore a disposable `executive_document_files` row — proves metadata recovery without PITR.

### Documents (SEC-1005)

1. Soft-restore via `POST /executive/documents/:id/restore` (AAL2 + reason) when object still in bucket.
2. If object missing, restore from storage backup / previous version (platform admin), then re-link `file_objects`.
3. Record `document_restore` drill.

### Compromised CEO (SEC-1006)

Follow Runbook A in `veyvio-executive-incident-response.md`. Record `compromised_ceo` drill with containment time vs 60-minute RTO.

## Destructive retention (SEC-1008)

1. Dry-run: `GET /executive/retention/dry-run`.
2. Propose sensitive action `retention_purge` with `retentionCategory` + `documentFileIds` (≤100).
3. Independent board approval executes soft-delete and writes `executive_retention_purge_jobs`.
4. Legal holds always block.
5. **Residual:** physical object removal from storage not automated.

## APIs

| Route | Who |
|---|---|
| `GET /executive/continuity` | Executive auditor AAL2 |
| `GET /executive/retention/purge-jobs` | Executive auditor AAL2 |
| `POST /executive/documents/:id/restore` | Executive AAL2 + fresh step-up |
| `GET /platform/continuity` | `platform_admin` only |

## Deploy

```bash
cd "Veyvio admin "
npm run backend:deploy
npm run test:executive-continuity
```
