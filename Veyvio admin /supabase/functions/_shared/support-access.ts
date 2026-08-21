import { admin } from './supabase.ts'
import { HttpError } from './http.ts'
import { isSupportGrantActive } from './support-workspace.ts'

export type ActiveSupportGrant = {
  id: string
  companyId: string
  accessLevel: string
  expiresAt: string
  startsAt: string | null
  revokedAt: string | null
}

export { isSupportGrantActive }

/** Active, non-revoked support grant for platform staff accessing a tenant workspace. */
export async function resolveActiveSupportGrant(
  userId: string,
  companyId: string,
): Promise<ActiveSupportGrant | null> {
  if (!companyId) return null
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('privileged_access_grants')
    .select('id, company_id, access_level, expires_at, revoked_at, starts_at')
    .eq('company_id', companyId)
    .eq('grantee_user_id', userId)
    .is('revoked_at', null)
    .lte('starts_at', now)
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new HttpError(500, error.message, 'database_error')
  if (!data) return null

  const grant: ActiveSupportGrant = {
    id: String(data.id),
    companyId: String(data.company_id),
    accessLevel: String(data.access_level ?? 'read_only'),
    expiresAt: String(data.expires_at),
    startsAt: data.starts_at ? String(data.starts_at) : null,
    revokedAt: data.revoked_at ? String(data.revoked_at) : null,
  }

  if (!isSupportGrantActive(grant)) return null
  return grant
}

/**
 * Resolve a specific grant by id and verify it is active for this user+company.
 * Used to reject stale/forged grant ids.
 */
export async function resolveSupportGrantById(input: {
  grantId: string
  userId: string
  companyId: string
}): Promise<ActiveSupportGrant | null> {
  const { data, error } = await admin
    .from('privileged_access_grants')
    .select('id, company_id, access_level, expires_at, revoked_at, starts_at, grantee_user_id')
    .eq('id', input.grantId)
    .maybeSingle()

  if (error) throw new HttpError(500, error.message, 'database_error')
  if (!data) return null
  if (String(data.grantee_user_id) !== input.userId) return null
  if (String(data.company_id) !== input.companyId) return null

  const grant: ActiveSupportGrant = {
    id: String(data.id),
    companyId: String(data.company_id),
    accessLevel: String(data.access_level ?? 'read_only'),
    expiresAt: String(data.expires_at),
    startsAt: data.starts_at ? String(data.starts_at) : null,
    revokedAt: data.revoked_at ? String(data.revoked_at) : null,
  }
  if (!isSupportGrantActive(grant)) return null
  return grant
}

export function supportGrantAllowsWrite(accessLevel: string): boolean {
  return ['write', 'full', 'admin'].includes(accessLevel.toLowerCase())
}

export function assertSupportGrantWrite(grant: ActiveSupportGrant | null, method: string): void {
  if (!grant) return
  const write = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
  if (write && !supportGrantAllowsWrite(grant.accessLevel)) {
    throw new HttpError(403, 'Support access is read-only for this grant', 'support_read_only')
  }
}

/** Open (or reuse) an attributable support_access_sessions row for this grant. */
export async function ensureOpenSupportSession(input: {
  grantId: string
  companyId: string
  supportUserId: string
}): Promise<string> {
  const { data: existing, error: existingError } = await admin
    .from('support_access_sessions')
    .select('id')
    .eq('grant_id', input.grantId)
    .eq('company_id', input.companyId)
    .eq('support_user_id', input.supportUserId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) throw new HttpError(500, existingError.message, 'database_error')
  if (existing?.id) return String(existing.id)

  const { data: created, error } = await admin
    .from('support_access_sessions')
    .insert({
      grant_id: input.grantId,
      company_id: input.companyId,
      support_user_id: input.supportUserId,
      banner_acknowledged_at: new Date().toISOString(),
      metadata: { source: 'authenticate' },
    })
    .select('id')
    .single()

  if (error || !created?.id) {
    throw new HttpError(500, error?.message ?? 'Support session could not be created', 'database_error')
  }
  return String(created.id)
}

export async function revokeSupportGrant(input: {
  grantId: string
  companyId: string
  actorUserId: string
}): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await admin
    .from('privileged_access_grants')
    .update({
      revoked_at: now,
    })
    .eq('id', input.grantId)
    .eq('company_id', input.companyId)
    .is('revoked_at', null)
  if (error) throw new HttpError(500, error.message, 'database_error')
  void input.actorUserId
}
