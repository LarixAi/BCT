/**
 * Phase 10 — pure continuity / backup policy (no Supabase import).
 * RPO/RTO targets and backup-admin separation rules.
 */

export const EXECUTIVE_CONTINUITY_OBJECTIVES = {
  database: {
    rpoMinutes: 60,
    rtoMinutes: 240,
    description:
      'Postgres recoverable to within 60 minutes of failure; service restored within 4 hours for Executive-critical paths.',
  },
  documents: {
    rpoMinutes: 60,
    rtoMinutes: 480,
    description:
      'Executive private objects recoverable to within 60 minutes; document availability restored within 8 hours.',
  },
  compromisedCeoAccount: {
    rpoMinutes: 0,
    rtoMinutes: 60,
    description:
      'Compromised CEO/privileged Executive account contained (sessions revoked, MFA reissued) within 60 minutes.',
  },
} as const

/** Roles that may administer platform backups — never ordinary Executive tenant roles. */
export const BACKUP_ADMINISTRATION_PLATFORM_ROLES = [
  'platform_admin',
] as const

export const EXECUTIVE_TENANT_ROLES_DENIED_BACKUP_ADMIN = [
  'chief_executive',
  'company_administrator',
  'director',
  'board_member',
  'board_reader',
  'auditor',
] as const

export function isBackupAdministrationRole(platformRole: string | null | undefined) {
  return BACKUP_ADMINISTRATION_PLATFORM_ROLES.includes(
    String(platformRole ?? '') as (typeof BACKUP_ADMINISTRATION_PLATFORM_ROLES)[number],
  )
}

export function executiveRoleMayAdministerBackups(roleKey: string) {
  const key = String(roleKey ?? '').trim().toLowerCase()
  return !EXECUTIVE_TENANT_ROLES_DENIED_BACKUP_ADMIN.includes(
    key as (typeof EXECUTIVE_TENANT_ROLES_DENIED_BACKUP_ADMIN)[number],
  ) && key === 'platform_admin'
}

export function meetsRecoveryObjective(input: {
  objective: 'database' | 'documents' | 'compromisedCeoAccount'
  observedRpoMinutes: number | null
  observedRtoMinutes: number | null
}) {
  const target = EXECUTIVE_CONTINUITY_OBJECTIVES[input.objective]
  const rpoOk =
    input.observedRpoMinutes == null || input.observedRpoMinutes <= target.rpoMinutes
  const rtoOk =
    input.observedRtoMinutes == null || input.observedRtoMinutes <= target.rtoMinutes
  return { rpoOk, rtoOk, passed: rpoOk && rtoOk, target }
}

export const BACKUP_POSTURE = {
  provider: 'Supabase',
  databaseEncryptionAtRest: true,
  objectStorageEncryptionAtRest: true,
  dailyBackups: true,
  pointInTimeRecovery: 'plan-dependent — confirm Pro/Team PITR in Supabase dashboard',
  documentBucket: 'executive-documents',
  backupAdministrationChannel: 'Supabase dashboard + platform_admin only (not Executive app)',
} as const
