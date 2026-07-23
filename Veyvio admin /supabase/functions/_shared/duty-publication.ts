/**
 * Duty publication first slice — draft/assign/publish/acknowledge.
 * Publication status is separate from execution duty_status.
 */
import { admin } from './supabase.ts'
import { apiError, json, readJson, toApiErrorResponse } from './http.ts'
import type { RequestContext } from './supabase.ts'
import {
  assertCompanyScopedDepot,
  assertCompanyScopedDriver,
  assertCompanyScopedVehicle,
} from './tenant-guards.ts'

type Row = Record<string, unknown>

export type EligibilityResult = {
  status: 'eligible' | 'eligible_with_warnings' | 'blocked'
  blockers: string[]
  warnings: string[]
}

function endOfServiceDayUtc(serviceDate: string): string {
  // Acknowledgement deadline: end of calendar day (UTC) before service date starts locally —
  // use service_date 20:00 UTC as a practical first-slice default.
  return new Date(`${serviceDate}T20:00:00.000Z`).toISOString()
}

export async function recordDutyAssignmentEvent(input: {
  companyId: string
  dutyId: string
  eventType: string
  actorUserId?: string | null
  actorDriverId?: string | null
  payload?: Row
  sourceApp?: string
}) {
  await admin.from('duty_assignment_events').insert({
    company_id: input.companyId,
    duty_id: input.dutyId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId ?? null,
    actor_driver_id: input.actorDriverId ?? null,
    payload: input.payload ?? {},
    source_app: input.sourceApp ?? 'COMMAND',
  })
}

export async function evaluateDutyAssignmentEligibility(input: {
  companyId: string
  driverId: string
  vehicleId?: string | null
  serviceDate: string
  plannedSignOn?: string | null
  plannedSignOff?: string | null
  excludeDutyId?: string | null
}): Promise<EligibilityResult> {
  const blockers: string[] = []
  const warnings: string[] = []

  const { data: driver } = await admin
    .from('drivers')
    .select('id, status, company_id')
    .eq('id', input.driverId)
    .eq('company_id', input.companyId)
    .maybeSingle()

  if (!driver) {
    blockers.push('Driver is not available for this company.')
  } else if (String(driver.status) === 'suspended' || String(driver.status) === 'left') {
    blockers.push('Driver is not available for duty assignment.')
  }

  const { data: appAccount } = await admin
    .from('driver_app_accounts')
    .select('account_status')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .maybeSingle()

  const accountStatus = String(appAccount?.account_status ?? '')
  if (
    accountStatus === 'suspended' ||
    accountStatus === 'temporarily_suspended' ||
    accountStatus === 'locked' ||
    accountStatus === 'offboarded' ||
    accountStatus === 'archived'
  ) {
    blockers.push('Driver app access is suspended or removed.')
  }

  let conflictQuery = admin
    .from('duties')
    .select('id, planned_sign_on_at, planned_sign_off_at, publication_status, status')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('service_date', input.serviceDate)
    .neq('status', 'cancelled')
    .neq('publication_status', 'cancelled')

  if (input.excludeDutyId) conflictQuery = conflictQuery.neq('id', input.excludeDutyId)

  const { data: otherDuties } = await conflictQuery
  if ((otherDuties ?? []).length > 0) {
    blockers.push('Driver already has another duty on this service date.')
  }

  if (input.vehicleId) {
    const { data: vehicle } = await admin
      .from('vehicles')
      .select('id, operational_status, registration')
      .eq('id', input.vehicleId)
      .eq('company_id', input.companyId)
      .maybeSingle()

    if (!vehicle) {
      blockers.push('Vehicle is not available for this company.')
    } else {
      const op = String(vehicle.operational_status ?? '')
      if (op === 'vor' || op === 'quarantined' || op === 'decommissioned') {
        blockers.push(`Vehicle ${vehicle.registration ?? ''} cannot enter service (${op}).`.trim())
      } else if (op === 'maintenance' || op === 'awaiting_check') {
        warnings.push(`Vehicle ${vehicle.registration ?? ''} is currently ${op.replace('_', ' ')}.`)
      }
    }
  } else {
    warnings.push('No vehicle assigned yet.')
  }

  if (!input.plannedSignOn || !input.plannedSignOff) {
    warnings.push('Report or finish time is missing.')
  }

  if (blockers.length) return { status: 'blocked', blockers, warnings }
  if (warnings.length) return { status: 'eligible_with_warnings', blockers, warnings }
  return { status: 'eligible', blockers, warnings }
}

