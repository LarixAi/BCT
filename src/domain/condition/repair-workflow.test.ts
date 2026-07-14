import { describe, expect, it } from "vitest";
import {
  activeRepairOrdersForVehicle,
  canCompleteRepair,
  canStartRepair,
  canVerifyRepair,
  damageStatusAfterVerification,
  ordersAwaitingVerification,
} from "@/domain/condition/repair-workflow";
import type { RepairWorkOrder } from "@/types/condition";

const orders: RepairWorkOrder[] = [
  { id: "r1", vehicleId: "v1", status: "in_progress", description: "A", requestedAt: "", requestedBy: "" },
  { id: "r2", vehicleId: "v1", status: "awaiting_verification", description: "B", requestedAt: "", requestedBy: "", completedAt: "2026-01-02" },
  { id: "r3", vehicleId: "v1", status: "completed", description: "C", requestedAt: "", requestedBy: "" },
];

describe("repair-workflow", () => {
  it("lists active orders excluding completed", () => {
    expect(activeRepairOrdersForVehicle(orders, "v1")).toHaveLength(2);
  });

  it("finds orders awaiting verification", () => {
    expect(ordersAwaitingVerification(orders)).toHaveLength(1);
    expect(ordersAwaitingVerification(orders)[0]?.id).toBe("r2");
  });

  it("gates repair lifecycle transitions", () => {
    expect(canStartRepair({ ...orders[0], status: "open" })).toBe(true);
    expect(canCompleteRepair(orders[0])).toBe(true);
    expect(canVerifyRepair(orders[1])).toBe(true);
    expect(canVerifyRepair(orders[0])).toBe(false);
  });

  it("maps verification outcome to damage status", () => {
    expect(damageStatusAfterVerification(true)).toBe("repaired");
    expect(damageStatusAfterVerification(false)).toBe("repair_required");
  });
});
