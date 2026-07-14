import type { DriverEligibilityDecision } from "@veyvio/ops";
import {
  buildEligibleDecision,
  buildWarningEligibility,
  eligibilityAllowsWork,
  eligibilityBlockedReason,
  eligibilityWarningCopy,
} from "@veyvio/ops";

/** Demo default: eligible. QA can force blocked via ?eligibility=blocked */
export function getDriverEligibilityDecision(): DriverEligibilityDecision {
  if (typeof window !== "undefined") {
    const param = new URLSearchParams(window.location.search).get("eligibility");
    if (param === "blocked") {
      return buildEligibleDecision({
        status: "blocked",
        blockers: [
          {
            code: "licence_review_required",
            message:
              "You cannot start this duty. Driver licence verification needs Operations review.",
          },
        ],
      });
    }
    if (param === "warning") {
      return buildWarningEligibility(
        "Licence expires within 30 days. Renew before your next compliance check.",
        "licence_expiring",
      );
    }
  }
  return buildEligibleDecision();
}

export function eligibilityGateCopy(decision: DriverEligibilityDecision): {
  allowsWork: boolean;
  detail: string;
  warning?: string;
  blockReason?: string;
} {
  return {
    allowsWork: eligibilityAllowsWork(decision),
    detail:
      decision.status === "eligible"
        ? "Eligible for this duty (Operations decision)"
        : decision.status === "eligible_with_warning"
          ? (eligibilityWarningCopy(decision) ?? "Eligible with warning")
          : (eligibilityBlockedReason(decision) ?? "Not eligible for this duty"),
    warning: eligibilityWarningCopy(decision),
    blockReason: eligibilityBlockedReason(decision),
  };
}
