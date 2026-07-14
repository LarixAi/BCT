import type { CheckOutcome, VehicleCheckSession, VehicleChecksHome } from "@/types/vehicle-check";
import type { DutyDetail } from "@/types/duty";
import { useDriverStore } from "@/store/driver";
import { buildVehicleReadiness, readinessCoversVehicle } from "@veyvio/ops";
import { toOpsCheckOutcome } from "@/domain/vehicle-check/check-outcomes";
import { dispatchOperationalCommand } from "@/domain/ops/dispatch-operational-command";

/**
 * After walkaround submit: optimistic projection + single command.
 * Does NOT write the mock duty Map — CommandTransport owns that.
 */
export function applyCheckSubmissionToDriverState(
  outcome: CheckOutcome,
  checksHome: VehicleChecksHome,
  session: VehicleCheckSession,
) {
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
    assignmentId: session.vehicleAssignmentId || checksHome.vehicleAssignmentId,
    checkSessionId: session.id,
    outcome: opsOutcome,
  });

  const duty = driver.getDuty(checksHome.dutyId);
  if (duty) {
    const sameVehicle = duty.vehicle?.id === readiness.vehicleId;
    const covers = readinessCoversVehicle(
      readiness,
      duty.vehicle?.id ?? "",
      duty.vehicleCheck.assignmentId ?? checksHome.vehicleAssignmentId,
    );

    if (sameVehicle || covers) {
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
      // Optimistic client projection only
      driver.updateDutyDetail(updatedDuty);
      void dispatchOperationalCommand({
        type: "vehicle.check.submit",
        payload: {
          dutyId: duty.id,
          vehicleId: readiness.vehicleId,
          assignmentId: readiness.assignmentId,
          checkSessionId: readiness.checkSessionId,
          hasDefect,
          outcome: opsOutcome,
        },
        idempotencyKey: `vehicle.check.${readiness.checkSessionId}`,
      });
    }
  }

  const homeVehicleMatches = home.vehicleAssignment?.vehicleId === readiness.vehicleId;

  useDriverStore.setState({
    homeSummary: {
      ...home,
      operationalState:
        cleared && homeVehicleMatches
          ? home.nextTrip
            ? "journey_assigned"
            : "ready_for_work"
          : hasSafety && homeVehicleMatches
            ? "operationally_blocked"
            : home.operationalState,
      blockReason:
        hasSafety && homeVehicleMatches
          ? "Vehicle held — safety-critical defect reported"
          : home.blockReason,
      requiredActions:
        cleared && homeVehicleMatches
          ? home.requiredActions.filter((action) => action.id !== "ra_check")
          : home.requiredActions,
      vehicleAssignment: home.vehicleAssignment
        ? homeVehicleMatches
          ? {
              ...home.vehicleAssignment,
              checkStatus: cleared ? "passed" : hasDefect ? "failed" : "in_progress",
              assignmentId: readiness.assignmentId,
              checkSessionId: readiness.checkSessionId,
              openDefectCount: hasDefect
                ? Math.max(home.vehicleAssignment.openDefectCount, session.defects.length)
                : home.vehicleAssignment.openDefectCount,
            }
          : home.vehicleAssignment
        : undefined,
    },
  });
}
