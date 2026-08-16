import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  closeDurableConnection,
  installMemoryIndexedDbForTests,
  resetMemoryIndexedDbForTests,
} from "@/lib/driver-durable-kv"
import { ITEM_PENDING, ITEM_RECONCILIATION, QUEUE_WALKAROUND } from "@/lib/driver-durable-queue"
import {
  enqueueWalkaroundSubmission,
  isWalkaroundAutoReplayEligible,
  loadSyncQueue,
  markWalkaroundReconciliation,
  revalidateWalkaroundSubmission,
} from "@/lib/walkaround-sync.storage"
import { listItemsNeedingAttention, reviewAndRetryQueuedItem } from "@/services/driver-sync-status.service"

const DRIVER = "drv-1"
const COMPANY = "co-a"
const MEMBERSHIP = "mem-1"
const OTHER_COMPANY = "co-b"

describe("walkaround review-and-retry revalidation", () => {
  beforeEach(() => {
    installMemoryIndexedDbForTests()
  })

  afterEach(() => {
    closeDurableConnection()
    resetMemoryIndexedDbForTests()
  })

  it("lists a rejected check as needing attention without making it replayable", async () => {
    await enqueueWalkaroundSubmission(
      DRIVER,
      { clientCheckId: "k-1", vehicle: { registration: "YX25 VEY" } },
      COMPANY,
      MEMBERSHIP,
    )
    await markWalkaroundReconciliation(DRIVER, "k-1", COMPANY, MEMBERSHIP, {
      status: 403,
      message: "Command rejected this vehicle check.",
    })

    const listed = await listItemsNeedingAttention(DRIVER, COMPANY, MEMBERSHIP)
    expect(listed).toEqual([
      expect.objectContaining({
        id: "k-1",
        queueType: QUEUE_WALKAROUND,
        label: "Vehicle check · YX25 VEY",
        status: ITEM_RECONCILIATION,
      }),
    ])

    const queued = await loadSyncQueue(DRIVER, COMPANY, MEMBERSHIP)
    expect(queued[0].status).toBe(ITEM_RECONCILIATION)
    expect(isWalkaroundAutoReplayEligible(queued[0])).toBe(false)
    expect(queued[0].revalidatedAt).toBeUndefined()
  })

  it("revalidates only the chosen tenant-scoped item after Review and retry", async () => {
    await enqueueWalkaroundSubmission(DRIVER, { clientCheckId: "k-keep" }, COMPANY, MEMBERSHIP)
    await enqueueWalkaroundSubmission(DRIVER, { clientCheckId: "k-retry" }, COMPANY, MEMBERSHIP)
    await markWalkaroundReconciliation(DRIVER, "k-keep", COMPANY, MEMBERSHIP, { status: 403 })
    await markWalkaroundReconciliation(DRIVER, "k-retry", COMPANY, MEMBERSHIP, { status: 403 })
    await enqueueWalkaroundSubmission(DRIVER, { clientCheckId: "k-other" }, OTHER_COMPANY, MEMBERSHIP)
    await markWalkaroundReconciliation(DRIVER, "k-other", OTHER_COMPANY, MEMBERSHIP, { status: 403 })

    const retried = await reviewAndRetryQueuedItem({
      driverId: DRIVER,
      companyId: COMPANY,
      membershipId: MEMBERSHIP,
      queueType: QUEUE_WALKAROUND,
      itemId: "k-retry",
    })

    expect(retried.status).toBe(ITEM_PENDING)
    expect(retried.revalidatedAt).toEqual(expect.any(String))
    expect(retried.revalidationCount).toBe(1)
    expect(isWalkaroundAutoReplayEligible(retried)).toBe(true)

    const sameWorkspace = await loadSyncQueue(DRIVER, COMPANY, MEMBERSHIP)
    const keep = sameWorkspace.find((item) => item.id === "k-keep")
    expect(keep.status).toBe(ITEM_RECONCILIATION)
    expect(keep.revalidatedAt).toBeUndefined()

    const otherTenant = await loadSyncQueue(DRIVER, OTHER_COMPANY, MEMBERSHIP)
    expect(otherTenant[0].status).toBe(ITEM_RECONCILIATION)
  })

  it("does not treat opening the list as revalidation", async () => {
    await enqueueWalkaroundSubmission(DRIVER, { clientCheckId: "k-1" }, COMPANY, MEMBERSHIP)
    await markWalkaroundReconciliation(DRIVER, "k-1", COMPANY, MEMBERSHIP, { status: 403 })
    await listItemsNeedingAttention(DRIVER, COMPANY, MEMBERSHIP)
    await listItemsNeedingAttention(DRIVER, COMPANY, MEMBERSHIP)
    const queued = await loadSyncQueue(DRIVER, COMPANY, MEMBERSHIP)
    expect(queued[0].status).toBe(ITEM_RECONCILIATION)
    expect(queued[0].revalidationCount ?? 0).toBe(0)
  })
})
