/** Company admin / ops notifications — prefer action-needed events over noisy sends.
 *
 * Wave 3F UserScopedDb/RLS cutover 27: membership JWT inserts `notifications`
 * through RLS (SELECT recipient-scoped + INSERT). Support-grant sessions and
 * callers without a membership JWT stay on company-scoped service-role.
 * Membership/role/driver_app_accounts lookups stay service-role.
 *
 * F-29: notifications never create business state. Callers are unchanged aside
 * from optional RequestContext threading where already available.
 */
import { companyScopedServiceDb, resolveTenantDb, userScopedDb } from './db-authority.ts'
import type { RequestContext } from './supabase.ts'

export type NotificationSeverity = 'info' | 'attention' | 'critical'

type NotifyScope = {
  companyId: string
  context?: RequestContext
}

function notifyTenantDb(scope: NotifyScope) {
  const companyId = scope.context?.companyId ?? scope.companyId
  if (scope.context?.workspaceAuthority === 'support') {
    return companyScopedServiceDb(scope.context, 'notifications_support_grant')
  }
  if (scope.context) {
    return userScopedDb(scope.context, 'notifications')
  }
  return resolveTenantDb(companyId, 'notifications')
}

function notifyLookupsDb(scope: NotifyScope) {
  const companyId = scope.context?.companyId ?? scope.companyId
  if (scope.context) {
    return companyScopedServiceDb(scope.context, 'notifications_lookups')
  }
  return resolveTenantDb(companyId, 'notifications_lookups')
}

function scopeFrom(input: { companyId: string; context?: RequestContext }): NotifyScope {
  return { companyId: input.context?.companyId ?? input.companyId, context: input.context }
}

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

export async function resolveCompanyAdminUserIds(
  companyId: string,
  context?: RequestContext,
): Promise<string[]> {
  const scope = scopeFrom({ companyId, context })
  const { data: memberships } = await notifyLookupsDb(scope)
    .from('company_memberships')
    .select('user_id, role_ids, status')
    .eq('company_id', scope.companyId)
    .in('status', ['active', 'invited'])

  if (!memberships?.length) return []

  const roleIds = [
    ...new Set(
      memberships.flatMap((m) => (Array.isArray(m.role_ids) ? m.role_ids.map(String) : [])),
    ),
  ]
  const { data: roles } = roleIds.length
    ? await notifyLookupsDb(scope).from('roles').select('id, name').eq('company_id', scope.companyId).in('id', roleIds)
    : { data: [] as { id: string; name: string }[] }

  const adminRoleIds = new Set(
    (roles ?? [])
      .filter((r) => ADMIN_ROLE_NAMES.has(String(r.name).toLowerCase()))
      .map((r) => String(r.id)),
  )

  const ids = memberships
    .filter((m) => {
      const memberRoles = Array.isArray(m.role_ids) ? m.role_ids.map(String) : []
      // Never fan out to every active member — that floods driver dual-role accounts.
      if (adminRoleIds.size === 0) return false
      return memberRoles.some((id) => adminRoleIds.has(id))
    })
    .map((m) => String(m.user_id))
    .filter(Boolean)

  return [...new Set(ids)]
}

/** Types shown in the Driver app inbox (Command staff noise is excluded). */
export function isDriverFacingNotificationType(type: unknown): boolean {
  const value = String(type ?? '').toLowerCase()
  if (!value) return false
  if (value.startsWith('driver.')) return true
  if (value.startsWith('document.')) return true
  if (value.startsWith('training.')) return true
  if (value.startsWith('journey_sequence')) return true
  if (value.startsWith('phv_trip')) return true
  return false
}

export function filterDriverFacingNotifications<T extends { notification_type?: unknown; notificationType?: unknown }>(
  rows: T[],
): T[] {
  return rows.filter((row) =>
    isDriverFacingNotificationType(row.notification_type ?? row.notificationType),
  )
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
  context?: RequestContext
}) {
  const scope = scopeFrom(input)
  const recipients = await resolveCompanyAdminUserIds(scope.companyId, input.context)
  const filtered = recipients.filter((id) => id && id !== input.excludeUserId)
  if (filtered.length === 0) return { inserted: 0 }

  const rows = filtered.map((userId) => ({
    company_id: scope.companyId,
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

  const { error } = await notifyTenantDb(scope).from('notifications').insert(rows)
  if (error) {
    console.error('notifyCompanyAdmins failed', error.message)
    return { inserted: 0, error: error.message }
  }
  return { inserted: rows.length }
}

/** In-app notification for the driver's linked app account (onboarding / evidence). */
export async function notifyDriverAppUser(input: {
  companyId: string
  driverId: string
  type: string
  title: string
  body: string
  severity?: NotificationSeverity
  actionUrl?: string | null
  sourceEntityType?: string | null
  sourceEntityId?: string | null
  context?: RequestContext
}) {
  const scope = scopeFrom(input)
  const { data: account } = await notifyLookupsDb(scope)
    .from('driver_app_accounts')
    .select('user_id')
    .eq('company_id', scope.companyId)
    .eq('driver_id', input.driverId)
    .maybeSingle()

  const userId = account?.user_id ? String(account.user_id) : null
  if (!userId) return { inserted: 0 }

  const { error } = await notifyTenantDb(scope).from('notifications').insert({
    company_id: scope.companyId,
    recipient_user_id: userId,
    notification_type: input.type,
    title: input.title,
    body: input.body,
    severity: input.severity ?? 'attention',
    source_entity_type: input.sourceEntityType ?? 'driver',
    source_entity_id: input.sourceEntityId ?? input.driverId,
    action_url: input.actionUrl ?? '/onboarding',
    status: 'unread',
  })
  if (error) {
    console.error('notifyDriverAppUser failed', error.message)
    return { inserted: 0, error: error.message }
  }
  return { inserted: 1 }
}
