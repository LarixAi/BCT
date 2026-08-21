/**
 * Phase 10 — continuity policy invariants.
 * Run: npx tsx scripts/executive-continuity.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  BACKUP_ADMINISTRATION_PLATFORM_ROLES,
  BACKUP_POSTURE,
  EXECUTIVE_CONTINUITY_OBJECTIVES,
  EXECUTIVE_TENANT_ROLES_DENIED_BACKUP_ADMIN,
  executiveRoleMayAdministerBackups,
  isBackupAdministrationRole,
  meetsRecoveryObjective,
} from '../supabase/functions/_shared/executive-continuity-policy.ts'
import { readFile } from 'node:fs/promises'

assert.equal(EXECUTIVE_CONTINUITY_OBJECTIVES.database.rpoMinutes, 60)
assert.equal(EXECUTIVE_CONTINUITY_OBJECTIVES.database.rtoMinutes, 240)
assert.equal(EXECUTIVE_CONTINUITY_OBJECTIVES.documents.rtoMinutes, 480)
assert.equal(EXECUTIVE_CONTINUITY_OBJECTIVES.compromisedCeoAccount.rtoMinutes, 60)

assert.equal(isBackupAdministrationRole('platform_admin'), true)
assert.equal(isBackupAdministrationRole('platform_support'), false)
assert.equal(executiveRoleMayAdministerBackups('chief_executive'), false)
assert.equal(executiveRoleMayAdministerBackups('company_administrator'), false)
assert.ok(EXECUTIVE_TENANT_ROLES_DENIED_BACKUP_ADMIN.includes('auditor'))
assert.deepEqual([...BACKUP_ADMINISTRATION_PLATFORM_ROLES], ['platform_admin'])

assert.equal(
  meetsRecoveryObjective({
    objective: 'database',
    observedRpoMinutes: 45,
    observedRtoMinutes: 180,
  }).passed,
  true,
)
assert.equal(
  meetsRecoveryObjective({
    objective: 'database',
    observedRpoMinutes: 90,
    observedRtoMinutes: 180,
  }).passed,
  false,
)

assert.equal(BACKUP_POSTURE.databaseEncryptionAtRest, true)
assert.equal(BACKUP_POSTURE.documentBucket, 'executive-documents')

const migration = await readFile(
  new URL(
    '../supabase/migrations/202607310002_executive_continuity_retention.sql',
    import.meta.url,
  ),
  'utf8',
)
assert.match(migration, /executive_retention_purge_jobs/)
assert.match(migration, /executive_continuity_drills/)
assert.match(migration, /retention_purge/)
assert.match(migration, /softDeleteOnly/)

const sensitive = await readFile(
  new URL(
    '../supabase/functions/_shared/executive-sensitive-actions.ts',
    import.meta.url,
  ),
  'utf8',
)
assert.match(sensitive, /retention_purge/)

console.log('executive-continuity.unit.mjs: ok')
