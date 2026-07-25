import { describe, expect, it } from "vitest";
import { mutationLabel, MUTATION_LABELS } from "@/domain/sync/mutation-labels";

describe("mutation-labels", () => {
  it("covers all outbox mutation types with operational labels", () => {
    const types = [
      "vehicle.move",
      "vehicle.mark_vor",
      "vehicle.release_vor",
      "vehicle.adblue_refill",
      "check.complete",
      "defect.create",
      "defect.resolve",
      "equipment.assign",
      "equipment.transfer",
      "equipment.restock",
      "departure.release",
      "departure.complete",
      "plan.acknowledge",
      "task.create",
      "task.update",
      "handover.complete",
      "inspection.start",
      "inspection.media",
      "inspection.complete",
      "inspection.approve",
      "damage.report",
      "damage.review",
      "repair.request",
      "repair.start",
      "repair.complete",
      "repair.verify",
    ] as const;
    expect(Object.keys(MUTATION_LABELS)).toHaveLength(types.length);
    for (const type of types) {
      expect(MUTATION_LABELS[type]).toBeTruthy();
    }
    expect(mutationLabel("vehicle.move")).toBe("Vehicle moved");
    expect(mutationLabel("vehicle.adblue_refill")).toBe("AdBlue refill recorded");
    expect(mutationLabel("departure.complete")).toBe("Vehicle departed for service");
    expect(mutationLabel("damage.review")).toBe("Damage reviewed");
  });

  it("falls back for unknown types", () => {
    expect(mutationLabel("unknown.type")).toBe("unknown type");
  });
});
