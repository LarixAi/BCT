import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './http.ts'
import { resolveEntitlements, resolvePlatformRole, type EntitlementSnapshot } from './entitlements.ts'
import { enforceTenantLifecycle, recordSecurityEvent } from './tenant-auth.ts'
import {
  assertSupportGrantWrite,
  ensureOpenSupportSession,
  resolveActiveSupportGrant,
  type ActiveSupportGrant,
} from './support-access.ts'
import { decideTenantMembershipAccess } from './membership-access.ts'
import {
  decideMembershipWorkspaceIdentity,
  decideSupportWorkspaceIdentity,
  type WorkspaceAuthority,
} from './support-workspace.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required')
}

export const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export function publicClient(accessToken?: string) {
  return createClient(supabaseUrl, anonKey, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Command API context. Frontend still calls this "tenant"; DB uses company_id. */
export type RequestContext = {
  user: User
  companyId: string
  /** @deprecated alias for companyId — kept for gradual migration */
  tenantId: string
  /**
   * Company membership id when workspaceAuthority === 'membership'.
   * Null when workspaceAuthority === 'support' (never a placeholder UUID).
   */
  membershipId: string | null
  /** Explicit provenance: ordinary membership vs support grant vs no tenant. */
  workspaceAuthority: WorkspaceAuthority
  /** All active roles on the membership. Never authorise from array order. */
  roleKeys: string[]
  /** Primary display role retained for older clients. */
  roleKey: string
  permissions: string[]
  platformRole: string | null
  entitlements: EntitlementSnapshot | null
  tenantStatus: string
  /** True only when workspaceAuthority === 'support'. */
  isSupportSession: boolean
  supportGrantId: string | null
  supportSessionId: string | null
  supportGrant: ActiveSupportGrant | null
  db: SupabaseClient
}

async function resolvePermissions(roleIds: string[]): Promise<string[]> {
  if (!roleIds.length) return []
  const { data } = await admin
    .from('role_permissions')
    .select('permission_code, effect')
    .in('role_id', roleIds)
  const allowed = new Set<string>()
  const denied = new Set<string>()
  for (const row of data ?? []) {
    if (row.effect === 'deny') denied.add(row.permission_code)
    else allowed.add(row.permission_code)
  }
  return [...allowed].filter((code) => !denied.has(code))
}

export async function ensurePlatformUser(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const { error } = await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      first_name: String(meta.first_name ?? meta.firstName ?? ''),
      last_name: String(meta.last_name ?? meta.lastName ?? ''),
      last_login_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) throw new Error(error.message)
}

function emptyContext(
  user: User,
  platformRole: string | null,
): RequestContext {
  return {
    user,
    companyId: '',
    tenantId: '',
    membershipId: null,
    workspaceAuthority: 'none',
    roleKeys: [],
    roleKey: '',
    permissions: [],
    platformRole,
    entitlements: null,
    tenantStatus: '',
    isSupportSession: false,
    supportGrantId: null,
    supportSessionId: null,
    supportGrant: null,
    db: admin,
  }
}

export async function authenticate(request: Request, requireCompany = true): Promise<RequestContext> {
  const header = request.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Authentication required', 'unauthenticated')
  }

  const accessToken = header.slice(7)
  const { data, error } = await publicClient(accessToken).auth.getUser(accessToken)
  if (error || !data.user) {
    throw new HttpError(401, 'Session is invalid or expired', 'unauthenticated')
  }

  const companyId = String(
    data.user.app_metadata.active_company_id ?? data.user.app_metadata.active_tenant_id ?? '',
  )
  if (requireCompany && !companyId) {
    throw new HttpError(409, 'Select a company before continuing', 'company_required')
  }

  const platformRole = await resolvePlatformRole(data.user.id)

  if (!companyId) {
    return emptyContext(data.user, platformRole)
  }

  // Client-supplied membership claims (if any header/query) must never authorize.
  const clientMembershipId =
    request.headers.get('x-veyvio-membership-id') ??
    new URL(request.url).searchParams.get('membershipId')

  const { data: membership, error: membershipError } = await admin
    .from('company_memberships')
    .select('id, role_ids, status')
    .eq('company_id', companyId)
    .eq('user_id', data.user.id)
    .maybeSingle()

  let supportGrant: ActiveSupportGrant | null = null
  if (platformRole && (membershipError || membership?.status !== 'active')) {
    supportGrant = await resolveActiveSupportGrant(data.user.id, companyId)
  }

  const access = decideTenantMembershipAccess({
    membership: membershipError ? null : membership,
    hasSupportGrant: Boolean(supportGrant),
  })

  if (!access.allow) {
    await recordSecurityEvent({
      companyId,
      actorUserId: data.user.id,
      eventType: 'auth.membership_denied',
      message: 'Tenant access denied — no active membership or support grant',
      severity: 'attention',
      metadata: { reason: access.reason },
    }).catch(() => undefined)
    throw new HttpError(403, 'Company access is unavailable', 'forbidden')
  }

  if (access.via === 'support') {
    const decision = decideSupportWorkspaceIdentity({
      platformRole,
      jwtCompanyId: companyId,
      grant: supportGrant,
      clientMembershipId,
    })
    if (!decision.ok) {
      await recordSecurityEvent({
        companyId,
        actorUserId: data.user.id,
        eventType: 'support.access_denied',
        message: decision.message,
        severity: 'attention',
        metadata: { code: decision.code, clientMembershipId: clientMembershipId || null },
      }).catch(() => undefined)
      throw new HttpError(403, decision.message, decision.code)
    }

    assertSupportGrantWrite(supportGrant, request.method)
    const supportSessionId = await ensureOpenSupportSession({
      grantId: decision.supportGrantId,
      companyId: decision.companyId,
      supportUserId: data.user.id,
    })

    await recordSecurityEvent({
      companyId: decision.companyId,
      actorUserId: data.user.id,
      eventType: 'support.access_used',
      message: 'Support grant used for tenant API access',
      severity: 'attention',
      metadata: {
        workspaceAuthority: 'support',
        grantId: decision.supportGrantId,
        supportSessionId,
        method: request.method,
        path: new URL(request.url).pathname,
        membershipId: null,
      },
    }).catch(() => undefined)

    const entitlements = await resolveEntitlements(decision.companyId)

    return {
      user: data.user,
      companyId: decision.companyId,
      tenantId: decision.companyId,
      membershipId: null,
      workspaceAuthority: 'support',
      roleKeys: [...decision.roleKeys],
      roleKey: decision.roleKey,
      permissions: [...decision.permissions],
      platformRole,
      entitlements,
      tenantStatus: entitlements?.tenantStatus ?? '',
      isSupportSession: true,
      supportGrantId: decision.supportGrantId,
      supportSessionId,
      supportGrant,
      db: admin,
    }
  }

  // Ordinary membership path — never mix support grant roles/grants.
  const membershipId = String(membership?.id ?? '')
  if (!membershipId) {
    throw new HttpError(403, 'Company access is unavailable', 'forbidden')
  }

  const roleIds = (membership?.role_ids as string[] | null) ?? []
  let roleKeys: string[] = []
  if (roleIds.length) {
    const { data: roles } = await admin.from('roles').select('id, name').in('id', roleIds)
    const roleNameById = new Map((roles ?? []).map((role) => [String(role.id), String(role.name)]))
    roleKeys = roleIds
      .map((roleId) => roleNameById.get(String(roleId)))
      .filter((role): role is string => Boolean(role))
  }
  const permissions = roleIds.length ? await resolvePermissions(roleIds) : []
  const identity = decideMembershipWorkspaceIdentity({
    companyId,
    membershipId,
    roleKeys,
    permissions,
  })

  const entitlements = await resolveEntitlements(companyId)
  if (entitlements) {
    enforceTenantLifecycle(entitlements.tenantStatus, request.method)
  }

  return {
    user: data.user,
    companyId: identity.companyId,
    tenantId: identity.companyId,
    membershipId: identity.membershipId,
    workspaceAuthority: 'membership',
    roleKeys: identity.roleKeys,
    roleKey: identity.roleKey,
    permissions: identity.permissions,
    platformRole,
    entitlements,
    tenantStatus: entitlements?.tenantStatus ?? '',
    isSupportSession: false,
    supportGrantId: null,
    supportSessionId: null,
    supportGrant: null,
    db: admin,
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}
