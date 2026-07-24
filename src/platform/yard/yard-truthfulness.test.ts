import { describe, expect, it } from "vitest";
import { createEmptyYardCoreState } from "@/platform/yard/empty-yard-state";
import { useYard } from "@/store/yard";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";

describe("yard store truthfulness", () => {
  it("starts empty before bootstrap", () => {
    useYard.getState().resetToEmpty();
    expect(useYard.getState().vehicles).toEqual([]);
    expect(useYard.getState().hydrated).toBe(false);
  });

  it("clears operational data on reset", () => {
    useYard.getState().hydrateFromBootstrap(buildBootstrapPayload("co_bct", "dep_bct_main"));
    expect(useYard.getState().vehicles.length).toBeGreaterThan(0);
    useYard.getState().resetToEmpty();
    expect(useYard.getState().vehicles).toEqual([]);
    expect(useYard.getState().hydrated).toBe(false);
  });

  it("empty core state has no fixture fleet", () => {
    const empty = createEmptyYardCoreState();
    expect(empty.vehicles).toEqual([]);
    expect(empty.trips).toEqual([]);
    expect(empty.dataSource).toBeNull();
  });
});
