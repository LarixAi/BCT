import type { VehicleReadinessState } from '@/lib/ops/canonical-states'
import {
  normalizeVorRecord,
  type VehicleOnboardingState,
  type VehicleProfile,
  type VehicleReadiness,
  type VehicleReleaseResult,
} from './types'

/** Coerce live payloads that send `{}` / null instead of arrays. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Build the shared VehicleReadiness projection from an evaluated release result. */
export function projectVehicleReadiness(
  profile: Pick<
    VehicleProfile,
    'id' | 'lifecycleStatus' | 'operationalStatus' | 'complianceStatus' | 'conditionStatus'
  >,
  result: Pick<
    VehicleReleaseResult,
    'canAllocate' | 'failures' | 'warnings' | 'evaluatedAt' | 'releaseDecision'
  >,
): VehicleReadiness {
  return {
    vehicleId: profile.id,
    lifecycleStatus: profile.lifecycleStatus,
    operationalStatus: profile.operationalStatus,
    complianceStatus: profile.complianceStatus,
    conditionStatus: profile.conditionStatus,
    assignmentEligible: result.canAllocate,
    blockingReasons: asArray<{ message: string }>(result.failures).map((f) => f.message),
    warningReasons: asArray<{ message: string }>(result.warnings).map((w) => w.message),
    calculatedAt: result.evaluatedAt ?? new Date().toISOString(),
    releaseDecision: result.releaseDecision,
  }
}

function normalizeOnboarding(onboarding: VehicleProfile['onboarding'] | null | undefined): VehicleOnboardingState {
  if (!onboarding || typeof onboarding !== 'object') {
    return {
      currentStage: 'approved',
      stages: [],
      approvedAt: null,
      approvedBy: null,
    }
  }
  return {
    currentStage: onboarding.currentStage ?? 'approved',
    stages: asArray(onboarding.stages),
    approvedAt: onboarding.approvedAt ?? null,
    approvedBy: onboarding.approvedBy ?? null,
  }
}

function normalizeRelease(
  release: VehicleReleaseResult | null | undefined,
  fallback: VehicleReleaseResult,
): VehicleReleaseResult {
  if (!release || typeof release !== 'object') return fallback
  return {
    ...fallback,
    ...release,
    failures: asArray(release.failures),
    warnings: asArray(release.warnings),
  }
}

