/**
 * Server-enforced driver job execution events (Command source of truth when configured).
 *
 * Wave 3F UserScopedDb/RLS cutover 2: membership JWT writes `driver_job_execution_events`
 * through RLS (INSERT + SELECT). Support-grant sessions stay on company-scoped
 * service-role — membership RLS cannot see non-member JWTs.
 * company_id filters remain defence-in-depth.
 * Domain events stay privileged until named capabilities exist.
 */
import { companyScopedServiceDb, userScopedDb } from './db-authority.ts'
import { guardDriverScopedWrite } from './driver-write-guards.ts'
import { emitDomainEvent } from './domain-events.ts'
import type { RequestContext } from './supabase.ts'

type Row = Record<string, unknown>

function jobExecutionDb(context: RequestContext) {
  if (context.workspaceAuthority === 'support') {
    return companyScopedServiceDb(context, 'driver_job_execution_support_grant')
  }
  return userScopedDb(context, 'driver_job_execution')
}

export type JobExecutionEventInput = {
  context: RequestContext
  driverId: string
  jobId: string
  eventType: string
  dutyId?: string | null
  journeyId?: string | null
  stopId?: string | null
  stopSequence?: number | null
  payload?: Row
  clientGeneratedId?: string | null
}

function mapStopStatus(eventType: string): string | null {
  if (eventType === 'arrived_stop') return 'arrived'
  if (eventType === 'completed_stop') return 'completed'
  return null
}

export async function recordDriverJobExecutionEvent(input: JobExecutionEventInput) {
  const companyId = input.context.companyId
  const db = jobExecutionDb(input.context)
  const clientGeneratedId = input.clientGeneratedId?.trim() || null
  if (clientGeneratedId) {
    const { data: existing } = await db
      .from('driver_job_execution_events')
      .select('id, event_type, occurred_at, payload')
      .eq('company_id', companyId)
      .eq('client_generated_id', clientGeneratedId)
      .maybeSingle()
    if (existing) return existing as Row
  }

  // jobId maps 1:1 onto a duty in the current driver job model (see
  // job-execution-bridge.service.js resolveDutyContext) — fall back to it
  // when dutyId is absent so this write can never skip the assignment
  // check just because the client omitted dutyId.
  await guardDriverScopedWrite({
    companyId,
    driverId: input.driverId,
    dutyId: input.dutyId ? String(input.dutyId) : String(input.jobId),
  })

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('driver_job_execution_events')
    .insert({
      company_id: companyId,
      driver_id: input.driverId,
      job_id: String(input.jobId),
      duty_id: input.dutyId ?? null,
      journey_id: input.journeyId ?? null,
      stop_id: input.stopId ?? null,
      stop_sequence: input.stopSequence ?? null,
      event_type: input.eventType,
      payload: input.payload ?? {},
      occurred_at: now,
      client_generated_id: clientGeneratedId,
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Job execution event could not be recorded')

  await emitDomainEvent({
    companyId,
    eventType: `job.${input.eventType}`,
    entityType: 'job',
    entityId: String(input.jobId),
    payload: {
      stopId: input.stopId ?? null,
      stopSequence: input.stopSequence ?? null,
    },
  }).catch(() => undefined)

  return data as Row
}

export async function getJobExecutionSnapshot(context: RequestContext, jobId: string) {
  const companyId = context.companyId
  const { data, error } = await jobExecutionDb(context)
    .from('driver_job_execution_events')
    .select('*')
    .eq('company_id', companyId)
    .eq('job_id', jobId)
    .order('occurred_at', { ascending: true })

  if (error) throw new Error(error.message)

  const events = data ?? []
  const stopStatusById = new Map<string, string>()
  const stopStatusBySequence = new Map<number, string>()

  let startedAt: string | null = null
  let completedAt: string | null = null
  let acceptedAt: string | null = null

  for (const row of events) {
    const type = String(row.event_type)
    const at = String(row.occurred_at ?? '')
    if (type === 'job_accepted') acceptedAt = at
    if (type === 'job_started') startedAt = at
    if (type === 'job_completed') completedAt = at
    const mapped = mapStopStatus(type)
    if (mapped) {
      if (row.stop_id) stopStatusById.set(String(row.stop_id), mapped)
      if (row.stop_sequence != null) stopStatusBySequence.set(Number(row.stop_sequence), mapped)
    }
  }

  return {
    events: events.map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      occurredAt: String(row.occurred_at ?? ''),
      stopId: row.stop_id ? String(row.stop_id) : null,
      stopSequence: row.stop_sequence != null ? Number(row.stop_sequence) : null,
    })),
    acceptedAt,
    startedAt,
    completedAt,
    stopStatusById: Object.fromEntries(stopStatusById),
    stopStatusBySequence: Object.fromEntries(stopStatusBySequence),
  }
}

export function mergeStopStatuses<T extends { id: string; stopOrder?: number; sequence?: number; status: string }>(
  stops: T[],
  snapshot: Awaited<ReturnType<typeof getJobExecutionSnapshot>>,
): T[] {
  return stops.map((stop) => {
    const fromId = snapshot.stopStatusById[stop.id]
    const seq = stop.stopOrder ?? stop.sequence
    const fromSeq = seq != null ? snapshot.stopStatusBySequence[seq] : null
    const next = fromId ?? fromSeq
    return next ? { ...stop, status: next } : stop
  })
}
