import type { DriverRecord, VehicleRecord } from '@/lib/api/types'
import type {
  DriverEligibilityResult,
  DriverProfile,
  DriverRestriction,
  EligibilityFailure,
  EligibilityOverride,
  OperationalEligibility,
  TrainingRequirement,
} from '@/lib/drivers/types'
import { deriveComplianceStatus } from '@/lib/drivers/compliance'
import { buildTrainingRequirements, getTrainingEligibilityEffect, isMandatoryTrainingKey } from '@/lib/drivers/training'

export interface JobEligibilityContext {
  wheelchairRequired?: boolean
  safeguardingRequired?: boolean
  schoolContract?: boolean
  escortRequired?: boolean
  vehicleSeatingCapacity?: number
  vehicleWheelchairCapacity?: number
}

export function jobContextFromBookingRequirements(req: {
  wheelchairAccessible?: boolean
  safeguardingRequired?: boolean
  schoolContract?: boolean
  escortRequired?: boolean
}): JobEligibilityContext {
  return {
    wheelchairRequired: req.wheelchairAccessible,
    safeguardingRequired: req.safeguardingRequired,
    schoolContract: req.schoolContract,
    escortRequired: req.escortRequired,
  }
}

const NON_DISPATCHABLE_ACCOUNT = [
  'draft',
  'invitation_pending',
  'setup_incomplete',
  'pending_approval',
  'temporarily_suspended',
  'compliance_restricted',
  'locked',
  'offboarded',
  'archived',
  'invitation_expired',
  'password_reset_required',
  // Legacy values that may still appear from older projections
  'suspended',
  'disabled',
  'not_created',
  'invite_pending',
]
const NON_DISPATCHABLE_EMPLOYMENT = ['suspended', 'employment_ended', 'applicant']
const WARN_DAYS = 30

