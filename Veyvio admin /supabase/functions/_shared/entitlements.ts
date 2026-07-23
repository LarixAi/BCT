import { admin } from './supabase.ts'
import {
  PLATFORM_MODULE_KEYS,
  deriveTenantStatus,
  mergeUsageLimits,
  resolveEnabledModules,
  type PlatformModuleKey,
} from './entitlements-core.ts'

export {
  PLATFORM_MODULE_KEYS,
  canUse,
  hasModule,
  deriveTenantStatus,
  mapSubscriptionStatusToTenant,
  resolveEnabledModules,
  mergeUsageLimits,
  isWithinLimit,
  USAGE_LIMIT_KEYS,
} from './entitlements-core.ts'

export type { PlatformModuleKey, UsageLimitKey } from './entitlements-core.ts'

export type EntitlementSnapshot = {
  planCode: string
  subscriptionStatus: string
  tenantStatus: string
  enabledModules: string[]
  usageLimits: Record<string, number | null>
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  gracePeriodEndsAt: string | null
}

const FALLBACK_MODULES = [...PLATFORM_MODULE_KEYS]

function normalizePlanCode(planCode: string | null | undefined): string {
  const code = (planCode ?? 'command_standard').trim() || 'command_standard'
  return code
}

export async function resolveEntitlements(companyId: string): Promise<EntitlementSnapshot> {
  const [{ data: company }, { data: subscription }] = await Promise.all([
    admin.from('companies').select('tenant_status').eq('id', companyId).maybeSingle(),
    admin
      .from('company_subscriptions')
      .select('status, plan_code, trial_ends_at, current_period_end, grace_period_ends_at')
      .eq('company_id', companyId)
      .maybeSingle(),
  ])

  const planCode = normalizePlanCode(subscription?.plan_code)
  const subscriptionStatus = String(subscription?.status ?? 'trial')
  const tenantStatus = deriveTenantStatus({
    subscriptionStatus,
    currentTenantStatus: company?.tenant_status ? String(company.tenant_status) : null,
  })

  const { data: features } = await admin
    .from('plan_features')
    .select('module_key, enabled')
    .eq('plan_code', planCode)

  let planModules: string[]
  if (features?.length) {
    planModules = features.filter((row) => row.enabled).map((row) => String(row.module_key))
  } else {
    // Pre-migration / unknown plan — fail open to professional-equivalent.
    planModules = FALLBACK_MODULES.filter((key) => key !== 'integrations')
  }

  const { data: overrides } = await admin
    .from('company_entitlement_overrides')
    .select('module_key, enabled')
    .eq('company_id', companyId)

  const enabledModules = resolveEnabledModules({
    planModules,
    overrides: (overrides ?? []).map((row) => ({
      moduleKey: String(row.module_key),
      enabled: Boolean(row.enabled),
    })),
  })

  const [{ data: planLimits }, { data: companyLimits }] = await Promise.all([
    admin.from('plan_usage_limits').select('limit_key, limit_value').eq('plan_code', planCode),
    admin.from('company_usage_limits').select('limit_key, limit_value').eq('company_id', companyId),
  ])

  const usageLimits = mergeUsageLimits(
    (planLimits ?? []).map((row) => ({
      limitKey: String(row.limit_key),
      limitValue: row.limit_value == null ? null : Number(row.limit_value),
    })),
    (companyLimits ?? []).map((row) => ({
      limitKey: String(row.limit_key),
      limitValue: row.limit_value == null ? null : Number(row.limit_value),
    })),
  )

  return {
    planCode,
    subscriptionStatus,
    tenantStatus,
    enabledModules,
    usageLimits,
    trialEndsAt: subscription?.trial_ends_at ? String(subscription.trial_ends_at) : null,
    currentPeriodEnd: subscription?.current_period_end
      ? String(subscription.current_period_end)
      : null,
    gracePeriodEndsAt: subscription?.grace_period_ends_at
      ? String(subscription.grace_period_ends_at)
      : null,
  }
}

/** Convenience: module check against a loaded snapshot. */
export function snapshotHasModule(snapshot: EntitlementSnapshot, moduleKey: string): boolean {
  return snapshot.enabledModules.includes(moduleKey)
}

export async function resolvePlatformRole(userId: string): Promise<string | null> {
  const { data } = await admin
    .from('platform_users')
    .select('platform_role, status')
    .eq('user_id', userId)
    .maybeSingle()
  if (data?.status === 'active' && data.platform_role) {
    return String(data.platform_role)
  }

  // Bootstrap first platform operator (empty table or configured email).
  const bootstrapEmail = (Deno.env.get('VEYVIO_PLATFORM_BOOTSTRAP_EMAIL') ?? 'admin@veyvio.test')
    .trim()
    .toLowerCase()
  const { data: user } = await admin.from('users').select('email').eq('id', userId).maybeSingle()
  const { count } = await admin.from('platform_users').select('*', { count: 'exact', head: true })
  const email = String(user?.email ?? '').toLowerCase()
  if ((count ?? 0) === 0 || email === bootstrapEmail) {
    await admin.from('platform_users').upsert({
      user_id: userId,
      platform_role: 'platform_admin',
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    return 'platform_admin'
  }

  return null
}
