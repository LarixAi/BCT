import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  closeDurableConnection,
  durableGet,
  durablePut,
  installMemoryIndexedDbForTests,
  resetMemoryIndexedDbForTests,
} from "@/lib/driver-durable-kv"
import { ITEM_PENDING, QUEUE_WALKAROUND, putQueueItem } from "@/lib/driver-durable-queue"
import {
  closeWalkaroundMediaConnection,
  persistWalkaroundMediaDataUrl,
} from "@/lib/walkaround-media-outbox"
import * as vehicleCheck from "@/services/vehicle-check.service"
import {
  RECOVERY_CONTEXT_KEY,
  RECOVERY_CONTEXT_MAX_AGE_MS,
  buildOfflineRecoverySession,
  clearVerifiedRecoveryContext,
  recoveryContextContainsCredentials,
  saveVerifiedRecoveryContext,
} from "@/lib/driver-offline-recovery"

const USER = "ef4c1895-f51b-4b77-8254-8d68f72980b9"
const COMPANY = "8c9d9333-cdac-4210-a3d5-f55d3f05895c"
const MEMBERSHIP = "93c9a4c5-ae18-47c3-8944-0886718709d9"
const DRIVER = "9222e9a2-ff63-405b-b6ed-67bf3c12d3c3"
const OTHER_USER = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

const liveSession = {
  userId: USER,
  organisationId: COMPANY,
  membershipId: MEMBERSHIP,
  driverId: DRIVER,
  organisationName: "veyvio Fleet LTD",
  accountStatus: "active",
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.live",
  refreshToken: "refresh-secret-value",
  driver: { id: DRIVER, fullName: "Larone Laing", organisationName: "veyvio Fleet LTD" },
}

