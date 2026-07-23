import { countDocumentsPendingAdminReview, isDocumentPendingAdminReview } from './compliance'
import type { DriverEligibilityResult, DriverProfile, OperationalEligibility } from './types'

const ONBOARDING_OPS = new Set(['draft', 'onboarding', 'pending_compliance'])

/** Align eligibility panel with documents + onboarding phase (matches command-api projection). */
export function reconcileDriverEligibility(profile: DriverProfile): DriverEligibilityResult {
  const name = `${profile.firstName} ${profile.lastName}`.trim()
  const failures: DriverEligibilityResult['failures'] = []
  const warnings: DriverEligibilityResult['warnings'] = []
  const op = profile.operationalStatus
  const pendingCount = countDocumentsPendingAdminReview(profile.documents)

  if (pendingCount > 0) {
    failures.push({
      code: 'documents_pending_review',
      message: `${name}: ${pendingCount} document${pendingCount === 1 ? '' : 's'} awaiting admin review — open Compliance to approve or decline`,
      severity: 'block',
      category: 'compliance',
    })
  }

  const licenceExpiry = profile.licenceExpiry
  if (!licenceExpiry) {
    failures.push({
      code: 'licence_missing',
      message: `${name}: driving licence expiry is required`,
      severity: 'block',
      category: 'compliance',
    })
  } else if (new Date(licenceExpiry).getTime() < Date.now()) {
    failures.push({
      code: 'licence_expired',
      message: `${name}: driving licence expired`,
      severity: 'block',
      category: 'compliance',
    })
  }

  if (profile.operationalStatus === 'suspended') {
    failures.push({
      code: 'employment_blocked',
      message: `${name}: employment status is suspended`,
      severity: 'block',
      category: 'employment',
    })
  }

  if (ONBOARDING_OPS.has(op)) {
    const docsApproved =
      pendingCount === 0 && profile.documents.some((d) => d.verificationStatus === 'verified')
    failures.push({
      code: 'onboarding_incomplete',
      message: pendingCount
        ? `${name}: finish onboarding after admin review in Compliance`
        : docsApproved
          ? `${name}: completing activation training in the Driver app — not yet eligible for dispatch`
          : `${name}: onboarding is not complete — finish onboarding and activate for dispatch`,
      severity: 'block',
      category: 'employment',
    })
  }

  const mandatoryGaps = (profile.trainingRequirements ?? []).filter((req) => {
    if (req.category !== 'mandatory') return false
    return (
      req.status === 'missing' ||
      req.status === 'expired' ||
      req.status === 'failed' ||
      req.status === 'assigned' ||
      req.status === 'in_progress'
    )
  })

  const vehicleGaps = (profile.trainingRequirements ?? []).filter((req) => {
    if (req.category !== 'vehicle') return false
    return (
      req.status === 'missing' ||
      req.status === 'expired' ||
      req.status === 'failed' ||
      req.status === 'assigned' ||
      req.status === 'in_progress'
    )
  })

  // Level 1 mandatory training must be complete before RELEASE STATUS can be Eligible.
  if (mandatoryGaps.length > 0) {
    failures.push({
      code: 'training_not_started',
      message:
        mandatoryGaps.length === 1
          ? `${mandatoryGaps[0]!.label} is still outstanding — complete it under Training before release`
          : `${mandatoryGaps.length} mandatory training courses still outstanding — complete them under Training before release`,
      severity: 'block',
      category: 'compliance',
    })
  }

  // Level 2 vehicle modules restrict assignment types but do not block overall release
  // once mandatory training is complete.
  if (vehicleGaps.length > 0 && mandatoryGaps.length === 0) {
    warnings.push({
      code: 'vehicle_training_incomplete',
      message: `${vehicleGaps.length} vehicle-specific course${vehicleGaps.length === 1 ? '' : 's'} still outstanding (e.g. MiDAS) — some vehicle types stay blocked`,
      severity: 'warning',
      category: 'compliance',
    })
  }

  // Preserve non-training warnings from API (e.g. custom overrides)
  for (const w of profile.eligibility?.warnings ?? []) {
    if (
      w.code.startsWith('training_') ||
      w.code === 'training_not_started' ||
      w.code === 'vehicle_training_incomplete'
    ) {
      continue
    }
    if (!warnings.some((x) => x.code === w.code)) warnings.push(w)
  }

  const canAssign = failures.length === 0
  let operationalEligibility: OperationalEligibility = 'not_eligible'
  if (canAssign) {
    operationalEligibility = warnings.length ? 'eligible_with_warning' : 'eligible'
  }

  return {
    operationalEligibility,
    failures,
    warnings,
    canAssign,
    canStartTrip: canAssign,
    summary: canAssign
      ? warnings.length
        ? 'Eligible with warnings'
        : 'Eligible for work'
      : 'Not eligible for assignment',
  }
}

export function reconcileDriverProfile(profile: DriverProfile): DriverProfile {
  const eligibility = reconcileDriverEligibility(profile)
  const op = profile.operationalStatus
  let account = profile.account
  if (
    (op === 'eligible' || op === 'restricted') &&
    account &&
    ['setup_incomplete', 'invitation_pending', 'draft'].includes(account.accountStatus)
  ) {
    account = { ...account, accountStatus: 'active' }
  }
  return {
    ...profile,
    account,
    operationalEligibility: eligibility.operationalEligibility,
    eligibility,
  }
}
