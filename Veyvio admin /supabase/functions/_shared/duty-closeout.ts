/**
 * Duty closeout records on Command (replaces Supabase-only job_stop_events for BCT path).
 *
 * Wave 3F first UserScopedDb/RLS cutover: membership JWT writes `duty_closeouts`
 * through RLS (INSERT + SELECT). Support-grant sessions stay on company-scoped
 * service-role — membership RLS cannot see non-member JWTs.
 * company_id filters remain defence-in-depth.
 * Audit / domain events stay privileged until named capabilities exist.
 */
import { companyScopedServiceDb, userScopedDb } from './db-authority.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { guardDriverScopedWrite } from './driver-write-guards.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

function closeoutDb(context: RequestContext) {
  if (context.workspaceAuthority === 'support') {
    return companyScopedServiceDb(context, 'duty_closeout_support_grant')
  }
  return userScopedDb(context, 'duty_closeout')
}

export async function submitDutyCloseout(input: {
  context: RequestContext
  driverId: string
  dutyId?: string | null
  jobReference?: string | null
  payload: Row
  clientGeneratedId?: string | null
}) {
  const companyId = input.context.companyId
  const db = closeoutDb(input.context)
  const clientGeneratedId = input.clientGeneratedId?.trim() || null
  if (clientGeneratedId) {
    const { data: existing } = await db
      .from('duty_closeouts')
      .select('id, submitted_at, payload')
      .eq('company_id', companyId)
      .eq('client_generated_id', clientGeneratedId)
      .maybeSingle()
    if (existing) {
      return {
        id: String(existing.id),
        submittedAt: String(existing.submitted_at),
        payload: existing.payload as Row,
        alreadySubmitted: true,
      }
    }
  }

  const guardDutyId = input.dutyId ? String(input.dutyId) : input.jobReference ? String(input.jobReference) : null
  if (!guardDutyId) {
    throw new Error('dutyId or jobReference is required to submit a closeout')
  }
  // jobReference maps 1:1 onto a duty in the current driver job model (see
  // duty-closeout.service.js resolveDutyIdForJob) — fall back to it when
  // dutyId is absent so this write can never skip the assignment check.
  await guardDriverScopedWrite({
    companyId,
    driverId: input.driverId,
    dutyId: guardDutyId,
  })

  const { data, error } = await db
    .from('duty_closeouts')
    .insert({
      company_id: companyId,
      duty_id: input.dutyId ?? null,
      driver_id: input.driverId,
      job_reference: input.jobReference ?? null,
      payload: input.payload,
      client_generated_id: clientGeneratedId,
    })
    .select('id, submitted_at, payload')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Closeout could not be saved')

  await writeImmutableAudit({
    companyId,
    actorUserId: input.context.user?.id ?? null,
    action: 'duty.closeout_submitted',
    entityType: 'duty_closeout',
    entityId: String(data.id),
    afterSnapshot: { dutyId: input.dutyId ?? null, jobReference: input.jobReference ?? null },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId,
    eventType: 'duty.closeout_submitted',
    entityType: 'duty_closeout',
    entityId: String(data.id),
    payload: { dutyId: input.dutyId ?? null, hadIncident: input.payload.hadIncident === true },
  }).catch(() => undefined)

  return {
    id: String(data.id),
    submittedAt: String(data.submitted_at),
    payload: data.payload as Row,
    alreadySubmitted: false,
  }
}

export async function getDutyCloseout(
  context: RequestContext,
  input: { dutyId?: string; jobReference?: string },
) {
  const companyId = context.companyId
  let query = closeoutDb(context)
    .from('duty_closeouts')
    .select('id, submitted_at, payload, duty_id, job_reference')
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false })
    .limit(1)

  if (input.dutyId) query = query.eq('duty_id', input.dutyId)
  if (input.jobReference) query = query.eq('job_reference', input.jobReference)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    id: String(data.id),
    submittedAt: String(data.submitted_at),
    payload: data.payload as Row,
    dutyId: data.duty_id ? String(data.duty_id) : null,
    jobReference: data.job_reference ? String(data.job_reference) : null,
  }
}
