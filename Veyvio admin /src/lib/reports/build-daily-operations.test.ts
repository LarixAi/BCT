import { describe, expect, it } from 'vitest'
import { buildDailyOperationsSummary } from './build-daily-operations'
import type { DutyRecord } from '@/lib/api/types'

const duty = (partial: Partial<DutyRecord> & Pick<DutyRecord, 'id' | 'reference' | 'dutyDate' | 'status'>): DutyRecord => ({
  startTime: '06:00',
  ...partial,
})

describe('buildDailyOperationsSummary', () => {
  it('counts planned, unassigned and cancelled duties in period', () => {
    const summary = buildDailyOperationsSummary({
      from: '2026-07-19',
      to: '2026-07-19',
      depotLabel: 'All depots',
      duties: [
        duty({
          id: '1',
          reference: 'A',
          dutyDate: '2026-07-19',
          status: 'published',
          driver: { id: 'd1', firstName: 'A', lastName: 'B' },
          vehicle: { id: 'v1', registrationNumber: 'AB12 CDE' },
        }),
        duty({
          id: '2',
          reference: 'B',
          dutyDate: '2026-07-19',
          status: 'published',
        }),
        duty({
          id: '3',
          reference: 'C',
          dutyDate: '2026-07-19',
          status: 'cancelled',
          driver: { id: 'd2', firstName: 'C', lastName: 'D' },
          vehicle: { id: 'v2', registrationNumber: 'EF34 GHI' },
        }),
        duty({
          id: '4',
          reference: 'D',
          dutyDate: '2026-07-18',
          status: 'published',
        }),
      ],
      dashboard: {
        todaysActiveDuties: 1,
        vehiclesInService: 10,
        vehiclesOffRoad: 2,
        driversOnDuty: 3,
        openDefects: 4,
        openIncidents: 1,
        expiringDocuments: 2,
        alerts: [],
        navBadges: { defects: 4, compliance: 2 },
        timeline: [],
      },
    })

    const byKey = Object.fromEntries(summary.metrics.map((m) => [m.key, m.value]))
    expect(byKey.planned).toBe(3)
    expect(byKey.unassigned).toBe(1)
    expect(byKey.cancelled).toBe(1)
    expect(byKey['open-defects']).toBe(4)
    expect(byKey.incidents).toBe(1)
    expect(summary.attention.some((a) => a.id === 'unassigned')).toBe(true)
    expect(summary.dataQuality.length).toBeGreaterThan(0)
  })
})
