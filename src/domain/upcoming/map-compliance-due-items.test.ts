import { describe, expect, it } from "vitest";
import { mapComplianceDueItemsToUpcoming } from "./map-compliance-due-items";
import type { Vehicle } from "@/types/yard";

const now = new Date("2026-08-08T12:00:00.000Z");

const vehicle: Vehicle = {
  id: "veh-1",
  reg: "SK23 FGH",
  type: "Coach",
  bayId: "A01",
  status: "Available",
};

describe("mapComplianceDueItemsToUpcoming", () => {
  it("maps MOT and retorque from Command rows", () => {
    const items = mapComplianceDueItemsToUpcoming(
      [
        {
          id: "veh-1:mot",
          entityType: "vehicle",
          entityId: "veh-1",
          entityLabel: "SK23 FGH",
          documentType: "MOT",
          expiryDate: "2026-08-09",
          source: "vehicles.mot_expiry",
        },
        {
          id: "veh-1:wheel_retorque",
          entityType: "vehicle",
          entityId: "veh-1",
          documentType: "Wheel re-torque",
          expiryDate: "2026-08-07",
          source: "vehicles.wheel_retorque_due_at",
        },
      ],
      [vehicle],
      now,
    );

    expect(items).toHaveLength(2);
    expect(items.some(i => i.category === "mot")).toBe(true);
    expect(items.some(i => i.category === "wheel_nut_retorque")).toBe(true);
    expect(items.every(i => i.vehicleReg === "SK23 FGH")).toBe(true);
  });

  it("ignores driver licence rows and empty input", () => {
    expect(
      mapComplianceDueItemsToUpcoming(
        [
          {
            id: "d1:licence",
            entityType: "driver",
            entityId: "d1",
            documentType: "Driving licence",
            expiryDate: "2026-08-09",
          },
        ],
        [vehicle],
        now,
      ),
    ).toEqual([]);
    expect(mapComplianceDueItemsToUpcoming([], [vehicle], now)).toEqual([]);
  });
});
