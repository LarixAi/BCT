/**
 * Blueprint Part F — application access scopes (deny-by-default).
 */
import { HttpError } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'
import { recordSecurityEvent } from './tenant-auth.ts'
import {
  legacyApplicationsForRoles,
  normalizeAppType,
  type VeyvioAppType,
} from './account-authority.ts'
import {
  type ApplicationScope,
  isIntegrationIntakePath,
  isPublicApiPath,
  normalizeApiPath,
  requiredScopesForApiPath,
  roleGrantsCommandScope,
  roleGrantsYardScope,
  scopesSatisfyRequirement,
  stripApiVersionPrefix,
} from './application-scope-paths.ts'

export type { ApplicationScope }
export {
  isIntegrationIntakePath,
  isPublicApiPath,
  normalizeApiPath,
  requiredScopesForApiPath,
  roleGrantsCommandScope,
  roleGrantsYardScope,
  scopesSatisfyRequirement,
  stripApiVersionPrefix,
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
