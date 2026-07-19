import type { VehicleProfile } from '@/lib/vehicles/types'
import type { EquipmentAsset, FleetResourcesSettings, TyreAsset } from './types'
import { DEFAULT_FLEET_RESOURCES_SETTINGS } from './constants'

export type ResourceReadinessDecision =
  | 'ready'
  | 'ready_with_warning'
  | 'conditionally_ready'
  | 'blocked'

export interface ResourceReadinessIssue {
  code: string
  severity: 'block' | 'warning'
  message: string
  href?: string
}

export interface ResourceReadinessResult {
  decision: ResourceReadinessDecision
  issues: ResourceReadinessIssue[]
}

/** Shared readiness gate — fuel, AdBlue stock proxy, tyres, required equipment. */
export function evaluateResourceReadiness(input: {
  profile: VehicleProfile
  tyres?: TyreAsset[]
  equipment?: EquipmentAsset[]
  settings?: Partial<FleetResourcesSettings>
}): ResourceReadinessResult {
  const settings = { ...DEFAULT_FLEET_RESOURCES_SETTINGS, ...input.settings }
  const reg = input.profile.registrationNumber
  const issues: ResourceReadinessIssue[] = []

  const fuel = input.profile.fuelLevelPercent
  if (fuel != null && fuel < settings.lowFuelPercent) {
    issues.push({
      code: 'low_fuel',
      severity: fuel < 10 ? 'block' : 'warning',
      message: `${reg}: fuel at ${fuel}% — top up before duty`,
      href: '/fleet-resources?tab=fuel',
    })
  }

  const vehicleTyres =
    input.tyres?.filter((t) => t.vehicleId === input.profile.id && t.status === 'fitted') ?? []
  for (const tyre of vehicleTyres) {
    if (tyre.treadDepthMm != null && tyre.treadDepthMm < settings.minTreadDepthMm) {
      issues.push({
        code: 'tyre_tread_low',
        severity: 'block',
        message: `${reg}: ${tyre.positionLabel ?? tyre.position ?? 'tyre'} tread ${tyre.treadDepthMm}mm — below ${settings.minTreadDepthMm}mm`,
        href: '/fleet-resources?tab=tyres',
      })
    }
    if (tyre.status === 'awaiting_retorque' || (tyre.retorqueDueAt && new Date(tyre.retorqueDueAt).getTime() < Date.now())) {
      issues.push({
        code: 'tyre_retorque_due',
        severity: 'block',
        message: `${reg}: wheel re-torque outstanding after tyre fit`,
        href: `/vehicles/${input.profile.id}?tab=wheels`,
      })
    }
    if (tyre.recommendation?.toLowerCase().includes('replace')) {
      issues.push({
        code: 'tyre_replace',
        severity: 'block',
        message: `${reg}: ${tyre.recommendation}`,
        href: '/fleet-resources?tab=tyres',
      })
    }
  }

  // Fall back to vehicle wheel layout when no tyre assets linked
  if (vehicleTyres.length === 0) {
    for (const w of Array.isArray(input.profile.wheelLayout) ? input.profile.wheelLayout : []) {
      if (w.condition === 'replace') {
        issues.push({
          code: 'wheel_replace',
          severity: 'block',
          message: `${reg}: ${w.label} needs replacement`,
          href: `/vehicles/${input.profile.id}?tab=wheels`,
        })
      } else if (w.condition === 'warning') {
        issues.push({
          code: 'wheel_warning',
          severity: 'warning',
          message: `${reg}: ${w.label} tread/pressure needs attention`,
          href: `/vehicles/${input.profile.id}?tab=wheels`,
        })
      }
      if (w.retorqueOverdue) {
        issues.push({
          code: 'wheel_retorque_overdue',
          severity: 'block',
          message: `${reg}: ${w.label} re-torque overdue`,
          href: `/vehicles/${input.profile.id}?tab=wheels`,
        })
      }
    }
  }

  const eq = input.equipment?.filter((e) => e.vehicleId === input.profile.id) ?? []
  for (const item of eq) {
    if (!item.requiredForDuty) continue
    if (item.status === 'missing' || item.status === 'unserviceable' || item.status === 'expired') {
      issues.push({
        code: 'equipment_not_ready',
        severity: 'block',
        message: `${reg}: ${item.name} is ${item.status.replace(/_/g, ' ')}`,
        href: '/fleet-resources?tab=equipment',
      })
    }
  }

  // Profile equipment (wheelchair restraint etc.)
  for (const item of Array.isArray(input.profile.equipment) ? input.profile.equipment : []) {
    if (!item.assigned || !item.serviceable) {
      if (item.name.toLowerCase().includes('wheelchair') || item.name.toLowerCase().includes('first aid') || item.name.toLowerCase().includes('extinguisher')) {
        issues.push({
          code: 'profile_equipment',
          severity: item.assigned ? 'warning' : 'block',
          message: `${reg}: ${item.name} not ready for service`,
          href: `/vehicles/${input.profile.id}?tab=equipment`,
        })
      }
    }
  }

  const blocks = issues.filter((i) => i.severity === 'block')
  const warnings = issues.filter((i) => i.severity === 'warning')
  const decision: ResourceReadinessDecision =
    blocks.length > 0
      ? 'blocked'
      : warnings.length > 1
        ? 'conditionally_ready'
        : warnings.length === 1
          ? 'ready_with_warning'
          : 'ready'

  return { decision, issues }
}

/** Map resource readiness into vehicle release failure shape. */
export function resourceReadinessToReleaseFailures(
  result: ResourceReadinessResult,
): { code: string; message: string; severity: 'block' | 'warning'; category: 'operational' }[] {
  return result.issues.map((i) => ({
    code: `resource_${i.code}`,
    message: i.message,
    severity: i.severity,
    category: 'operational' as const,
  }))
}
