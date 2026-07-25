import { evaluateComplianceRules } from './compliance-engine.ts'
import { finalizeEligibilityResult, type EligibilityResult } from './dispatch-assignment-gates.ts'

export type AssignmentRulesInput = {
  companyId: string
  driverId: string
  vehicleId?: string | null
  requireTodaysCheck?: boolean
  readinessAlreadyChecked?: boolean
}

/**
 * Evaluate hard assignment/sign-on rules for a driver (+ optional vehicle).
 * Single entry point for Command dispatch and Driver lifecycle callers.
 */
export async function evaluateAssignmentRules(input: AssignmentRulesInput): Promise<EligibilityResult> {
  const result = await evaluateComplianceRules(input)
  return finalizeEligibilityResult(result.blockers, result.warnings)
}

export { finalizeEligibilityResult }