export async function createDraftDuty(context: RequestContext, request: Request) {
  const input = await readJson<{
    driverId?: string
    depotId?: string
    vehicleId?: string
    serviceDate?: string
    plannedSignOnAt?: string
    plannedSignOffAt?: string
    specialInstructions?: string
    runIds?: string[]
  }>(request)

  if (!input.driverId || !input.serviceDate) {
    return apiError(400, 'Driver and service date are required', 'invalid_input')
  }

  try {
    await assertCompanyScopedDriver(input.driverId, context.companyId)
    if (input.vehicleId) await assertCompanyScopedVehicle(input.vehicleId, context.companyId)
    if (input.depotId) await assertCompanyScopedDepot(input.depotId, context.companyId)
  } catch (error) {
    return toApiErrorResponse(error, 'Assignment target not found')
  }

  const eligibility = await evaluateDutyAssignmentEligibility({
    companyId: context.companyId,
    driverId: input.driverId,
    vehicleId: input.vehicleId,
    serviceDate: input.serviceDate,
    plannedSignOn: input.plannedSignOnAt,
    plannedSignOff: input.plannedSignOffAt,
  })

  if (eligibility.status === 'blocked') {
    return apiError(409, eligibility.blockers[0] ?? 'Assignment is blocked', 'assignment_blocked')
  }

  const publicationStatus =
    input.vehicleId && input.plannedSignOnAt && input.plannedSignOffAt
      ? 'ready_to_publish'
      : 'draft'

  const { data: duty, error } = await admin
    .from('duties')
    .insert({
      company_id: context.companyId,
      driver_id: input.driverId,
      depot_id: input.depotId ?? null,
      vehicle_id: input.vehicleId ?? null,
      service_date: input.serviceDate,
      planned_sign_on_at: input.plannedSignOnAt ?? null,
      planned_sign_off_at: input.plannedSignOffAt ?? null,
      special_instructions: input.specialInstructions ?? null,
      status: 'planned',
      publication_status: publicationStatus,
      acknowledgement_required: true,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
    .select('*')
    .single()

  if (error || !duty) {
    return apiError(500, error?.message ?? 'Duty could not be created')
  }

  const runIds = Array.isArray(input.runIds) ? input.runIds.filter(Boolean) : []
  if (runIds.length) {
    await admin.from('duty_runs').insert(
      runIds.map((runId, index) => ({
        duty_id: duty.id,
        run_id: runId,
        sequence: index + 1,
      })),
    )
  }

  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId: String(duty.id),
    eventType: 'assigned',
    actorUserId: context.user.id,
    payload: { eligibility, publicationStatus },
  })

  return json({ duty: expandDutyRow(duty), eligibility })
}

function mapExecutionStatus(status: unknown, fallback: string): string {
  const s = String(status ?? '')
  if (s === 'in_progress') return 'in_progress'
  if (s === 'completed' || s === 'signed_off') return 'signed_off'
  if (s === 'signed_on') return 'signed_on'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'assigned' || s === 'unassigned' || s === 'planned') return 'planned'
  return fallback
}

