import { describe, expect, it } from "vitest";
import {
  optionsFromBootstrap,
  previewWalkaroundSessionFromBootstrap,
} from "@/services/vehicle-check.service";

const bootstrap = {
  operator: { depotName: "Ridgeway" },
  duties: [
    {
      id: "duty-1",
      routeName: "AM School",
      dutyDate: "2026-07-19",
      vehicle: {
        id: "veh-1",
        registrationNumber: "AB12 CDE",
        make: "Ford",
        model: "Transit",
        vehicleType: "minibus",
        seatingCapacity: 16,
        wheelchairCapacity: 0,
        mileage: 12000,
        vorStatus: false,
      },
    },
  ],
  legacy: {
    homeSummary: {
      vehicleAssignment: {
        vehicleId: "veh-1",
        registration: "AB12 CDE",
        checkStatus: "required",
        roadworthinessStatus: "roadworthy",
      },
    },
  },
};

describe("walkaround bootstrap fast path", () => {
  it("builds options from duties without network", () => {
    const options = optionsFromBootstrap(bootstrap);
    expect(options).toHaveLength(1);
    expect(options[0].vehicle.registration).toBe("AB12 CDE");
  });

  it("previews a confirmable walkaround session synchronously", () => {
    const session = previewWalkaroundSessionFromBootstrap(
      { id: "driver-1" },
      bootstrap,
      { checkType: "daily" },
    );
    expect(session?.ok).toBe(true);
    expect(session.vehicle.registration).toBe("AB12 CDE");
    expect(session.checklist.items.length).toBeGreaterThan(0);
    expect(session.safety.checkRequired).toBe(true);
  });
});
