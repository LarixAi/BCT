import { describe, expect, it } from "vitest";
import {
  documentStatusUi,
  operationalStatusLabel,
  operationalStatusTone,
  resolveAssignedVehicleId,
} from "@/lib/vehicle-readiness";

describe("vehicle-readiness", () => {
  it("resolves assigned vehicle id from duty or legacy bootstrap", () => {
    expect(
      resolveAssignedVehicleId(
        {
          duties: [{ vehicle: { id: "veh-duty" } }],
          legacy: { homeSummary: { vehicleAssignment: { vehicleId: "veh-legacy" } } },
        },
        null,
      ),
    ).toBe("veh-duty");
    expect(
      resolveAssignedVehicleId(
        { legacy: { homeSummary: { vehicleAssignment: { vehicleId: "veh-legacy" } } } },
        null,
      ),
    ).toBe("veh-legacy");
  });

  it("maps operational status to driver-facing labels and tones", () => {
    expect(operationalStatusLabel("vor")).toBe("VOR");
    expect(operationalStatusTone("vor")).toBe("blocked");
    expect(operationalStatusTone("available")).toBe("good");
  });

  it("maps document compliance status for hub rows", () => {
    expect(documentStatusUi("valid").tone).toBe("good");
    expect(documentStatusUi("expired").label).toBe("Expired");
  });
});
