import { describe, expect, it } from 'vitest'
import { deriveConditionStatus } from './condition'
import type { VehicleDefectEntry, VehicleProfile } from './types'

function base(
  overrides: Partial<
    Pick<
      VehicleProfile,
      'defects' | 'damageRecords' | 'vorRecords' | 'operationalStatus' | 'criticalDefectCount' | 'openDefectCount' | 'lifecycleStatus'
    >
  > = {},
) {
  return {
    defects: [] as VehicleDefectEntry[],
    damageRecords: [],
    vorRecords: [],
    operationalStatus: 'available' as const,
    criticalDefectCount: 0,
    openDefectCount: 0,
    lifecycleStatus: 'active' as const,
    ...overrides,
  }
}

describe('deriveConditionStatus', () => {
  it('returns no_known_issues when clean and active', () => {
    expect(deriveConditionStatus(base())).toBe('no_known_issues')
  })

  it('returns awaiting_assessment during onboarding with no defects', () => {
    expect(deriveConditionStatus(base({ lifecycleStatus: 'awaiting_onboarding' }))).toBe('awaiting_assessment')
  })

  it('returns safety_critical for open VOR', () => {
    expect(
      deriveConditionStatus(
        base({
          vorRecords: [
            {
              id: 'v1',
              reason: 'Brakes',
              category: 'safety',
              defectId: null,
              reportedAt: new Date().toISOString(),
              reportedBy: 'Yard',
              location: null,
              recoveryRequired: false,
              resolvedAt: null,
              resolvedBy: null,
              resolutionReason: null,
            },
          ],
        }),
      ),
    ).toBe('safety_critical')
  })

  it('returns repair_required for major open defect', () => {
    expect(
      deriveConditionStatus(
        base({
          openDefectCount: 1,
          defects: [
            {
              id: 'd1',
              category: 'brakes',
              component: 'pads',
              description: 'Worn',
              severity: 'major',
              status: 'awaiting_repair',
              source: 'driver',
              reportedBy: 'Driver',
              reportedAt: new Date().toISOString(),
              mileage: null,
              location: null,
              vorApplied: false,
              closedAt: null,
              closedBy: null,
              closureReason: null,
              triageStatus: 'validated',
              triagedBy: null,
              triagedAt: null,
              linkedWorkOrderId: null,
            },
          ],
        }),
      ),
    ).toBe('repair_required')
  })

  it('returns advisory for minor open defect', () => {
    expect(
      deriveConditionStatus(
        base({
          openDefectCount: 1,
          defects: [
            {
              id: 'd2',
              category: 'body',
              component: 'mirror',
              description: 'Crack',
              severity: 'minor',
              status: 'open',
              source: 'yard',
              reportedBy: 'Yard',
              reportedAt: new Date().toISOString(),
              mileage: null,
              location: null,
              vorApplied: false,
              closedAt: null,
              closedBy: null,
              closureReason: null,
              triageStatus: 'pending',
              triagedBy: null,
              triagedAt: null,
              linkedWorkOrderId: null,
            },
          ],
        }),
      ),
    ).toBe('advisory')
  })
})
