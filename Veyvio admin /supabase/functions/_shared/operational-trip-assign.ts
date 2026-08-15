/**
 * Assign driver/vehicle onto an operational trip (writes trip_assignments + run/duty links).
 * One authoritative path used by Schedule planning and Incoming Interests.
 */
import { admin, type RequestContext } from './supabase.ts'
import { apiError, json, readJson, toApiErrorResponse } from './http.ts'
import {
  evaluateDutyAssignmentEligibility,
  recordDutyAssignmentEvent,
} from './duty-publication.ts'
import { recordOverride, requireOverrideReason } from './override-audit.ts'
import {
  assertCompanyScopedDepot,
  assertCompanyScopedDriver,
  assertCompanyScopedVehicle,
} from './tenant-guards.ts'
import { projectOperationalTrips } from './projections.ts'

type Row = Record<string, unknown>

async function resolveRunIdForTrip(companyId: string, tripId: string): Promise<string | null> {
  const { data: links } = await admin.from('run_trips').select('run_id').eq('trip_id', tripId).limit(5)
  const runIds = [...new Set((links ?? []).map((row) => String(row.run_id)).filter(Boolean))]
  if (!runIds.length) return null
  const { data: runs } = await admin
    .from('runs')
    .select('id')
    .eq('company_id', companyId)
    .in('id', runIds)
    .limit(1)
  return runs?.[0]?.id ? String(runs[0].id) : null
}

