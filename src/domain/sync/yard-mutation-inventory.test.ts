import { describe, expect, it } from "vitest";
import type { OutboxMutationType } from "@/types/sync";
import { MUTATION_LABELS } from "@/domain/sync/mutation-labels";
import {
  assertYardMutationCommandSupported,
  commandSupportedYardMutationTypes,
  UnsupportedYardMutationError,
  YARD_MUTATION_INVENTORY,
} from "@/domain/sync/yard-mutation-inventory";

const ALL_OUTBOX_TYPES: OutboxMutationType[] = [
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
];

describe("yard-mutation-inventory", () => {
  it("covers every OutboxMutationType exactly once", () => {
    const inventoryTypes = YARD_MUTATION_INVENTORY.map((e) => e.type);
    expect(inventoryTypes).toHaveLength(ALL_OUTBOX_TYPES.length);
    expect(new Set(inventoryTypes).size).toBe(ALL_OUTBOX_TYPES.length);
    for (const type of ALL_OUTBOX_TYPES) {
      expect(inventoryTypes).toContain(type);
    }
  });

  it("every inventory type has an operational label", () => {
    for (const entry of YARD_MUTATION_INVENTORY) {
      expect(MUTATION_LABELS[entry.type]).toBeTruthy();
    }
  });

  it("all mutation types are Command-supported after TD-009 handlers", () => {
    expect(commandSupportedYardMutationTypes()).toHaveLength(ALL_OUTBOX_TYPES.length);
    for (const type of ALL_OUTBOX_TYPES) {
      expect(() => assertYardMutationCommandSupported(type)).not.toThrow();
    }
  });

  it("throws UnsupportedYardMutationError for unknown types", () => {
    expect(() => assertYardMutationCommandSupported("unknown.type" as OutboxMutationType)).toThrow(
      UnsupportedYardMutationError,
    );
  });
});
