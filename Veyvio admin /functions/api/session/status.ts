import {
  buildSessionClearCookies,
  buildSessionSetCookies,
  json,
  readSessionCookies,
  refreshWithSupabase,
  requireEnv,
  upstreamCommand,
  withSetCookies,
  type CommandEnv,
} from '../../_lib/session'

export const onRequestGet: any = async (context) => {
  const envCheck = requireEnv(context.env)
  if (envCheck) return envCheck

  let session = readSessionCookies(context.request, context.env)
  let setCookies: string[] = []

  if (!session.accessToken && session.refreshToken) {
    const rotated = await refreshWithSupabase(context.env, session.refreshToken)
    if (!rotated) {
      return withSetCookies(
        json({ authenticated: false, hasTenant: false }),
        buildSessionClearCookies(context.request, context.env),
      )
    }
    setCookies = buildSessionSetCookies(context.request, context.env, rotated)
    session = {
      ...session,
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    }
  }

  if (!session.accessToken) {
    return json({ authenticated: false, hasTenant: false })
  }

  const meRes = await upstreamCommand(context.env, '/auth/me', {
    method: 'GET',
    accessToken: session.accessToken,
  })

  if (meRes.status === 401 && session.refreshToken) {
    const rotated = await refreshWithSupabase(context.env, session.refreshToken)
    if (!rotated) {
      return withSetCookies(
        json({ authenticated: false, hasTenant: false }),
        buildSessionClearCookies(context.request, context.env),
      )
    }
    setCookies = buildSessionSetCookies(context.request, context.env, rotated)
    const retry = await upstreamCommand(context.env, '/auth/me', {
      method: 'GET',
      accessToken: rotated.accessToken,
    })
    if (!retry.ok) {
      return withSetCookies(json({ authenticated: true, hasTenant: false }), setCookies)
    }
    const me = (await retry.json().catch(() => null)) as { activeTenantId?: string } | null
    return withSetCookies(
      json({
        authenticated: true,
        hasTenant: Boolean(me?.activeTenantId),
      }),
      setCookies,
    )
  }

  if (!meRes.ok) {
    const body = json({ authenticated: Boolean(session.accessToken), hasTenant: false })
    return setCookies.length ? withSetCookies(body, setCookies) : body
  }

  const me = (await meRes.json().catch(() => null)) as { activeTenantId?: string } | null
  const body = json({
    authenticated: true,
    hasTenant: Boolean(me?.activeTenantId),
  })
  return setCookies.length ? withSetCookies(body, setCookies) : body
}
