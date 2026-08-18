/**
 * Durable journey-sequence move for Command (F-03).
 * Moves pickup trips between runs via run_trips (one operational truth).
 *
 * PROD-1 Batch 06 — authority declaration / bare-admin removal.
 * Not UserScopedDb / RLS cutover. Reads/writes still use company-scoped service-role
 * via companyScopedServiceDbForCompany; company_id filters remain defence-in-depth.
 * Junction rows (duty_runs / run_trips) are reached only after the parent duty,
 * trip, or run has been resolved with company_id.
 *
 * writeImmutableAudit stays on transitional audit-service — do not wrap that hub here.
 */
import { companyScopedServiceDbForCompany } from './db-authority.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { HttpError } from './http.ts'
import { parseDutyTripSyntheticId } from './journey-sequence-reorder.mapping.ts'
import {
  evaluateJourneyMovePlan,
  nextRunSequences,
  uniqueTripIdsFromJobIds,
  type JourneyMoveAction,
} from './journey-sequence-move.mapping.ts'

type Row = Record<string, unknown>

function moveDb(companyId: string) {
  return companyScopedServiceDbForCompany(companyId, 'journey_sequence_move')
}

async function resolvePrimaryRunForDuty(companyId: string, dutyId: string): Promise<{
  dutyId: string
  runId: string
  serviceDate: string
}> {
  const { data: duty, error } = await moveDb(companyId)
    .from('duties')
    .select('id, company_id, service_date')
    .eq('company_id', companyId)
    .eq('id', dutyId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!duty) throw new HttpError(404, 'Duty not found', 'not_found')

  const { data: dutyRuns, error: linkError } = await moveDb(companyId)
    .from('duty_runs')
    .select('run_id, sequence')
    .eq('duty_id', dutyId)
    .order('sequence', { ascending: true })
  if (linkError) throw new Error(linkError.message)
  const runId = dutyRuns?.[0]?.run_id ? String(dutyRuns[0].run_id) : null
  if (!runId) throw new HttpError(409, 'Duty has no run', 'duty_has_no_run')
  return { dutyId, runId, serviceDate: String(duty.service_date) }
}

async function resolveRunForTrip(companyId: string, tripId: string): Promise<{
  tripId: string
  runId: string | null
  serviceDate: string
  status: string
}> {
  const { data: trip, error } = await moveDb(companyId)
    .from('trips')
    .select('id, company_id, service_date, status')
    .eq('company_id', companyId)
    .eq('id', tripId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!trip) throw new HttpError(404, 'Trip not found', 'not_found')

  const { data: link } = await moveDb(companyId)
    .from('run_trips')
    .select('run_id')
    .eq('trip_id', tripId)
    .maybeSingle()

  return {
    tripId,
    runId: link?.run_id ? String(link.run_id) : null,
    serviceDate: String(trip.service_date),
    status: String(trip.status),
  }
}

async function loadRunTripIds(companyId: string, runId: string): Promise<string[]> {
  const { data, error } = await moveDb(companyId)
    .from('run_trips')
    .select('trip_id, sequence')
    .eq('run_id', runId)
    .order('sequence', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => String(row.trip_id))
}

async function renumberRunTrips(companyId: string, runId: string, orderedTripIds: string[]) {
  for (let i = 0; i < orderedTripIds.length; i++) {
    const { error } = await moveDb(companyId)
      .from('run_trips')
      .update({ sequence: -(i + 1) })
      .eq('run_id', runId)
      .eq('trip_id', orderedTripIds[i]!)
    if (error) throw new Error(error.message)
  }
  for (let i = 0; i < orderedTripIds.length; i++) {
    const { error } = await moveDb(companyId)
      .from('run_trips')
      .update({ sequence: i + 1 })
      .eq('run_id', runId)
      .eq('trip_id', orderedTripIds[i]!)
    if (error) throw new Error(error.message)
  }
}

async function detachTripsFromRun(companyId: string, runId: string, tripIds: string[]) {
  const remaining = (await loadRunTripIds(companyId, runId)).filter((id) => !tripIds.includes(id))
  const { error } = await moveDb(companyId).from('run_trips').delete().eq('run_id', runId).in('trip_id', tripIds)
  if (error) throw new Error(error.message)
  if (remaining.length) await renumberRunTrips(companyId, runId, remaining)
}

async function attachTripsToRun(companyId: string, runId: string, tripIds: string[]) {
  const existing = await loadRunTripIds(companyId, runId)
  const sequences = nextRunSequences(
    existing.map((_, i) => i + 1),
    tripIds.length,
  )
  for (let i = 0; i < tripIds.length; i++) {
    const tripId = tripIds[i]!
    if (existing.includes(tripId)) continue
    const { error } = await moveDb(companyId).from('run_trips').insert({
      run_id: runId,
      trip_id: tripId,
      sequence: sequences[i]!,
    })
    if (error) throw new Error(error.message)
  }
}

