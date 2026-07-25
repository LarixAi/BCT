import { HttpError } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'
import { recordSecurityEvent } from './tenant-auth.ts'

/** Blueprint Part F — application access scopes (deny-by-default). */
export type ApplicationScope = 'COMMAND' | 'DRIVER' | 'YARD' | 'PLATFORM'

const YARD_ROLE_KEYS = new Set(['yard_manager', 'yard_operative', 'contractor'])

const COMMAND_ROLE_KEYS = new Set([
  'company_owner',
  'company_administrator',
  'transport_manager',
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
  const p = normalizeApiPath(path)

  if (isPublicApiPath(p)) return null
  if (p.startsWith('platform/')) return ['PLATFORM']

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

  const { data: driverAccount } = await admin
    .from('driver_app_accounts')
    .select('id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (driverAccount?.id) {
    scopes.add('DRIVER')
  }

  if (context.membershipId && context.roleKey) {
    if (roleGrantsCommandScope(context.roleKey)) {
      scopes.add('COMMAND')
    }
    if (roleGrantsYardScope(context.roleKey)) {
      scopes.add('YARD')
    }
  }

  return scopes
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
    },
  }).catch(() => undefined)

  throw new HttpError(
    403,
    `This login does not have access to the required Veyvio application (${requiredLabel}).`,
    'application_scope_forbidden',
  )
}
