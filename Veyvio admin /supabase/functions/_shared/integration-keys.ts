/**
 * F-14 — hashed integration API keys + intake authentication.
 */
import { admin, type RequestContext } from './supabase.ts'
import { apiError, HttpError, json, readJson, toCamelCase } from './http.ts'
import { writeImmutableAudit } from './audit-service.ts'
import { recordSecurityEvent } from './tenant-auth.ts'
import {
  ALLOWED_INTEGRATION_SCOPES,
  INTEREST_CREATE_SCOPE,
} from './interest-submissions.mapping.ts'

export type IntegrationKeyContext = {
  keyId: string
  companyId: string
  name: string
  keyPrefix: string
  scopes: string[]
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomToken(bytes = 24): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sanitizeScopes(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.map((s) => String(s).trim()).filter(Boolean) : []
  const scopes = [...new Set(raw.length ? raw : [INTEREST_CREATE_SCOPE])]
  const invalid = scopes.filter((s) => !ALLOWED_INTEGRATION_SCOPES.has(s))
  if (invalid.length) {
    throw new HttpError(
      400,
      `Unsupported integration scopes: ${invalid.join(', ')}. Allowed: ${[...ALLOWED_INTEGRATION_SCOPES].join(', ')}`,
      'invalid_scopes',
    )
  }
  return scopes
}

function clientMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null,
    userAgent: request.headers.get('user-agent'),
  }
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

  let scopes: string[]
  try {
    scopes = sanitizeScopes(input.scopes)
  } catch (error) {
    if (error instanceof HttpError) return apiError(error.status, error.message, error.code)
    throw error
  }

  // Displayed once: vyv_live_<48 hex>. Legacy vv_ keys remain valid for hash lookup.
  const secret = `vyv_live_${randomToken(24)}`
  const keyPrefix = secret.slice(0, 16)
  const keyHash = await sha256Hex(secret)

  const { data, error } = await admin
    .from('integration_api_keys')
    .insert({
      company_id: context.companyId,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes,
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

/**
 * Authenticate a third-party request via X-Veyvio-API-Key (or Authorization: Bearer vyv_…).
 * Updates last_used_at on success. Rejected attempts are written to security_events.
 */
export async function authenticateIntegrationKey(
  request: Request,
  requiredScope: string,
): Promise<IntegrationKeyContext> {
  const meta = clientMeta(request)
  const headerKey =
    request.headers.get('x-veyvio-api-key')?.trim() ||
    (() => {
      const auth = request.headers.get('authorization') ?? ''
      if (auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim()
        if (token.startsWith('vyv_') || token.startsWith('vv_')) return token
      }
      return null
    })()

  if (!headerKey) {
    await recordSecurityEvent({
      eventType: 'integration.api_key_missing',
      severity: 'attention',
      message: 'Integration request missing API key',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { requiredScope },
      evaluateAlerts: false,
    }).catch(() => undefined)
    throw new HttpError(401, 'X-Veyvio-API-Key is required', 'api_key_required')
  }

  const keyHash = await sha256Hex(headerKey)
  const { data, error } = await admin
    .from('integration_api_keys')
    .select('id, company_id, name, key_prefix, scopes, status, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) throw new HttpError(500, error.message, 'api_key_lookup_failed')

  if (!data) {
    await recordSecurityEvent({
      eventType: 'integration.api_key_rejected',
      severity: 'attention',
      message: 'Integration API key rejected (unknown)',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: {
        requiredScope,
        keyPrefix: headerKey.slice(0, 16),
        reason: 'unknown',
      },
      evaluateAlerts: false,
    }).catch(() => undefined)
    throw new HttpError(401, 'Invalid API key', 'api_key_invalid')
  }

  if (data.status !== 'active') {
    await recordSecurityEvent({
      companyId: String(data.company_id),
      eventType: 'integration.api_key_rejected',
      severity: 'attention',
      message: 'Integration API key rejected (revoked)',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { keyId: data.id, reason: 'revoked', requiredScope },
      evaluateAlerts: false,
    }).catch(() => undefined)
    throw new HttpError(401, 'API key has been revoked', 'api_key_revoked')
  }

  if (data.expires_at && Date.parse(String(data.expires_at)) < Date.now()) {
    await recordSecurityEvent({
      companyId: String(data.company_id),
      eventType: 'integration.api_key_rejected',
      severity: 'attention',
      message: 'Integration API key rejected (expired)',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { keyId: data.id, reason: 'expired', requiredScope },
      evaluateAlerts: false,
    }).catch(() => undefined)
    throw new HttpError(401, 'API key has expired', 'api_key_expired')
  }

  const scopes = Array.isArray(data.scopes) ? data.scopes.map(String) : []
  if (!scopes.includes(requiredScope)) {
    await recordSecurityEvent({
      companyId: String(data.company_id),
      eventType: 'integration.api_key_scope_denied',
      severity: 'attention',
      message: `Integration API key missing scope ${requiredScope}`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { keyId: data.id, scopes, requiredScope },
      evaluateAlerts: false,
    }).catch(() => undefined)
    throw new HttpError(403, `API key lacks scope ${requiredScope}`, 'api_key_scope_denied')
  }

  await admin
    .from('integration_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined)
    .catch(() => undefined)

  return {
    keyId: String(data.id),
    companyId: String(data.company_id),
    name: String(data.name),
    keyPrefix: String(data.key_prefix),
    scopes,
  }
}
