import type { CheckOutcome, VehicleCheckSession, VehicleChecksHome } from "@/types/vehicle-check";
import type { DutyDetail } from "@/types/duty";
import { useDriverStore } from "@/store/driver";
import { buildVehicleReadiness, readinessCoversVehicle } from "@veyvio/ops";
import { toOpsCheckOutcome } from "@/domain/vehicle-check/check-outcomes";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";

function compactReg(value: string | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function vehiclesMatch(a: { vehicleId?: string; registration?: string }, b: {
  vehicleId?: string;
  registration?: string;
}): boolean {
  if (a.vehicleId && b.vehicleId && a.vehicleId === b.vehicleId) return true;
  const ra = compactReg(a.registration);
  const rb = compactReg(b.registration);
  return Boolean(ra && rb && ra === rb);
}

/**
 * After walkaround submit: project onto duty + home, then enqueue command.
 * Also used to reconcile when Checks already shows released but home/duty lagged.
 */
export function applyCheckSubmissionToDriverState(
  outcome: CheckOutcome,
  checksHome: VehicleChecksHome,
  session: VehicleCheckSession,
  options?: { enqueueCommand?: boolean },
) {
  const enqueueCommand = options?.enqueueCommand !== false;
  const driver = useDriverStore.getState();
  const home = driver.homeSummary;
  const hasDefect = session.defects.length > 0;
  const hasSafety = session.defects.some((d) => d.severity === "safety_critical");
  const hasAcceptedOnly =
    hasDefect && !hasSafety && session.defects.every((d) => d.severity === "cosmetic");
  const opsOutcome =
    outcome === "nil_defects" && hasAcceptedOnly
      ? ("RELEASED_WITH_ACCEPTED_DEFECTS" as const)
      : toOpsCheckOutcome(outcome);
  const cleared =
    opsOutcome === "RELEASED_NO_DEFECTS" || opsOutcome === "RELEASED_WITH_ACCEPTED_DEFECTS";

  const readiness = buildVehicleReadiness({
    vehicleId: session.vehicleId || checksHome.vehicle.vehicleId,
    assignmentId:
      session.vehicleAssignmentId ||
      checksHome.vehicleAssignmentId ||
      home.vehicleAssignment?.assignmentId ||
      `asgn_${checksHome.dutyId}`,
    checkSessionId: session.id,
    outcome: opsOutcome,
  });

  const duty = driver.getDuty(checksHome.dutyId);
  if (duty) {
    const sameVehicle = vehiclesMatch(
      { vehicleId: duty.vehicle?.id, registration: duty.vehicle?.registrationNumber },
      { vehicleId: readiness.vehicleId, registration: checksHome.vehicle.registration },
    );
    const covers = readinessCoversVehicle(
      readiness,
      duty.vehicle?.id ?? "",
      // Prefer the check's assignment id so a legacy duty assignmentId cannot block release
      readiness.assignmentId,
    );

    if (sameVehicle || covers || duty.id === checksHome.dutyId) {
      const updatedDuty: DutyDetail = {
        ...duty,
        vehicleVerified: true,
        vehicleCheck: {
          ...duty.vehicleCheck,
          status: cleared ? "cleared" : hasSafety || hasDefect ? "awaiting_decision" : "submitted",
          canStartDuty: cleared,
          pendingManagerAdvice: hasDefect && !hasSafety,
          checklist: duty.vehicleCheck.checklist,
          vehicleId: readiness.vehicleId,
          assignmentId: readiness.assignmentId,
          checkSessionId: readiness.checkSessionId,
        },
      };
      driver.updateDutyDetail(updatedDuty);
      if (enqueueCommand) {
        void dispatchOperationalCommand({
          type: "vehicle.check.submit",
          payload: {
            dutyId: duty.id,
            vehicleId: readiness.vehicleId,
            assignmentId: readiness.assignmentId,
            checkSessionId: readiness.checkSessionId,
            hasDefect,
            outcome: opsOutcome,
            checklist: session.itemResults
              ? Object.fromEntries(
                  Object.entries(session.itemResults).map(([id, row]) => [id, row.result]),
                )
              : undefined,
          },
          idempotencyKey: `vehicle.check.${readiness.checkSessionId}`,
        });
      }
    }
  }

  const homeVehicleMatches = home.vehicleAssignment
    ? vehiclesMatch(home.vehicleAssignment, {
        vehicleId: readiness.vehicleId,
        registration: checksHome.vehicle.registration,
      })
    : false;

  // Always clear "check required" when this submitted check covers the assigned vehicle
  useDriverStore.setState({
    homeSummary: {
      ...home,
      operationalState:
        cleared && (homeVehicleMatches || !home.vehicleAssignment)
          ? home.nextTrip
            ? "journey_assigned"
            : "ready_for_work"
          : hasSafety && homeVehicleMatches
            ? "operationally_blocked"
            : home.operationalState === "vehicle_check_required" && cleared
              ? home.nextTrip
                ? "journey_assigned"
                : "ready_for_work"
              : home.operationalState,
      blockReason:
        hasSafety && homeVehicleMatches
          ? "Vehicle held — safety-critical defect reported"
          : cleared
            ? undefined
            : home.blockReason,
      requiredActions:
        cleared
          ? home.requiredActions.filter((action) => action.id !== "ra_check")
          : home.requiredActions,
      vehicleAssignment: home.vehicleAssignment
        ? {
            ...home.vehicleAssignment,
            checkStatus: cleared
              ? "passed"
              : hasDefect
                ? "failed"
                : home.vehicleAssignment.checkStatus === "required"
                  ? "in_progress"
                  : home.vehicleAssignment.checkStatus,
            assignmentId: readiness.assignmentId || home.vehicleAssignment.assignmentId,
            checkSessionId: readiness.checkSessionId,
            openDefectCount: hasDefect
              ? Math.max(home.vehicleAssignment.openDefectCount, session.defects.length)
              : home.vehicleAssignment.openDefectCount,
          }
        : undefined,
    },
  });
}

/**
 * If Checks already shows released/complete but Duties/home still require a check,
 * project the released state without re-enqueueing the same command.
 */
export function reconcileReleasedCheckToDriver(
  checksHome: VehicleChecksHome,
  session: VehicleCheckSession | null,
): boolean {
  const gate = checksHome.vehicle.gateStatus;
  const released = gate === "ready_for_service" || gate === "returned_to_service";
  const sessionCleared = session?.phase === "submitted" && session.outcome === "nil_defects";
  if (!released && !sessionCleared) return false;

  const driver = useDriverStore.getState();
  const home = driver.homeSummary;
  const duty = driver.getDuty(checksHome.dutyId);
  const stripStillOn =
    home.operationalState === "vehicle_check_required" ||
    home.vehicleAssignment?.checkStatus === "required" ||
    home.vehicleAssignment?.checkStatus === "in_progress";
  const dutyStillNeedsCheck = duty
    ? !(duty.vehicleCheck.status === "cleared" && duty.vehicleCheck.canStartDuty)
    : false;

  if (!stripStillOn && !dutyStillNeedsCheck) return false;

  const syntheticSession: VehicleCheckSession =
    session && session.outcome
      ? session
      : {
          id: checksHome.vehicle.lastCompletedCheck?.id ?? `vc_reconcile_${checksHome.dutyId}`,
          vehicleId: checksHome.vehicle.vehicleId,
          dutyId: checksHome.dutyId,
          vehicleAssignmentId: checksHome.vehicleAssignmentId,
          templateVersion: "reconcile",
          phase: "submitted",
          verified: true,
          dashboardPhotoTaken: true,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          itemResults: {},
          defects: [],
          syncStatus: "synced",
          outcome: "nil_defects",
          checkReference: checksHome.vehicle.lastCompletedCheck?.reference,
          odometer: checksHome.vehicle.lastCompletedCheck?.odometer ?? checksHome.vehicle.mileage,
          fuelLevel: checksHome.vehicle.fuelOrChargeLevel,
        };

  applyCheckSubmissionToDriverState("nil_defects", checksHome, syntheticSession, {
    enqueueCommand: false,
  });
  return true;
}
