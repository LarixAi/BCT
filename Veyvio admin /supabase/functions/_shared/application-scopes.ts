/**
 * Blueprint Part F — application access scopes (deny-by-default).
 * Wave 3B: explicit membership_application_access (+ support grant path) only.
 */
import { HttpError } from './http.ts'
import { admin, type RequestContext } from './supabase.ts'
import { recordSecurityEvent } from './tenant-auth.ts'
import { normalizeAppType, type VeyvioAppType } from './account-authority.ts'
import { decideExplicitApplicationScopes } from './explicit-application-scopes.ts'
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
export { decideExplicitApplicationScopes } from './explicit-application-scopes.ts'

export async function resolveApplicationScopes(
  context: RequestContext,
  options: { clientClaimedApps?: readonly string[] | null } = {},
): Promise<Set<ApplicationScope>> {
  let explicitAppTypes: string[] = []

  if (context.companyId && context.membershipId && !context.isSupportSession) {
    const { data: accessRows, error: accessError } = await admin
      .from('membership_application_access')
      .select('app_type')
      .eq('company_id', context.companyId)
      .eq('membership_id', context.membershipId)
      .eq('status', 'active')

    if (!accessError && accessRows?.length) {
      explicitAppTypes = accessRows
        .map((row) => normalizeAppType(String(row.app_type ?? '')))
        .filter((app): app is VeyvioAppType => Boolean(app))
    }
  }

  return decideExplicitApplicationScopes({
    platformRole: context.platformRole,
    isSupportSession: context.isSupportSession,
    companyId: context.companyId,
    membershipId: context.membershipId,
    explicitAppTypes,
    clientClaimedApps: options.clientClaimedApps,
  })
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
