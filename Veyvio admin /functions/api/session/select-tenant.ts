import {
  apiError,
  assessSameOriginMutation,
  buildSessionSetCookies,
  enforceCanonicalHost,
  extractTokens,
  json,
  readSessionCookies,
  requireEnv,
  stripAuthCredentials,
  upstreamCommand,
  withSetCookies,
  type CommandEnv,
} from '../../_lib/session'

export const onRequestPost: any = async (context) => {
  const envCheck = requireEnv(context.env)
  if (envCheck) return envCheck

  const hostDenied = enforceCanonicalHost(context.request, context.env)
  if (hostDenied) return hostDenied

  const csrf = assessSameOriginMutation(context.request)
  if (!csrf.allowed) return apiError(403, csrf.message, csrf.code)

  const session = readSessionCookies(context.request, context.env)
  if (!session.refreshToken) {
    return apiError(401, 'Session expired — sign in again', 'session_expired')
  }

  let input: Record<string, unknown> = {}
  try {
    input = (await context.request.json()) as Record<string, unknown>
  } catch {
    return apiError(400, 'Invalid JSON body', 'invalid_body')
  }

  // Never trust a browser-supplied refresh token — use HttpOnly cookie only.
  const upstream = await upstreamCommand(context.env, '/auth/select-tenant', {
    method: 'POST',
    accessToken: session.accessToken,
    body: JSON.stringify({
      tenantId: input.tenantId ?? input.companyId,
      companyId: input.companyId ?? input.tenantId,
      refreshToken: session.refreshToken,
    }),
  })

  const raw = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    return json(raw ?? { message: 'Could not select company' }, upstream.status)
  }

  const tokens = extractTokens(raw)
  const sanitized = stripAuthCredentials(raw)
  const response = json(sanitized, upstream.status)

  if (!tokens.accessToken || !tokens.refreshToken) {
    return apiError(500, 'Company selection did not return a session', 'session_incomplete')
  }

  return withSetCookies(
    response,
    buildSessionSetCookies(context.request, context.env, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
  )
}