export async function assignDuty(context: RequestContext, dutyId: string, request: Request) {
  const input = await readJson<{
    driverId?: string | null
    depotId?: string
    vehicleId?: string | null
    plannedSignOnAt?: string | null
    plannedSignOffAt?: string | null
    specialInstructions?: string | null
    runIds?: string[]
    status?: string
  }>(request)

  const { data: existing, error: loadError } = await admin
    .from('duties')
    .select('*')
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .maybeSingle()

  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Duty not found', 'not_found')

  const isPublished = String(existing.publication_status) === 'published'
  const onlyStatusUpdate =
    input.status !== undefined &&
    input.driverId === undefined &&
    input.vehicleId === undefined &&
    input.plannedSignOnAt === undefined &&
    input.plannedSignOffAt === undefined

  if (isPublished && !onlyStatusUpdate) {
    return apiError(409, 'Published duties cannot be reassigned in this slice. Cancel or amend later.', 'already_published')
  }

  if (onlyStatusUpdate) {
    const { data: updated, error } = await admin
      .from('duties')
      .update({
        status: mapExecutionStatus(input.status, String(existing.status)),
        updated_at: new Date().toISOString(),
        updated_by: context.user.id,
      })
      .eq('id', dutyId)
      .eq('company_id', context.companyId)
      .select('*')
      .single()
    if (error || !updated) return apiError(500, error?.message ?? 'Duty could not be updated')
    return json({
      duty: expandDutyRow(updated),
      eligibility: { status: 'eligible', blockers: [], warnings: [] },
    })
  }

  const driverId = input.driverId === null ? null : String(input.driverId ?? existing.driver_id)
  if (!driverId) {
    return apiError(400, 'Driver is required for assignment', 'invalid_input')
  }
  const serviceDate = String(existing.service_date)
  const plannedSignOn = input.plannedSignOnAt !== undefined ? input.plannedSignOnAt : existing.planned_sign_on_at
  const plannedSignOff = input.plannedSignOffAt !== undefined ? input.plannedSignOffAt : existing.planned_sign_off_at
  const vehicleId = input.vehicleId !== undefined ? input.vehicleId : existing.vehicle_id

  try {
    await assertCompanyScopedDriver(driverId, context.companyId)
    if (vehicleId) await assertCompanyScopedVehicle(String(vehicleId), context.companyId)
    if (input.depotId) await assertCompanyScopedDepot(String(input.depotId), context.companyId)
  } catch (error) {
    return toApiErrorResponse(error, 'Assignment target not found')
  }

  const eligibility = await evaluateDutyAssignmentEligibility({
    companyId: context.companyId,
    driverId,
    vehicleId: vehicleId ? String(vehicleId) : null,
    serviceDate,
    plannedSignOn: plannedSignOn ? String(plannedSignOn) : null,
    plannedSignOff: plannedSignOff ? String(plannedSignOff) : null,
    excludeDutyId: dutyId,
  })

  if (eligibility.status === 'blocked') {
    return apiError(409, eligibility.blockers[0] ?? 'Assignment is blocked', 'assignment_blocked')
  }

  const publicationStatus =
    driverId && vehicleId && plannedSignOn && plannedSignOff ? 'ready_to_publish' : 'draft'

  const { data: updated, error } = await admin
    .from('duties')
    .update({
      driver_id: driverId,
      depot_id: input.depotId !== undefined ? input.depotId : existing.depot_id,
      vehicle_id: vehicleId,
      planned_sign_on_at: plannedSignOn,
      planned_sign_off_at: plannedSignOff,
      special_instructions:
        input.specialInstructions !== undefined ? input.specialInstructions : existing.special_instructions,
      publication_status: isPublished ? existing.publication_status : publicationStatus,
      status: input.status ? mapExecutionStatus(input.status, String(existing.status)) : existing.status,
      updated_at: new Date().toISOString(),
      updated_by: context.user.id,
    })
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Duty could not be assigned')

  if (Array.isArray(input.runIds)) {
    await admin.from('duty_runs').delete().eq('duty_id', dutyId)
    if (input.runIds.length) {
      await admin.from('duty_runs').insert(
        input.runIds.map((runId, index) => ({
          duty_id: dutyId,
          run_id: runId,
          sequence: index + 1,
        })),
      )
    }
  }

  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId,
    eventType: 'assigned',
    actorUserId: context.user.id,
    payload: { eligibility, publicationStatus },
  })

  return json({ duty: expandDutyRow(updated), eligibility })
}

