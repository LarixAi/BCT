import {
  apiError,
  assessSameOriginMutation,
  buildSessionClearCookies,
  json,
  readSessionCookies,
  requireEnv,
  revokeSupabaseSession,
  withSetCookies,
  type CommandEnv,
} from '../../_lib/session'

export const onRequestPost: any = async (context) => {
  const envCheck = requireEnv(context.env)
  if (envCheck) return envCheck

  const csrf = assessSameOriginMutation(context.request)
  if (!csrf.allowed) return apiError(403, csrf.message, csrf.code)

  const session = readSessionCookies(context.request, context.env)
  await revokeSupabaseSession(context.env, session.accessToken)

  return withSetCookies(
    json({ ok: true }),
    buildSessionClearCookies(context.request, context.env),
  )
}