async function createRunForTrip(input: {
  companyId: string
  trip: Row
  actorUserId: string
  depotId: string | null
  driverId: string
  vehicleId: string | null
}): Promise<string> {
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase()
  const tripRef = String(input.trip.trip_reference ?? input.trip.id).slice(-10)
  const { data, error } = await admin
    .from('runs')
    .insert({
      company_id: input.companyId,
      run_reference: `RUN-${tripRef}-${suffix}`,
      service_date: String(input.trip.service_date),
      depot_id: input.depotId,
      planned_start_at: input.trip.planned_pickup_at ?? null,
      planned_end_at: input.trip.planned_arrival_at ?? null,
      status: 'assigned',
      driver_id: input.driverId,
      vehicle_id: input.vehicleId,
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Could not create run for trip')

  const { error: linkError } = await admin.from('run_trips').insert({
    run_id: data.id,
    trip_id: String(input.trip.id),
    sequence: 1,
  })
  if (linkError) throw new Error(linkError.message)
  return String(data.id)
}

async function ensureDutyForRun(input: {
  companyId: string
  runId: string
  driverId: string
  vehicleId: string | null
  depotId: string | null
  serviceDate: string
  plannedSignOnAt: string | null
  plannedSignOffAt: string | null
  actorUserId: string
  overrideReason?: string | null
}): Promise<{ dutyId: string; eligibility: Awaited<ReturnType<typeof evaluateDutyAssignmentEligibility>> }> {
  const { data: existingLink } = await admin
    .from('duty_runs')
    .select('duty_id')
    .eq('run_id', input.runId)
    .limit(1)
    .maybeSingle()

  let dutyId = existingLink?.duty_id ? String(existingLink.duty_id) : null

  if (!dutyId) {
    const { data: sameDayDuty } = await admin
      .from('duties')
      .select('id')
      .eq('company_id', input.companyId)
      .eq('driver_id', input.driverId)
      .eq('service_date', input.serviceDate)
      .neq('status', 'cancelled')
      .neq('publication_status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    dutyId = sameDayDuty?.id ? String(sameDayDuty.id) : null
  }

  const eligibility = await evaluateDutyAssignmentEligibility({
    companyId: input.companyId,
    driverId: input.driverId,
    vehicleId: input.vehicleId,
    serviceDate: input.serviceDate,
    plannedSignOn: input.plannedSignOnAt,
    plannedSignOff: input.plannedSignOffAt,
    excludeDutyId: dutyId,
  })

  if (eligibility.status === 'blocked') {
    const overrideCheck = requireOverrideReason(eligibility.blockers, input.overrideReason)
    if (!overrideCheck.ok) {
      throw Object.assign(new Error(overrideCheck.message), {
        status: 409,
        code: 'assignment_blocked',
      })
    }
    await recordOverride({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      ruleCode: 'dispatch.assignment_blocked',
      reason: overrideCheck.reason,
      entityType: 'trip_assignment',
      entityId: input.runId,
      blockers: eligibility.blockers,
      warnings: eligibility.warnings,
      payload: { driverId: input.driverId, vehicleId: input.vehicleId },
    })
  }

  const publicationStatus =
    input.driverId && input.vehicleId && input.plannedSignOnAt && input.plannedSignOffAt
      ? 'ready_to_publish'
      : 'draft'

  if (!dutyId) {
    const { data: duty, error } = await admin
      .from('duties')
      .insert({
        company_id: input.companyId,
        driver_id: input.driverId,
        depot_id: input.depotId,
        vehicle_id: input.vehicleId,
        service_date: input.serviceDate,
        planned_sign_on_at: input.plannedSignOnAt,
        planned_sign_off_at: input.plannedSignOffAt,
        status: 'planned',
        publication_status: publicationStatus,
        acknowledgement_required: true,
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
        source_app: 'COMMAND',
      })
      .select('id')
      .single()
    if (error || !duty) throw new Error(error?.message ?? 'Could not create duty')
    dutyId = String(duty.id)
    await recordDutyAssignmentEvent({
      companyId: input.companyId,
      dutyId,
      eventType: 'assigned',
      actorUserId: input.actorUserId,
      payload: { eligibility, publicationStatus, source: 'operational_trip_assign' },
    })
  } else {
    const { error } = await admin
      .from('duties')
      .update({
        driver_id: input.driverId,
        depot_id: input.depotId,
        vehicle_id: input.vehicleId,
        planned_sign_on_at: input.plannedSignOnAt,
        planned_sign_off_at: input.plannedSignOffAt,
        publication_status: publicationStatus,
        updated_at: new Date().toISOString(),
        updated_by: input.actorUserId,
      })
      .eq('id', dutyId)
      .eq('company_id', input.companyId)
    if (error) throw new Error(error.message)
    await recordDutyAssignmentEvent({
      companyId: input.companyId,
      dutyId,
      eventType: 'reassigned',
      actorUserId: input.actorUserId,
      payload: { eligibility, publicationStatus, source: 'operational_trip_assign' },
    })
  }

  const { data: link } = await admin
    .from('duty_runs')
    .select('duty_id')
    .eq('duty_id', dutyId)
    .eq('run_id', input.runId)
    .maybeSingle()
  if (!link) {
    const { count } = await admin
      .from('duty_runs')
      .select('duty_id', { count: 'exact', head: true })
      .eq('duty_id', dutyId)
    const { error: linkError } = await admin.from('duty_runs').insert({
      duty_id: dutyId,
      run_id: input.runId,
      sequence: (count ?? 0) + 1,
    })
    if (linkError) throw new Error(linkError.message)
  }

  return { dutyId, eligibility }
}

export async function assignOperationalTrip(context: RequestContext, tripId: string, request: Request) {
  const input = await readJson<{
    driverId?: string | null
    vehicleId?: string | null
    depotId?: string | null
    overrideReason?: string | null
  }>(request)

  const driverId = input.driverId ? String(input.driverId) : null
  if (!driverId) {
    return apiError(400, 'Driver is required to assign this trip', 'invalid_input')
  }
  const vehicleId = input.vehicleId ? String(input.vehicleId) : null
  const depotIdInput = input.depotId ? String(input.depotId) : null

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', tripId)
    .maybeSingle()
  if (tripError) return apiError(500, tripError.message)
  if (!trip) return apiError(404, 'Trip not found', 'not_found')

  try {
    await assertCompanyScopedDriver(driverId, context.companyId)
    if (vehicleId) await assertCompanyScopedVehicle(vehicleId, context.companyId)
    if (depotIdInput) await assertCompanyScopedDepot(depotIdInput, context.companyId)
  } catch (error) {
    return toApiErrorResponse(error, 'Assignment target not found')
  }

  const { data: driver } = await admin
    .from('drivers')
    .select('id, primary_depot_id')
    .eq('id', driverId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  const depotId =
    depotIdInput ??
    (trip.depot_id ? String(trip.depot_id) : null) ??
    (driver?.primary_depot_id ? String(driver.primary_depot_id) : null)

  try {
    let runId = await resolveRunIdForTrip(context.companyId, tripId)
    if (!runId) {
      runId = await createRunForTrip({
        companyId: context.companyId,
        trip,
        actorUserId: context.user.id,
        depotId,
        driverId,
        vehicleId,
      })
    } else {
      await admin
        .from('runs')
        .update({
          driver_id: driverId,
          vehicle_id: vehicleId,
          depot_id: depotId,
          status: 'assigned',
          updated_at: new Date().toISOString(),
          updated_by: context.user.id,
        })
        .eq('id', runId)
        .eq('company_id', context.companyId)
    }

    const { dutyId, eligibility } = await ensureDutyForRun({
      companyId: context.companyId,
      runId,
      driverId,
      vehicleId,
      depotId,
      serviceDate: String(trip.service_date),
      plannedSignOnAt: trip.planned_pickup_at ? String(trip.planned_pickup_at) : null,
      plannedSignOffAt: trip.planned_arrival_at ? String(trip.planned_arrival_at) : null,
      actorUserId: context.user.id,
      overrideReason: input.overrideReason ?? null,
    })

    const now = new Date().toISOString()
    await admin
      .from('trip_assignments')
      .update({
        status: 'superseded',
        effective_to: now,
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('company_id', context.companyId)
      .eq('trip_id', tripId)
      .eq('status', 'active')

    const { error: assignmentError } = await admin.from('trip_assignments').insert({
      company_id: context.companyId,
      trip_id: tripId,
      run_id: runId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      assigned_at: now,
      assigned_by: context.user.id,
      status: 'active',
      effective_from: now,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
    if (assignmentError) throw new Error(assignmentError.message)

    await admin
      .from('trips')
      .update({
        status: 'assigned',
        depot_id: depotId,
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('id', tripId)
      .eq('company_id', context.companyId)

    if (trip.booking_id) {
      await admin
        .from('bookings')
        .update({
          status: 'assigned',
          depot_id: depotId,
          updated_at: now,
          updated_by: context.user.id,
        })
        .eq('id', String(trip.booking_id))
        .eq('company_id', context.companyId)
    }

    const projected = await projectOperationalTrips(context.companyId, tripId)
    return json({
      ...(projected as Row),
      dutyId: (projected as Row)?.dutyId ?? dutyId,
      eligibility,
    })
  } catch (error) {
    const status = typeof (error as { status?: number })?.status === 'number'
      ? (error as { status: number }).status
      : 500
    const code =
      typeof (error as { code?: string })?.code === 'string'
        ? (error as { code: string }).code
        : undefined
    if (status === 409) {
      return apiError(409, error instanceof Error ? error.message : 'Assignment blocked', code)
    }
    return apiError(500, error instanceof Error ? error.message : 'Trip assignment failed')
  }
}
