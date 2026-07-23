// Synced from packages/entitlements/src/index.ts — keep in sync via: npm run sync:edge --prefix packages/entitlements
/**
 * Pure licensing helpers shared by Command, Yard, Driver, and Edge (via sync copy).
 * No I/O — callers load plan/subscription rows and pass snapshots in.
 */

export const PLATFORM_MODULE_KEYS = [
  'identity',
  'tenancy',
  'operations',
  'dispatch',
  'workforce',
  'fleet',
  'yard',
  'maintenance',
  'safety',
  'compliance',
  'customers',
  'passengers',
  'commercial',
  'communications',
  'reporting',
  'integrations',
  'audit',
] as const

export type PlatformModuleKey = (typeof PLATFORM_MODULE_KEYS)[number]

export const USAGE_LIMIT_KEYS = ['drivers', 'vehicles', 'depots'] as const
export type UsageLimitKey = (typeof USAGE_LIMIT_KEYS)[number]

/** Onboarding / setup states that billing sync must not clobber (except hard suspend). */
export const ONBOARDING_TENANT_STATUSES = [
  'PENDING_EMAIL_VERIFICATION',
  'PENDING_COMPANY_VERIFICATION',
  'PENDING_CONTRACT',
  'PENDING_PAYMENT',
  'SETUP_REQUIRED',
] as const

export type EntitlementModulesInput = {
  /** Module keys enabled by the plan (and defaults). */
  planModules: Iterable<string>
  /** Company overrides: enabled true/false. */
  overrides?: Iterable<{ moduleKey: string; enabled: boolean }>
}

export type TenantDeriveInput = {
  subscriptionStatus: string
  /** Current companies.tenant_status — used to preserve onboarding. */
  currentTenantStatus?: string | null
}

/** Alias used across UIs: can the company use this module? */
export function canUse(
  enabledModules: readonly string[] | null | undefined,
  moduleKey: string | null | undefined,
): boolean {
  if (!moduleKey) return true
  // Soft-open: empty/missing entitlements do not hide surfaces.
  if (!enabledModules || enabledModules.length === 0) return true
  return enabledModules.includes(moduleKey)
}

export function hasModule(
  enabledModules: readonly string[] | null | undefined,
  moduleKey: string,
): boolean {
  return canUse(enabledModules, moduleKey)
}

export function resolveEnabledModules(input: EntitlementModulesInput): string[] {
  const enabled = new Set<string>()
  for (const key of input.planModules) {
    if (key) enabled.add(String(key))
  }
  for (const row of input.overrides ?? []) {
    const key = String(row.moduleKey)
    if (row.enabled) enabled.add(key)
    else enabled.delete(key)
  }
  // Core identity/tenancy always on for an active membership session.
  enabled.add('identity')
  enabled.add('tenancy')
  return PLATFORM_MODULE_KEYS.filter((key) => enabled.has(key))
}

/**
 * Map commercial subscription status → operational tenant_status.
 * Subscription is the commercial source of truth for ACTIVE / READ_ONLY / SUSPENDED / PENDING_PAYMENT.
 */
export function mapSubscriptionStatusToTenant(subscriptionStatus: string): string {
  const status = String(subscriptionStatus ?? '').trim().toLowerCase()
  switch (status) {
    case 'active':
    case 'trialing':
    case 'trial':
      return 'ACTIVE'
    case 'past_due':
      return 'READ_ONLY'
    case 'canceled':
    case 'cancelled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'SUSPENDED'
    case 'incomplete':
    case 'pending_payment':
      return 'PENDING_PAYMENT'
    default:
      return 'ACTIVE'
  }
}

/**
 * Derive effective tenant_status: subscription drives billing states;
 * onboarding company states are preserved unless subscription forces SUSPENDED / READ_ONLY / PENDING_PAYMENT.
 */
export function deriveTenantStatus(input: TenantDeriveInput): string {
  const fromSub = mapSubscriptionStatusToTenant(input.subscriptionStatus)
  const current = String(input.currentTenantStatus ?? '').trim() || 'ACTIVE'
  const onboarding = (ONBOARDING_TENANT_STATUSES as readonly string[]).includes(current)

  if (onboarding) {
    if (fromSub === 'SUSPENDED' || fromSub === 'READ_ONLY' || fromSub === 'PENDING_PAYMENT') {
      return fromSub
    }
    return current
  }

  // CLOSED / CLOSING stay until platform reopens via subscription + explicit restore.
  if (current === 'CLOSED' || current === 'CLOSING') {
    if (fromSub === 'ACTIVE') return 'ACTIVE'
    return current
  }

  return fromSub
}

export function mergeUsageLimits(
  planLimits: Iterable<{ limitKey: string; limitValue: number | null }>,
  companyLimits?: Iterable<{ limitKey: string; limitValue: number | null }>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const row of planLimits) {
    out[String(row.limitKey)] = row.limitValue
  }
  for (const row of companyLimits ?? []) {
    out[String(row.limitKey)] = row.limitValue
  }
  return out
}

/** null / missing = unlimited. */
export function isWithinLimit(limitValue: number | null | undefined, currentCount: number): boolean {
  if (limitValue == null) return true
  return currentCount <= limitValue
}
