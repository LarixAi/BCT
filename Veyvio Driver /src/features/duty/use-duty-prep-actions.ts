import { useCallback, useState } from "react";
import { toast } from "sonner";
import { canClockInDuty, canCompleteDuty } from "@/domain/duty/duty-state-machine";
import { getDriverEligibilityDecision, eligibilityGateCopy } from "@/domain/duty/driver-eligibility";
import { dutyVehicleCheckCleared } from "@/domain/duty/duty-check-release";
import {
  buildDutyPrepSteps,
  canShowAcknowledgeCard,
  type DutyPrepStep,
} from "@/domain/duty/duty-prep-steps";
import { getActiveJourney } from "@/domain/journey/journey-helpers";
import { enqueueDriverMutation } from "@/platform/driver/enqueue-driver-mutation";
import { getVehicleReadiness } from "@/data/mocks/duties";
import { patchDutyLocal } from "@/features/duty/patch-duty-local";
import { reconcileReleasedCheckToDriver } from "@/domain/vehicle-check/complete-check-flow";
import { useDriverStore } from "@/store/driver";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import type { DutyDetail, DutyStop } from "@/types/duty";

export type DutyPrepActionKey = "ack" | "verify" | "clock" | "arrive" | "complete";

function readDuty(dutyId: string): DutyDetail | null {
  return useDriverStore.getState().getDuty(dutyId);
}

/**
 * If Checks / readiness already say released, stamp that onto the duty before clock-in.
 */
export function ensureDutyCheckReleased(dutyId: string): DutyDetail | null {
  const checksHome = useVehicleCheckStore.getState().checksHome;
  const session = useVehicleCheckStore.getState().activeSession;
  reconcileReleasedCheckToDriver(checksHome, session);

  let duty = readDuty(dutyId);
  if (!duty) return null;

  if (!dutyVehicleCheckCleared(duty)) return duty;

  if (!(duty.vehicleCheck.canStartDuty && duty.vehicleCheck.status === "cleared")) {
    const readiness = duty.vehicle?.id ? getVehicleReadiness(duty.vehicle.id) : undefined;
    patchDutyLocal(dutyId, (d) => ({
      ...d,
      vehicleVerified: true,
      vehicleCheck: {
        ...d.vehicleCheck,
        status: "cleared",
        canStartDuty: true,
        vehicleId: readiness?.vehicleId ?? d.vehicleCheck.vehicleId ?? d.vehicle?.id,
        assignmentId: readiness?.assignmentId ?? d.vehicleCheck.assignmentId,
        checkSessionId: readiness?.checkSessionId ?? d.vehicleCheck.checkSessionId,
      },
    }));
    duty = readDuty(dutyId);
  }
  return duty;
}

