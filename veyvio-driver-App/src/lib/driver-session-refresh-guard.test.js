import { describe, expect, it } from "vitest"
import { OFFLINE_RECOVERY_ROUTE } from "@/lib/driver-offline-recovery"
import {
  isLiveOperationalSession,
  resolveRefreshedSession,
} from "@/lib/driver-session-refresh-guard"

const DRIVER = { id: "9222e9a2-ff63-405b-b6ed-67bf3c12d3c3", fullName: "Larone Laing" }

const liveSession = {
  userId: "ef4c1895-f51b-4b77-8254-8d68f72980b9",
  organisationId: "8c9d9333-cdac-4210-a3d5-f55d3f05895c",
  membershipId: "93c9a4c5-ae18-47c3-8944-0886718709d9",
  routeTarget: "app",
  driver: DRIVER,
}

const recoveryContext = {
  userId: liveSession.userId,
  routeTarget: OFFLINE_RECOVERY_ROUTE,
  recoveryOnly: true,
  driver: DRIVER,
  recovery: { pendingChecks: 0, walkarounds: [] },
}

const reachabilityError = {
  userId: liveSession.userId,
  routeTarget: "session_error",
  driver: null,
  linkError: "Could not reach Command. Check your connection and try again.",
}

describe("driver session refresh guard", () => {
  it("keeps a live session when an offline resume resolves to the recovery shell", () => {
    const result = resolveRefreshedSession(recoveryContext, liveSession)
    expect(result.keptPrior).toBe(true)
    expect(result.session).toBe(liveSession)
    expect(result.session.routeTarget).toBe("app")
  })

  it("keeps a live session when Command is unreachable", () => {
    const result = resolveRefreshedSession(reachabilityError, liveSession)
    expect(result.keptPrior).toBe(true)
    expect(result.session).toBe(liveSession)
  })

  it("falls back to the recovery shell on cold start with no working session", () => {
    const result = resolveRefreshedSession(recoveryContext, null)
    expect(result.keptPrior).toBe(false)
    expect(result.session).toBe(recoveryContext)
  })

  it("leaves the recovery shell once a live session is resolved again", () => {
    const result = resolveRefreshedSession(liveSession, recoveryContext)
    expect(result.keptPrior).toBe(false)
    expect(result.session.routeTarget).toBe("app")
  })

  it("does not treat the recovery shell itself as a live operational session", () => {
    expect(isLiveOperationalSession(recoveryContext)).toBe(false)
    expect(isLiveOperationalSession(liveSession)).toBe(true)
    expect(isLiveOperationalSession({ routeTarget: "app", driver: null })).toBe(false)
  })

  it("still applies real access decisions over a live session", () => {
    const revoked = { userId: liveSession.userId, routeTarget: "not_driver", driver: null }
    const restricted = { ...liveSession, routeTarget: "restricted" }
    expect(resolveRefreshedSession(revoked, liveSession).session).toBe(revoked)
    expect(resolveRefreshedSession(restricted, liveSession).session).toBe(restricted)
  })
})
