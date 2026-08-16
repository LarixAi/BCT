/**
 * Wave 3E-1 — Command Session BFF shared helpers (Pages Functions).
 * Files under functions/_lib are not routed.
 */

export type CommandEnv = {
  COMMAND_API_URL: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  VEYVIO_COMMAND_CANONICAL_HOST?: string
  VEYVIO_COMMAND_ENFORCE_CANONICAL_HOST?: string
  VEYVIO_COMMAND_LOCAL_COOKIE?: string
}

export const COOKIE_ACCESS_HOST = '__Host-veyvio_at'
export const COOKIE_REFRESH_HOST = '__Host-veyvio_rt'
export const COOKIE_ACCESS_LOCAL = 'veyvio_at'
export const COOKIE_REFRESH_LOCAL = 'veyvio_rt'

export function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  })
}

export function apiError(status: number, message: string, code: string) {
  return json({ statusCode: status, code, message }, status)
}

export function localCookieMode(request: Request, env: CommandEnv): boolean {
  const flag = String(env.VEYVIO_COMMAND_LOCAL_COOKIE ?? '').trim().toLowerCase()
  if (flag === '1' || flag === 'true' || flag === 'yes') return true
  const host = new URL(request.url).hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

export function cookieNames(request: Request, env: CommandEnv) {
  if (localCookieMode(request, env)) {
    return { access: COOKIE_ACCESS_LOCAL, refresh: COOKIE_REFRESH_LOCAL }
  }
  return { access: COOKIE_ACCESS_HOST, refresh: COOKIE_REFRESH_HOST }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx <= 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (!key) continue
    out[key] = decodeURIComponent(value)
  }
  return out
}

export function readSessionCookies(request: Request, env: CommandEnv) {
  const names = cookieNames(request, env)
  const cookies = parseCookies(request.headers.get('cookie'))
  return {
    names,
    accessToken: cookies[names.access] || null,
    refreshToken: cookies[names.refresh] || null,
  }
}

function cookiePair(
  name: string,
  value: string,
  options: { maxAge?: number; secure: boolean; httpOnly?: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    options.httpOnly === false ? '' : 'HttpOnly',
    options.secure ? 'Secure' : '',
    'SameSite=Strict',
  ]
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`)
  return parts.filter(Boolean).join('; ')
}

export function buildSessionSetCookies(
  request: Request,
  env: CommandEnv,
  tokens: { accessToken: string; refreshToken: string },
): string[] {
  const names = cookieNames(request, env)
  const secure = !localCookieMode(request, env)
  // Access ~1h; refresh ~30d — values are still HttpOnly; expiry is defense in depth.
  return [
    cookiePair(names.access, tokens.accessToken, { maxAge: 60 * 60, secure }),
    cookiePair(names.refresh, tokens.refreshToken, { maxAge: 60 * 60 * 24 * 30, secure }),
  ]
}

export function buildSessionClearCookies(request: Request, env: CommandEnv): string[] {
  const names = cookieNames(request, env)
  const secure = !localCookieMode(request, env)
  return [
    cookiePair(names.access, '', { maxAge: 0, secure }),
    cookiePair(names.refresh, '', { maxAge: 0, secure }),
  ]
}

export function withSetCookies(response: Response, setCookies: string[]): Response {
  const headers = new Headers(response.headers)
  for (const cookie of setCookies) headers.append('Set-Cookie', cookie)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/** Remove reusable credentials from JSON returned to the SPA. */
export function stripAuthCredentials(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body
  const source = body as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    const lower = key.toLowerCase()
    if (
      lower === 'accesstoken' ||
      lower === 'refreshtoken' ||
      lower === 'access_token' ||
      lower === 'refresh_token'
    ) {
      continue
    }
    out[key] = value
  }
  return out
}

export function extractTokens(body: unknown): { accessToken: string | null; refreshToken: string | null } {
  if (!body || typeof body !== 'object') return { accessToken: null, refreshToken: null }
  const row = body as Record<string, unknown>
  const accessToken = String(row.accessToken ?? row.access_token ?? '').trim() || null
  const refreshToken = String(row.refreshToken ?? row.refresh_token ?? '').trim() || null
  return { accessToken, refreshToken }
}

export function assessSameOriginMutation(request: Request): {
  allowed: boolean
  code: string
  message: string
} {
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return { allowed: true, code: 'allowed', message: 'Safe method' }
  }

  const url = new URL(request.url)
  const origin = request.headers.get('origin')
  if (!origin || origin !== url.origin) {
    return {
      allowed: false,
      code: 'origin_check_failed',
      message: 'The request origin could not be verified.',
    }
  }

  const site = request.headers.get('sec-fetch-site')
  if (site && !['same-origin', 'none'].includes(site)) {
    return {
      allowed: false,
      code: 'sec_fetch_site_rejected',
      message: 'Cross-site state-changing requests are not allowed.',
    }
  }

  return { allowed: true, code: 'allowed', message: 'Same-origin mutation checks passed.' }
}

export function canonicalHost(env: CommandEnv): string {
  return String(env.VEYVIO_COMMAND_CANONICAL_HOST ?? 'command.veyvio.co.uk').trim().toLowerCase()
}

export function enforceCanonicalHost(request: Request, env: CommandEnv): Response | null {
  const flag = String(env.VEYVIO_COMMAND_ENFORCE_CANONICAL_HOST ?? '').trim().toLowerCase()
  if (!(flag === '1' || flag === 'true' || flag === 'yes')) return null
  if (localCookieMode(request, env)) return null

  const host = new URL(request.url).hostname.toLowerCase()
  const expected = canonicalHost(env)
  if (host === expected) return null

  return apiError(
    403,
    `Production Command sessions are only created on ${expected}.`,
    'canonical_host_required',
  )
}

export function requireEnv(env: CommandEnv): Response | null {
  if (!env.COMMAND_API_URL || !env.SUPABASE_ANON_KEY) {
    return apiError(500, 'Command session BFF is not configured', 'bff_misconfigured')
  }
  return null
}

export function commandApiBase(env: CommandEnv): string {
  return String(env.COMMAND_API_URL).replace(/\/$/, '')
}

export async function upstreamCommand(
  env: CommandEnv,
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<Response> {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = `${commandApiBase(env)}/api${normalized}`
  const headers = new Headers(init.headers)
  headers.set('apikey', env.SUPABASE_ANON_KEY)
  const bearer = init.accessToken || env.SUPABASE_ANON_KEY
  headers.set('Authorization', `Bearer ${bearer}`)
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const { accessToken: _a, ...rest } = init
  return fetch(url, { ...rest, headers })
}

export async function refreshWithSupabase(
  env: CommandEnv,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '')
  if (!supabaseUrl) return null

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string; refresh_token?: string }
  if (!data.access_token || !data.refresh_token) return null
  return { accessToken: data.access_token, refreshToken: data.refresh_token }
}

export async function revokeSupabaseSession(env: CommandEnv, accessToken: string | null) {
  if (!accessToken) return
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '')
  if (!supabaseUrl) return
  await fetch(`${supabaseUrl}/auth/v1/logout`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  }).catch(() => undefined)
}
