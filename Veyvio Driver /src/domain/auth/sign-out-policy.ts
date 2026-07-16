import type { HomeOperationalState } from "@/types/home";
import type { CheckSessionPhase } from "@/types/vehicle-check";

export type SignOutSeverity = "allowed" | "warning" | "blocked";

export interface SignOutAssessment {
  severity: SignOutSeverity;
  blockers: string[];
  warnings: string[];
  primaryAction?: {
    label: string;
    href: string;
  };
}

export interface SignOutContext {
  activeDutyId: string | null;
  dutyLifecycleStatus: string | null;
  operationalState: HomeOperationalState;
  vehicleCheckPhase: CheckSessionPhase | null;
  pendingSyncCount: number;
  failedSyncCount: number;
  hasTripRecovery: boolean;
}

export function assessSignOut(ctx: SignOutContext): SignOutAssessment {
  const blockers: string[] = [];
  const warnings: string[] = [];
  let primaryAction: SignOutAssessment["primaryAction"];

  const dutyInProgress = ctx.dutyLifecycleStatus === "in_progress";
  const checkInProgress =
    ctx.vehicleCheckPhase != null && ctx.vehicleCheckPhase !== "submitted";

  if (ctx.operationalState === "journey_active" || (dutyInProgress && ctx.activeDutyId)) {
    blockers.push("Active duty is still open on this device.");
    primaryAction = {
      label: "Return to active duty",
      href: ctx.activeDutyId ? `/trips?dutyId=${ctx.activeDutyId}` : "/",
    };
  }

  if (checkInProgress) {
    blockers.push("Vehicle walkaround check is still in progress.");
    primaryAction = primaryAction ?? { label: "Return to vehicle check", href: "/checks/walkaround" };
  }

  if (ctx.operationalState === "end_of_duty_required") {
    warnings.push("End-of-duty sign-off is still outstanding.");
    primaryAction = primaryAction ?? {
      label: "Complete end of duty",
      href: ctx.activeDutyId ? `/duties/${ctx.activeDutyId}/journey/end` : "/",
    };
  }

  if (ctx.failedSyncCount > 0) {
    warnings.push(
      `${ctx.failedSyncCount} change${ctx.failedSyncCount === 1 ? "" : "s"} failed to sync. The office may not have your latest records.`,
    );
  } else if (ctx.pendingSyncCount > 0) {
    warnings.push(
      `${ctx.pendingSyncCount} update${ctx.pendingSyncCount === 1 ? "" : "s"} still waiting to sync.`,
    );
  }

  if (ctx.hasTripRecovery) {
    warnings.push("An active trip snapshot is still stored on this device.");
  }

  if (ctx.operationalState === "on_break") {
    warnings.push("You are marked on break. Confirm the yard knows before leaving the device.");
  }

  const severity: SignOutSeverity =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "allowed";

  return { severity, blockers, warnings, primaryAction };
}
