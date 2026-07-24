import { describe, expect, it } from "vitest";
import { mapYardHubToBootstrap } from "@/platform/api/map-yard-hub";
import type { YardHubResponse } from "@/platform/auth/command-auth-api";

function minimalHub(overrides: Partial<YardHubResponse> = {}): YardHubResponse {
  return {
    depotId: "depot-1",
    depotName: "Main Depot",
    vehicles: [
      {
        vehicleId: "v-live-1",
        registrationNumber: "WX21 FYV",
        vehicleCategory: "minibus",
        bay: "Bay 1",
        readinessState: "ready_for_service",
        lastUpdatedAt: "2026-07-24T08:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("mapYardHubToBootstrap body condition", () => {
  it("hydrates inspections and damage records from hub bodyCondition", () => {
    const hub = minimalHub({
      bodyCondition: {
        inspections: [
          {
            id: "insp-1",
            vehicleId: "v-live-1",
            inspectionType: "routine",
            sourceApp: "yard",
            status: "approved",
            startedBy: "Yard",
            startedAt: "2026-07-24T07:00:00Z",
          },
        ],
        damageRecords: [
          {
            id: "dmg-1",
            vehicleId: "v-live-1",
            zoneId: "front_bumper",
            damageType: "scuff",
            severity: "cosmetic",
            status: "under-review",
            origin: "discovered_yard_check",
            title: "Scuff — front bumper",
            firstObservedAt: "2026-07-24T07:05:00Z",
            firstObservationId: "obs-1",
            lastConfirmedAt: "2026-07-24T07:05:00Z",
          },
        ],
        damageObservations: [],
        inspectionMedia: [],
      },
    });

    const bootstrap = mapYardHubToBootstrap(hub, "co-1", "depot-1", "yard_manager");
    expect(bootstrap.inspections).toHaveLength(1);
    expect(bootstrap.inspections[0]?.id).toBe("insp-1");
    expect(bootstrap.damageRecords).toHaveLength(1);
    expect(bootstrap.damageRecords[0]?.zoneId).toBe("front_bumper");
  });

  it("merges bodywork driver reports when no hub observations", () => {
    const hub = minimalHub({
      bodyworkReports: [
        {
          id: "bw-1",
          vehicleId: "v-live-1",
          description: "Scratch on nearside",
          severity: "major",
          reportedAt: "2026-07-24T06:00:00Z",
          zone: "nearside_panel",
        },
      ],
    });

    const bootstrap = mapYardHubToBootstrap(hub, "co-1", "depot-1", "yard_operative");
    expect(bootstrap.damageObservations.length).toBeGreaterThanOrEqual(1);
    expect(bootstrap.damageObservations[0]?.description).toContain("Scratch");
  });
});
