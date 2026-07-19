import type { VehicleRecord } from '@/lib/api/types'
import {
  evaluateResourceReadiness,
  resourceReadinessToReleaseFailures,
} from '@/lib/fleet-resources/readiness'
import type { EquipmentAsset, TyreAsset } from '@/lib/fleet-resources/types'
import { deriveConditionStatus } from './condition'
import { deriveVehicleComplianceStatus, nearestVehicleExpiry } from './compliance'
import { syncDefectCounts } from './defects'
import { equipmentReady } from './equipment'
import { projectVehicleReadiness } from './readiness-projection'
import { checkTachographReview } from './tachograph'
import { nearestRetorqueDue } from './wheels'
import type {
  JobVehicleContext,
  ReleaseDecision,
  ReleaseFailure,
  VehicleOperationalStatus,
  VehicleProfile,
  VehicleReleaseResult,
} from './types'

const WARN_DAYS = 30
const INACTIVE_LIFECYCLE = ['draft', 'awaiting_onboarding', 'sold', 'returned_to_lessor', 'written_off', 'archived']
const BLOCKING_OPERATIONAL = ['vor', 'in_workshop', 'awaiting_parts', 'awaiting_recovery', 'under_inspection']
const MAINTENANCE_OPERATIONAL = ['in_workshop', 'awaiting_parts', 'under_inspection']

function isExpired(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date).getTime() < Date.now()
}

function isExpiringSoon(date: string | null | undefined): boolean {
  if (!date) return false
  const t = new Date(date).getTime()
  const now = Date.now()
  return t > now && t < now + WARN_DAYS * 24 * 60 * 60 * 1000
}

function failure(
  code: string,
  message: string,
  severity: 'block' | 'warning',
  category: ReleaseFailure['category'],
  sourceRecordId?: string | null,
): ReleaseFailure {
  return { code, message, severity, category, sourceRecordId }
}

function checkTachograph(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []
  if (checkTachographReview(profile)) {
    items.push(
      failure(
        'tachograph_review',
        `${reg}: tachograph review required — ${profile.tachograph?.reviewReason ?? 'event trigger'}`,
        'block',
        'compliance',
      ),
    )
  }
  return items
}

function checkEquipment(profile: VehicleProfile, ctx?: JobVehicleContext): ReleaseFailure[] {
  if (!ctx?.wheelchairRequired) return []
  const reg = profile.registrationNumber
  const missing = equipmentReady(profile.equipment ?? [], ['wheelchair restraint'])
  if (missing.length > 0) {
    return [failure('equipment_missing', `${reg}: missing equipment — ${missing.join(', ')}`, 'block', 'operational')]
  }
  return []
}

/** Fleet Resources readiness gate — fuel, tyres, required kit. */
function checkResourceGate(
  profile: VehicleProfile,
  resourceCtx?: { tyres?: TyreAsset[]; equipment?: EquipmentAsset[] },
): ReleaseFailure[] {
  const result = evaluateResourceReadiness({
    profile,
    tyres: resourceCtx?.tyres,
    equipment: resourceCtx?.equipment,
  })
  return resourceReadinessToReleaseFailures(result).map((f) =>
    failure(f.code, f.message, f.severity, f.category),
  )
}

function checkLifecycle(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  if (INACTIVE_LIFECYCLE.includes(profile.lifecycleStatus)) {
    return [
      failure(
        'lifecycle_inactive',
        `${reg}: lifecycle status is ${profile.lifecycleStatus.replace(/_/g, ' ')}`,
        'block',
        'lifecycle',
      ),
    ]
  }
  if (profile.lifecycleStatus === 'temporarily_inactive') {
    return [failure('lifecycle_temporarily_inactive', `${reg}: temporarily inactive`, 'block', 'lifecycle')]
  }
  return []
}

function checkOperational(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []
  if (BLOCKING_OPERATIONAL.includes(profile.operationalStatus)) {
    items.push(
      failure(
        'operational_blocked',
        `${reg}: ${profile.operationalStatus.replace(/_/g, ' ')}`,
        'block',
        'operational',
      ),
    )
  }
  return items
}

