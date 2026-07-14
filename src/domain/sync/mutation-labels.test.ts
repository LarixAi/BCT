import { describe, expect, it } from "vitest";
import { mutationLabel, MUTATION_LABELS } from "@/domain/sync/mutation-labels";

describe("mutation-labels", () => {
  it("covers all outbox mutation types with operational labels", () => {
    expect(Object.keys(MUTATION_LABELS).length).toBeGreaterThanOrEqual(20);
    expect(mutationLabel("vehicle.move")).toBe("Vehicle moved");
    expect(mutationLabel("damage.review")).toBe("Damage reviewed");
  });

  it("falls back for unknown types", () => {
    expect(mutationLabel("unknown.type")).toBe("unknown type");
  });
});
