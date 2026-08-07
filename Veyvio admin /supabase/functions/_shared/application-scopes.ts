import { HttpError } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'
import { recordSecurityEvent } from './tenant-auth.ts'
import {
  legacyApplicationsForRoles,
  normalizeAppType,
  type VeyvioAppType,
} from './account-authority.ts'

/** Blueprint Part F — application access scopes (deny-by-default). */
export type ApplicationScope = VeyvioAppType | 'PLATFORM'

const YARD_ROLE_KEYS = new Set(['yard_manager', 'yard_operative', 'contractor'])

const COMMAND_ROLE_KEYS = new Set([
  'company_owner',
  'company_administrator',
  'transport_manager',
  'operations_manager',
  'dispatcher',
  'compliance_manager',
  'safeguarding_lead',
  'read_only_auditor',
  'support',
])

/** Driver onboarding paths reachable before full driver_app_accounts linkage is complete. */
const DRIVER_SCOPE_EXEMPT_PREFIXES = [
  'driver/onboarding',
  'driver/profile',
  'driver/devices',
] as const

const PUBLIC_PATH_PREFIXES = ['auth/', 'system/', 'health'] as const

export function normalizeApiPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '')
}

/** Strip optional REST version prefix used by third-party docs (e.g. v1/interests). */
export function stripApiVersionPrefix(path: string): string {
  const p = normalizeApiPath(path)
  return p.startsWith('v1/') ? p.slice(3) : p
}

/**
 * Integration intake paths authenticate via X-Veyvio-API-Key inside the handler.
 * Dispatch must route these before the JWT application-scope gate.
 */
export function isIntegrationIntakePath(path: string, method: string): boolean {
  if (method.toUpperCase() !== 'POST') return false
  const p = stripApiVersionPrefix(path)
  return p === 'interests'
}

export function isPublicApiPath(path: string): boolean {
  const p = normalizeApiPath(path)
  if (!p || p === 'health') return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))
}

/**
 * Scopes required to call this path (any one match grants access unless noted).
 * Returns null when no application-scope gate applies.
 */
export function requiredScopesForApiPath(path: string): ApplicationScope[] | null {
  const p = stripApiVersionPrefix(path)

  if (isPublicApiPath(normalizeApiPath(path))) return null
  if (p.startsWith('platform/')) return ['PLATFORM']
  if (p.startsWith('executive/')) return ['EXECUTIVE']
  if (p.startsWith('finance/')) return ['FINANCE']
  if (p.startsWith('hr/')) return ['HR']

  if (p.startsWith('settings/account-hierarchy')) return ['EXECUTIVE']

  if (p === 'settings/invitations') {
    // Executive creates department accounts; Command creates Driver/Yard.
    // The account-authority policy performs the second, target-specific check.
    return ['EXECUTIVE', 'COMMAND']
  }

  if (p.startsWith('driver/')) {
    if (DRIVER_SCOPE_EXEMPT_PREFIXES.some((prefix) => p.startsWith(prefix))) return null
    return ['DRIVER']
  }

  if (p.startsWith('yard/')) {
    // Yard app (YARD) and Command oversight (COMMAND) — never driver-only accounts.
    return ['YARD', 'COMMAND']
  }

  if (p === 'notifications' || p.startsWith('notifications/')) {
    return ['COMMAND', 'DRIVER']
  }

  if (p === 'interests' || p.startsWith('interests/')) {
    return ['COMMAND']
  }

  // Licensed module paths and general Command API surface.
  return ['COMMAND']
}

export function roleGrantsCommandScope(roleKey: string): boolean {
  return COMMAND_ROLE_KEYS.has(roleKey)
}

export function roleGrantsYardScope(roleKey: string): boolean {
  return YARD_ROLE_KEYS.has(roleKey)
}

export async function resolveApplicationScopes(
  context: RequestContext,
): Promise<Set<ApplicationScope>> {
  const scopes = new Set<ApplicationScope>()

  if (context.platformRole) {
    scopes.add('PLATFORM')
    // Platform operators with an active company context can use Command/Yard APIs for that tenant.
    if (context.companyId) {
      scopes.add('COMMAND')
      scopes.add('YARD')
    }
  }

  if (context.isSupportSession) {
    scopes.add('COMMAND')
    scopes.add('YARD')
    return scopes
  }

  if (!context.companyId) return scopes

  let explicitAccessFound = false
  if (context.membershipId) {
    const { data: accessRows, error: accessError } = await admin
      .from('membership_application_access')
      .select('app_type')
      .eq('company_id', context.companyId)
      .eq('membership_id', context.membershipId)
      .eq('status', 'active')

    if (!accessError && accessRows?.length) {
      explicitAccessFound = true
      for (const row of accessRows) {
        const appType = normalizeAppType(String(row.app_type ?? ''))
        if (appType) scopes.add(appType)
      }
    }
  }

  const { data: driverAccount } = await admin
    .from('driver_app_accounts')
    .select('id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (driverAccount?.id) {
    scopes.add('DRIVER')
  }

  if (!explicitAccessFound) {
    const roleKeys = context.roleKeys?.length ? context.roleKeys : [context.roleKey]
    for (const scope of legacyApplicationsForRoles(roleKeys)) {
      scopes.add(scope)
    }
  }

  return scopes
}

/**
 * High-assurance applications must never use the role-based compatibility
 * fallback. The active application grant is an independent database fact.
 */
export async function assertExplicitApplicationAccess(
  context: RequestContext,
  appType: VeyvioAppType,
): Promise<void> {
  if (!context.companyId || !context.membershipId || context.isSupportSession) {
    throw new HttpError(
      403,
      `An active ${appType} application grant is required.`,
      'explicit_application_access_required',
    )
  }

  const { data, error } = await admin
    .from('membership_application_access')
    .select('id')
    .eq('company_id', context.companyId)
    .eq('membership_id', context.membershipId)
    .eq('app_type', appType)
    .eq('status', 'active')
    .maybeSingle()

  if (!error && data?.id) return

  await recordSecurityEvent({
    companyId: context.companyId,
    actorUserId: context.user.id,
    eventType: 'auth.explicit_application_access_denied',
    message: `Explicit ${appType} application access denied`,
    severity: 'attention',
    metadata: {
      appType,
      membershipId: context.membershipId,
      roleKeys: context.roleKeys,
    },
  }).catch(() => undefined)

  throw new HttpError(
    403,
    `An active ${appType} application grant is required.`,
    'explicit_application_access_required',
  )
}

export function scopesSatisfyRequirement(
  granted: Set<ApplicationScope>,
  required: ApplicationScope[],
): boolean {
  if (required.includes('PLATFORM')) {
    return granted.has('PLATFORM')
  }
  return required.some((scope) => granted.has(scope))
}

export async function assertApplicationScope(
  context: RequestContext,
  path: string,
): Promise<void> {
  const required = requiredScopesForApiPath(path)
  if (!required?.length) return

  const granted = await resolveApplicationScopes(context)

  if (scopesSatisfyRequirement(granted, required)) return

  const requiredLabel = required.join(' or ')
  await recordSecurityEvent({
    companyId: context.companyId,
    actorUserId: context.user.id,
    eventType: 'auth.application_scope_denied',
    message: `Application scope denied for ${path}`,
    severity: 'attention',
    metadata: {
      path,
      required: requiredLabel,
      granted: [...granted],
      roleKey: context.roleKey,
      roleKeys: context.roleKeys,
    },
  }).catch(() => undefined)

  throw new HttpError(
    403,
    `This login does not have access to the required Veyvio application (${requiredLabel}).`,
    'application_scope_forbidden',
  )
}
