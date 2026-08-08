import { describe, expect, it } from "vitest";
import { mapYardHubToBootstrap } from "@/platform/api/map-yard-hub";
import type { YardHubResponse } from "@/platform/auth/command-auth-api";

describe("mapYardHubToBootstrap", () => {
  it("maps hub vehicles onto bootstrap and keeps fixture domains", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "North Bolton",
      shiftLabel: "Day shift",
      vehicles: [
        {
          vehicleId: "veh_1",
          registrationNumber: "AB12 CDE",
          vehicleCategory: "minibus",
          zone: "Yard",
          readinessState: "ready_for_service",
        },
        {
          vehicleId: "veh_2",
          registrationNumber: "XY99 ZZZ",
          vehicleCategory: "coach",
          zone: "Workshop",
          readinessState: "vor",
          exceptionLabels: ["VOR"],
        },
      ],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.companyId).toBe("co_live");
    expect(payload.depotId).toBe("dep_live");
    expect(payload.vehicles).toHaveLength(2);
    expect(payload.vehicles[0].reg).toBe("AB12 CDE");
    expect(payload.vehicles[0].status).toBe("Available");
    expect(payload.vehicles[0].fuelPct).toBeUndefined();
    expect(payload.vehicles[1].status).toBe("VOR");
    expect(payload.tasks).toEqual([]);
    expect(payload.bays.length).toBeGreaterThan(0);
    // F-03: no invented yard layout when hub omits yardLayout.
    expect(payload.yardMapEnabled).toBe(false);
    expect(payload.yardLayout).toBeNull();
    expect(payload.equipment).toEqual({});
  });

  it("maps durable equipmentByVehicle from hub without inventing kit", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "Wembley",
      vehicles: [
        {
          vehicleId: "veh_1",
          registrationNumber: "AB12 CDE",
          vehicleCategory: "minibus",
          zone: "Yard",
          readinessState: "ready_for_service",
        },
      ],
      equipmentByVehicle: {
        veh_1: {
          fixed: [],
          assigned: [
            {
              id: "eq-1",
              defId: "equipment",
              label: "Wheelchair Strap",
              status: "present",
              assignedAt: "2026-08-08T10:00:00.000Z",
              assignedBy: "Yard lead",
              qrCode: "WCS-014",
            },
          ],
          consumables: [],
          documents: [],
        },
      },
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.equipment.veh_1?.assigned).toHaveLength(1);
    expect(payload.equipment.veh_1?.assigned[0]?.label).toBe("Wheelchair Strap");
    expect(payload.equipment.veh_2).toBeUndefined();
  });

  it("maps driver check sections from hub top-level sections field", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "Wembley",
      vehicles: [
        {
          vehicleId: "veh_1",
          registrationNumber: "YX25 VEY",
          vehicleCategory: "minibus",
          zone: "Yard",
          readinessState: "ready_for_service",
        },
      ],
      vehicleChecks: [
        {
          id: "chk_1",
          vehicleId: "veh_1",
          registrationNumber: "YX25 VEY",
          driverName: "Larone Laing",
          checkType: "start_of_day",
          result: "pass",
          startedAt: "2026-07-19T08:19:00Z",
          submittedAt: "2026-07-19T08:24:00Z",
          odometer: 500,
          checklist: { checkType: "start_of_day", responses: [] },
          sections: [
            { id: "item-1", section: "Exterior", question: "Tyres and wheels", answer: "Yes / Pass" },
            { id: "item-2", section: "Interior", question: "Seat belts", answer: "No / Fail", notes: "Rear row frayed" },
            { id: "item-3", section: "Cab", question: "Mirrors", answer: "Not applicable" },
          ],
        },
      ],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.yardChecks).toHaveLength(1);
    expect(payload.yardChecks[0].sections).toHaveLength(3);
    expect(payload.yardChecks[0].sections[0]).toMatchObject({
      sectionId: "item-1",
      title: "Tyres and wheels",
      outcome: "passed",
    });
    expect(payload.yardChecks[0].sections[1]).toMatchObject({
      sectionId: "item-2",
      title: "Seat belts",
      outcome: "defect",
      note: "Rear row frayed",
    });
    expect(payload.yardChecks[0].sections[2].outcome).toBe("na");
  });

  it("falls back to checklist.responses when hub sections are absent", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "Wembley",
      vehicles: [
        {
          vehicleId: "veh_1",
          registrationNumber: "YX25 VEY",
          vehicleCategory: "minibus",
          zone: "Yard",
          readinessState: "ready_for_service",
        },
      ],
      vehicleChecks: [
        {
          id: "chk_2",
          vehicleId: "veh_1",
          checkType: "start_of_day",
          result: "pass",
          submittedAt: "2026-07-19T08:24:00Z",
          checklist: {
            checkType: "start_of_day",
            responses: [
              {
                itemId: "lights",
                questionTitle: "Lights working",
                responseStatus: "pass",
              },
              {
                itemId: "brakes",
                questionTitle: "Brake test",
                responseStatus: "fail",
                driverNote: "Soft pedal",
              },
            ],
          },
        },
      ],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.yardChecks[0].sections).toHaveLength(2);
    expect(payload.yardChecks[0].sections[0].outcome).toBe("passed");
    expect(payload.yardChecks[0].sections[1]).toMatchObject({
      outcome: "defect",
      note: "Soft pedal",
    });
  });

  it("maps driver check evidence from hub evidence array and odometer photo", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "Wembley",
      vehicles: [
        {
          vehicleId: "veh_1",
          registrationNumber: "YX25 VEY",
          vehicleCategory: "minibus",
          zone: "Yard",
          readinessState: "ready_for_service",
        },
      ],
      vehicleChecks: [
        {
          id: "chk_3",
          vehicleId: "veh_1",
          driverName: "Larone Laing",
          checkType: "driver_pre_use",
          result: "pass",
          submittedAt: "2026-07-19T08:24:00Z",
          odometer: 500,
          checklist: { checkType: "start_of_day", responses: [] },
          sections: [],
          evidence: [
            {
              id: "odometer",
              kind: "odometer",
              label: "Odometer 0500",
              url: "data:image/jpeg;base64,AAA",
            },
            {
              id: "signature",
              kind: "signature",
              label: "Driver declaration signature",
              url: "data:image/png;base64,BBB",
            },
          ],
        },
      ],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.yardChecks[0].evidence).toHaveLength(2);
    expect(payload.yardChecks[0].evidence?.[0]).toMatchObject({
      kind: "odometer",
      label: "Odometer 0500",
      imageDataUrl: "data:image/jpeg;base64,AAA",
    });
    expect(payload.yardChecks[0].evidence?.[1]).toMatchObject({
      kind: "signature",
      label: "Driver declaration signature",
    });
  });

  it("maps hub tasks with defectId parsed from instructions", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "Wembley",
      vehicles: [],
      tasks: [
        {
          id: "task-uuid-1",
          depotId: "dep_live",
          vehicleId: "veh_1",
          registrationNumber: "AB12 CDE",
          taskType: "inspect_damage",
          title: "Inspect driver-reported damage",
          priority: "important",
          status: "open",
          instructions: "Driver-reported defect DEF-1 (a1b2c3d4-e5f6-4789-a012-3456789abcde). Mirror cracked",
          createdAt: "2026-07-24T10:00:00.000Z",
          createdBy: "Driver app",
        },
      ],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.tasks[0]?.defectId).toBe("a1b2c3d4-e5f6-4789-a012-3456789abcde");
    expect(payload.tasks[0]?.id).toBe("task-uuid-1");
  });

  it("prefers server hub permissions over client role defaults", () => {
    const hub: YardHubResponse = {
      depotId: "dep_live",
      depotName: "North Bolton",
      roleKey: "yard_operative",
      permissions: ["vehicle.view", "vehicle.move", "check.complete"],
      vehicles: [],
    };

    const payload = mapYardHubToBootstrap(hub, "co_live", "dep_live", "yard_manager");
    expect(payload.permissions).toEqual(["vehicle.view", "vehicle.move", "check.complete"]);
    expect(payload.permissions).not.toContain("vehicle.mark_vor");
  });
});
