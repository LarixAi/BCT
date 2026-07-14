import { describe, expect, it } from "vitest";
import {
  computeEvidenceSimilarityHint,
  findDuplicateDamageCandidates,
} from "@/domain/condition/evidence-similarity";
import type { DamageObservation, DamageRecord } from "@/types/condition";

const records: DamageRecord[] = [{
  id: "dmg1",
  vehicleId: "v3",
  zoneId: "ns-rear-quarter",
  damageType: "scratch",
  severity: "cosmetic",
  status: "monitoring",
  origin: "existing_at_onboarding",
  title: "Scratch",
  firstObservedAt: "2026-01-01",
  firstObservationId: "o1",
  lastConfirmedAt: "2026-07-01",
}];

describe("evidence-similarity", () => {
  it("suggests existing unchanged for same zone and type", () => {
    const hint = computeEvidenceSimilarityHint({
      vehicleId: "v3",
      zoneId: "ns-rear-quarter",
      damageType: "scratch",
      observedAt: "2026-07-11T00:00:00Z",
      damageRecords: records,
    });
    expect(hint.suggestedClassification).toBe("existing_unchanged");
    expect(hint.score).toBeGreaterThan(60);
    expect(hint.matchedDamageId).toBe("dmg1");
  });

  it("suggests worsened when description indicates deterioration", () => {
    const hint = computeEvidenceSimilarityHint({
      vehicleId: "v3",
      zoneId: "ns-rear-quarter",
      damageType: "scratch",
      observedAt: "2026-07-11T00:00:00Z",
      description: "Scratch has spread along the panel",
      damageRecords: records,
    });
    expect(hint.suggestedClassification).toBe("existing_worsened");
  });

  it("flags duplicate candidates for driver reports overlapping records", () => {
    const obs: DamageObservation = {
      id: "o2",
      vehicleId: "v3",
      inspectionId: "i1",
      zoneId: "ns-rear-quarter",
      reportSource: "driver_report",
      reportedBy: "Driver",
      observedAt: "",
      classification: "new_not_reported",
      damageType: "scratch",
      mediaIds: [],
    };
    const dupes = findDuplicateDamageCandidates(obs, records);
    expect(dupes).toHaveLength(1);
    const hint = computeEvidenceSimilarityHint({
      vehicleId: "v3",
      zoneId: "ns-rear-quarter",
      damageType: "scratch",
      observedAt: "2026-07-11",
      reportSource: "driver_report",
      damageRecords: records,
    });
    expect(hint.duplicateCandidate).toBe(true);
  });
});
