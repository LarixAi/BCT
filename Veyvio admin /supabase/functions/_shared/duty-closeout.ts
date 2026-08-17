/**
 * Duty closeout records on Command (replaces Supabase-only job_stop_events for BCT path).
 *
 * PROD-1 Batch 01 — authority declaration / bare-admin removal.
 * Not UserScopedDb / RLS cutover. Writes still use company-scoped service-role
 * via companyScopedServiceDbForCompany; company_id filters remain defence-in-depth.
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { guardDriverScopedWrite } from './driver-write-guards.ts'

type Row = Record<string, unknown>

function closeoutDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'duty_closeout')
}

export async function submitDutyCloseout(input: {
  companyId: string
  driverId: string
  dutyId?: string | null
  jobReference?: string | null
  payload: Row
  clientGeneratedId?: string | null
}) {
  const clientGeneratedId = input.clientGeneratedId?.trim() || null
  if (clientGeneratedId) {
    const { data: existing } = await closeoutDb(input.companyId)
      .from('duty_closeouts')
      .select('id, submitted_at, payload')
      .eq('company_id', input.companyId)
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
    companyId: input.companyId,
    driverId: input.driverId,
    dutyId: guardDutyId,
  })

  const { data, error } = await closeoutDb(input.companyId)
    .from('duty_closeouts')
    .insert({
      company_id: input.companyId,
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
    companyId: input.companyId,
    actorUserId: null,
    action: 'duty.closeout_submitted',
    entityType: 'duty_closeout',
    entityId: String(data.id),
    afterSnapshot: { dutyId: input.dutyId ?? null, jobReference: input.jobReference ?? null },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: input.companyId,
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

export async function getDutyCloseout(companyId: string, input: { dutyId?: string; jobReference?: string }) {
  let query = closeoutDb(companyId)
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
