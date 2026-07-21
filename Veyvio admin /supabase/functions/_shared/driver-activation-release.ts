/** After admin approves compliance documents, unlock Driver app onboarding for activation training steps. */
import { admin } from './supabase.ts'
import { DRIVER_ONBOARDING_NOTIFICATION, notifyDriverAppUser } from './notifications.ts'

type Row = Record<string, unknown>

const PENDING_DOC_STATUSES = new Set(['awaiting_review', 'uploaded'])

export const ACTIVATION_TRAINING_STEP_KEYS = [
  'driver_handbook',
  'vehicle_check_training',
  'defect_policy',
] as const

export async function countPendingDriverDocumentReviews(
  companyId: string,
  driverId: string,
): Promise<number> {
  const { data, error } = await admin
    .from('driver_documents')
    .select('verification_status')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
  if (error) return 0
  return (data ?? []).filter((row) =>
    PENDING_DOC_STATUSES.has(String(row.verification_status ?? '')),
  ).length
}

async function loadCompletedStepKeys(companyId: string, driverId: string): Promise<Set<string>> {
  const keys = new Set<string>()
  const { data: requirements } = await admin
    .from('driver_requirements')
    .select('definition_key, status_override')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
  for (const row of requirements ?? []) {
    const key = String(row.definition_key ?? '')
    const override = String(row.status_override ?? '')
    if (override === 'submitted' || override === 'approved') keys.add(key)
  }
  const { data: auditRows } = await admin
    .from('audit_events')
    .select('action, after_snapshot')
    .eq('company_id', companyId)
    .eq('entity_type', 'driver')
    .eq('entity_id', driverId)
    .like('action', 'driver.onboarding%')
    .order('occurred_at', { ascending: false })
    .limit(50)
  for (const event of auditRows ?? []) {
    const after = (event.after_snapshot as Row | null) ?? {}
    if (String(event.action) === 'driver.onboarding_step_completed' && after.stepKey) {
      keys.add(String(after.stepKey))
    }
    if (String(event.action) === 'driver.onboarding_submitted') keys.add('review_submit')
  }
  return keys
}

function firstIncompleteActivationStep(completed: Set<string>): string {
  for (const key of ACTIVATION_TRAINING_STEP_KEYS) {
    if (!completed.has(key)) return key
  }
  return 'review_submit'
}

export type DriverActivationPhase =
  | 'active'
  | 'awaiting_document_review'
  | 'activation_training'

export async function resolveDriverActivationPhase(
  companyId: string,
  driverId: string,
  operationalStatus: string,
  onboardingStep: string,
): Promise<DriverActivationPhase> {
  const op = String(operationalStatus ?? '')
  if (!['pending_compliance', 'onboarding', 'draft'].includes(op)) return 'active'

  // Fast path for session bootstrap — avoid audit history scans on the hot path.
  const { count, error } = await admin
    .from('driver_documents')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .in('verification_status', [...PENDING_DOC_STATUSES])
  if (!error && (count ?? 0) > 0) return 'awaiting_document_review'

  const step = String(onboardingStep ?? '')
  if (ACTIVATION_TRAINING_STEP_KEYS.includes(step as (typeof ACTIVATION_TRAINING_STEP_KEYS)[number])) {
    return 'activation_training'
  }
  if (step === 'review' || step === 'review_submit') {
    // Docs cleared but still on review — treat as activation training until steps finish.
    return 'activation_training'
  }
  return 'active'
}

/** Unlock app onboarding for handbook / vehicle-check / defect training after documents are cleared. */
export async function releaseDriverForActivationTraining(input: {
  companyId: string
  driverId: string
  actorUserId: string | null
}): Promise<{ released: boolean; nextStepKey?: string }> {
  const pending = await countPendingDriverDocumentReviews(input.companyId, input.driverId)
  if (pending > 0) return { released: false }

  const { data: driver } = await admin
    .from('drivers')
    .select('id, onboarding_step, operational_status')
    .eq('company_id', input.companyId)
    .eq('id', input.driverId)
    .maybeSingle()
  if (!driver) return { released: false }

  const op = String(driver.operational_status ?? '')
  if (!['pending_compliance', 'onboarding'].includes(op)) return { released: false }

  const completed = await loadCompletedStepKeys(input.companyId, input.driverId)
  const nextStepKey = firstIncompleteActivationStep(completed)
  if (nextStepKey === 'review_submit' && completed.has('review_submit')) {
    return { released: false }
  }

  const now = new Date().toISOString()

  await admin
    .from('drivers')
    .update({
      onboarding_step: nextStepKey,
      operational_status: 'pending_compliance',
      updated_at: now,
      updated_by: input.actorUserId,
    })
    .eq('id', input.driverId)
    .eq('company_id', input.companyId)

  await admin
    .from('driver_app_accounts')
    .update({
      account_status: 'active',
      updated_at: now,
      updated_by: input.actorUserId,
    })
    .eq('driver_id', input.driverId)
    .eq('company_id', input.companyId)

  for (const key of ACTIVATION_TRAINING_STEP_KEYS) {
    if (completed.has(key)) continue
    await admin.from('driver_requirements').upsert(
      {
        company_id: input.companyId,
        driver_id: input.driverId,
        definition_key: key,
        requirement_type: key === 'vehicle_check_training' ? 'internal_training' : 'document',
        status_override: 'request_sent',
        last_requested_at: now,
        updated_at: now,
        updated_by: input.actorUserId,
        created_by: input.actorUserId,
      },
      { onConflict: 'driver_id,definition_key' },
    )
  }

  await notifyDriverAppUser({
    companyId: input.companyId,
    driverId: input.driverId,
    type: DRIVER_ONBOARDING_NOTIFICATION.requestSent,
    title: 'Documents approved — complete activation training',
    body: 'Open the Driver app and finish handbook and vehicle-check training before you can take jobs.',
    severity: 'info',
    actionUrl: '/onboarding',
  })

  await admin.from('audit_events').insert({
    company_id: input.companyId,
    entity_type: 'driver',
    entity_id: input.driverId,
    action: 'driver.activation_training_released',
    actor_id: input.actorUserId,
    occurred_at: now,
    after_snapshot: { nextStepKey, source: 'document_review_complete' },
  })

  return { released: true, nextStepKey }
}

export async function maybeReleaseDriverForActivationTraining(input: {
  companyId: string
  driverId: string
  actorUserId: string | null
}): Promise<void> {
  await releaseDriverForActivationTraining(input)
}