function checkCompliance(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []

  if (isExpired(profile.motExpiry)) {
    items.push(failure('mot_expired', `${reg}: MOT expired`, 'block', 'compliance'))
  } else if (isExpiringSoon(profile.motExpiry)) {
    items.push(failure('mot_expiring', `${reg}: MOT expiring within ${WARN_DAYS} days`, 'warning', 'compliance'))
  }

  if (isExpired(profile.insuranceExpiry)) {
    items.push(failure('insurance_expired', `${reg}: insurance expired`, 'block', 'compliance'))
  } else if (isExpiringSoon(profile.insuranceExpiry)) {
    items.push(
      failure('insurance_expiring', `${reg}: insurance expiring within ${WARN_DAYS} days`, 'warning', 'compliance'),
    )
  }

  if (profile.taxExpiry && isExpired(profile.taxExpiry)) {
    items.push(failure('tax_expired', `${reg}: road tax expired`, 'block', 'compliance'))
  }

  if (profile.tachographCalibrationExpiry && isExpired(profile.tachographCalibrationExpiry)) {
    items.push(failure('tachograph_expired', `${reg}: tachograph calibration expired`, 'block', 'compliance'))
  } else if (isExpiringSoon(profile.tachographCalibrationExpiry)) {
    items.push(
      failure(
        'tachograph_expiring',
        `${reg}: tachograph calibration expiring within ${WARN_DAYS} days`,
        'warning',
        'compliance',
      ),
    )
  }

  if (profile.complianceStatus === 'non_compliant' || profile.complianceStatus === 'awaiting_verification') {
    items.push(
      failure(
        'compliance_status',
        `${reg}: compliance status is ${profile.complianceStatus.replace(/_/g, ' ')}`,
        profile.complianceStatus === 'non_compliant' ? 'block' : 'warning',
        'compliance',
      ),
    )
  }

  return items
}

function checkDefects(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []
  if (profile.criticalDefectCount > 0) {
    items.push(
      failure(
        'dangerous_defect',
        `${reg}: ${profile.criticalDefectCount} dangerous defect(s) open`,
        'block',
        'defect',
      ),
    )
  } else if (profile.openDefectCount > 0 && profile.operationalStatus !== 'vor') {
    items.push(
      failure('open_defects', `${reg}: ${profile.openDefectCount} open defect(s)`, 'warning', 'defect'),
    )
  }
  return items
}

function checkReadiness(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  if (profile.readinessStatus === 'ready') return []
  return [
    failure(
      'readiness_not_ready',
      `${reg}: ${profile.readinessStatus.replace(/_/g, ' ')}`,
      profile.readinessStatus.includes('biohazard') ? 'block' : 'warning',
      'readiness',
    ),
  ]
}

function checkYard(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []
  if (profile.yardStatus === 'unknown_location') {
    items.push(failure('unknown_location', `${reg}: location unknown`, 'warning', 'yard'))
  }
  if (profile.yardStatus === 'workshop' || profile.yardStatus === 'recovery_compound') {
    items.push(failure('yard_workshop', `${reg}: at ${profile.yardStatus.replace(/_/g, ' ')}`, 'block', 'yard'))
  }
  return items
}

function checkMaintenance(profile: VehicleProfile): ReleaseFailure[] {
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []
  if (profile.wheelRetorqueDueAt && new Date(profile.wheelRetorqueDueAt).getTime() < Date.now()) {
    items.push(failure('wheel_retorque_overdue', `${reg}: wheel re-torque overdue`, 'block', 'maintenance'))
  }
  if (profile.checksOverdue) {
    items.push(failure('check_overdue', `${reg}: daily check overdue`, 'block', 'maintenance'))
  }
  const today = new Date().toISOString().slice(0, 10)
  if (profile.nextMaintenanceDate && profile.nextMaintenanceDate < today) {
    items.push(
      failure(
        'inspection_overdue',
        `${reg}: formal inspection / PMI overdue — clear in Inspections before dispatch`,
        'block',
        'compliance',
      ),
    )
  }
  return items
}

function checkRestrictions(profile: VehicleProfile, ctx?: JobVehicleContext): ReleaseFailure[] {
  if (!ctx) return []
  const items: ReleaseFailure[] = []
  const active = profile.restrictions.filter((r) => r.status === 'active')
  for (const r of active) {
    if (r.type === 'no_school' && ctx.schoolContract) {
      items.push(failure('restriction_no_school', r.reason, 'block', 'operational'))
    }
    if (r.type === 'no_wheelchair' && ctx.wheelchairRequired) {
      items.push(failure('restriction_no_wheelchair', r.reason, 'block', 'operational'))
    }
  }
  return items
}

function checkCapabilities(profile: VehicleProfile, ctx?: JobVehicleContext): ReleaseFailure[] {
  if (!ctx) return []
  const reg = profile.registrationNumber
  const items: ReleaseFailure[] = []
  const enabled = new Set(profile.capabilities.filter((c) => c.enabled).map((c) => c.key))

  if (ctx.wheelchairRequired && (profile.wheelchairCapacity < 1 || !enabled.has('wheelchair'))) {
    items.push(failure('wheelchair_capacity', `${reg}: wheelchair capacity required`, 'block', 'operational'))
  }
  if (ctx.schoolContract && !enabled.has('school')) {
    items.push(failure('school_capability', `${reg}: school transport approval required`, 'block', 'operational'))
  }
  if (ctx.minSeatingCapacity && profile.seatingCapacity < ctx.minSeatingCapacity) {
    items.push(failure('seating_capacity', `${reg}: insufficient seating capacity`, 'block', 'operational'))
  }
  return items
}

function deriveReleaseDecision(blocks: ReleaseFailure[], warnings: ReleaseFailure[]): ReleaseDecision {
  if (blocks.some((b) => b.category === 'operational' && b.code.startsWith('restriction'))) {
    return 'restricted_use'
  }
  if (blocks.length > 0) return 'blocked'
  if (warnings.length > 0) return 'released_with_warning'
  return 'released'
}

