import { beforeEach, describe, expect, it } from "vitest";
import { buildBootstrapPayload } from "@/data/mocks/bootstrap";
import { applyBootstrapToYard } from "@/platform/yard/hydrate-yard-store";
import { usePermissionStore } from "@/platform/permissions/permission-store";
import { useYard } from "@/store/yard";

describe("applyBootstrapToYard", () => {
  beforeEach(() => {
    usePermissionStore.getState().reset();
  });

  it("hydrates yard state and permissions from bootstrap payload", () => {
    const payload = buildBootstrapPayload("co_northwest", "dep_b3", "yard_manager");
    applyBootstrapToYard(payload);

    const yard = useYard.getState();
    expect(yard.bays).toEqual(payload.bays);
    expect(yard.vehicles).toEqual(payload.vehicles);
    expect(yard.equipment).toEqual(payload.equipment);

    expect(usePermissionStore.getState().can("vehicle.mark_vor")).toBe(true);
    expect(usePermissionStore.getState().can("equipment.write_off")).toBe(false);
  });
});
