import { describe, expect, it } from 'vitest'
import { mockVehiclesApi } from '@/lib/api/mock-vehicles'
import {
  normalizeVehicleProfile,
  projectVehicleReadiness,
  toOpsVehicleReadinessState,
} from './readiness-projection'

describe('projectVehicleReadiness', () => {
  it('projects assignmentEligible from release.canAllocate', () => {
    const vehicle = mockVehiclesApi.get('veh-1')
    expect(vehicle).toBeTruthy()
    const readiness = projectVehicleReadiness(vehicle!, vehicle!.release)
    expect(readiness.vehicleId).toBe(vehicle!.id)
    expect(readiness.assignmentEligible).toBe(vehicle!.release.canAllocate)
    expect(readiness.conditionStatus).toBe(vehicle!.conditionStatus)
    expect(readiness.blockingReasons).toEqual(vehicle!.release.failures.map((f) => f.message))
  })

  it('marks VOR vehicles restricted in ops mapping', () => {
    const vehicle = mockVehiclesApi.get('veh-4')
    expect(vehicle).toBeTruthy()
    expect(vehicle!.readiness.assignmentEligible).toBe(false)
    expect(toOpsVehicleReadinessState(vehicle!.readiness)).toBe('VOR')
  })

  it('maps available eligible vehicles to AVAILABLE', () => {
    const list = mockVehiclesApi.list().filter(
      (v) => v.operationalStatus === 'available' && v.readiness.assignmentEligible && v.conditionStatus === 'no_known_issues',
    )
    if (list[0]) {
      expect(toOpsVehicleReadinessState(list[0].readiness)).toBe('AVAILABLE')
    }
  })
})

describe('normalizeVehicleProfile', () => {
  it('coerces empty-object list fields so detail pages do not throw', () => {
    const base = mockVehiclesApi.get('veh-1')
    expect(base).toBeTruthy()
    const normalized = normalizeVehicleProfile({
      ...base!,
      workOrders: {} as unknown as typeof base.workOrders,
      documents: {} as unknown as typeof base.documents,
      equipment: {} as unknown as typeof base.equipment,
      wheelLayout: {} as unknown as typeof base.wheelLayout,
      vorRecords: {} as unknown as typeof base.vorRecords,
      defects: {} as unknown as typeof base.defects,
      readiness: {
        ...base!.readiness,
        blockingReasons: {} as unknown as string[],
        warningReasons: {} as unknown as string[],
      },
      release: {
        ...base!.release,
        failures: {} as unknown as typeof base.release.failures,
        warnings: {} as unknown as typeof base.release.warnings,
      },
      onboarding: {
        ...base!.onboarding,
        stages: {} as unknown as typeof base.onboarding.stages,
      },
    })

    expect(Array.isArray(normalized.workOrders)).toBe(true)
    expect(Array.isArray(normalized.documents)).toBe(true)
    expect(Array.isArray(normalized.equipment)).toBe(true)
    expect(Array.isArray(normalized.wheelLayout)).toBe(true)
    expect(Array.isArray(normalized.vorRecords)).toBe(true)
    expect(Array.isArray(normalized.readiness.blockingReasons)).toBe(true)
    expect(Array.isArray(normalized.release.failures)).toBe(true)
    expect(Array.isArray(normalized.onboarding.stages)).toBe(true)
    expect(() => normalized.workOrders.find(() => false)).not.toThrow()
    expect(() => normalized.readiness.blockingReasons.map((r) => r)).not.toThrow()
  })
})
