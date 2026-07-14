import { describe, expect, it } from "vitest";
import {
  countVehiclesNeedingAttention,
  homeOperationalHeadline,
  homeSubtitle,
} from "@/copy/yard-messages";
import type { Vehicle } from "@/types/yard";

const vehicle = (id: string, status: Vehicle["status"]): Vehicle =>
  ({
    id,
    reg: `REG${id}`,
    status,
    bayId: "B1",
    fleetNumber: id,
    type: "PSV",
    make: "Test",
    model: "Bus",
    year: 2024,
    fuelType: "Diesel",
    wheelchairAccessible: true,
    lastCheckAt: null,
    nextCheckDueAt: null,
    conditionProfileId: null,
  }) as Vehicle;

describe("yard-messages", () => {
  it("counts vehicles needing attention before service", () => {
    const vehicles = [
      vehicle("1", "Available"),
      vehicle("2", "VOR"),
      vehicle("3", "Awaiting Check"),
      vehicle("4", "On Departure Line"),
    ];
    const trips = [{ vehicleId: "4", ready: false }];
    expect(countVehiclesNeedingAttention(vehicles, trips)).toBe(3);
  });

  it("dedupes blocked departure vehicles also counted as VOR", () => {
    const vehicles = [vehicle("1", "VOR")];
    const trips = [{ vehicleId: "1", ready: false }];
    expect(countVehiclesNeedingAttention(vehicles, trips)).toBe(1);
  });

  it("formats operational home headline", () => {
    expect(homeOperationalHeadline(0)).toBe("All vehicles accounted for");
    expect(homeOperationalHeadline(1)).toBe("One vehicle needs attention before service");
    expect(homeOperationalHeadline(3)).toBe("3 vehicles need attention before service");
  });

  it("formats home subtitle from context", () => {
    expect(homeSubtitle(0, 0)).toContain("at a glance");
    expect(homeSubtitle(2, 0)).toContain("blockers");
    expect(homeSubtitle(0, 2)).toContain("reviews and tasks");
  });
});