describe("offline recovery context", () => {
  beforeEach(() => {
    installMemoryIndexedDbForTests()
    vi.spyOn(vehicleCheck, "flushPendingWalkaroundSubmissions")
  })

  afterEach(() => {
    closeWalkaroundMediaConnection()
    closeDurableConnection()
    resetMemoryIndexedDbForTests()
    vi.restoreAllMocks()
  })

  it("saves a sanitized verified recovery context from a live Command session", async () => {
    const saved = await saveVerifiedRecoveryContext(liveSession)
    expect(saved.ok).toBe(true)
    const stored = await durableGet(RECOVERY_CONTEXT_KEY)
    expect(stored.found).toBe(true)
    expect(stored.value.userId).toBe(USER)
    expect(stored.value.companyId).toBe(COMPANY)
    expect(stored.value.membershipId).toBe(MEMBERSHIP)
    expect(stored.value.driverId).toBe(DRIVER)
    expect(stored.value.displayName).toBe("Larone Laing")
  })

  it("stores no credentials or tokens in the recovery context", async () => {
    const saved = await saveVerifiedRecoveryContext(liveSession)
    expect(recoveryContextContainsCredentials(saved.context)).toBe(false)
    const stored = await durableGet(RECOVERY_CONTEXT_KEY)
    expect(JSON.stringify(stored.value)).not.toMatch(/accessToken|refreshToken|eyJ|password|secret/i)
  })

  it("enters OFFLINE_RECOVERY after a simulated restart when Command is unreachable", async () => {
    await saveVerifiedRecoveryContext(liveSession)
    closeDurableConnection()
    const recovered = await buildOfflineRecoverySession(USER)
    expect(recovered.ok).toBe(true)
    expect(recovered.session.routeTarget).toBe("offline_recovery")
    expect(recovered.session.recoveryOnly).toBe(true)
    expect(recovered.session.accessToken).toBeUndefined()
  })

  it("shows an existing PENDING walkaround in OFFLINE_RECOVERY", async () => {
    await saveVerifiedRecoveryContext(liveSession)
    const odo = await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,b2Rv",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      kind: "odometer",
      clientCheckId: "chk-recovery-1",
    })
    const sig = await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,c2ln",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      kind: "signature",
      clientCheckId: "chk-recovery-1",
    })
    await putQueueItem({
      id: "chk-recovery-1",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      driverId: DRIVER,
      queueType: QUEUE_WALKAROUND,
      status: ITEM_PENDING,
      idempotencyKey: "chk-recovery-1",
      payload: {
        clientCheckId: "chk-recovery-1",
        mediaRefs: [odo, sig],
        odometerPhotoMediaRef: odo,
        driverSignatureMediaRef: sig,
      },
    })
    const recovered = await buildOfflineRecoverySession(USER)
    expect(recovered.session.recovery.pendingChecks).toBe(1)
    expect(recovered.session.recovery.walkarounds[0].clientCheckId).toBe("chk-recovery-1")
    expect(recovered.session.recovery.walkarounds[0].status).toBe("PENDING")
  })

  it("confirms both media records exist for the pending walkaround", async () => {
    await saveVerifiedRecoveryContext(liveSession)
    const odo = await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,b2Rv",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      kind: "odometer",
    })
    const sig = await persistWalkaroundMediaDataUrl({
      dataUrl: "data:image/jpeg;base64,c2ln",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      kind: "signature",
    })
    await putQueueItem({
      id: "chk-recovery-2",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      driverId: DRIVER,
      queueType: QUEUE_WALKAROUND,
      status: ITEM_PENDING,
      idempotencyKey: "chk-recovery-2",
      payload: {
        clientCheckId: "chk-recovery-2",
        mediaRefs: [odo, sig],
        odometerPhotoMediaRef: odo,
        driverSignatureMediaRef: sig,
      },
    })
    const recovered = await buildOfflineRecoverySession(USER)
    const row = recovered.session.recovery.walkarounds[0]
    expect(row.odometerPresent).toBe(true)
    expect(row.signaturePresent).toBe(true)
    expect(row.mediaPresentCount).toBe(2)
  })

  it("denies recovery when the restored Supabase user does not match", async () => {
    await saveVerifiedRecoveryContext(liveSession)
    const recovered = await buildOfflineRecoverySession(OTHER_USER)
    expect(recovered.ok).toBe(false)
    expect(recovered.reason).toBe("user_mismatch")
  })

  it("denies recovery when membership is missing or malformed", async () => {
    await durablePut(RECOVERY_CONTEXT_KEY, {
      version: 1,
      userId: USER,
      companyId: COMPANY,
      membershipId: USER,
      driverId: DRIVER,
      verifiedAt: new Date().toISOString(),
      displayName: "Larone",
      organisationName: "veyvio Fleet LTD",
      accountStatusLabel: "active",
    })
    expect((await buildOfflineRecoverySession(USER)).reason).toBe("malformed_membership")

    await durablePut(RECOVERY_CONTEXT_KEY, {
      version: 1,
      userId: USER,
      companyId: COMPANY,
      membershipId: "",
      driverId: DRIVER,
      verifiedAt: new Date().toISOString(),
      displayName: "Larone",
      organisationName: "veyvio Fleet LTD",
      accountStatusLabel: "active",
    })
    expect((await buildOfflineRecoverySession(USER)).reason).toBe("malformed_membership")
  })

  it("removes the recovery context on sign-out", async () => {
    await saveVerifiedRecoveryContext(liveSession)
    await clearVerifiedRecoveryContext()
    expect((await durableGet(RECOVERY_CONTEXT_KEY)).found).toBe(false)
    expect((await buildOfflineRecoverySession(USER)).ok).toBe(false)
  })

  it("does not auto-replay or flush queued mutations when recovery mode opens", async () => {
    await saveVerifiedRecoveryContext(liveSession)
    await putQueueItem({
      id: "chk-no-flush",
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      driverId: DRIVER,
      queueType: QUEUE_WALKAROUND,
      status: ITEM_PENDING,
      idempotencyKey: "chk-no-flush",
      payload: { clientCheckId: "chk-no-flush", mediaRefs: [] },
    })
    await buildOfflineRecoverySession(USER)
    expect(vehicleCheck.flushPendingWalkaroundSubmissions).not.toHaveBeenCalled()
    const again = await buildOfflineRecoverySession(USER)
    expect(again.session.recovery.pendingChecks).toBe(1)
  })

  it("replaces the cached recovery context when a live Command session succeeds", async () => {
    await saveVerifiedRecoveryContext(liveSession, new Date("2026-08-01T10:00:00.000Z"))
    const first = (await durableGet(RECOVERY_CONTEXT_KEY)).value
    const next = await saveVerifiedRecoveryContext(
      { ...liveSession, driver: { ...liveSession.driver, fullName: "Larone Laing" } },
      new Date("2026-08-16T10:00:00.000Z"),
    )
    expect(next.ok).toBe(true)
    expect(next.context.verifiedAt).toBe("2026-08-16T10:00:00.000Z")
    expect(next.context.verifiedAt).not.toBe(first.verifiedAt)
    const recovered = await buildOfflineRecoverySession(USER, new Date("2026-08-16T10:01:00.000Z"))
    expect(recovered.ok).toBe(true)
    expect(recovered.session.routeTarget).toBe("offline_recovery")
  })

  it("rejects a recovery context older than the validity window", async () => {
    await saveVerifiedRecoveryContext(liveSession, new Date("2026-01-01T00:00:00.000Z"))
    const recovered = await buildOfflineRecoverySession(
      USER,
      new Date(Date.parse("2026-01-01T00:00:00.000Z") + RECOVERY_CONTEXT_MAX_AGE_MS + 1),
    )
    expect(recovered.ok).toBe(false)
    expect(recovered.reason).toBe("expired")
  })
})
