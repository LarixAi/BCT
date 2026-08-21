import {
  apiError,
  assessSameOriginMutation,
  buildSessionSetCookies,
  enforceCanonicalHost,
  extractTokens,
  json,
  requireEnv,
  stripAuthCredentials,
  upstreamCommand,
  withSetCookies,
  type CommandEnv,
} from '../../_lib/session'

/** MFA confirm — mirrors command-api /auth/login/confirm */
export const onRequestPost: any = async (context) => {
  const envCheck = requireEnv(context.env)
  if (envCheck) return envCheck

  const hostDenied = enforceCanonicalHost(context.request, context.env)
  if (hostDenied) return hostDenied

  const csrf = assessSameOriginMutation(context.request)
  if (!csrf.allowed) return apiError(403, csrf.message, csrf.code)

  const bodyText = await context.request.text()
  const upstream = await upstreamCommand(context.env, '/auth/login/confirm', {
    method: 'POST',
    body: bodyText,
  })

  const raw = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    return json(raw ?? { message: 'MFA verification failed' }, upstream.status)
  }

  const tokens = extractTokens(raw)
  const sanitized = stripAuthCredentials(raw)
  const response = json(sanitized, upstream.status)

  if (!tokens.accessToken || !tokens.refreshToken) {
    return response
  }

  return withSetCookies(
    response,
    buildSessionSetCookies(context.request, context.env, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
  )
}