/** Live API profiles sometimes omit readiness/condition — keep the fleet board resilient. */
export function normalizeVehicleProfile(vehicle: VehicleProfile): VehicleProfile {
  const vorRecords = asArray<VehicleProfile['vorRecords'][number]>(vehicle.vorRecords).map(normalizeVorRecord)
  const restrictions = asArray<VehicleProfile['restrictions'][number]>(vehicle.restrictions)
  const workOrders = asArray<VehicleProfile['workOrders'][number]>(vehicle.workOrders)

  const conditionStatus =
    vehicle.conditionStatus ??
    (vehicle.criticalDefectCount > 0
      ? 'safety_critical'
      : vehicle.openDefectCount > 0
        ? 'repair_required'
        : 'no_known_issues')

  const openVor = vorRecords.some((v) => !v.resolvedAt)
  const openCritical = (vehicle.criticalDefectCount ?? 0) > 0
  const activeRestriction = restrictions.some(
    (r) =>
      r.status === 'active' &&
      (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now()),
  )
  const blocked =
    vehicle.operationalStatus === 'vor' ||
    openVor ||
    openCritical ||
    (vehicle.releaseDecision ?? 'released') === 'blocked'

  const fallbackRelease: VehicleReleaseResult = {
    releaseDecision: blocked ? 'blocked' : activeRestriction ? 'restricted_use' : vehicle.releaseDecision ?? 'released',
    failures: [
      ...(openVor || vehicle.operationalStatus === 'vor'
        ? [{ code: 'vor', message: 'Vehicle is VOR', severity: 'block' as const, category: 'operational' as const }]
        : []),
      ...(openCritical
        ? [
            {
              code: 'critical_defect',
              message: 'Unresolved critical defect',
              severity: 'block' as const,
              category: 'defect' as const,
            },
          ]
        : []),
    ],
    warnings: [],
    canAllocate: !blocked,
    canLeaveYard: !blocked,
    canAcceptPassengers: !blocked && !activeRestriction,
    summary: blocked
      ? 'Blocked — not eligible for assignment'
      : activeRestriction
        ? 'Restricted use'
        : 'Released for service',
    evaluatedAt: new Date().toISOString(),
  }

  const release = normalizeRelease(vehicle.release, fallbackRelease)

  const readinessBase =
    vehicle.readiness ??
    projectVehicleReadiness(
      {
        id: vehicle.id,
        lifecycleStatus: vehicle.lifecycleStatus ?? 'active',
        operationalStatus: vehicle.operationalStatus ?? 'available',
        complianceStatus: vehicle.complianceStatus ?? 'compliant',
        conditionStatus,
      },
      release,
    )

  const blockingReasons = asArray<string>(readinessBase.blockingReasons)
  const warningReasons = asArray<string>(readinessBase.warningReasons)

  return {
    ...vehicle,
    conditionStatus,
    release,
    readiness: {
      ...readinessBase,
      assignmentEligible: Boolean(readinessBase.assignmentEligible) && !blocked,
      blockingReasons:
        blockingReasons.length > 0 ? blockingReasons : release.failures.map((f) => f.message),
      warningReasons,
    },
    releaseDecision: vehicle.releaseDecision ?? readinessBase.releaseDecision,
    onboarding: normalizeOnboarding(vehicle.onboarding),
    capabilities: asArray(vehicle.capabilities),
    documents: asArray(vehicle.documents),
    restrictions,
    vorRecords,
    notes: asArray(vehicle.notes),
    auditEvents: asArray(vehicle.auditEvents),
    checks: asArray(vehicle.checks),
    defects: asArray(vehicle.defects),
    workOrders,
    downtimeEvents: asArray(vehicle.downtimeEvents),
    wheelLayout: asArray(vehicle.wheelLayout),
    retorqueTasks: asArray(vehicle.retorqueTasks),
    equipment: asArray(vehicle.equipment),
    damageRecords: asArray(vehicle.damageRecords),
    platformEvents: asArray(vehicle.platformEvents),
    previousRegistrations: asArray(vehicle.previousRegistrations),
    openDefectCount: vehicle.openDefectCount ?? 0,
    criticalDefectCount: vehicle.criticalDefectCount ?? 0,
    wheelchairCapacity: vehicle.wheelchairCapacity ?? 0,
    seatingCapacity: vehicle.seatingCapacity ?? 0,
    standingCapacity: vehicle.standingCapacity ?? 0,
  }
}

/** Map shared readiness into Control Centre / Live Ops VehicleReadinessState. */
export function toOpsVehicleReadinessState(readiness: VehicleReadiness): VehicleReadinessState {
  if (readiness.operationalStatus === 'vor' || readiness.conditionStatus === 'safety_critical') {
    return 'VOR'
  }
  if (!readiness.assignmentEligible || readiness.releaseDecision === 'blocked') {
    return 'RESTRICTED'
  }
  if (readiness.operationalStatus === 'in_service') return 'IN_SERVICE'
  if (readiness.releaseDecision === 'restricted_use') return 'RESTRICTED'
  if (
    readiness.operationalStatus === 'under_inspection' ||
    readiness.operationalStatus === 'in_workshop' ||
    readiness.operationalStatus === 'awaiting_parts'
  ) {
    return 'PREPARING'
  }
  if (readiness.assignmentEligible && readiness.operationalStatus === 'available') {
    return asArray(readiness.warningReasons).length > 0 ? 'OPERATIONALLY_READY' : 'AVAILABLE'
  }
  if (readiness.operationalStatus === 'allocated' || readiness.operationalStatus === 'reserved') {
    return 'PLANNED'
  }
  return 'PREPARATION_PENDING'
}
