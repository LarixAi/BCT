import { describe, expect, it } from "vitest";
import { buildConditionAnalytics } from "@/domain/condition/condition-analytics";
import * as cfx from "@/data/condition-fixtures";
import * as fx from "@/data/fixtures";

describe("condition-analytics", () => {
  it("aggregates depot condition metrics", () => {
    const stats = buildConditionAnalytics({
      vehicles: fx.vehicles,
      damageRecords: cfx.damageRecords,
      observations: cfx.damageObservations,
      reviews: cfx.damageReviews,
      repairOrders: cfx.repairWorkOrders,
      profiles: cfx.conditionProfiles,
      inspections: cfx.inspections,
    });
    expect(stats.openDamageCount).toBeGreaterThan(0);
    expect(stats.pendingReviewCount).toBeGreaterThan(0);
    expect(stats.riskAlerts.length).toBeGreaterThan(0);
  });
});
