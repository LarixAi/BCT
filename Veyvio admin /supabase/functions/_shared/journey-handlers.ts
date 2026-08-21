/**
 * Driver journey start/complete handlers (runs as journeys).
 *
 * Wave 3F UserScopedDb/RLS cutover 26+28: membership JWT reads/writes
 * `journey_stops` (SELECT/INSERT/UPDATE) and reads/updates `runs`
 * (SELECT/UPDATE). Support-grant sessions stay on company-scoped service-role.
 * Duties, drivers, duty_runs, and driver_app_accounts stay service-role.
 * emitDomainEvent and writeImmutableAudit stay privileged.
 */
import { type RequestContext } from './supabase.ts'
import { resolveTenantDb } from './db-authority.ts'
import { apiError, json, readJson } from './http.ts'
import {
  evaluateJourneyTransition,
  journeyTransitionHttpStatus,
  journeyCompleteImpliesHandback,
  normalizeJourneyStatus,
} from './journey-lifecycle-gates.ts'
import { emitDomainEvent } from './domain-events.ts'
import { writeImmutableAudit } from './audit-service.ts'

type Row = Record<string, unknown>

function journeyTenantDb(context: RequestContext) {
  return resolveTenantDb(context.companyId, 'journey_stops', context)
}

function journeyRunsDb(context: RequestContext) {
  return resolveTenantDb(context.companyId, 'runs', context)
}

function journeyLookupsDb(context: RequestContext) {
  return resolveTenantDb(context.companyId, 'journey_handlers_lookups', context)
}

