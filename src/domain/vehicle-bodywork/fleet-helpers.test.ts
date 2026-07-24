import { describe, expect, it } from "vitest";
import {
  fleetBodyworkMetrics,
  formatFleetNumber,
  isOpenDamageRecord,
  summarizeVehicleBodywork,
  vehicleMatchesDamageFilter,
} from "@/domain/vehicle-bodywork/fleet-helpers";
import type { DamageRecord } from "@/types/condition";
import type { Vehicle } from "@/types/yard";

const vehicle: Vehicle = {
  id: "bct-v3",
  reg: "AB12 CDE",
  type: "Minibus",
  bayId: "BAY-03",
  status: "Available",
};

const damage: DamageRecord = {
  id: "dmg1",
  vehicleId: "bct-v3",
  zoneId: "ns-rear-quarter",
  damageType: "dent",
  severity: "cosmetic",
  status: "awaiting_review",
  origin: "discovered_yard_check",
  title: "Nearside rear dent",
  firstObservedAt: "2026-07-18T08:00:00Z",
  firstObservationId: "obs1",
  lastConfirmedAt: "2026-07-18T08:00:00Z",
};

describe("fleet-helpers", () => {
  it("counts fleet bodywork metrics from open damage", () => {
    const metrics = fleetBodyworkMetrics([vehicle], [damage]);
    expect(metrics.vehiclesWithDamage).toBe(1);
    expect(metrics.openReports).toBe(1);
    expect(metrics.awaitingAssessment).toBe(1);
  });

  it("summarises vehicle bodywork from records and inspections", () => {
    const summary = summarizeVehicleBodywork("bct-v3", [damage], []);
    expect(summary.openDamageCount).toBe(1);
    expect(summary.hasNoKnownDamage).toBe(false);
  });

  it("filters vehicles with no known damage", () => {
    const summary = summarizeVehicleBodywork("bct-v3", [], []);
    expect(
      vehicleMatchesDamageFilter(summary, vehicle, [], "no_damage"),
    ).toBe(true);
    expect(
      vehicleMatchesDamageFilter(summary, vehicle, [damage], "damage_recorded"),
    ).toBe(false);
  });

  it("formats fleet number from vehicle id", () => {
    expect(formatFleetNumber("bct-v3")).toBe("003");
    expect(formatFleetNumber("bct-v42")).toBe("042");
  });

  it("treats awaiting review as open damage", () => {
    expect(isOpenDamageRecord(damage)).toBe(true);
  });
});
