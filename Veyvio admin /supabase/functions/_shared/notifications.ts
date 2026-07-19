/** Company admin / ops notifications — prefer action-needed events over noisy sends. */
import { admin } from './supabase.ts'

export type NotificationSeverity = 'info' | 'attention' | 'critical'

export const DRIVER_ONBOARDING_NOTIFICATION = {
  requestSent: 'driver.onboarding.request_sent',
  requestOpened: 'driver.onboarding.request_opened',
  reminderSent: 'driver.onboarding.reminder_sent',
  requestOverdue: 'driver.onboarding.request_overdue',
  evidenceSubmitted: 'driver.onboarding.evidence_submitted',
  evidenceRejected: 'driver.onboarding.evidence_rejected',
  evidenceApproved: 'driver.onboarding.evidence_approved',
  trainingRequested: 'driver.onboarding.training_requested',
  trainingAssigned: 'driver.onboarding.training_assigned',
  trainingCompleted: 'driver.onboarding.training_completed',
  readyForActivation: 'driver.onboarding.ready_for_activation',
  appInviteDeliveryFailed: 'driver.app_invite.delivery_failed',
  appInviteExpiring: 'driver.app_invite.expiring',
  appInviteAccepted: 'driver.app_invite.accepted',
} as const

/** Roles that should receive driver activation / onboarding action notifications. */
const ADMIN_ROLE_NAMES = new Set([
  'owner',
  'company_admin',
  'admin',
  'operations_manager',
  'fleet_manager',
  'compliance_manager',
  'dispatcher',
])

export async function resolveCompanyAdminUserIds(companyId: string): Promise<string[]> {
  const { data: memberships } = await admin
    .from('company_memberships')
    .select('user_id, role_ids, status')
    .eq('company_id', companyId)
    .in('status', ['active', 'invited'])

  if (!memberships?.length) return []

  const roleIds = [
    ...new Set(
      memberships.flatMap((m) => (Array.isArray(m.role_ids) ? m.role_ids.map(String) : [])),
    ),
  ]
  const { data: roles } = roleIds.length
    ? await admin.from('roles').select('id, name').eq('company_id', companyId).in('id', roleIds)
    : { data: [] as { id: string; name: string }[] }

  const adminRoleIds = new Set(
    (roles ?? [])
      .filter((r) => ADMIN_ROLE_NAMES.has(String(r.name).toLowerCase()))
      .map((r) => String(r.id)),
  )

  const ids = memberships
    .filter((m) => {
      const memberRoles = Array.isArray(m.role_ids) ? m.role_ids.map(String) : []
      if (adminRoleIds.size === 0) return m.status === 'active'
      return memberRoles.some((id) => adminRoleIds.has(id))
    })
    .map((m) => String(m.user_id))
    .filter(Boolean)

  return [...new Set(ids)]
}

export async function notifyCompanyAdmins(input: {
  companyId: string
  type: string
  title: string
  body: string
  severity?: NotificationSeverity
  actionUrl?: string | null
  sourceEntityType?: string | null
  sourceEntityId?: string | null
  /** Skip notifying this user (e.g. the actor who just performed the action). */
  excludeUserId?: string | null
}) {
  const recipients = await resolveCompanyAdminUserIds(input.companyId)
  const filtered = recipients.filter((id) => id && id !== input.excludeUserId)
  if (filtered.length === 0) return { inserted: 0 }

  const rows = filtered.map((userId) => ({
    company_id: input.companyId,
    recipient_user_id: userId,
    notification_type: input.type,
    title: input.title,
    body: input.body,
    severity: input.severity ?? 'attention',
    source_entity_type: input.sourceEntityType ?? 'driver',
    source_entity_id: input.sourceEntityId ?? null,
    action_url: input.actionUrl ?? null,
    status: 'unread',
  }))

  const { error } = await admin.from('notifications').insert(rows)
  if (error) {
    console.error('notifyCompanyAdmins failed', error.message)
    return { inserted: 0, error: error.message }
  }
  return { inserted: rows.length }
}