async function loadDriverForUser(context: RequestContext): Promise<Row | null> {
  const { data } = await journeyLookupsDb(context)
    .from('drivers')
    .select('id, company_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (data) return data
  // Fallback: driver_app_accounts linkage
  const { data: app } = await journeyLookupsDb(context)
    .from('driver_app_accounts')
    .select('driver_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (!app?.driver_id) return null
  const { data: driver } = await journeyLookupsDb(context)
    .from('drivers')
    .select('id, company_id')
    .eq('id', app.driver_id)
    .eq('company_id', context.companyId)
    .maybeSingle()
  return driver
}

async function loadJourneyForDriver(context: RequestContext, journeyId: string, driverId: string) {
  const { data: run, error } = await journeyRunsDb(context)
    .from('runs')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', journeyId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!run) return { run: null, duty: null, forbidden: false as const }

  const { data: link } = await journeyLookupsDb(context)
    .from('duty_runs')
    .select('duty_id')
    .eq('run_id', journeyId)
    .limit(1)
    .maybeSingle()

  let duty: Row | null = null
  if (link?.duty_id) {
    const { data: dutyRow } = await journeyLookupsDb(context)
      .from('duties')
      .select('id, driver_id, company_id, actual_sign_on_at, actual_sign_off_at, active_journey_id, publication_status, status')
      .eq('id', link.duty_id)
      .eq('company_id', context.companyId)
      .maybeSingle()
    duty = dutyRow
  }

  if (duty && String(duty.driver_id) !== driverId) {
    return { run, duty: null, forbidden: true as const }
  }
  if (!duty && run.driver_id && String(run.driver_id) !== driverId) {
    return { run, duty: null, forbidden: true as const }
  }
  return { run, duty, forbidden: false as const }
}

export async function startDriverJourney(
  context: RequestContext,
  journeyId: string,
  request: Request,
) {
  await readJson(request).catch(() => ({}))
  const driver = await loadDriverForUser(context)
  if (!driver) return apiError(403, 'No Driver account is linked to this login', 'forbidden')

  let loaded: Awaited<ReturnType<typeof loadJourneyForDriver>>
  try {
    loaded = await loadJourneyForDriver(context, journeyId, String(driver.id))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Journey load failed')
  }

  if (!loaded.run) return apiError(404, 'Journey not found', 'not_found')
  if (loaded.forbidden) return apiError(403, 'This journey is not assigned to you', 'forbidden')

  if (loaded.duty && !loaded.duty.actual_sign_on_at) {
    return apiError(409, 'Sign on to your duty before starting a journey', 'not_signed_on')
  }
  if (loaded.duty?.actual_sign_off_at) {
    return apiError(409, 'Duty is already signed off', 'duty_completed')
  }

  const gate = evaluateJourneyTransition(loaded.run.lifecycle_status ?? loaded.run.status, 'start')
  if (!gate.ok) {
    return apiError(journeyTransitionHttpStatus(gate.code), gate.message, gate.code)
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await journeyRunsDb(context)
    .from('runs')
    .update({
      lifecycle_status: gate.to,
      started_at: loaded.run.started_at ?? now,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', journeyId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Journey could not be started')

  if (loaded.duty?.id) {
    await journeyLookupsDb(context)
      .from('duties')
      .update({
        active_journey_id: journeyId,
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('id', loaded.duty.id)
      .eq('company_id', context.companyId)
  }

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'journey.started',
    entityType: 'journey',
    entityId: journeyId,
    afterSnapshot: { from: gate.from, to: gate.to },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'journey.started',
    entityType: 'journey',
    entityId: journeyId,
    actorUserId: context.user.id,
    payload: { dutyId: loaded.duty?.id ?? null },
  }).catch(() => undefined)

  return json({
    journey: {
      id: updated.id,
      lifecycleStatus: normalizeJourneyStatus(updated.lifecycle_status),
      startedAt: updated.started_at,
      completedAt: updated.completed_at,
    },
    activeJourneyId: journeyId,
    impliesHandback: journeyCompleteImpliesHandback(),
  })
}

export async function completeDriverJourney(
  context: RequestContext,
  journeyId: string,
  request: Request,
) {
  const body = await readJson<{ outcome?: string; notes?: string }>(request).catch(() => ({}))
  const driver = await loadDriverForUser(context)
  if (!driver) return apiError(403, 'No Driver account is linked to this login', 'forbidden')

  let loaded: Awaited<ReturnType<typeof loadJourneyForDriver>>
  try {
    loaded = await loadJourneyForDriver(context, journeyId, String(driver.id))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Journey load failed')
  }

  if (!loaded.run) return apiError(404, 'Journey not found', 'not_found')
  if (loaded.forbidden) return apiError(403, 'This journey is not assigned to you', 'forbidden')

  const gate = evaluateJourneyTransition(loaded.run.lifecycle_status ?? loaded.run.status, 'complete')
  if (!gate.ok) {
    return apiError(journeyTransitionHttpStatus(gate.code), gate.message, gate.code)
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await journeyRunsDb(context)
    .from('runs')
    .update({
      lifecycle_status: gate.to,
      completed_at: now,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', journeyId)
    .eq('company_id', context.companyId)
    .select('*')
    .single()

  if (error || !updated) return apiError(500, error?.message ?? 'Journey could not be completed')

  if (loaded.duty?.id && String(loaded.duty.active_journey_id) === journeyId) {
    await journeyLookupsDb(context)
      .from('duties')
      .update({
        active_journey_id: null,
        updated_at: now,
        updated_by: context.user.id,
      })
      .eq('id', loaded.duty.id)
      .eq('company_id', context.companyId)
  }

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'journey.completed',
    entityType: 'journey',
    entityId: journeyId,
    afterSnapshot: {
      from: gate.from,
      to: gate.to,
      outcome: (body as { outcome?: string }).outcome ?? null,
      impliesHandback: false,
    },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'journey.completed',
    entityType: 'journey',
    entityId: journeyId,
    actorUserId: context.user.id,
    payload: { dutyId: loaded.duty?.id ?? null, impliesHandback: false },
  }).catch(() => undefined)

  return json({
    journey: {
      id: updated.id,
      lifecycleStatus: normalizeJourneyStatus(updated.lifecycle_status),
      startedAt: updated.started_at,
      completedAt: updated.completed_at,
    },
    activeJourneyId: null,
    impliesHandback: false,
    message: 'Journey completed. Vehicle handback is a separate step if custody is ending.',
  })
}

async function resolveJourneyStop(
  context: RequestContext,
  journeyId: string,
  input: { stopId?: string; sequence?: number; label?: string },
) {
  const stopId = input.stopId ? String(input.stopId).trim() : ''
  if (stopId) {
    const { data, error } = await journeyTenantDb(context)
      .from('journey_stops')
      .select('*')
      .eq('company_id', context.companyId)
      .eq('run_id', journeyId)
      .eq('id', stopId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  const sequence = Number(input.sequence ?? 1)
  if (!Number.isFinite(sequence) || sequence < 1) {
    throw new Error('sequence must be a positive integer when stopId is omitted')
  }

  const { data: existing } = await journeyTenantDb(context)
    .from('journey_stops')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('run_id', journeyId)
    .eq('sequence', sequence)
    .maybeSingle()
  if (existing) return existing

  const { data: created, error: createError } = await journeyTenantDb(context)
    .from('journey_stops')
    .insert({
      company_id: context.companyId,
      run_id: journeyId,
      sequence,
      label: input.label ? String(input.label).trim() : `Stop ${sequence}`,
      status: 'planned',
      created_by: context.user.id,
    })
    .select('*')
    .single()
  if (createError || !created) throw new Error(createError?.message ?? 'Stop could not be created')
  return created
}

/** Arrive at a journey stop (creates stop by sequence when missing). */
export async function arriveDriverJourneyStop(
  context: RequestContext,
  journeyId: string,
  request: Request,
) {
  const input = await readJson<{ stopId?: string; sequence?: number; label?: string }>(request).catch(() => ({}))
  const driver = await loadDriverForUser(context)
  if (!driver) return apiError(403, 'No Driver account is linked to this login', 'forbidden')

  let loaded: Awaited<ReturnType<typeof loadJourneyForDriver>>
  try {
    loaded = await loadJourneyForDriver(context, journeyId, String(driver.id))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Journey load failed')
  }
  if (!loaded.run) return apiError(404, 'Journey not found', 'not_found')
  if (loaded.forbidden) return apiError(403, 'This journey is not assigned to you', 'forbidden')

  const status = normalizeJourneyStatus(loaded.run.lifecycle_status)
  if (status !== 'in_progress') {
    return apiError(409, 'Start the journey before arriving at a stop', 'not_in_progress')
  }

  let stop: Row
  try {
    stop = (await resolveJourneyStop(context, journeyId, input)) as Row
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Invalid stop', 'invalid_input')
  }
  if (!stop) return apiError(404, 'Stop not found', 'not_found')

  if (String(stop.status) === 'completed') {
    return apiError(409, 'This stop is already completed', 'stop_completed')
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await journeyTenantDb(context)
    .from('journey_stops')
    .update({
      status: 'arrived',
      arrived_at: stop.arrived_at ?? now,
      updated_at: now,
    })
    .eq('id', stop.id)
    .eq('company_id', context.companyId)
    .select('*')
    .single()
  if (error || !updated) return apiError(500, error?.message ?? 'Stop arrive failed')

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'journey.stop_arrived',
    entityType: 'journey_stop',
    entityId: String(updated.id),
    afterSnapshot: { journeyId, sequence: updated.sequence, status: updated.status },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'journey.stop_arrived',
    entityType: 'journey_stop',
    entityId: String(updated.id),
    actorUserId: context.user.id,
    payload: { journeyId, sequence: updated.sequence },
  }).catch(() => undefined)

  return json({
    stop: {
      id: updated.id,
      sequence: updated.sequence,
      status: updated.status,
      arrivedAt: updated.arrived_at,
      label: updated.label,
    },
  })
}

/** Complete a journey stop after arrive (or arrive+complete in one step if never arrived). */
export async function completeDriverJourneyStop(
  context: RequestContext,
  journeyId: string,
  request: Request,
) {
  const input = await readJson<{
    stopId?: string
    sequence?: number
    label?: string
    outcome?: string
    notes?: string
  }>(request).catch(() => ({}))
  const driver = await loadDriverForUser(context)
  if (!driver) return apiError(403, 'No Driver account is linked to this login', 'forbidden')

  let loaded: Awaited<ReturnType<typeof loadJourneyForDriver>>
  try {
    loaded = await loadJourneyForDriver(context, journeyId, String(driver.id))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Journey load failed')
  }
  if (!loaded.run) return apiError(404, 'Journey not found', 'not_found')
  if (loaded.forbidden) return apiError(403, 'This journey is not assigned to you', 'forbidden')

  const status = normalizeJourneyStatus(loaded.run.lifecycle_status)
  if (status !== 'in_progress') {
    return apiError(409, 'Start the journey before completing a stop', 'not_in_progress')
  }

  let stop: Row
  try {
    stop = (await resolveJourneyStop(context, journeyId, input)) as Row
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Invalid stop', 'invalid_input')
  }
  if (!stop) return apiError(404, 'Stop not found', 'not_found')

  if (String(stop.status) === 'completed') {
    return json({
      stop: {
        id: stop.id,
        sequence: stop.sequence,
        status: stop.status,
        arrivedAt: stop.arrived_at,
        completedAt: stop.completed_at,
        outcome: stop.outcome,
      },
    })
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await journeyTenantDb(context)
    .from('journey_stops')
    .update({
      status: 'completed',
      arrived_at: stop.arrived_at ?? now,
      completed_at: now,
      outcome: input.outcome ? String(input.outcome).trim() : stop.outcome ?? 'completed',
      notes: input.notes != null ? String(input.notes) : stop.notes,
      updated_at: now,
    })
    .eq('id', stop.id)
    .eq('company_id', context.companyId)
    .select('*')
    .single()
  if (error || !updated) return apiError(500, error?.message ?? 'Stop complete failed')

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'journey.stop_completed',
    entityType: 'journey_stop',
    entityId: String(updated.id),
    afterSnapshot: {
      journeyId,
      sequence: updated.sequence,
      status: updated.status,
      outcome: updated.outcome,
    },
  }).catch(() => undefined)

  await emitDomainEvent({
    companyId: context.companyId,
    eventType: 'journey.stop_completed',
    entityType: 'journey_stop',
    entityId: String(updated.id),
    actorUserId: context.user.id,
    payload: { journeyId, sequence: updated.sequence, outcome: updated.outcome },
  }).catch(() => undefined)

  return json({
    stop: {
      id: updated.id,
      sequence: updated.sequence,
      status: updated.status,
      arrivedAt: updated.arrived_at,
      completedAt: updated.completed_at,
      outcome: updated.outcome,
      label: updated.label,
    },
  })
}
