/**
 * Driver operational notifications — duty publish, compliance warnings, vehicle status.
 * In-app + best-effort FCM push (Gate 3). Push never creates business state (F-29).
 */
import { admin } from './supabase.ts'
import { notifyDriverAppUser, type NotificationSeverity } from './notifications.ts'
import { sendFcmToDriver } from './fcm-send.ts'

export const DRIVER_OPS_NOTIFICATION = {
  dutyPublished: 'driver.duty.published',
  complianceWarning: 'driver.compliance.warning',
  vehicleVor: 'driver.vehicle.vor',
  vehicleAwaitingCheck: 'driver.vehicle.awaiting_check',
  defectFollowUp: 'driver.defect.follow_up',
  journeySequenceChanged: 'driver.journey_sequence.changed',
} as const

function formatDutyTime(iso: string | null | undefined): string {
  if (!iso) return 'time TBC'
  const raw = String(iso)
  if (raw.includes('T') && raw.length >= 16) return raw.slice(11, 16)
  return raw
}

function complianceWarningKey(warning: string): string {
  return `warn:${warning.trim().slice(0, 120).replace(/\s+/g, '_').toLowerCase()}`
}

async function hasRecentNotification(input: {
  companyId: string
  recipientUserId: string
  notificationType: string
  sourceEntityId: string
  withinHours: number
}): Promise<boolean> {
  const since = new Date(Date.now() - input.withinHours * 3_600_000).toISOString()
  const { data } = await admin
    .from('notifications')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('recipient_user_id', input.recipientUserId)
    .eq('notification_type', input.notificationType)
    .eq('source_entity_id', input.sourceEntityId)
    .gte('created_at', since)
    .limit(1)
  return Boolean(data?.length)
}

async function resolveDriverAppUserId(companyId: string, driverId: string): Promise<string | null> {
  const { data: account } = await admin
    .from('driver_app_accounts')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .maybeSingle()
  return account?.user_id ? String(account.user_id) : null
}

async function notifyDriverDeduped(input: {
  companyId: string
  driverId: string
  type: string
  title: string
  body: string
  severity?: NotificationSeverity
  actionUrl?: string | null
  sourceEntityType?: string | null
  sourceEntityId: string
  dedupeWithinHours: number
}) {
  const userId = await resolveDriverAppUserId(input.companyId, input.driverId)
  if (!userId) return { inserted: 0, deduped: false }

  const duplicate = await hasRecentNotification({
    companyId: input.companyId,
    recipientUserId: userId,
    notificationType: input.type,
    sourceEntityId: input.sourceEntityId,
    withinHours: input.dedupeWithinHours,
  })
  if (duplicate) return { inserted: 0, deduped: true }

  const result = await notifyDriverAppUser({
    companyId: input.companyId,
    driverId: input.driverId,
    type: input.type,
    title: input.title,
    body: input.body,
    severity: input.severity,
    actionUrl: input.actionUrl,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
  })

  if ((result.inserted ?? 0) > 0) {
    try {
      await sendFcmToDriver({
        companyId: input.companyId,
        driverId: input.driverId,
        title: input.title,
        body: input.body,
        type: input.type,
        dutyId: input.sourceEntityType === 'duty' ? input.sourceEntityId : null,
        actionUrl: input.actionUrl ?? null,
      })
    } catch (error) {
      console.error('fcm send after in-app notification failed', error)
    }
  }

  return result
}

export async function notifyDriverDutyPublished(input: {
  companyId: string
  driverId: string
  dutyId: string
  serviceDate: string
  plannedSignOnAt?: string | null
  vehicleRegistration?: string | null
  eligibilityWarnings?: string[]
}) {
  const reportTime = formatDutyTime(input.plannedSignOnAt)
  const vehiclePart = input.vehicleRegistration ? ` Vehicle ${input.vehicleRegistration}.` : ''
  const body = `Duty on ${input.serviceDate}. Report at ${reportTime}.${vehiclePart} Open My duty to acknowledge.`

  const result = await notifyDriverDeduped({
    companyId: input.companyId,
    driverId: input.driverId,
    type: DRIVER_OPS_NOTIFICATION.dutyPublished,
    title: 'Duty published',
    body,
    severity: 'info',
    actionUrl: '/jobs',
    sourceEntityType: 'duty',
    sourceEntityId: input.dutyId,
    dedupeWithinHours: 24,
  })

  for (const warning of input.eligibilityWarnings ?? []) {
    await notifyDriverDeduped({
      companyId: input.companyId,
      driverId: input.driverId,
      type: DRIVER_OPS_NOTIFICATION.complianceWarning,
      title: 'Duty published with warnings',
      body: warning,
      severity: 'attention',
      actionUrl: '/readiness',
      sourceEntityType: 'duty',
      sourceEntityId: `${input.dutyId}:${complianceWarningKey(warning)}`,
      dedupeWithinHours: 24,
    })
  }

  return result
}

export async function syncDriverComplianceWarningNotifications(input: {
  companyId: string
  driverId: string
  warnings: string[]
  dedupeWithinHours?: number
}) {
  const dedupeHours = input.dedupeWithinHours ?? 72
  let inserted = 0
  let deduped = 0

  for (const warning of input.warnings) {
    const trimmed = String(warning ?? '').trim()
    if (!trimmed) continue
    const outcome = await notifyDriverDeduped({
      companyId: input.companyId,
      driverId: input.driverId,
      type: DRIVER_OPS_NOTIFICATION.complianceWarning,
      title: 'Compliance attention needed',
      body: trimmed,
      severity: 'attention',
      actionUrl: '/documents',
      sourceEntityType: 'driver',
      sourceEntityId: complianceWarningKey(trimmed),
      dedupeWithinHours: dedupeHours,
    })
    if (outcome.deduped) deduped += 1
    else if ((outcome.inserted ?? 0) > 0) inserted += 1
  }

  return { inserted, deduped }
}

export async function notifyDriverVehicleOperationalAlert(input: {
  companyId: string
  driverId: string
  vehicleId: string
  registration: string
  status: 'vor' | 'awaiting_check'
  reason: string
  defectId?: string | null
}) {
  const isVor = input.status === 'vor'
  return notifyDriverDeduped({
    companyId: input.companyId,
    driverId: input.driverId,
    type: isVor ? DRIVER_OPS_NOTIFICATION.vehicleVor : DRIVER_OPS_NOTIFICATION.vehicleAwaitingCheck,
    title: isVor
      ? `${input.registration} marked VOR`
      : `${input.registration} needs inspection`,
    body: input.reason,
    severity: isVor ? 'critical' : 'attention',
    actionUrl: '/vehicle',
    sourceEntityType: 'vehicle',
    sourceEntityId: input.defectId ? `${input.vehicleId}:${input.defectId}` : input.vehicleId,
    dedupeWithinHours: 12,
  })
}

/** F-29: notification only — acknowledgement state is written elsewhere. */
export async function notifyDriverJourneySequenceChanged(input: {
  companyId: string
  driverId: string
  tripKey: string
  summary: string
}) {
  return notifyDriverDeduped({
    companyId: input.companyId,
    driverId: input.driverId,
    type: DRIVER_OPS_NOTIFICATION.journeySequenceChanged,
    title: 'Journey sequence updated',
    body: input.summary || 'Your run stop order changed. Open Acknowledgements to confirm.',
    severity: 'attention',
    actionUrl: '/acknowledgements',
    sourceEntityType: 'journey_sequence_acknowledgement',
    sourceEntityId: input.tripKey,
    dedupeWithinHours: 1,
  })
}
