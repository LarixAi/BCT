import type { DutyDetail } from "@/types/duty";
import type { TripStop } from "@/types/trips";
import type { VehicleChecksHome } from "@/types/vehicle-check";
import { getDriverEligibilityDecision, eligibilityGateCopy } from "@/domain/duty/driver-eligibility";

export interface JourneyReadinessItem {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  blocker?: boolean;
}

export interface JourneyReadinessResult {
  items: JourneyReadinessItem[];
  blocked: boolean;
  blockTitle?: string;
  blockDetail?: string;
}

export function buildJourneyReadiness(
  duty: DutyDetail,
  checksHome?: VehicleChecksHome,
): JourneyReadinessResult {
  const walkaroundPassed =
    (duty.vehicleCheck.status === "cleared" || duty.vehicleCheck.status === "submitted") &&
    duty.vehicleCheck.canStartDuty &&
    (!duty.vehicle ||
      !duty.vehicleCheck.vehicleId ||
      duty.vehicleCheck.vehicleId === duty.vehicle.id);

  const clockedIn = Boolean(duty.clockedInAt);
  const vehicleAssigned = Boolean(duty.vehicle);
  const eligibility = eligibilityGateCopy(getDriverEligibilityDecision());
  const compliancePassed = eligibility.allowsWork;
  const noSafetyDefects =
    !duty.vehicle?.vorStatus &&
    !duty.vehicleCheck.pendingManagerAdvice &&
    (duty.vehicleCheck.canStartDuty || walkaroundPassed);

  const walkaroundItem: JourneyReadinessItem = {
    id: "walkaround",
    label: "Pre-use walkaround",
    detail: walkaroundPassed
      ? checksHome?.vehicle.lastCompletedCheck
        ? `Completed ${checksHome.vehicle.lastCompletedCheck.completedAt} · Signed off for ${duty.vehicle?.registrationNumber ?? "vehicle"}`
        : `Completed · Signed off for ${duty.vehicle?.registrationNumber ?? "vehicle"}`
      : duty.vehicleCheck.status === "in_progress"
        ? "In progress · Finish remaining sections"
        : "Not completed · Open Checks for this assigned vehicle",
    passed: walkaroundPassed,
    blocker: !walkaroundPassed,
  };

  const clockInItem: JourneyReadinessItem = {
    id: "clock_in",
    label: "Duty clock-in",
    detail: clockedIn
      ? "Fit-for-duty declared · Clocked in"
      : "Not clocked in · Complete clock-in on the Duty Hub first",
    passed: clockedIn,
    blocker: !clockedIn,
  };

  const items: JourneyReadinessItem[] = [
    walkaroundItem,
    clockInItem,
    {
      id: "vehicle",
      label: "Vehicle assigned",
      detail: duty.vehicle
        ? `${duty.vehicle.registrationNumber} · ${duty.reportingLocation}`
        : "No vehicle assigned",
      passed: vehicleAssigned,
    },
    {
      id: "compliance",
      label: "Driver eligibility",
      detail: eligibility.detail,
      passed: compliancePassed,
      blocker: !compliancePassed,
    },
    {
      id: "defects",
      label: "Open defects",
      detail: noSafetyDefects
        ? "No safety-critical defects open"
        : "Safety-critical defect requires yard review",
      passed: noSafetyDefects,
      blocker: !noSafetyDefects,
    },
  ];

  const blocked = items.some((item) => item.blocker && !item.passed);

  return {
    items,
    blocked,
    blockTitle: !compliancePassed
      ? "Driver not eligible for this duty"
      : !clockedIn
        ? "Clock into the duty first"
        : !walkaroundPassed
          ? "Pre-use walkaround incomplete"
          : !noSafetyDefects
            ? "Vehicle cannot enter service"
            : undefined,
    blockDetail: !compliancePassed
      ? (eligibility.blockReason ?? eligibility.detail)
      : !clockedIn
        ? "Journey start cannot clock you in. Return to the Duty Hub and complete fit-for-duty clock-in."
        : !walkaroundPassed
          ? `${duty.vehicle?.registrationNumber ?? "This vehicle"} cannot enter service until its own walkaround is signed off.`
          : !noSafetyDefects
            ? "Contact operations before opening this journey."
            : undefined,
  };
}

export function dutyStopsToTripStops(duty: DutyDetail): TripStop[] {
  const run = duty.runs[0];
  if (!run) return [];

  return run.stops.map((stop, index) => {
    const hasPickup = stop.passengerTasks.some((t) => t.type === "pickup");
    const hasDropoff = stop.passengerTasks.some((t) => t.type === "dropoff");
    let type: TripStop["type"] = "pickup";
    if (index === 0 || (!hasPickup && !hasDropoff)) type = "depot";
    else if (hasDropoff && !hasPickup) type = "dropoff";

    return {
      id: stop.id,
      order: stop.stopOrder,
      name: stop.name,
      address: stop.address,
      plannedTime: stop.plannedArrival,
      status:
        stop.status === "completed"
          ? "completed"
          : stop.status === "arrived" || stop.status === "in_progress"
            ? "arrived"
            : "pending",
      type,
    };
  });
}

export function firstPickupStop(duty: DutyDetail) {
  const run = duty.runs[0];
  if (!run) return null;
  return run.stops.find((s) => s.passengerTasks.some((t) => t.type === "pickup")) ?? run.stops[1] ?? null;
}
