/**
 * F-14 — hashed integration API keys.
 */
import { admin, type RequestContext } from './supabase.ts'
import { apiError, json, readJson, toCamelCase } from './http.ts'
import { writeImmutableAudit } from './audit-service.ts'

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function listIntegrationKeys(context: RequestContext) {
  const { data, error } = await admin
    .from('integration_api_keys')
    .select('id, company_id, name, key_prefix, scopes, status, expires_at, last_used_at, created_at, revoked_at')
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
  if (error) return apiError(500, error.message)
  return json({ items: (data ?? []).map((row) => toCamelCase(row)) })
}

export async function createIntegrationKey(context: RequestContext, request: Request) {
  const input = await readJson<{ name?: string; scopes?: string[]; expiresAt?: string | null }>(request)
  const name = String(input.name ?? '').trim()
  if (!name) return apiError(400, 'name is required', 'invalid_input')

  const secret = `vv_${randomToken()}`
  const keyPrefix = secret.slice(0, 10)
  const keyHash = await sha256Hex(secret)

  const { data, error } = await admin
    .from('integration_api_keys')
    .insert({
      company_id: context.companyId,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: Array.isArray(input.scopes) ? input.scopes : ['read'],
      expires_at: input.expiresAt ?? null,
      created_by: context.user.id,
    })
    .select('id, company_id, name, key_prefix, scopes, status, expires_at, created_at')
    .single()

  if (error || !data) return apiError(500, error?.message ?? 'API key could not be created')

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'integration_key.created',
    entityType: 'integration_api_key',
    entityId: String(data.id),
    afterSnapshot: { name, keyPrefix, scopes: data.scopes },
  }).catch(() => undefined)

  // Secret is returned once only.
  return json({ ...toCamelCase(data), secret }, 201)
}

export async function revokeIntegrationKey(context: RequestContext, keyId: string) {
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('integration_api_keys')
    .update({
      status: 'revoked',
      revoked_at: now,
      revoked_by: context.user.id,
    })
    .eq('company_id', context.companyId)
    .eq('id', keyId)
    .select('id, name, status, revoked_at')
    .maybeSingle()

  if (error) return apiError(500, error.message)
  if (!data) return apiError(404, 'API key not found', 'not_found')

  await writeImmutableAudit({
    companyId: context.companyId,
    actorUserId: context.user.id,
    action: 'integration_key.revoked',
    entityType: 'integration_api_key',
    entityId: keyId,
  }).catch(() => undefined)

  return json(toCamelCase(data))
}
