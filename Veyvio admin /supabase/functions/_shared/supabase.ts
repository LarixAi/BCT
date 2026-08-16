import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './http.ts'
import { resolveEntitlements, resolvePlatformRole, type EntitlementSnapshot } from './entitlements.ts'
import { enforceTenantLifecycle, recordSecurityEvent } from './tenant-auth.ts'
import {
  assertSupportGrantWrite,
  resolveActiveSupportGrant,
  type ActiveSupportGrant,
} from './support-access.ts'
import { decideTenantMembershipAccess } from './membership-access.ts'

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
  membershipId: string
  /** All active roles on the membership. Never authorise from array order. */
  roleKeys: string[]
  /** Primary display role retained for older clients. */
  roleKey: string
  permissions: string[]
  platformRole: string | null
  entitlements: EntitlementSnapshot | null
  tenantStatus: string
  isSupportSession: boolean
  supportGrantId: string | null
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
    return {
      user: data.user,
      companyId: '',
      tenantId: '',
      membershipId: '',
      roleKeys: [],
      roleKey: '',
      permissions: [],
      platformRole,
      entitlements: null,
      tenantStatus: '',
      isSupportSession: false,
      supportGrantId: null,
      supportGrant: null,
      db: admin,
    }
  }

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
  const hasActiveMembership = access.allow && access.via === 'membership'

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

  if (access.via === 'support' && supportGrant) {
    assertSupportGrantWrite(supportGrant, request.method)
    await recordSecurityEvent({
      companyId,
      actorUserId: data.user.id,
      eventType: 'support.access_used',
      message: 'Support grant used for tenant API access',
      severity: 'attention',
      metadata: { grantId: supportGrant.id, method: request.method, path: new URL(request.url).pathname },
    }).catch(() => undefined)
  }

  const entitlements = companyId ? await resolveEntitlements(companyId) : null
  if (entitlements && hasActiveMembership) {
    enforceTenantLifecycle(entitlements.tenantStatus, request.method)
  }

  const roleIds = (membership?.role_ids as string[] | null) ?? []
  let roleKeys = supportGrant ? ['support'] : []
  if (roleIds.length) {
    const { data: roles } = await admin.from('roles').select('id, name').in('id', roleIds)
    const roleNameById = new Map((roles ?? []).map((role) => [String(role.id), String(role.name)]))
    roleKeys = roleIds
      .map((roleId) => roleNameById.get(String(roleId)))
      .filter((role): role is string => Boolean(role))
  }
  const roleKey = roleKeys[0] ?? (supportGrant ? 'support' : 'member')
  const permissions = roleIds.length ? await resolvePermissions(roleIds) : []

  return {
    user: data.user,
    companyId,
    tenantId: companyId,
    membershipId: membership?.id ?? '',
    roleKeys,
    roleKey,
    permissions,
    platformRole,
    entitlements,
    tenantStatus: entitlements?.tenantStatus ?? '',
    isSupportSession: Boolean(supportGrant),
    supportGrantId: supportGrant?.id ?? null,
    supportGrant,
    db: admin,
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}