function isExpired(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

function isExpiringSoon(date: string | null | undefined): boolean {
  if (!date) return false
  const t = new Date(date).getTime()
  const now = Date.now()
  const threshold = now + WARN_DAYS * 24 * 60 * 60 * 1000
  return t > now && t < threshold
}

function legacyDutyToStatus(dutyStatus: string): string {
  switch (dutyStatus) {
    case 'on_trip':
    case 'assigned':
    case 'checking_in':
    case 'finishing_duty':
      return 'on_duty'
    case 'available':
    case 'scheduled':
      return 'available'
    default:
      return 'unavailable'
  }
}

function failure(
  code: string,
  message: string,
  severity: 'block' | 'warning',
  category: EligibilityFailure['category'],
): EligibilityFailure {
  return { code, message, severity, category }
}

function checkRestrictions(
  restrictions: DriverRestriction[],
  ctx?: JobEligibilityContext,
): EligibilityFailure[] {
  const items: EligibilityFailure[] = []
  const active = restrictions.filter((r) => r.status === 'active')
  for (const r of active) {
    if (r.type === 'no_school' && ctx?.schoolContract) {
      items.push(failure('restriction_no_school', r.reason, 'block', 'restriction'))
    }
    if (r.type === 'no_wheelchair' && ctx?.wheelchairRequired) {
      items.push(failure('restriction_no_wheelchair', r.reason, 'block', 'restriction'))
    }
    if (r.type === 'automatic_only') {
      items.push(failure('restriction_automatic_only', r.reason, 'warning', 'restriction'))
    }
    if (!ctx) {
      items.push(failure(`restriction_${r.type}`, `${r.label}: ${r.reason}`, 'warning', 'restriction'))
    }
  }
  return items
}

function checkDocumentExpiries(driver: Pick<DriverProfile, 'licenceExpiry' | 'cpcExpiry' | 'dbsExpiry' | 'medicalExpiry' | 'firstName' | 'lastName' | 'documents'>, ctx?: JobEligibilityContext): EligibilityFailure[] {
  const name = `${driver.firstName} ${driver.lastName}`
  const items: EligibilityFailure[] = []
  const licenceExpiry =
    driver.licenceExpiry ??
    driver.documents?.find((d) => d.requirementType === 'driving_licence' || d.requirementType === 'licence')?.expiryDate ??
    null

  if (!licenceExpiry) {
    items.push(failure('licence_missing', `${name}: driving licence expiry is required`, 'block', 'compliance'))
  } else if (isExpired(licenceExpiry)) {
    items.push(failure('licence_expired', `${name}: driving licence expired`, 'block', 'compliance'))
  } else if (isExpiringSoon(licenceExpiry)) {
    items.push(failure('licence_expiring', `${name}: licence expiring within ${WARN_DAYS} days`, 'warning', 'compliance'))
  }

  if (isExpired(driver.cpcExpiry)) {
    items.push(failure('cpc_expired', `${name}: CPC expired`, 'block', 'compliance'))
  } else if (isExpiringSoon(driver.cpcExpiry)) {
    items.push(failure('cpc_expiring', `${name}: CPC expiring within ${WARN_DAYS} days`, 'warning', 'compliance'))
  }

  if (ctx?.safeguardingRequired || !ctx) {
    if (isExpired(driver.dbsExpiry)) {
      items.push(failure('dbs_expired', `${name}: DBS / safeguarding check expired`, 'block', 'compliance'))
    } else if (isExpiringSoon(driver.dbsExpiry)) {
      items.push(failure('dbs_expiring', `${name}: DBS expiring within ${WARN_DAYS} days`, 'warning', 'compliance'))
    }
  }

  if (driver.medicalExpiry) {
    if (isExpired(driver.medicalExpiry)) {
      items.push(failure('medical_expired', `${name}: medical certificate expired`, 'block', 'compliance'))
    } else if (isExpiringSoon(driver.medicalExpiry)) {
      items.push(failure('medical_expiring', `${name}: medical expiring within ${WARN_DAYS} days`, 'warning', 'compliance'))
    }
  }

  return items
}

function checkWorkPermissions(
  driver: Pick<DriverProfile, 'workPermissions'>,
  ctx?: JobEligibilityContext,
): EligibilityFailure[] {
  if (!ctx) return []
  const items: EligibilityFailure[] = []
  const enabled = new Set((driver.workPermissions ?? []).filter((p) => p.enabled).map((p) => p.key))

  if (ctx.schoolContract && !enabled.has('school')) {
    items.push(failure('school_permission', 'School transport permission required', 'block', 'operational'))
  }
  if (ctx.wheelchairRequired && !enabled.has('wheelchair')) {
    items.push(failure('wheelchair_permission', 'Wheelchair passenger permission required', 'block', 'operational'))
  }
  if (ctx.safeguardingRequired && !enabled.has('school') && !enabled.has('accessible')) {
    items.push(failure('safeguarding_permission', 'Safeguarding-approved work permission required', 'warning', 'operational'))
  }

  return items
}

function checkAccountAndEmployment(driver: DriverProfile): EligibilityFailure[] {
  const items: EligibilityFailure[] = []
  const name = `${driver.firstName} ${driver.lastName}`

  if (driver.operationalStatus === 'draft') {
    items.push(
      failure(
        'onboarding_incomplete',
        `${name}: onboarding is not complete`,
        'warning',
        'employment',
      ),
    )
  }

  if (NON_DISPATCHABLE_ACCOUNT.includes(driver.account.accountStatus)) {
    items.push(
      failure(
        'account_blocked',
        `${name}: account is ${driver.account.accountStatus.replace(/_/g, ' ')}`,
        'block',
        'account',
      ),
    )
  }

  if (NON_DISPATCHABLE_EMPLOYMENT.includes(driver.employmentStatus)) {
    items.push(
      failure(
        'employment_blocked',
        `${name}: employment status is ${driver.employmentStatus.replace(/_/g, ' ')}`,
        'block',
        'employment',
      ),
    )
  }

  if (driver.complianceStatus === 'non_compliant' || driver.complianceStatus === 'verification_failed') {
    items.push(failure('compliance_blocked', `${name}: compliance status is ${driver.complianceStatus.replace(/_/g, ' ')}`, 'block', 'compliance'))
  }

  if (driver.availabilityStatus === 'sick' || driver.availabilityStatus === 'holiday' || driver.availabilityStatus === 'unavailable') {
    items.push(
      failure(
        'availability_blocked',
        `${name}: marked ${driver.availabilityStatus.replace(/_/g, ' ')}`,
        'block',
        'operational',
      ),
    )
  }

  const staleSyncMs = 24 * 60 * 60 * 1000
  if (driver.account.lastAppSyncAt) {
    const syncAge = Date.now() - new Date(driver.account.lastAppSyncAt).getTime()
    if (syncAge > staleSyncMs && driver.dutyStatus !== 'off_duty') {
      items.push(failure('stale_app_sync', `${name}: app not synced in the last 24 hours`, 'warning', 'app'))
    }
  }

  return items
}

function applyActiveOverrides(
  failures: EligibilityFailure[],
  overrides: EligibilityOverride[],
): EligibilityFailure[] {
  const now = Date.now()
  const overridden = new Set(
    overrides
      .filter((o) => o.status === 'active' && new Date(o.expiresAt).getTime() > now)
      .map((o) => o.checkCode),
  )
  return failures.filter((f) => !overridden.has(f.code))
}

function checkTrainingRequirements(
  requirements: TrainingRequirement[],
  ctx?: JobEligibilityContext,
): EligibilityFailure[] {
  const items: EligibilityFailure[] = []
  for (const req of requirements) {
    const outstanding =
      req.status === 'missing' ||
      req.status === 'expired' ||
      req.status === 'failed' ||
      req.status === 'assigned' ||
      req.status === 'in_progress'
    if (!outstanding) continue

    const effect = getTrainingEligibilityEffect(req.key)
    const mandatory =
      req.category === 'mandatory' ||
      isMandatoryTrainingKey(req.key) ||
      effect === 'block_all_work'
    const vehicleModule =
      req.category === 'vehicle' || effect === 'block_vehicle_type'
    const schoolBlock =
      (req.key === 'safeguarding_children' || req.key === 'safeguarding_training' || req.key === 'send_autism_awareness') &&
      ctx?.schoolContract
    const wheelchairBlock =
      (req.key === 'wheelchair_restraint' || req.key === 'midas_accessible' || req.key === 'lift_ramp_operation') &&
      ctx?.wheelchairRequired

    if (schoolBlock || wheelchairBlock) {
      items.push(
        failure(
          req.key.startsWith('safeguarding') ? 'safeguarding_training' : 'wheelchair_training',
          `${req.label} required — ${req.status.replace(/_/g, ' ')}`,
          'block',
          'compliance',
        ),
      )
      continue
    }

    // Level 1 — blocks all duty assignment
    if (!ctx && mandatory) {
      items.push(
        failure(`training_${req.key}`, `${req.label} — ${req.status.replace(/_/g, ' ')}`, 'block', 'compliance'),
      )
      continue
    }

    // Level 2 — without a job context, surface as restriction warnings so dispatch sees gaps
    if (!ctx && vehicleModule) {
      items.push(
        failure(
          `training_${req.key}`,
          `${req.label} incomplete — cannot assign to matching vehicles`,
          'warning',
          'compliance',
        ),
      )
      continue
    }

    // Level 4 / other — warnings unless job context already handled above
    if (!ctx) {
      items.push(
        failure(`training_${req.key}`, `${req.label} — ${req.status.replace(/_/g, ' ')}`, 'warning', 'compliance'),
      )
    }
  }
  return items
}

function deriveEligibility(
  blocks: EligibilityFailure[],
  warnings: EligibilityFailure[],
  hasActiveOverride: boolean,
): OperationalEligibility {
  if (blocks.some((b) => b.category === 'restriction')) return 'restricted'
  if (blocks.length > 0) return 'not_eligible'
  if (hasActiveOverride) return 'emergency_override_active'
  if (warnings.length > 0) return 'eligible_with_warning'
  return 'eligible'
}

export function evaluateDriverEligibility(
  driver: DriverProfile,
  ctx?: JobEligibilityContext,
): DriverEligibilityResult {
  const trainingReqs = driver.trainingRequirements?.length
    ? driver.trainingRequirements
    : buildTrainingRequirements(driver)

  const rawBlocks = [
    ...checkAccountAndEmployment(driver),
    ...checkDocumentExpiries(driver, ctx),
    ...checkRestrictions(driver.restrictions ?? [], ctx),
    ...checkWorkPermissions(driver, ctx),
    ...checkTrainingRequirements(trainingReqs, ctx),
  ].filter((f) => f.severity === 'block')

  const rawWarnings = [
    ...checkAccountAndEmployment(driver),
    ...checkDocumentExpiries(driver, ctx),
    ...checkRestrictions(driver.restrictions ?? [], ctx),
    ...checkWorkPermissions(driver, ctx),
    ...checkTrainingRequirements(trainingReqs, ctx),
  ].filter((f) => f.severity === 'warning')

  const now = Date.now()
  const overrides = driver.eligibilityOverrides ?? []
  const hasActiveOverride = overrides.some(
    (o) => o.status === 'active' && new Date(o.expiresAt).getTime() > now,
  )

  const blocks = applyActiveOverrides(rawBlocks, overrides)
  const warnings = applyActiveOverrides(rawWarnings, overrides)

  const operationalEligibility = deriveEligibility(blocks, warnings, hasActiveOverride && rawBlocks.length > blocks.length)
  const uniqueBlocks = blocks.filter((b, i, arr) => arr.findIndex((x) => x.code === b.code) === i)
  const uniqueWarnings = warnings.filter((w, i, arr) => arr.findIndex((x) => x.code === w.code) === i)

  let summary: string
  switch (operationalEligibility) {
    case 'eligible':
      summary = 'Eligible for work'
      break
    case 'eligible_with_warning':
      summary = 'Eligible with warnings'
      break
    case 'restricted':
      summary = 'Restricted — some work types blocked'
      break
    case 'not_eligible':
      summary = 'Not eligible for assignment'
      break
    case 'emergency_override_active':
      summary = 'Eligible via controlled override'
      break
    default:
      summary = operationalEligibility.replace(/_/g, ' ')
  }

  return {
    operationalEligibility,
    failures: uniqueBlocks,
    warnings: uniqueWarnings,
    canAssign: uniqueBlocks.length === 0,
    canStartTrip: uniqueBlocks.length === 0,
    summary,
  }
}

/** Backward-compatible compliance blocks for dispatch (slim DriverRecord). */
export function getDriverComplianceBlocks(
  driver: DriverRecord | null,
  vehicle: VehicleRecord | null,
): string[] {
  const blocks: string[] = []
  if (driver) {
    const name = `${driver.firstName} ${driver.lastName}`
    if (driver.status && ['inactive', 'suspended', 'off_duty', 'unavailable'].includes(driver.status)) {
      blocks.push(`${name} is ${driver.status.replace(/_/g, ' ')}`)
    }
    if (isExpired(driver.licenceExpiry)) blocks.push(`${name}: licence expired`)
    if (isExpired(driver.cpcExpiry)) blocks.push(`${name}: CPC expired`)
    if (isExpired(driver.dbsExpiry)) blocks.push(`${name}: DBS expired`)
    if (isExpired(driver.medicalExpiry)) blocks.push(`${name}: medical expired`)
  }
  if (vehicle) {
    const reg = vehicle.registrationNumber
    if (vehicle.status && ['off_road', 'decommissioned', 'maintenance'].includes(vehicle.status)) {
      blocks.push(`${reg} is ${vehicle.status.replace(/_/g, ' ')}`)
    }
    if (isExpired(vehicle.motExpiry)) blocks.push(`${reg}: MOT expired`)
    if (isExpired(vehicle.insuranceExpiry)) blocks.push(`${reg}: insurance expired`)
  }
  return blocks
}

export function getDriverComplianceWarnings(
  driver: DriverRecord | null,
  vehicle: VehicleRecord | null,
): string[] {
  const warnings: string[] = []
  const warnThreshold = Date.now() + WARN_DAYS * 24 * 60 * 60 * 1000

  function expiringSoon(date: string | null | undefined, label: string, entity: string) {
    if (!date) return
    const t = new Date(date).getTime()
    if (t > Date.now() && t < warnThreshold) {
      warnings.push(`${entity}: ${label} expiring within ${WARN_DAYS} days`)
    }
  }

  if (driver) {
    const name = `${driver.firstName} ${driver.lastName}`
    expiringSoon(driver.licenceExpiry, 'licence', name)
    expiringSoon(driver.cpcExpiry, 'CPC', name)
    expiringSoon(driver.dbsExpiry, 'DBS', name)
  }
  if (vehicle) {
    expiringSoon(vehicle.motExpiry, 'MOT', vehicle.registrationNumber)
    expiringSoon(vehicle.insuranceExpiry, 'insurance', vehicle.registrationNumber)
  }
  return warnings
}

export function profileToLegacyRecord(profile: DriverProfile): DriverRecord {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    status: legacyDutyToStatus(profile.dutyStatus),
    email: profile.email,
    phone: profile.phone,
    depotId: profile.depotId,
    depotName: profile.depotName,
    licenceNumber: profile.licenceNumber,
    licenceExpiry: profile.licenceExpiry,
    cpcExpiry: profile.cpcExpiry,
    dbsExpiry: profile.dbsExpiry,
    medicalExpiry: profile.medicalExpiry,
  }
}

export function syncProfileEligibility(profile: DriverProfile): DriverProfile {
  const trainingRequirements = buildTrainingRequirements(profile)
  const complianceStatus = deriveComplianceStatus(profile.documents)
  const enriched: DriverProfile = {
    ...profile,
    trainingRequirements,
    complianceStatus,
    documentVersions: profile.documentVersions ?? [],
    eligibilityOverrides: profile.eligibilityOverrides ?? [],
  }
  const eligibility = evaluateDriverEligibility(enriched)
  return {
    ...enriched,
    operationalEligibility: eligibility.operationalEligibility,
    eligibility,
    status: legacyDutyToStatus(profile.dutyStatus),
    updatedAt: new Date().toISOString(),
  }
}
