import type { DutyDetail } from "@/types/duty";

export type DutyPrepStepId =
  | "acknowledge"
  | "vehicle"
  | "check"
  | "clock_in"
  | "journey";

export interface DutyPrepStep {
  id: DutyPrepStepId;
  label: string;
  detail: string;
  done: boolean;
  current: boolean;
}

/** Ordered prep path: acknowledge → vehicle → check → clock-in → open journey. */
export function buildDutyPrepSteps(duty: DutyDetail): DutyPrepStep[] {
  const checkCleared =
    duty.vehicleCheck.status === "cleared" && duty.vehicleCheck.canStartDuty;
  const needsAck = ["published", "delivered", "viewed"].includes(duty.lifecycleStatus);
  const ackDone = ["acknowledged", "ready", "in_progress", "completed"].includes(
    duty.lifecycleStatus,
  );
  const vehicleDone = duty.vehicleVerified;
  const checkDone = checkCleared;
  const clockDone = Boolean(duty.clockedInAt);
  const journeyDone = duty.lifecycleStatus === "in_progress";

  const steps: Omit<DutyPrepStep, "current">[] = [
    {
      id: "acknowledge",
      label: "Acknowledge duty",
      detail: ackDone ? "Duty accepted" : "Confirm you have received this duty",
      done: ackDone,
    },
    {
      id: "vehicle",
      label: "Confirm vehicle",
      detail: vehicleDone
        ? duty.vehicle?.registrationNumber ?? "Vehicle confirmed"
        : "Accept the assigned vehicle",
      done: vehicleDone,
    },
    {
      id: "check",
      label: "Vehicle check",
      detail: checkDone
        ? `Released for ${duty.vehicle?.registrationNumber ?? "vehicle"}`
        : duty.vehicleCheck.status === "in_progress"
          ? "Walkaround in progress"
          : "Complete the walkaround in Checks",
      done: checkDone,
    },
    {
      id: "clock_in",
      label: "Clock in",
      detail: clockDone ? "Fit for duty declared" : "Declare fit for duty on this hub",
      done: clockDone,
    },
    {
      id: "journey",
      label: "Start journey",
      detail: journeyDone ? "Journey in service" : "Open journey when prep is complete",
      done: journeyDone,
    },
  ];

  const firstOpen = steps.findIndex((s) => !s.done);
  return steps.map((step, index) => ({
    ...step,
    current: firstOpen === -1 ? false : index === firstOpen,
  }));
}

export function canShowAcknowledgeCard(duty: DutyDetail): boolean {
  return ["published", "delivered", "viewed"].includes(duty.lifecycleStatus);
}
