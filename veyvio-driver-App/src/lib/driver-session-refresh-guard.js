import { OFFLINE_RECOVERY_ROUTE } from "@/lib/driver-offline-recovery"

const REACHABILITY_MESSAGE = /timed out|check your connection|could not reach|could not restore/i

const BROKEN_ROUTES = new Set([OFFLINE_RECOVERY_ROUTE, "session_error", "not_driver"])

/** Command was unreachable rather than the driver being signed out or unlinked. */
export function isReachabilitySessionError(ctx) {
  if (!ctx || ctx.routeTarget !== "session_error") return false
  return REACHABILITY_MESSAGE.test(String(ctx.linkError ?? ""))
}

export function isOfflineRecoveryFallback(ctx) {
  return Boolean(ctx && ctx.routeTarget === OFFLINE_RECOVERY_ROUTE)
}

export function isLiveOperationalSession(session) {
  return Boolean(session?.driver && !BROKEN_ROUTES.has(session.routeTarget))
}

/**
 * Decide what a mid-session refresh is allowed to do to the current session.
 *
 * Losing connectivity is not a loss of eligibility: both the timeout path
 * (`session_error`) and the cached-identity path (`offline_recovery`) must leave a
 * working session alone. Swapping either one in unmounts whatever the driver is
 * doing — a walkaround in progress holds its odometer photo in memory until submit,
 * so the demotion destroys evidence the driver already captured.
 */
export function resolveRefreshedSession(ctx, priorSession) {
  if (!isLiveOperationalSession(priorSession)) return { session: ctx, keptPrior: false }
  if (isReachabilitySessionError(ctx) || isOfflineRecoveryFallback(ctx)) {
    return { session: priorSession, keptPrior: true }
  }
  return { session: ctx, keptPrior: false }
}
