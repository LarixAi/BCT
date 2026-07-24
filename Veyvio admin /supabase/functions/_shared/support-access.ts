import { admin } from './supabase.ts'
import { HttpError } from './http.ts'

export type ActiveSupportGrant = {
  id: string
  companyId: string
  accessLevel: string
  expiresAt: string
}

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

  return {
    id: String(data.id),
    companyId: String(data.company_id),
    accessLevel: String(data.access_level ?? 'read_only'),
    expiresAt: String(data.expires_at),
  }
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
