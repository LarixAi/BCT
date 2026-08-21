/**
 * Phase 10 — Executive continuity: restore drills, purge listing, backup-admin gate.
 */
import { HttpError } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'
import { requirePlatformRole } from './tenant-guards.ts'
import { recordSecurityEvent, validateExecutiveUserSession } from './tenant-auth.ts'
import { decideExecutiveAuthorisation } from './executive-authorisation.ts'
import {
  BACKUP_POSTURE,
  EXECUTIVE_CONTINUITY_OBJECTIVES,
  isBackupAdministrationRole,
} from './executive-continuity-policy.ts'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireExecutiveSession(
  context: RequestContext,
  request: Request,
  freshStepUp: boolean,
) {
  const sessionId = request.headers.get('x-veyvio-session-id') ?? ''
  if (!UUID_PATTERN.test(sessionId)) {
    throw new HttpError(
      403,
      'Confirm your Executive session with multi-factor authentication',
      'executive_step_up_required',
    )
  }
  const session = await validateExecutiveUserSession({
    sessionId,
    userId: context.user.id,
    companyId: context.companyId,
    membershipId: context.membershipId,
  })
  if (freshStepUp && !session.stepUpFresh) {
    throw new HttpError(
      403,
      'Sign in with multi-factor authentication again to continue',
      'executive_step_up_required',
    )
  }
  return session
}

/** SEC-1002: Ordinary Executive callers cannot administer backups. */
export function assertExecutiveCannotAdministerBackups(context: RequestContext) {
  if (isBackupAdministrationRole(context.platformRole)) return
  throw new HttpError(
    403,
    'Backup administration is limited to platform administrators outside the Executive app',
    'backup_admin_forbidden',
  )
}

export async function getExecutiveContinuityObjectives(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveSession(context, request, false)
  const decision = decideExecutiveAuthorisation({
    actorUserId: context.user.id,
    roleKeys: context.roleKeys,
    action: 'executive.audit.read',
    companyId: context.companyId,
    resourceCompanyId: context.companyId,
  })
  if (!decision.allowed) {
    throw new HttpError(403, decision.message, decision.code)
  }

  const { data: drills } = await admin
    .from('executive_continuity_drills')
    .select('id, drill_type, status, title, performed_at, rpo_minutes_observed, rto_minutes_observed')
    .eq('company_id', context.companyId)
    .order('performed_at', { ascending: false })
    .limit(20)

  return {
    objectives: EXECUTIVE_CONTINUITY_OBJECTIVES,
    backupPostureSummary: {
      databaseEncryptionAtRest: BACKUP_POSTURE.databaseEncryptionAtRest,
      objectStorageEncryptionAtRest: BACKUP_POSTURE.objectStorageEncryptionAtRest,
      documentBucket: BACKUP_POSTURE.documentBucket,
      note: 'Backup administration credentials and PITR controls are not exposed to Executive.',
    },
    recentDrills: drills ?? [],
  }
}

export async function getPlatformContinuityStatus(request: Request) {
  const { authenticate } = await import('./supabase.ts')
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin'])

  const { data: drills } = await admin
    .from('executive_continuity_drills')
    .select(
      'id, company_id, drill_type, status, title, summary, performed_at, rpo_minutes_observed, rto_minutes_observed',
    )
    .order('performed_at', { ascending: false })
    .limit(50)

  return {
    posture: BACKUP_POSTURE,
    objectives: EXECUTIVE_CONTINUITY_OBJECTIVES,
    drills: drills ?? [],
    separationOfDuties:
      'Backup/PITR administration uses Supabase owner + platform_admin only. Executive tenant roles cannot list or restore platform backups.',
  }
}

export async function softRestoreExecutiveDocument(
  context: RequestContext,
  request: Request,
  documentFileId: string,
  input: { reason?: string },
) {
  const session = await requireExecutiveSession(context, request, true)
  const decision = decideExecutiveAuthorisation({
    actorUserId: context.user.id,
    roleKeys: context.roleKeys,
    action: 'executive.audit.read',
    companyId: context.companyId,
    resourceCompanyId: context.companyId,
  })
  if (!decision.allowed) {
    throw new HttpError(403, decision.message, decision.code)
  }
  const reason = String(input.reason ?? '').trim()
  if (reason.length < 10) {
    throw new HttpError(400, 'A restore reason of at least 10 characters is required', 'restore_reason_required')
  }
  if (!UUID_PATTERN.test(documentFileId)) {
    throw new HttpError(404, 'Document not found', 'executive_document_not_found')
  }

  const { data: doc } = await admin
    .from('executive_document_files')
    .select('id, deleted_at, classification, file_object_id')
    .eq('id', documentFileId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (!doc) {
    throw new HttpError(404, 'Document not found', 'executive_document_not_found')
  }
  if (!doc.deleted_at) {
    throw new HttpError(409, 'Document is not soft-deleted', 'document_not_deleted')
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('executive_document_files')
    .update({ deleted_at: null, updated_at: now })
    .eq('id', doc.id)
    .eq('company_id', context.companyId)
  if (error) throw new Error(error.message)

  await recordSecurityEvent({
    companyId: context.companyId,
    actorUserId: context.user.id,
    eventType: 'executive.document_restored',
    message: 'Soft-deleted Executive document restored',
    severity: 'attention',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      documentFileId: doc.id,
      classification: doc.classification,
      sessionId: session.id,
      reason,
    },
  })

  return { id: doc.id, restoredAt: now, deletedAt: null }
}

export async function listRetentionPurgeJobs(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveSession(context, request, false)
  const decision = decideExecutiveAuthorisation({
    actorUserId: context.user.id,
    roleKeys: context.roleKeys,
    action: 'executive.audit.read',
    companyId: context.companyId,
    resourceCompanyId: context.companyId,
  })
  if (!decision.allowed) {
    throw new HttpError(403, decision.message, decision.code)
  }
  const { data, error } = await admin
    .from('executive_retention_purge_jobs')
    .select(
      'id, status, retention_category, candidate_count, purged_count, legal_hold_blocked_count, reason, approved_at, completed_at, sensitive_action_request_id',
    )
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return { jobs: data ?? [] }
}

export async function recordContinuityDrill(input: {
  companyId?: string | null
  drillType:
    | 'database_restore'
    | 'document_restore'
    | 'compromised_ceo'
    | 'backup_admin_separation'
    | 'tabletop_continuity'
  status?: 'passed' | 'failed' | 'partial' | 'skipped'
  title: string
  summary: string
  rpoMinutesObserved?: number | null
  rtoMinutesObserved?: number | null
  evidence?: Record<string, unknown>
  performedBy?: string | null
}) {
  const { data, error } = await admin
    .from('executive_continuity_drills')
    .insert({
      company_id: input.companyId ?? null,
      drill_type: input.drillType,
      status: input.status ?? 'passed',
      title: input.title,
      summary: input.summary,
      rpo_minutes_observed: input.rpoMinutesObserved ?? null,
      rto_minutes_observed: input.rtoMinutesObserved ?? null,
      evidence: input.evidence ?? {},
      performed_by: input.performedBy ?? 'technical_owner',
    })
    .select('id, drill_type, status, performed_at')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Continuity drill could not be recorded')
  return data
}
