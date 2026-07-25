/**
 * Driver journey start/complete handlers (runs as journeys).
 */
import { admin, type RequestContext } from './supabase.ts'
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

async function loadDriverForUser(context: RequestContext): Promise<Row | null> {
  const { data } = await admin
    .from('drivers')
    .select('id, company_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (data) return data
  // Fallback: driver_app_accounts linkage
  const { data: app } = await admin
    .from('driver_app_accounts')
    .select('driver_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (!app?.driver_id) return null
  const { data: driver } = await admin
    .from('drivers')
    .select('id, company_id')
    .eq('id', app.driver_id)
    .eq('company_id', context.companyId)
    .maybeSingle()
  return driver
}

async function loadJourneyForDriver(context: RequestContext, journeyId: string, driverId: string) {
  const { data: run, error } = await admin
    .from('runs')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('id', journeyId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!run) return { run: null, duty: null, forbidden: false as const }

  const { data: link } = await admin
    .from('duty_runs')
    .select('duty_id')
    .eq('run_id', journeyId)
    .limit(1)
    .maybeSingle()

  let duty: Row | null = null
  if (link?.duty_id) {
    const { data: dutyRow } = await admin
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
  const { data: updated, error } = await admin
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
    await admin
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
  const { data: updated, error } = await admin
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
    await admin
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
