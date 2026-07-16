import type { VehicleChecksHome, VehicleCheckSession } from "@/types/vehicle-check";
import { VEHICLE_CHECK_TEMPLATE_VERSION } from "@/domain/vehicle-check/check-template";

export function buildMockVehicleChecksHome(
  overrides?: Partial<VehicleChecksHome>,
): VehicleChecksHome {
  return {
    vehicle: {
      vehicleId: "veh_lk23",
      registration: "LK23 ABC",
      fleetNumber: "042",
      make: "Mercedes-Benz",
      model: "Sprinter",
      vehicleType: "Accessible minibus",
      depotName: "Willesden Depot",
      mileage: 48216,
      fuelOrChargeLevel: "68%",
      accessibilityCapable: true,
      gateStatus: "awaiting_check",
    },
    dutyId: "duty_1",
    dutyReference: "DUTY-1042",
    dutyLabel: "School AM 1042",
    vehicleAssignmentId: "asgn_school_am",
    knownIssues: {
      cosmeticDamageCount: 1,
      openSafetyDefectCount: 0,
      bodyworkRecords: [
        {
          id: "def_1",
          zone: "rear_nearside_panel",
          label:
            "Accepted defect DEF-1: Rear nearside bodywork scratch — cosmetic (Yard supervisor, 10 Jul 2026)",
          recordedAt: "2026-07-10",
        },
      ],
    },
    primaryActionLabel: "Start vehicle check",
    primaryActionHref: "/checks/verify",
    reportDefectAlwaysAvailable: true,
    ...overrides,
  };
}

export function buildInProgressChecksHome(): VehicleChecksHome {
  return buildMockVehicleChecksHome({
    vehicle: {
      ...buildMockVehicleChecksHome().vehicle,
      gateStatus: "check_in_progress",
    },
    activeCheckId: "vc_session_1",
    primaryActionLabel: "Continue check",
    primaryActionHref: "/checks/walkaround",
  });
}

export function buildReadyChecksHome(): VehicleChecksHome {
  return buildMockVehicleChecksHome({
    vehicle: {
      ...buildMockVehicleChecksHome().vehicle,
      gateStatus: "ready_for_service",
      lastCompletedCheck: {
        id: "vc_done_1",
        reference: "VC-20260712-10482",
        completedAt: "06:32",
        result: "nil_defects",
        odometer: 48216,
      },
    },
    primaryActionLabel: "View completed check",
    primaryActionHref: "/checks/result",
  });
}

export function buildHeldChecksHome(): VehicleChecksHome {
  return buildMockVehicleChecksHome({
    vehicle: {
      ...buildMockVehicleChecksHome().vehicle,
      gateStatus: "vehicle_held",
      vorRestrictions: ["Rear passenger-side tyre damage reported"],
    },
    primaryActionLabel: "Contact Operations",
    primaryActionHref: "/checks/result",
  });
}

export function createCheckSession(home: VehicleChecksHome): VehicleCheckSession {
  return {
    id: `vc_${Date.now()}`,
    vehicleId: home.vehicle.vehicleId,
    dutyId: home.dutyId,
    vehicleAssignmentId: home.vehicleAssignmentId,
    templateVersion: VEHICLE_CHECK_TEMPLATE_VERSION,
    phase: "verification",
    verified: false,
    dashboardPhotoTaken: false,
    startedAt: new Date().toISOString(),
    itemResults: {},
    defects: [],
    syncStatus: "synced",
  };
}

export function buildDemoCheckSession(home: VehicleChecksHome): VehicleCheckSession {
  return {
    ...createCheckSession(home),
    id: "vc_session_1",
    phase: "walkaround",
    verified: true,
    odometer: home.vehicle.mileage,
    fuelLevel: home.vehicle.fuelOrChargeLevel,
    dashboardPhotoTaken: true,
    itemResults: {
      cab_mirrors: { itemId: "cab_mirrors", result: "pass", recordedAt: new Date().toISOString() },
      cab_wipers: { itemId: "cab_wipers", result: "pass", recordedAt: new Date().toISOString() },
      cab_warnings: { itemId: "cab_warnings", result: "pass", recordedAt: new Date().toISOString() },
    },
  };
}
