import {
  apiError,
  assessSameOriginMutation,
  type CommandEnv,
} from '../_lib/session'

type MiddlewareContext = {
  request: Request
  env: CommandEnv
  next: () => Promise<Response>
}

/**
 * CSRF gate for all /api/* session and command routes.
 * Canonical host is enforced on session-mutating handlers.
 */
export const onRequest = async (context: MiddlewareContext) => {
  const csrf = assessSameOriginMutation(context.request)
  if (!csrf.allowed) {
    return apiError(403, csrf.message, csrf.code)
  }

  return context.next()
}