export function useDutyPrepActions(dutyId: string | undefined) {
  const loadDuty = useDriverStore((s) => s.loadDuty);
  // Subscribe via getDuty so we never favour a stale store over a fresher mock stamp
  const duty = useDriverStore((s) => (dutyId ? s.getDuty(dutyId) : null)) ?? undefined;
  const [acting, setActing] = useState<DutyPrepActionKey | null>(null);
  const [fitDeclared, setFitDeclared] = useState(false);

  const refresh = useCallback(async () => {
    if (dutyId) await loadDuty(dutyId);
  }, [dutyId, loadDuty]);

  const runAction = useCallback(
    async (key: DutyPrepActionKey, fn: () => Promise<void>) => {
      if (!dutyId) return;
      setActing(key);
      try {
        await fn();
        await loadDuty(dutyId);
      } finally {
        setActing(null);
      }
    },
    [dutyId, loadDuty],
  );

  const acknowledge = useCallback(async () => {
    if (!dutyId) return;
    const current = readDuty(dutyId);
    if (current && ["published", "delivered", "viewed"].includes(current.lifecycleStatus)) {
      patchDutyLocal(dutyId, { lifecycleStatus: "ready" });
    }
    try {
      await runAction("ack", () =>
        enqueueDriverMutation("duty.acknowledge", { dutyId }, `duty.${dutyId}.ack`),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not acknowledge duty");
    }
  }, [dutyId, runAction]);

  const verifyVehicle = useCallback(async () => {
    if (!dutyId) return;
    const current = readDuty(dutyId);
    if (!current?.vehicle) return;
    const vehicleId = current.vehicle.id;
    if (!current.vehicleVerified) {
      patchDutyLocal(dutyId, { vehicleVerified: true });
    }
    try {
      await runAction("verify", () =>
        enqueueDriverMutation("vehicle.verify", { dutyId, vehicleId }, `duty.${dutyId}.verify`),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm vehicle");
    }
  }, [dutyId, runAction]);

  const clockIn = useCallback(async () => {
    if (!dutyId) return;

    // Fold any completed Checks release into the duty before gating
    const healed = ensureDutyCheckReleased(dutyId);
    if (!healed) return;

    if (healed.clockedInAt) {
      toast.message("Already clocked in — open the journey when ready.");
      return;
    }

    if (!fitDeclared) {
      toast.error("Confirm you are fit for duty before clocking in.");
      return;
    }

    const checkCleared = dutyVehicleCheckCleared(healed);
    const gate = canClockInDuty({
      lifecycleStatus: healed.lifecycleStatus,
      vehicleVerified: healed.vehicleVerified || checkCleared,
      vehicleCheckCanStart: checkCleared,
      eligibility: getDriverEligibilityDecision(),
      alreadyClockedIn: false,
    });
    if (!gate.allowed) {
      toast.error(gate.reason ?? "Cannot clock in yet.");
      return;
    }

    const now = new Date().toISOString();
    setActing("clock");
    try {
      // Apply authoritative clock-in first — do not stamp optimistically (avoids false "ready")
      await enqueueDriverMutation(
        "duty.clock_in",
        { dutyId, fitForDutyDeclared: true },
        `duty.${dutyId}.clock_in`,
      );
      await loadDuty(dutyId);

      let after = readDuty(dutyId);
      if (after && !after.clockedInAt) {
        // Defensive: mutation applied but stamp missing from projection
        patchDutyLocal(dutyId, { clockedInAt: now, fitForDutyDeclaredAt: now });
        after = readDuty(dutyId);
      }
      if (!after?.clockedInAt) {
        throw new Error("Clock-in did not save. Try again.");
      }
      setFitDeclared(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clock in");
    } finally {
      setActing(null);
    }
  }, [dutyId, fitDeclared, loadDuty]);

  const markArrival = useCallback(
    async (stop: DutyStop) => {
      if (!dutyId) return;
      try {
        await runAction("arrive", () =>
          enqueueDriverMutation("stop.arrive", {
            dutyId,
            stopId: stop.id,
            arrivedAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not mark arrival");
      }
    },
    [dutyId, runAction],
  );

  const completeDuty = useCallback(async () => {
    if (!dutyId) return;
    try {
      await runAction("complete", () =>
        enqueueDriverMutation("duty.complete", { dutyId }, `duty.${dutyId}.complete`),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not complete duty");
    }
  }, [dutyId, runAction]);

  const gates = duty ? buildDutyPrepGates(duty) : null;
  const prepSteps: DutyPrepStep[] = duty ? buildDutyPrepSteps(duty) : [];

  return {
    duty,
    acting,
    fitDeclared,
    setFitDeclared,
    prepSteps,
    gates,
    refresh,
    loadDuty,
    acknowledge,
    verifyVehicle,
    clockIn,
    markArrival,
    completeDuty,
    canShowAcknowledge: duty ? canShowAcknowledgeCard(duty) : false,
  };
}

export function buildDutyPrepGates(duty: DutyDetail) {
  const checkCleared = dutyVehicleCheckCleared(duty);
  const eligibility = getDriverEligibilityDecision();
  const eligibilityCopy = eligibilityGateCopy(eligibility);
  const clockGate = canClockInDuty({
    lifecycleStatus: duty.lifecycleStatus,
    vehicleVerified: duty.vehicleVerified || checkCleared,
    vehicleCheckCanStart: checkCleared,
    eligibility,
    alreadyClockedIn: Boolean(duty.clockedInAt),
  });
  const completeGate = canCompleteDuty(duty);
  const activeRun = getActiveJourney(duty, duty.activeJourneyId);
  const nextStop = activeRun?.stops.find((s) => s.status !== "completed" && s.status !== "skipped");

  return {
    checkCleared,
    eligibilityCopy,
    clockGate,
    completeGate,
    nextStop,
    journeyHref: `/duties/${duty.id}/journey/open`,
  };
}

/** How the sheet primary CTA should behave for the current prep/live stage. */
export type SheetPrimaryMode =
  | { kind: "mutation"; action: "ack" | "verify" | "clock" }
  | { kind: "href"; href: string }
  | { kind: "disabled" };

export function resolveSheetPrimaryMode(
  stage: string,
  duty: DutyDetail | undefined,
): SheetPrimaryMode {
  if (!duty) return { kind: "disabled" };
  switch (stage) {
    case "acknowledge":
      return { kind: "mutation", action: "ack" };
    case "vehicle":
      return { kind: "mutation", action: "verify" };
    case "check":
      return { kind: "href", href: "/checks" };
    case "clock_in":
      return { kind: "mutation", action: "clock" };
    case "ready":
      return { kind: "href", href: `/duties/${duty.id}/journey/open` };
    case "active":
      return { kind: "href", href: `/duties/${duty.id}/nav` };
    case "waiting":
      return { kind: "href", href: `/duties/${duty.id}/help` };
    case "return":
      return { kind: "href", href: `/duties/${duty.id}/journey/return` };
    case "handback":
      return { kind: "href", href: `/duties/${duty.id}/journey/end` };
    case "complete":
      return { kind: "href", href: `/duties/${duty.id}` };
    default:
      return duty ? { kind: "href", href: `/duties/${duty.id}` } : { kind: "disabled" };
  }
}