export async function publishDuty(context: RequestContext, dutyId: string) {
  const { data: existing, error: loadError } = await admin
    .from('duties')
    .select('*')
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .maybeSingle()

  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Duty not found', 'not_found')
  if (String(existing.publication_status) === 'published') {
    return json({ duty: expandDutyRow(existing), alreadyPublished: true })
  }
  if (String(existing.publication_status) === 'cancelled') {
    return apiError(409, 'Cancelled duties cannot be published', 'cancelled')
  }

  const eligibility = await evaluateDutyAssignmentEligibility({
    companyId: context.companyId,
    driverId: String(existing.driver_id),
    vehicleId: existing.vehicle_id ? String(existing.vehicle_id) : null,
    serviceDate: String(existing.service_date),
    plannedSignOn: existing.planned_sign_on_at ? String(existing.planned_sign_on_at) : null,
    plannedSignOff: existing.planned_sign_off_at ? String(existing.planned_sign_off_at) : null,
    excludeDutyId: dutyId,
  })

  if (eligibility.status === 'blocked') {
    return apiError(409, eligibility.blockers[0] ?? 'Cannot publish a blocked assignment', 'assignment_blocked')
  }
  if (!existing.driver_id || !existing.planned_sign_on_at || !existing.planned_sign_off_at) {
    return apiError(400, 'Driver, report time and finish time are required before publish', 'not_ready')
  }

  const publishedAt = new Date().toISOString()
  const deadline =
    existing.acknowledgement_deadline ?? endOfServiceDayUtc(String(existing.service_date))

  const { data: updated, error } = await admin
    .from('duties')
    .update({
      publication_status: 'published',
      published_at: publishedAt,
      published_by: context.user.id,
      acknowledgement_required: true,
      acknowledgement_deadline: deadline,
      driver_lifecycle_status: 'published',
      updated_at: publishedAt,
      updated_by: context.user.id,
    })
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Duty could not be published')

  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId,
    eventType: 'published',
    actorUserId: context.user.id,
    payload: {
      eligibility,
      acknowledgementDeadline: deadline,
      notificationPending: true,
    },
  })

  // Push not wired in this slice — event records notification_pending for the next slice.
  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId,
    eventType: 'notification_pending',
    actorUserId: context.user.id,
    payload: { channel: 'push', template: 'duty_published' },
  })

  return json({ duty: expandDutyRow(updated), eligibility })
}

export async function acknowledgePublishedDuty(
  context: RequestContext,
  dutyId: string,
  driverId: string,
  deviceId?: string | null,
) {
  const { data: existing, error: loadError } = await admin
    .from('duties')
    .select('*')
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .maybeSingle()

  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Duty not found', 'not_found')
  if (String(existing.publication_status) !== 'published') {
    return apiError(409, 'Only published duties can be acknowledged', 'not_published')
  }
  if (String(existing.driver_id) !== driverId) {
    return apiError(403, 'This duty is not assigned to you', 'forbidden')
  }

  const revision = Number(existing.version ?? 1)
  const acknowledgedAt = new Date().toISOString()

  const { error: ackError } = await admin.from('duty_acknowledgements').upsert(
    {
      company_id: context.companyId,
      duty_id: dutyId,
      driver_id: driverId,
      revision,
      acknowledged_at: acknowledgedAt,
      device_id: deviceId ?? null,
      source_app: 'DRIVER',
      created_by: context.user.id,
    },
    { onConflict: 'duty_id,driver_id,revision' },
  )
  if (ackError) return apiError(500, ackError.message)

  const { data: updated, error } = await admin
    .from('duties')
    .update({
      driver_lifecycle_status: 'acknowledged',
      updated_at: acknowledgedAt,
      updated_by: context.user.id,
    })
    .eq('id', dutyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Acknowledgement could not be saved')

  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId,
    eventType: 'acknowledged',
    actorUserId: context.user.id,
    actorDriverId: driverId,
    payload: { revision, deviceId: deviceId ?? null },
    sourceApp: 'DRIVER',
  })

  return json({
    ok: true,
    dutyId,
    revision,
    acknowledgedAt,
    lifecycleStatus: 'acknowledged',
    duty: expandDutyRow(updated),
  })
}

export async function signOnPublishedDuty(
  context: RequestContext,
  dutyId: string,
  driverId: string,
  deviceId?: string | null,
) {
  const { data: existing, error: loadError } = await admin
    .from('duties')
    .select('*')
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .maybeSingle()

  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Duty not found', 'not_found')
  if (String(existing.publication_status) !== 'published') {
    return apiError(409, 'Only published duties can be signed on', 'not_published')
  }
  if (String(existing.driver_id) !== driverId) {
    return apiError(403, 'This duty is not assigned to you', 'forbidden')
  }
  if (existing.actual_sign_on_at) {
    return json({
      ok: true,
      dutyId,
      signedOnAt: existing.actual_sign_on_at,
      lifecycleStatus: existing.driver_lifecycle_status ?? 'in_progress',
      duty: expandDutyRow(existing),
      alreadySignedOn: true,
    })
  }

  const signedOnAt = new Date().toISOString()
  const { data: updated, error } = await admin
    .from('duties')
    .update({
      actual_sign_on_at: signedOnAt,
      status: 'signed_on',
      driver_lifecycle_status: 'in_progress',
      updated_at: signedOnAt,
      updated_by: context.user.id,
    })
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Sign-on could not be saved')

  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId,
    eventType: 'signed_on',
    actorUserId: context.user.id,
    actorDriverId: driverId,
    payload: { deviceId: deviceId ?? null, signedOnAt },
    sourceApp: 'DRIVER',
  })

  return json({
    ok: true,
    dutyId,
    signedOnAt,
    lifecycleStatus: 'in_progress',
    duty: expandDutyRow(updated),
  })
}

