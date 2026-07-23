/**
 * Keep companies.tenant_status aligned with company_subscriptions (commercial SoT).
 * Writes subscription_events for every material change.
 */
import { admin } from './supabase.ts'
import { deriveTenantStatus } from './entitlements-core.ts'

type Row = Record<string, unknown>

export type SubscriptionLifecycleSource = 'system' | 'platform' | 'stripe_webhook' | 'seed' | 'api'

export async function recordSubscriptionEvent(input: {
  companyId: string
  eventType: string
  source: SubscriptionLifecycleSource
  fromStatus?: string | null
  toStatus?: string | null
  fromPlanCode?: string | null
  toPlanCode?: string | null
  fromTenantStatus?: string | null
  toTenantStatus?: string | null
  actorUserId?: string | null
  detail?: Row
}) {
  await admin.from('subscription_events').insert({
    company_id: input.companyId,
    event_type: input.eventType,
    source: input.source,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    from_plan_code: input.fromPlanCode ?? null,
    to_plan_code: input.toPlanCode ?? null,
    from_tenant_status: input.fromTenantStatus ?? null,
    to_tenant_status: input.toTenantStatus ?? null,
    actor_user_id: input.actorUserId ?? null,
    detail: input.detail ?? {},
  })
}

/**
 * Upsert subscription commercial fields, derive tenant_status, persist both, audit event.
 */
export async function applySubscriptionLifecycle(input: {
  companyId: string
  status?: string
  planCode?: string
  providerCustomerRef?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  currentPeriodEnd?: string | null
  trialEndsAt?: string | null
  gracePeriodEndsAt?: string | null
  source: SubscriptionLifecycleSource
  actorUserId?: string | null
  eventType?: string
  detail?: Row
  /** When set, forces tenant_status after derive (platform emergency suspend/restore). */
  tenantStatusOverride?: string | null
}) {
  const { data: existingSub } = await admin
    .from('company_subscriptions')
    .select('status, plan_code')
    .eq('company_id', input.companyId)
    .maybeSingle()

  const { data: company } = await admin
    .from('companies')
    .select('tenant_status')
    .eq('id', input.companyId)
    .maybeSingle()

  const nextStatus = input.status ?? String(existingSub?.status ?? 'trial')
  const nextPlan = input.planCode ?? String(existingSub?.plan_code ?? 'professional')

  const subPatch: Row = {
    company_id: input.companyId,
    status: nextStatus,
    plan_code: nextPlan,
    updated_at: new Date().toISOString(),
  }
  if (input.providerCustomerRef !== undefined) {
    subPatch.provider_customer_ref = input.providerCustomerRef
  }
  if (input.stripeSubscriptionId !== undefined) {
    subPatch.stripe_subscription_id = input.stripeSubscriptionId
  }
  if (input.stripePriceId !== undefined) {
    subPatch.stripe_price_id = input.stripePriceId
  }
  if (input.currentPeriodEnd !== undefined) {
    subPatch.current_period_end = input.currentPeriodEnd
  }
  if (input.trialEndsAt !== undefined) {
    subPatch.trial_ends_at = input.trialEndsAt
  }
  if (input.gracePeriodEndsAt !== undefined) {
    subPatch.grace_period_ends_at = input.gracePeriodEndsAt
  }

  await admin.from('company_subscriptions').upsert(subPatch, { onConflict: 'company_id' })

  const derived = deriveTenantStatus({
    subscriptionStatus: nextStatus,
    currentTenantStatus: company?.tenant_status ? String(company.tenant_status) : null,
  })
  const nextTenant = input.tenantStatusOverride?.trim() || derived

  await admin.from('companies').update({
    tenant_status: nextTenant,
    subscription_status: nextStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', input.companyId)

  const fromStatus = existingSub?.status ? String(existingSub.status) : null
  const fromPlan = existingSub?.plan_code ? String(existingSub.plan_code) : null
  const fromTenant = company?.tenant_status ? String(company.tenant_status) : null

  if (
    fromStatus !== nextStatus ||
    fromPlan !== nextPlan ||
    fromTenant !== nextTenant ||
    input.tenantStatusOverride
  ) {
    await recordSubscriptionEvent({
      companyId: input.companyId,
      eventType: input.eventType ?? 'subscription.lifecycle',
      source: input.source,
      fromStatus,
      toStatus: nextStatus,
      fromPlanCode: fromPlan,
      toPlanCode: nextPlan,
      fromTenantStatus: fromTenant,
      toTenantStatus: nextTenant,
      actorUserId: input.actorUserId,
      detail: {
        ...(input.detail ?? {}),
        tenantStatusOverride: input.tenantStatusOverride ?? null,
        derivedTenantStatus: derived,
      },
    })
  }

  return { status: nextStatus, planCode: nextPlan, tenantStatus: nextTenant }
}

/** Recompute tenant_status from current subscription row only. */
export async function syncTenantStatusFromSubscription(
  companyId: string,
  source: SubscriptionLifecycleSource = 'system',
  actorUserId?: string | null,
) {
  const { data: subscription } = await admin
    .from('company_subscriptions')
    .select('status, plan_code')
    .eq('company_id', companyId)
    .maybeSingle()

  return applySubscriptionLifecycle({
    companyId,
    status: String(subscription?.status ?? 'trial'),
    planCode: String(subscription?.plan_code ?? 'professional'),
    source,
    actorUserId,
    eventType: 'tenant.synced_from_subscription',
  })
}
