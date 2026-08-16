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

export const onRequestPost: any = async (context) => {
  const envCheck = requireEnv(context.env)
  if (envCheck) return envCheck

  const hostDenied = enforceCanonicalHost(context.request, context.env)
  if (hostDenied) return hostDenied

  const csrf = assessSameOriginMutation(context.request)
  if (!csrf.allowed) return apiError(403, csrf.message, csrf.code)

  const bodyText = await context.request.text()
  const upstream = await upstreamCommand(context.env, '/auth/login', {
    method: 'POST',
    body: bodyText,
  })

  const raw = await upstream.json().catch(() => null)
  if (!upstream.ok) {
    return json(raw ?? { message: 'Sign-in failed' }, upstream.status)
  }

  const tokens = extractTokens(raw)
  const sanitized = stripAuthCredentials(raw)
  const response = json(sanitized, upstream.status)

  // MFA pending: no session cookies yet — challenge is the credential.
  const requiresMfa =
    Boolean((raw as { requiresMfaChallenge?: boolean } | null)?.requiresMfaChallenge)

  if (requiresMfa || !tokens.accessToken || !tokens.refreshToken) {
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