export function evaluateVehicleRelease(
  profile: VehicleProfile,
  ctx?: JobVehicleContext,
  resourceCtx?: { tyres?: TyreAsset[]; equipment?: EquipmentAsset[] },
): VehicleReleaseResult {
  const raw = [
    ...checkLifecycle(profile),
    ...checkOperational(profile),
    ...checkCompliance(profile),
    ...checkDefects(profile),
    ...checkReadiness(profile),
    ...checkYard(profile),
    ...checkMaintenance(profile),
    ...checkTachograph(profile),
    ...checkRestrictions(profile, ctx),
    ...checkCapabilities(profile, ctx),
    ...checkEquipment(profile, ctx),
    ...checkResourceGate(profile, resourceCtx),
  ]

  const blocks = raw.filter((f) => f.severity === 'block')
  const warnings = raw.filter((f) => f.severity === 'warning')
  const releaseDecision = deriveReleaseDecision(blocks, warnings)

  let summary: string
  switch (releaseDecision) {
    case 'released':
      summary = 'Released for operational use'
      break
    case 'released_with_warning':
      summary = 'Released with warnings'
      break
    case 'restricted_use':
      summary = 'Restricted — some work types blocked'
      break
    case 'blocked':
      summary = 'Blocked from allocation'
      break
    default:
      summary = releaseDecision.replace(/_/g, ' ')
  }

  const uniqueBlocks = blocks.filter((b, i, arr) => arr.findIndex((x) => x.code === b.code) === i)
  const uniqueWarnings = warnings.filter((w, i, arr) => arr.findIndex((x) => x.code === w.code) === i)

  return {
    releaseDecision,
    failures: uniqueBlocks,
    warnings: uniqueWarnings,
    canAllocate: uniqueBlocks.length === 0,
    canLeaveYard: uniqueBlocks.length === 0,
    canAcceptPassengers: uniqueBlocks.length === 0,
    summary,
    evaluatedAt: new Date().toISOString(),
  }
}

export function operationalToLegacyStatus(status: VehicleOperationalStatus): string {
  switch (status) {
    case 'vor':
    case 'awaiting_recovery':
      return 'off_road'
    case 'in_workshop':
    case 'awaiting_parts':
    case 'under_inspection':
      return 'maintenance'
    default:
      return 'in_service'
  }
}

export function profileToLegacyVehicleRecord(profile: VehicleProfile): VehicleRecord {
  return {
    id: profile.id,
    registrationNumber: profile.registrationNumber,
    fleetNumber: profile.fleetNumber,
    status: operationalToLegacyStatus(profile.operationalStatus),
    make: profile.make,
    model: profile.model,
    vehicleType: profile.vehicleCategory,
    seatingCapacity: profile.seatingCapacity,
    wheelchairCapacity: profile.wheelchairCapacity,
    depotId: profile.currentDepotId,
    depotName: profile.currentDepotName,
    motExpiry: profile.motExpiry,
    insuranceExpiry: profile.insuranceExpiry,
    mileage: profile.mileage,
  }
}

export function syncVehicleProfile(profile: VehicleProfile): VehicleProfile {
  const complianceStatus = deriveVehicleComplianceStatus(profile.documents ?? [])
  const nearest = nearestVehicleExpiry(profile)
  const defectCounts = syncDefectCounts({
    ...profile,
    defects: profile.defects ?? [],
  })
  const wheelRetorqueDueAt = profile.wheelRetorqueDueAt ?? nearestRetorqueDue(profile.wheelLayout ?? [])
  const withDefects: VehicleProfile = {
    ...profile,
    ...defectCounts,
    complianceStatus,
    nearestExpiryDate: nearest.date,
    nearestExpiryLabel: nearest.label,
    restrictions: profile.restrictions ?? [],
    documents: profile.documents ?? [],
    vorRecords: profile.vorRecords ?? [],
    capabilities: profile.capabilities ?? [],
    checks: profile.checks ?? [],
    defects: profile.defects ?? [],
    workOrders: profile.workOrders ?? [],
    wheelLayout: profile.wheelLayout ?? [],
    retorqueTasks: profile.retorqueTasks ?? [],
    equipment: profile.equipment ?? [],
    damageRecords: profile.damageRecords ?? [],
    wheelRetorqueDueAt,
  }
  const conditionStatus = deriveConditionStatus(withDefects)
  const enriched: VehicleProfile = {
    ...withDefects,
    conditionStatus,
  }
  const release = evaluateVehicleRelease(enriched)
  const readiness = projectVehicleReadiness(enriched, release)
  return {
    ...enriched,
    releaseDecision: release.releaseDecision,
    release,
    readiness,
    status: operationalToLegacyStatus(enriched.operationalStatus),
    updatedAt: new Date().toISOString(),
  }
}

export function isVehicleInMaintenance(status: VehicleOperationalStatus): boolean {
  return MAINTENANCE_OPERATIONAL.includes(status)
}
