import type { DriverEligibilityDecision } from "./types";

/** Server-shaped eligibility decision — Driver must not interpret raw document dates alone. */
export function buildEligibleDecision(
  overrides?: Partial<DriverEligibilityDecision>,
): DriverEligibilityDecision {
  const now = new Date();
  return {
    status: "eligible",
    evaluatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    policyVersion: "eligibility-policy-v1",
    blockers: [],
    warnings: [],
    ...overrides,
  };
}

export function buildBlockedEligibility(message: string, code = "licence_expired"): DriverEligibilityDecision {
  return buildEligibleDecision({
    status: "blocked",
    blockers: [{ code, message }],
  });
}

export function buildWarningEligibility(message: string, code = "document_expiring"): DriverEligibilityDecision {
  return buildEligibleDecision({
    status: "eligible_with_warning",
    warnings: [{ code, message }],
  });
}

export function eligibilityAllowsWork(decision: DriverEligibilityDecision): boolean {
  return decision.status === "eligible" || decision.status === "eligible_with_warning";
}

export function eligibilityBlockedReason(decision: DriverEligibilityDecision): string | undefined {
  if (decision.status !== "blocked") return undefined;
  return (
    decision.blockers[0]?.message ??
    "You cannot start this duty. Operations has been notified."
  );
}

export function eligibilityWarningCopy(decision: DriverEligibilityDecision): string | undefined {
  if (decision.status !== "eligible_with_warning") return undefined;
  return decision.warnings[0]?.message;
}
