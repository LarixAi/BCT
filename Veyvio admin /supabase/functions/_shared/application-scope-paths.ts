/**
 * Pure API path → application-scope rules (no I/O).
 * Imported by application-scopes.ts and Node unit tests.
 */
import type { VeyvioAppType } from './account-authority.ts'

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

export function scopesSatisfyRequirement(
  granted: Set<ApplicationScope>,
  required: ApplicationScope[],
): boolean {
  if (required.includes('PLATFORM')) {
    return granted.has('PLATFORM')
  }
  return required.some((scope) => granted.has(scope))
}
