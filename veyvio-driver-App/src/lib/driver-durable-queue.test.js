import { describe, expect, it } from "vitest";
import { classifyLegacyQueueItem, dedupeQueueItems } from "@/lib/driver-durable-queue";

describe("legacy queue provenance", () => {
  const proof = {
    driverId: "drv-1",
    companyId: "co-a",
    membershipId: "mem-1",
    userId: "user-1",
    driverBelongsToCompany: true,
    membershipBelongsToUserAndCompany: true,
    legacyQueueDriverId: "drv-1",
  };

  it("adopts unscoped items only for the proven driver", () => {
    expect(classifyLegacyQueueItem({ id: "a", driverId: "drv-1" }, proof)).toBe("adopt");
    expect(classifyLegacyQueueItem({ id: "b", driverId: "drv-other" }, proof)).toBe("quarantine");
  });

  it("does not stamp a foreign tenant onto the current workspace", () => {
    expect(
      classifyLegacyQueueItem({ id: "c", companyId: "co-b", membershipId: "mem-2" }, proof),
    ).toBe("quarantine");
  });

  it("dedupes merged scoped and legacy identities", () => {
    expect(
      dedupeQueueItems([
        { id: "1", payload: { clientId: "same" } },
        { id: "2", idempotencyKey: "same" },
      ]),
    ).toHaveLength(1);
  });
});
