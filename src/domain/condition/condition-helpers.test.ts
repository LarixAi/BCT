import { describe, expect, it } from "vitest";
import { pendingDamageReviews, openDamageForVehicle } from "@/domain/condition/condition-helpers";
import type { DamageObservation, DamageRecord, DamageReview } from "@/types/condition";

describe("condition-helpers", () => {
  it("lists open damage excluding repaired", () => {
    const records: DamageRecord[] = [
      { id: "d1", vehicleId: "v1", zoneId: "z", damageType: "scratch", severity: "cosmetic", status: "monitoring", origin: "discovered_yard_check", title: "A", firstObservedAt: "", firstObservationId: "o1", lastConfirmedAt: "" },
      { id: "d2", vehicleId: "v1", zoneId: "z", damageType: "dent", severity: "cosmetic", status: "repaired", origin: "discovered_yard_check", title: "B", firstObservedAt: "", firstObservationId: "o2", lastConfirmedAt: "" },
    ];
    expect(openDamageForVehicle(records, "v1")).toHaveLength(1);
  });

  it("finds pending damage reviews", () => {
    const obs: DamageObservation[] = [{
      id: "o1", vehicleId: "v1", inspectionId: "i1", zoneId: "z", reportSource: "driver_report",
      reportedBy: "Driver", observedAt: "2026-01-01T00:00:00Z", classification: "new_not_reported", mediaIds: [],
    }];
    expect(pendingDamageReviews(obs, [])).toHaveLength(1);
    const reviews: DamageReview[] = [{ id: "r1", observationId: "o1", reviewedBy: "M", reviewedAt: "", decision: "new_not_reported" }];
    expect(pendingDamageReviews(obs, reviews)).toHaveLength(0);
  });
});
