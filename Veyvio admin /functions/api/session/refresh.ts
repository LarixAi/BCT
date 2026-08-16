import {
  apiError,
  assessSameOriginMutation,
  buildSessionClearCookies,
  buildSessionSetCookies,
  enforceCanonicalHost,
  json,
  readSessionCookies,
  refreshWithSupabase,
  requireEnv,
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
    return withSetCookies(
      apiError(401, 'Session expired — sign in again', 'session_expired'),
      buildSessionClearCookies(context.request, context.env),
    )
  }

  const rotated = await refreshWithSupabase(context.env, session.refreshToken)
  if (!rotated) {
    return withSetCookies(
      apiError(401, 'Session expired — sign in again', 'session_expired'),
      buildSessionClearCookies(context.request, context.env),
    )
  }

  return withSetCookies(
    json({ ok: true }),
    buildSessionSetCookies(context.request, context.env, rotated),
  )
}
