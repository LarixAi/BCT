import type { DriverProfile } from './types'
import { buildCoreComplianceSlots, type ComplianceRequirementSlot } from './compliance'
import {
  buildDriverTrainingRequirements,
  isTrainingOutstanding,
  isTrainingSatisfied,
  summariseDriverTraining,
  trainingDaysUntil,
  type DriverDutyEligibility,
  type TrainingRequirementWithCategory,
} from './training'

export type LegalComplianceSummary = {
  slots: ComplianceRequirementSlot[]
  total: number
  valid: number
  allValid: boolean
  blockingLabels: string[]
}

export function summariseLegalCompliance(profile: DriverProfile): LegalComplianceSummary {
  const slots = buildCoreComplianceSlots(profile)
  const validStatuses = new Set(['verified', 'expiring_soon'])
  const valid = slots.filter((s) => validStatuses.has(s.status)).length
  const blockingLabels = slots
    .filter((s) => s.status === 'missing' || s.status === 'expired' || s.status === 'rejected')
    .map((s) => (s.status === 'expired' ? `${s.label} expired` : s.label))
  return {
    slots,
    total: slots.length,
    valid,
    allValid: blockingLabels.length === 0 && slots.every((s) => s.status !== 'under_review'),
    blockingLabels,
  }
}

export type NextExpiryItem = {
  label: string
  expiresAt: string
  daysRemaining: number
  kind: 'training' | 'document'
}

export function findNextExpiry(
  reqs: TrainingRequirementWithCategory[],
  legal: LegalComplianceSummary,
): NextExpiryItem | null {
  const items: NextExpiryItem[] = []
  for (const r of reqs) {
    if (!r.expiresAt) continue
    const days = trainingDaysUntil(r.expiresAt)
    if (days == null || days < 0) continue
    if (!isTrainingSatisfied(r) && r.status !== 'due_soon') continue
    items.push({ label: r.label, expiresAt: r.expiresAt, daysRemaining: days, kind: 'training' })
  }
  for (const slot of legal.slots) {
    const expiry = slot.primary?.expiryDate
    if (!expiry) continue
    const days = trainingDaysUntil(expiry)
    if (days == null || days < 0) continue
    if (slot.status !== 'verified' && slot.status !== 'expiring_soon') continue
    items.push({ label: slot.label, expiresAt: expiry, daysRemaining: days, kind: 'document' })
  }
  items.sort((a, b) => a.daysRemaining - b.daysRemaining)
  return items[0] ?? null
}

export type DriverTrainingEligibilityView = {
  status: DriverDutyEligibility
  headline: string
  summaryLine: string
  complianceScore: number
  mandatoryComplete: number
  mandatoryTotal: number
  roleComplete: number
  roleTotal: number
  vehicleComplete: number
  vehicleTotal: number
  certificatesLabel: string
  nextExpiry: NextExpiryItem | null
  blockReasons: string[]
  restrictionReasons: string[]
  canAssignToVehicle: boolean
  legal: LegalComplianceSummary
}

/**
 * Automatic eligibility engine for the Training / Compliance surface.
 * Combines Level 1 training, Level 2 vehicle modules, Level 3 legal docs, and Level 4 role gaps.
 */
export function evaluateTrainingEligibility(
  profile: DriverProfile,
  reqs?: TrainingRequirementWithCategory[],
): DriverTrainingEligibilityView {
  const requirements = reqs ?? buildDriverTrainingRequirements(profile)
  const summary = summariseDriverTraining(requirements)
  const legal = summariseLegalCompliance(profile)
  const nextExpiry = findNextExpiry(requirements, legal)

  const mandatoryGaps = requirements
    .filter((r) => r.category === 'mandatory' && isTrainingOutstanding(r))
    .map((r) => r.label)
  const vehicleGaps = requirements
    .filter((r) => r.category === 'vehicle' && isTrainingOutstanding(r))
    .map((r) => r.label)
  const roleGaps = requirements
    .filter((r) => r.category === 'role' && isTrainingOutstanding(r))
    .map((r) => r.label)

  const blockReasons = [...mandatoryGaps, ...legal.blockingLabels]
  const restrictionReasons = [...vehicleGaps, ...roleGaps]

  const trainingScored = requirements.filter((r) => r.category !== 'development')
  const trainingDone = trainingScored.filter(isTrainingSatisfied).length
  const totalUnits = trainingScored.length + legal.total
  const complianceScore =
    totalUnits === 0 ? 100 : Math.round(((trainingDone + legal.valid) / totalUnits) * 100)

  let status: DriverDutyEligibility
  let headline: string
  let summaryLine: string

  if (blockReasons.length > 0) {
    status = 'not_eligible'
    headline = 'Not eligible for duty'
    summaryLine = 'This driver cannot be assigned to a vehicle.'
  } else if (restrictionReasons.length > 0) {
    status = 'eligible_with_restrictions'
    headline = 'Eligible with restrictions'
    summaryLine =
      'Can work, but some vehicle types or duties are blocked until training is complete.'
  } else {
    status = 'eligible'
    headline = 'Eligible for duty'
    summaryLine = 'Mandatory training and legal compliance are in place for assignment.'
  }

  return {
    status,
    headline,
    summaryLine,
    complianceScore,
    mandatoryComplete: summary.mandatoryComplete,
    mandatoryTotal: summary.mandatoryTotal,
    roleComplete: summary.roleComplete,
    roleTotal: summary.roleTotal,
    vehicleComplete: summary.vehicleComplete,
    vehicleTotal: summary.vehicleTotal,
    certificatesLabel: legal.allValid
      ? 'All valid'
      : legal.blockingLabels.length > 0
        ? `${legal.blockingLabels.length} issue${legal.blockingLabels.length === 1 ? '' : 's'}`
        : `${legal.valid} / ${legal.total} valid`,
    nextExpiry,
    blockReasons,
    restrictionReasons,
    canAssignToVehicle: blockReasons.length === 0,
    legal,
  }
}
