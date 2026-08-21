import {
  apiError,
  assessSameOriginMutation,
  buildSessionClearCookies,
  buildSessionSetCookies,
  commandApiBase,
  readSessionCookies,
  refreshWithSupabase,
  requireEnv,
  withSetCookies,
  type CommandEnv,
} from '../../_lib/session'

/**
 * Same-origin Command API proxy.
 * SPA calls /api/command/<path> → upstream COMMAND_API_URL/api/<path>
 * Bearer is attached from HttpOnly cookies only.
 */
export const onRequest: any = async (context) => {
  const envCheck = requireEnv(context.env)
  if (envCheck) return envCheck

  const method = context.request.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = assessSameOriginMutation(context.request)
    if (!csrf.allowed) return apiError(403, csrf.message, csrf.code)
  }

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  const parts = context.params.path
  const suffix = Array.isArray(parts) ? parts.join('/') : String(parts || '')
  const incoming = new URL(context.request.url)
  const upstreamPath = `/${suffix}${incoming.search}`

  let session = readSessionCookies(context.request, context.env)
  let setCookies: string[] = []

  const forward = async (accessToken: string | null) => {
    const headers = new Headers()
    // Copy selected request headers; never forward Cookie to Supabase.
    const contentType = context.request.headers.get('content-type')
    if (contentType) headers.set('content-type', contentType)
    const idempotency =
      context.request.headers.get('idempotency-key') ||
      context.request.headers.get('x-idempotency-key')
    if (idempotency) {
      headers.set('idempotency-key', idempotency)
      headers.set('x-idempotency-key', idempotency)
    }
    headers.set('apikey', context.env.SUPABASE_ANON_KEY)
    headers.set(
      'Authorization',
      `Bearer ${accessToken || context.env.SUPABASE_ANON_KEY}`,
    )

    const url = `${commandApiBase(context.env)}/api${upstreamPath.startsWith('/') ? upstreamPath : `/${upstreamPath}`}`
    return fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : context.request.body,
      redirect: 'manual',
    })
  }

  let upstream = await forward(session.accessToken)

  if (upstream.status === 401 && session.refreshToken) {
    const rotated = await refreshWithSupabase(context.env, session.refreshToken)
    if (rotated) {
      setCookies = buildSessionSetCookies(context.request, context.env, rotated)
      session = {
        ...session,
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
      }
      upstream = await forward(rotated.accessToken)
    } else {
      setCookies = buildSessionClearCookies(context.request, context.env)
    }
  }

  const responseHeaders = new Headers()
  const passHeaders = ['content-type', 'cache-control']
  for (const name of passHeaders) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  responseHeaders.set('cache-control', 'no-store')

  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })

  return setCookies.length ? withSetCookies(response, setCookies) : response
}