export async function signOffPublishedDuty(
  context: RequestContext,
  dutyId: string,
  driverId: string,
  deviceId?: string | null,
) {
  const { data: existing, error: loadError } = await admin
    .from('duties')
    .select('*')
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .maybeSingle()

  if (loadError) return apiError(500, loadError.message)
  if (!existing) return apiError(404, 'Duty not found', 'not_found')
  if (String(existing.driver_id) !== driverId) {
    return apiError(403, 'This duty is not assigned to you', 'forbidden')
  }
  if (!existing.actual_sign_on_at) {
    return apiError(409, 'Sign on before signing off', 'not_signed_on')
  }
  if (existing.actual_sign_off_at) {
    return json({
      ok: true,
      dutyId,
      signedOffAt: existing.actual_sign_off_at,
      lifecycleStatus: existing.driver_lifecycle_status ?? 'completed',
      duty: expandDutyRow(existing),
      alreadySignedOff: true,
    })
  }

  const signedOffAt = new Date().toISOString()
  const { data: updated, error } = await admin
    .from('duties')
    .update({
      actual_sign_off_at: signedOffAt,
      status: 'signed_off',
      driver_lifecycle_status: 'completed',
      updated_at: signedOffAt,
      updated_by: context.user.id,
    })
    .eq('id', dutyId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Sign-off could not be saved')

  await recordDutyAssignmentEvent({
    companyId: context.companyId,
    dutyId,
    eventType: 'signed_off',
    actorUserId: context.user.id,
    actorDriverId: driverId,
    payload: { deviceId: deviceId ?? null, signedOffAt },
    sourceApp: 'DRIVER',
  })

  return json({
    ok: true,
    dutyId,
    signedOffAt,
    lifecycleStatus: 'completed',
    duty: expandDutyRow(updated),
  })
}

function expandDutyRow(row: Row) {
  return {
    id: row.id,
    reference: `DUTY-${String(row.id).slice(0, 8).toUpperCase()}`,
    dutyDate: row.service_date,
    startTime: row.planned_sign_on_at ?? null,
    endTime: row.planned_sign_off_at ?? null,
    actualSignOnAt: row.actual_sign_on_at ?? null,
    actualSignOffAt: row.actual_sign_off_at ?? null,
    status: row.status,
    publicationStatus: row.publication_status ?? 'draft',
    publishedAt: row.published_at ?? null,
    acknowledgementRequired: row.acknowledgement_required ?? true,
    acknowledgementDeadline: row.acknowledgement_deadline ?? null,
    driverLifecycleStatus: row.driver_lifecycle_status ?? null,
    specialInstructions: row.special_instructions ?? null,
    version: row.version ?? 1,
    driverId: row.driver_id,
    depotId: row.depot_id,
    vehicleId: row.vehicle_id ?? null,
  }
}

function locationLabel(location: unknown): string {
  if (!location || typeof location !== 'object') return 'Stop'
  const row = location as Row
  return String(row.name ?? row.label ?? row.address ?? 'Stop')
}

function locationAddress(location: unknown): string {
  if (!location || typeof location !== 'object') return ''
  const row = location as Row
  const parts = [row.address, row.name, row.postcode].filter(Boolean).map(String)
  return [...new Set(parts)].join(', ')
}

function locationCoord(location: unknown, key: 'lat' | 'lng' | 'latitude' | 'longitude', fallback: number) {
  if (!location || typeof location !== 'object') return fallback
  const row = location as Row
  const value = row[key] ?? (key === 'lat' ? row.latitude : key === 'lng' ? row.longitude : null)
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function buildStopsFromTrips(trips: Row[], passengerNames: Map<string, string>): Row[] {
  const stops: Row[] = []
  let order = 1
  const dropPassengerTasks: Row[] = []
  let schoolDestination: Row | null = null
  let schoolArrival = '08:45'

  for (const trip of trips) {
    const pickup = (trip.pickup_location as Row | null) ?? {}
    const destination = (trip.destination_location as Row | null) ?? {}
    const passengerIds = Array.isArray(trip.passenger_ids) ? trip.passenger_ids.map(String) : []
    const plannedPickup = isoTimeLabel(trip.planned_pickup_at)
    const pickupTasks = passengerIds.map((passengerId) => ({
      id: `pt_pickup_${trip.id}_${passengerId}`,
      passengerId,
      passengerName: passengerNames.get(passengerId) ?? 'Passenger',
      stopId: `stop_pickup_${trip.id}`,
      type: 'pickup',
      status: 'scheduled',
      requiresEscort: false,
      plannedTime: plannedPickup,
    }))

    stops.push({
      id: `stop_pickup_${trip.id}`,
      stopOrder: order,
      name: locationLabel(pickup),
      address: locationAddress(pickup),
      latitude: locationCoord(pickup, 'lat', 51.55),
      longitude: locationCoord(pickup, 'lng', -0.29),
      plannedArrival: plannedPickup,
      status: 'scheduled',
      kind: 'passenger_pickup',
      passengerTasks: pickupTasks,
    })
    order += 1

    for (const task of pickupTasks) {
      dropPassengerTasks.push({
        ...task,
        id: `pt_drop_${trip.id}_${task.passengerId}`,
        stopId: 'stop_school_drop',
        type: 'dropoff',
        plannedTime: isoTimeLabel(trip.planned_arrival_at),
        safeguardingNotes: 'Hand to school staff only',
        requiresEscort: true,
      })
    }

    if (!schoolDestination && Object.keys(destination).length) {
      schoolDestination = destination
      schoolArrival = isoTimeLabel(trip.planned_arrival_at)
    }
  }

  if (schoolDestination) {
    stops.push({
      id: 'stop_school_drop',
      stopOrder: order,
      name: locationLabel(schoolDestination),
      address: locationAddress(schoolDestination),
      latitude: locationCoord(schoolDestination, 'lat', 51.552),
      longitude: locationCoord(schoolDestination, 'lng', -0.285),
      plannedArrival: schoolArrival,
      status: 'scheduled',
      kind: 'passenger_dropoff',
      passengerTasks: dropPassengerTasks.map((task) => ({ ...task, stopId: 'stop_school_drop' })),
    })
  }

  return stops
}

/** Map published DB duties into Driver bootstrap DutyDetail[] (schema v8). */
export async function projectPublishedDutiesForDriver(input: {
  companyId: string
  driverId: string
  depotId: string
}): Promise<Row[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: duties, error } = await admin
    .from('duties')
    .select(
      '*, depots(id, name, code), vehicles(id, registration, fleet_number, make, model, seat_capacity, wheelchair_capacity, fuel_type, operational_status)',
    )
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('publication_status', 'published')
    .gte('service_date', today)
    .order('planned_sign_on_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!duties?.length) return []

  const dutyIds = duties.map((d) => String(d.id))
  const { data: dutyRuns } = await admin
    .from('duty_runs')
    .select(
      'duty_id, sequence, runs(id, run_reference, planned_start_at, planned_end_at, status, vehicle_id)',
    )
    .in('duty_id', dutyIds)
    .order('sequence', { ascending: true })

  const runsByDuty = new Map<string, Row[]>()
  const runIds: string[] = []
  for (const link of dutyRuns ?? []) {
    const id = String(link.duty_id)
    const list = runsByDuty.get(id) ?? []
    list.push(link)
    runsByDuty.set(id, list)
    const run = (link.runs as Row | null) ?? null
    if (run?.id) runIds.push(String(run.id))
  }

  const tripsByRun = new Map<string, Row[]>()
  const passengerIds = new Set<string>()
  if (runIds.length) {
    const { data: runTrips } = await admin
      .from('run_trips')
      .select(
        'run_id, sequence, trips(id, trip_reference, planned_pickup_at, planned_arrival_at, pickup_location, destination_location, passenger_ids, status)',
      )
      .in('run_id', runIds)
      .order('sequence', { ascending: true })

    for (const link of runTrips ?? []) {
      const runId = String(link.run_id)
      const trip = (link.trips as Row | null) ?? null
      if (!trip) continue
      const list = tripsByRun.get(runId) ?? []
      list.push(trip)
      tripsByRun.set(runId, list)
      for (const pid of Array.isArray(trip.passenger_ids) ? trip.passenger_ids : []) {
        passengerIds.add(String(pid))
      }
    }
  }

  const passengerNames = new Map<string, string>()
  if (passengerIds.size) {
    const { data: passengers } = await admin
      .from('passengers')
      .select('id, first_name, last_name, preferred_name')
      .eq('company_id', input.companyId)
      .in('id', [...passengerIds])
    for (const passenger of passengers ?? []) {
      const preferred = passenger.preferred_name ? String(passenger.preferred_name) : ''
      const full = [passenger.first_name, passenger.last_name].filter(Boolean).join(' ').trim()
      passengerNames.set(String(passenger.id), preferred || full || 'Passenger')
    }
  }

  return duties.map((row) => {
    const depot = (row.depots as Row | null) ?? null
    const vehicleRow = (row.vehicles as Row | null) ?? null
    const links = runsByDuty.get(String(row.id)) ?? []
    const lifecycle = mapDriverLifecycle(row)
    const startTime = isoTimeLabel(row.planned_sign_on_at)
    const endTime = isoTimeLabel(row.planned_sign_off_at)
    let totalPassengers = 0
    const runs = links.map((link, index) => {
      const run = (link.runs as Row | null) ?? {}
      const runId = String(run.id ?? `${row.id}_run_${index}`)
      const trips = tripsByRun.get(runId) ?? []
      const stops = buildStopsFromTrips(trips, passengerNames)
      const runPassengerIds = new Set<string>()
      for (const trip of trips) {
        for (const pid of Array.isArray(trip.passenger_ids) ? trip.passenger_ids : []) {
          runPassengerIds.add(String(pid))
        }
      }
      totalPassengers += runPassengerIds.size
      return {
        id: runId,
        journeyId: runId,
        name: String(run.run_reference ?? `Run ${index + 1}`),
        status: mapRunStatus(run.status),
        stops,
      }
    })

    const vehicle = vehicleRow
      ? {
          id: String(vehicleRow.id),
          registrationNumber: String(vehicleRow.registration ?? 'UNKNOWN'),
          fleetNumber: String(vehicleRow.fleet_number ?? ''),
          make: String(vehicleRow.make ?? ''),
          model: String(vehicleRow.model ?? ''),
          seatingCapacity: Number(vehicleRow.seat_capacity ?? 0),
          wheelchairCapacity: Number(vehicleRow.wheelchair_capacity ?? 0),
          fuelType: String(vehicleRow.fuel_type ?? ''),
          mileage: 0,
          vorStatus: String(vehicleRow.operational_status) === 'vor',
          knownDefects: [] as string[],
        }
      : undefined

    return {
      id: String(row.id),
      reference: `DUTY-${String(row.id).slice(0, 8).toUpperCase()}`,
      dutyDate: String(row.service_date),
      startTime,
      endTime,
      lifecycleStatus: lifecycle,
      actualSignOnAt: row.actual_sign_on_at ? String(row.actual_sign_on_at) : null,
      actualSignOffAt: row.actual_sign_off_at ? String(row.actual_sign_off_at) : null,
      dutyStatus: String(row.status ?? 'planned'),
      reportingLocation: String(depot?.name ?? 'Depot'),
      routeName: runs[0]?.name ?? 'Duty',
      passengerCount: totalPassengers,
      escortRequired: true,
      specialInstructions: row.special_instructions ? String(row.special_instructions) : undefined,
      vehicle,
      runs,
      vehicleCheck: {
        status: 'not_started',
        canStartDuty: false,
        pendingManagerAdvice: false,
        checklist: {},
        vehicleId: vehicle?.id,
      },
      vehicleVerified: false,
      primaryJourneyId: runs[0]?.journeyId,
    }
  })
}

function mapDriverLifecycle(row: Row): string {
  if (row.actual_sign_off_at) return 'completed'
  if (row.actual_sign_on_at) return 'in_progress'
  const stored = String(row.driver_lifecycle_status ?? '')
  if (stored) return stored
  if (String(row.publication_status) === 'published') return 'published'
  return 'published'
}

function mapRunStatus(status: unknown): string {
  const s = String(status ?? 'scheduled')
  if (s === 'in_progress' || s === 'active') return 'active'
  if (s === 'completed' || s === 'signed_off') return 'completed'
  if (s === 'cancelled') return 'completed'
  return 'scheduled'
}

function isoTimeLabel(value: unknown): string {
  if (!value) return '00:00'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value).slice(11, 16) || '00:00'
  return d.toISOString().slice(11, 16)
}

export function buildHomeSummaryFromDuties(input: {
  driverId: string
  displayName: string
  companyName: string
  depotName: string
  duties: Row[]
  serverTime: string
  accessStatus: string
}) {
  const next = input.duties[0] as Row | undefined
  if (!next) {
    return {
      driver: {
        id: input.driverId,
        displayName: input.displayName,
        companyName: input.companyName,
        depotName: input.depotName,
        complianceStatus: input.accessStatus === 'restricted' ? 'warning' : 'clear',
        unreadNotifications: 0,
      },
      operationalState: 'no_duty_scheduled',
      duty: { status: 'off_duty', drivingMinutes: 0, dutyMinutes: 0 },
      todaySchedule: [],
      requiredActions: [],
      sync: { online: true, lastSyncedAt: input.serverTime, pendingChangeCount: 0 },
    }
  }

  const lifecycle = String(next.lifecycleStatus ?? 'published')
  const vehicle = next.vehicle as Row | undefined
  const needsAck = lifecycle === 'published' || lifecycle === 'delivered' || lifecycle === 'viewed'
  const signedOn =
    Boolean(next.actualSignOnAt) || lifecycle === 'in_progress' || String(next.dutyStatus) === 'signed_on'
  const signedOff = Boolean(next.actualSignOffAt) || lifecycle === 'completed'

  return {
    driver: {
      id: input.driverId,
      displayName: input.displayName,
      companyName: input.companyName,
      depotName: input.depotName,
      complianceStatus: input.accessStatus === 'restricted' ? 'warning' : 'clear',
      unreadNotifications: 0,
    },
    operationalState: signedOff
      ? 'duty_complete'
      : signedOn
        ? 'on_duty'
        : needsAck
          ? 'duty_scheduled_not_started'
          : 'ready_for_work',
    duty: {
      status: signedOff ? 'off_duty' : signedOn ? 'on_duty' : needsAck ? 'scheduled' : 'ready',
      scheduledStart: next.startTime,
      scheduledStartLabel: next.startTime,
      signOnAt: next.actualSignOnAt ?? null,
      signOffAt: next.actualSignOffAt ?? null,
      drivingMinutes: 0,
      dutyMinutes: 0,
      dutyId: next.id,
    },
    vehicleAssignment: vehicle
      ? {
          vehicleId: String(vehicle.id),
          registration: String(vehicle.registrationNumber ?? ''),
          fleetNumber: String(vehicle.fleetNumber ?? ''),
          make: String(vehicle.make ?? ''),
          model: String(vehicle.model ?? ''),
          vehicleType: 'minibus',
          roadworthinessStatus: vehicle.vorStatus ? 'vor' : 'roadworthy',
          checkStatus: 'required',
          openDefectCount: 0,
          mileage: Number(vehicle.mileage ?? 0),
          defects: [],
        }
      : undefined,
    nextTrip: {
      id: String(next.primaryJourneyId ?? next.id),
      dutyId: String(next.id),
      name: String(next.routeName ?? 'Duty'),
      startTime: String(next.startTime ?? ''),
      vehicleRegistration: String(vehicle?.registrationNumber ?? ''),
      passengerCount: Number(next.passengerCount ?? 0),
      wheelchairPassengerCount: 0,
      phase: 'pre_departure',
    },
    todaySchedule: [
      {
        id: String(next.id),
        time: String(next.startTime ?? ''),
        label: String(next.routeName ?? next.reference),
        status: signedOff
          ? 'completed'
          : signedOn
            ? 'in_progress'
            : needsAck
              ? 'action_required'
              : 'upcoming',
      },
    ],
    requiredActions: needsAck
      ? [
          {
            id: `ack_${next.id}`,
            priority: 'work_blocking',
            title: 'Acknowledge duty',
            description: 'Confirm you have received and reviewed this assignment.',
            actionLabel: 'Review duty',
            href: `/trips?dutyId=${String(next.id)}`,
          },
        ]
      : signedOn || signedOff
        ? []
        : [
            {
              id: `signon_${next.id}`,
              priority: 'work_blocking',
              title: 'Sign on for duty',
              description: 'Confirm you are starting this duty so Admin can see you on shift.',
              actionLabel: 'Sign on',
              href: `/duty`,
            },
          ],
    sync: { online: true, lastSyncedAt: input.serverTime, pendingChangeCount: 0 },
  }
}