async function createPlannedRun(input: {
  companyId: string
  serviceDate: string
  actorUserId: string
  sourceRunId: string | null
}): Promise<string> {
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase()
  const runReference = `SPLIT-${suffix}`
  let depotId: string | null = null
  if (input.sourceRunId) {
    const { data: sourceRun } = await moveDb(input.companyId)
      .from('runs')
      .select('depot_id')
      .eq('id', input.sourceRunId)
      .eq('company_id', input.companyId)
      .maybeSingle()
    depotId = sourceRun?.depot_id ? String(sourceRun.depot_id) : null
  }
  const { data, error } = await moveDb(input.companyId)
    .from('runs')
    .insert({
      company_id: input.companyId,
      run_reference: runReference,
      service_date: input.serviceDate,
      depot_id: depotId,
      status: 'planned',
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Could not create run')
  return String(data.id)
}

async function resolveSourceContext(companyId: string, tripId: string, dutyId?: string | null) {
  const syntheticDutyId = parseDutyTripSyntheticId(tripId)
  const resolvedDutyId = dutyId?.trim() || syntheticDutyId
  if (resolvedDutyId) {
    const duty = await resolvePrimaryRunForDuty(companyId, resolvedDutyId)
    return {
      kind: 'duty' as const,
      dutyId: duty.dutyId,
      runId: duty.runId,
      serviceDate: duty.serviceDate,
      entityId: duty.dutyId,
    }
  }
  const trip = await resolveRunForTrip(companyId, tripId)
  return {
    kind: 'trip' as const,
    dutyId: null as string | null,
    runId: trip.runId,
    serviceDate: trip.serviceDate,
    entityId: trip.tripId,
  }
}

async function resolveDestinationRunId(
  companyId: string,
  destinationTripId: string | null,
): Promise<{ runId: string | null; closed: boolean; sameTripId: string | null }> {
  if (!destinationTripId) return { runId: null, closed: false, sameTripId: null }
  const dutyId = parseDutyTripSyntheticId(destinationTripId)
  if (dutyId) {
    const duty = await resolvePrimaryRunForDuty(companyId, dutyId)
    const { data: run } = await moveDb(companyId)
      .from('runs')
      .select('status')
      .eq('id', duty.runId)
      .eq('company_id', companyId)
      .maybeSingle()
    const status = String(run?.status ?? 'planned')
    return {
      runId: duty.runId,
      closed: status === 'completed' || status === 'cancelled',
      sameTripId: destinationTripId,
    }
  }
  const trip = await resolveRunForTrip(companyId, destinationTripId)
  const closed = trip.status === 'completed' || trip.status === 'cancelled'
  if (!trip.runId) {
    // Destination trip exists but is unlinked — create is not automatic here.
    throw new HttpError(409, 'Destination trip is not on a run', 'destination_run_missing')
  }
  const { data: run } = await moveDb(companyId)
    .from('runs')
    .select('status')
    .eq('id', trip.runId)
    .eq('company_id', companyId)
    .maybeSingle()
  const runStatus = String(run?.status ?? trip.status)
  return {
    runId: trip.runId,
    closed: closed || runStatus === 'completed' || runStatus === 'cancelled',
    sameTripId: destinationTripId,
  }
}

export async function commitJourneySequenceMove(input: {
  companyId: string
  actorUserId: string
  sourceTripId: string
  jobIds: string[]
  action: JourneyMoveAction
  destinationTripId?: string | null
  reason?: string | null
  actorName?: string | null
  dutyId?: string | null
}): Promise<{
  action: JourneyMoveAction
  movedTripIds: string[]
  sourceRunId: string | null
  destinationRunId: string | null
  message: string
  auditId: string
}> {
  const action = input.action
  if (!['move_to_run', 'create_new_run', 'assign_standby', 'leave_unassigned'].includes(action)) {
    throw new HttpError(400, 'Invalid move action', 'invalid_action')
  }

  const movedTripIds = uniqueTripIdsFromJobIds(input.jobIds)
  const source = await resolveSourceContext(input.companyId, input.sourceTripId, input.dutyId)
  if (!source.runId) {
    throw new HttpError(409, 'Source journey is not linked to a run', 'source_run_missing')
  }

  const sourceTripIds = await loadRunTripIds(input.companyId, source.runId)
  for (const tripId of movedTripIds) {
    if (!sourceTripIds.includes(tripId)) {
      throw new HttpError(409, `Pickup trip ${tripId} is not on the source run`, 'trip_not_on_source_run')
    }
  }

  let destinationRunId: string | null = null
  let destinationClosed = false
  if (action === 'move_to_run') {
    const dest = await resolveDestinationRunId(input.companyId, input.destinationTripId ?? null)
    destinationRunId = dest.runId
    destinationClosed = dest.closed
  }

  const plan = evaluateJourneyMovePlan({
    action,
    sourceTripIds: movedTripIds,
    sourceRunId: source.runId,
    destinationRunId,
    destinationClosed,
    destinationSameAsSource: destinationRunId === source.runId,
  })
  if (plan.blocked) {
    throw new HttpError(
      409,
      plan.checks.find((c) => c.level === 'error')?.message ?? 'Cannot move journey',
      'move_blocked',
    )
  }

  if (action === 'create_new_run') {
    destinationRunId = await createPlannedRun({
      companyId: input.companyId,
      serviceDate: source.serviceDate,
      actorUserId: input.actorUserId,
      sourceRunId: source.runId,
    })
  }

  await detachTripsFromRun(input.companyId, source.runId, movedTripIds)

  if (destinationRunId && (action === 'move_to_run' || action === 'create_new_run')) {
    await attachTripsToRun(input.companyId, destinationRunId, movedTripIds)
  }

  const reason = String(input.reason ?? '').trim() || 'Operational transfer'
  const audit = await writeImmutableAudit({
    companyId: input.companyId,
    actorUserId: input.actorUserId,
    action: 'journey_sequence.move',
    entityType: source.kind === 'duty' ? 'duty' : 'run',
    entityId: source.kind === 'duty' ? source.dutyId! : source.runId,
    reason,
    beforeSnapshot: {
      sourceRunId: source.runId,
      movedTripIds,
      action,
    },
    afterSnapshot: {
      destinationRunId,
      movedTripIds,
      action,
      actorName: input.actorName ?? null,
    },
  })

  const count = movedTripIds.length
  let message = `${count} pickup(s) moved.`
  if (action === 'create_new_run') {
    message = `Created a new run with ${count} pickup(s).`
  } else if (action === 'leave_unassigned') {
    message = `${count} pickup(s) left unassigned.`
  } else if (action === 'assign_standby') {
    message = `${count} pickup(s) queued for standby coverage.`
  } else if (action === 'move_to_run') {
    message = `${count} pickup(s) moved to the selected run.`
  }

  return {
    action,
    movedTripIds,
    sourceRunId: source.runId,
    destinationRunId,
    message,
    auditId: audit.id,
  }
}

export async function listJourneySequenceDestinations(input: {
  companyId: string
  sourceTripId: string
  dutyId?: string | null
}): Promise<
  Array<{
    tripId: string
    tripReference: string
    runReference: string | null
    routeName: string | null
    driverName: string | null
    vehicleRegistration: string | null
    tripStatus: string
    jobCount: number
    wheelchairSpacesHint: number
  }>
> {
  const source = await resolveSourceContext(input.companyId, input.sourceTripId, input.dutyId)
  const { data: runs, error } = await moveDb(input.companyId)
    .from('runs')
    .select(
      'id, run_reference, status, service_date, driver_id, vehicle_id, drivers(id, staff_members(first_name, last_name)), vehicles(id, registration)',
    )
    .eq('company_id', input.companyId)
    .eq('service_date', source.serviceDate)
    .order('run_reference', { ascending: true })
  if (error) throw new Error(error.message)

  const out: Array<{
    tripId: string
    tripReference: string
    runReference: string | null
    routeName: string | null
    driverName: string | null
    vehicleRegistration: string | null
    tripStatus: string
    jobCount: number
    wheelchairSpacesHint: number
  }> = []

  for (const run of runs ?? []) {
    const runId = String(run.id)
    if (source.runId && runId === source.runId) continue
    const tripIds = await loadRunTripIds(input.companyId, runId)
    const headTripId = tripIds[0] ?? runId
    const driver = (run.drivers as Row | null) ?? null
    const staff = (driver?.staff_members as Row | null) ?? null
    const vehicle = (run.vehicles as Row | null) ?? null
    const driverName = staff
      ? `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim() || null
      : null
    out.push({
      tripId: headTripId,
      tripReference: String(run.run_reference ?? headTripId),
      runReference: String(run.run_reference ?? ''),
      routeName: String(run.run_reference ?? ''),
      driverName,
      vehicleRegistration: vehicle?.registration ? String(vehicle.registration) : null,
      tripStatus: String(run.status ?? 'planned'),
      jobCount: tripIds.length,
      wheelchairSpacesHint: 2,
    })
  }
  return out
}
