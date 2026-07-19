import { describe, expect, it } from 'vitest'
import type { DutyRecord } from '@/lib/api/types'
import {
  detectScheduleConflicts,
  filterRuns,
  formatDelayLabel,
  formatDutyClock,
  isRunDelayed,
  runScheduleDelayMinutes,
  runSummary,
  weekDates,
} from './runs-trips-schedule'

function duty(partial: Partial<DutyRecord> & Pick<DutyRecord, 'id' | 'reference'>): DutyRecord {
  return {
    dutyDate: '2026-07-17',
    startTime: '08:00',
    status: 'assigned',
    route: { id: 'r1', name: 'Oakwood School AM' },
    driver: { id: 'd1', firstName: 'Jane', lastName: 'Smith' },
    vehicle: { id: 'v1', registrationNumber: 'AB12 CDE' },
    ...partial,
  }
}

describe('runs-trips-schedule helpers', () => {
  it('summarises run board counts', () => {
    const summary = runSummary([
      duty({ id: '1', reference: 'A', status: 'in_progress' }),
      duty({ id: '2', reference: 'B', status: 'completed' }),
      duty({ id: '3', reference: 'C', status: 'unassigned', driver: null }),
    ])
    expect(summary.completed).toBe(1)
    expect(summary.unassigned).toBe(1)
  })

  it('filters unassigned runs', () => {
    const rows = filterRuns(
      [
        duty({ id: '1', reference: 'A', status: 'assigned' }),
        duty({ id: '2', reference: 'B', status: 'unassigned', driver: null }),
      ],
      'unassigned',
      '',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('2')
  })

  it('detects driver double booking and VOR vehicle', () => {
    const conflicts = detectScheduleConflicts([
      duty({ id: '1', reference: 'A', dutyDate: '2026-07-18' }),
      duty({ id: '2', reference: 'B', dutyDate: '2026-07-18', vehicle: { id: 'v2', registrationNumber: 'YX21', status: 'off_road' } }),
      duty({
        id: '3',
        reference: 'C',
        dutyDate: '2026-07-18',
        driver: { id: 'd1', firstName: 'Jane', lastName: 'Smith' },
        vehicle: { id: 'v9', registrationNumber: 'ZZ99' },
      }),
    ])
    expect(conflicts.some((c) => c.title.includes('double booked'))).toBe(true)
    expect(conflicts.some((c) => c.title.includes('VOR'))).toBe(true)
  })

  it('builds a Monday-start week', () => {
    const days = weekDates('2026-07-17') // Friday
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-07-13')
    expect(days[6]).toBe('2026-07-19')
  })

  it('computes schedule delay from planned finish for overdue signed-on duties', () => {
    const now = new Date('2026-07-19T13:20:00+01:00')
    const row = duty({
      id: 'late-1',
      reference: 'S19-AM',
      dutyDate: '2026-07-19',
      status: 'signed_on',
      startTime: '2026-07-19T05:45:00+00:00',
      endTime: '2026-07-19T08:15:00+00:00',
    })
    const delay = runScheduleDelayMinutes(row, now)
    expect(delay).toBeGreaterThanOrEqual(240)
    expect(isRunDelayed(row, now)).toBe(true)
    expect(formatDelayLabel(delay)).toMatch(/^\+\d+h/)
    expect(formatDutyClock(row.startTime)).toMatch(/^\d{2}:\d{2}$/)
  })

  it('counts delayed runs in summary', () => {
    const now = new Date('2026-07-19T13:20:00+01:00')
    const summary = runSummary(
      [
        duty({
          id: '1',
          reference: 'LATE',
          dutyDate: '2026-07-19',
          status: 'signed_on',
          startTime: '2026-07-19T05:45:00+00:00',
          endTime: '2026-07-19T08:15:00+00:00',
        }),
        duty({
          id: '2',
          reference: 'OK',
          dutyDate: '2026-07-19',
          status: 'assigned',
          startTime: '2026-07-19T14:00:00+00:00',
          endTime: '2026-07-19T16:00:00+00:00',
        }),
      ],
      now,
    )
    expect(summary.delayed).toBe(1)
  })
})
