import { describe, expect, it } from 'vitest'
import {
  accrueIrregularHours,
  applyRounding,
  buildHolidayPayRecord,
  buildLeaveRequestWarnings,
  computeEntitlementMinutes,
  computeOfficialBalance,
  countWorkingDaysInRange,
  driverBlockedByApprovedLeave,
  formatApproximateDays,
  leaveMinutesForWindow,
  leaveTypeDeductsBalance,
  suggestAlternativeDates,
} from './engine'

describe('holiday engine — entitlement', () => {
  it('fixed five-day driver gets 28 days (5 × 5.6 × 480 minutes)', () => {
    const minutes = computeEntitlementMinutes({
      method: 'fixed_days',
      contractedDaysPerWeek: 5,
      contractedHoursPerWeek: 40,
      entitlementWeeks: 5.6,
      standardDayMinutes: 480,
    })
    expect(minutes).toBe(28 * 480)
  })

  it('part-time three-day driver gets 16.8 days', () => {
    const minutes = computeEntitlementMinutes({
      method: 'fixed_days',
      contractedDaysPerWeek: 3,
      contractedHoursPerWeek: 24,
      entitlementWeeks: 5.6,
      standardDayMinutes: 480,
    })
    expect(minutes).toBe(Math.round(16.8 * 480))
  })

  it('fixed hours uses hours × weeks × 60', () => {
    const minutes = computeEntitlementMinutes({
      method: 'fixed_hours',
      contractedDaysPerWeek: 5,
      contractedHoursPerWeek: 40,
      entitlementWeeks: 5.6,
      standardDayMinutes: 480,
    })
    expect(minutes).toBe(Math.round(40 * 5.6 * 60))
  })

  it('manual contractual allowance wins', () => {
    const minutes = computeEntitlementMinutes({
      method: 'manual',
      contractedDaysPerWeek: 5,
      contractedHoursPerWeek: 40,
      entitlementWeeks: 5.6,
      standardDayMinutes: 480,
      manualAnnualMinutes: 30 * 480,
    })
    expect(minutes).toBe(30 * 480)
  })

  it('irregular accrual is 12.07% of hours worked', () => {
    expect(accrueIrregularHours(160)).toBe(Math.round(160 * 0.1207 * 60))
  })
})

describe('holiday engine — working days', () => {
  it('Mon–Fri request Mon–Fri deducts 5 days', () => {
    // 2026-08-10 Mon → 2026-08-14 Fri
    expect(countWorkingDaysInRange('2026-08-10', '2026-08-14')).toBe(5)
    expect(
      leaveMinutesForWindow({
        startDate: '2026-08-10',
        endDate: '2026-08-14',
        standardDayMinutes: 480,
      }),
    ).toBe(5 * 480)
  })

  it('Mon–Wed worker requesting Mon–Fri only deducts 3 days', () => {
    const minutes = leaveMinutesForWindow({
      startDate: '2026-08-10',
      endDate: '2026-08-14',
      standardDayMinutes: 480,
      workingWeekdays: [1, 2, 3],
    })
    expect(minutes).toBe(3 * 480)
  })

  it('official balance formula matches plan', () => {
    expect(
      computeOfficialBalance({
        opening: 28 * 480,
        accrued: 0,
        carriedForward: 2 * 480,
        positiveAdj: 480,
        taken: 10 * 480,
        approvedFuture: 3 * 480,
        negativeAdj: 0,
      }),
    ).toBe(18 * 480)
  })
})

describe('holiday engine — warnings and assignment', () => {
  it('flags assigned trips without blocking', () => {
    const warnings = buildLeaveRequestWarnings({
      leaveType: 'annual_leave',
      requestMinutes: 5 * 480,
      remainingMinutes: 18 * 480,
      allowNegative: false,
      overlappingPending: false,
      overlappingApproved: false,
      assignedTripsCount: 2,
    })
    expect(warnings.some((w) => w.code === 'assigned_trips')).toBe(true)
    expect(warnings.every((w) => w.severity !== 'block')).toBe(true)
  })

  it('blocks assignment when approved leave covers the date', () => {
    expect(
      driverBlockedByApprovedLeave({
        driverId: 'd1',
        onDate: '2026-08-12',
        leaveRows: [
          {
            personId: 'd1',
            status: 'approved',
            startDate: '2026-08-10',
            endDate: '2026-08-14',
          },
        ],
      }),
    ).toBe(true)
  })

  it('does not block on pending leave', () => {
    expect(
      driverBlockedByApprovedLeave({
        driverId: 'd1',
        onDate: '2026-08-12',
        leaveRows: [
          {
            personId: 'd1',
            status: 'pending',
            startDate: '2026-08-10',
            endDate: '2026-08-14',
          },
        ],
      }),
    ).toBe(false)
  })

  it('only annual leave deducts balance by default', () => {
    expect(leaveTypeDeductsBalance('annual_leave')).toBe(true)
    expect(leaveTypeDeductsBalance('unpaid_leave')).toBe(false)
    expect(leaveTypeDeductsBalance('medical_appointment')).toBe(false)
  })
})

describe('holiday engine — suggest dates, rounding, pay', () => {
  it('suggests an alternative window after the request', () => {
    const alt = suggestAlternativeDates({
      startDate: '2026-08-10',
      endDate: '2026-08-14',
      blockedRanges: [{ startDate: '2026-08-10', endDate: '2026-08-21' }],
    })
    expect(alt).not.toBeNull()
    expect(alt!.startDate > '2026-08-14').toBe(true)
    expect(countWorkingDaysInRange(alt!.startDate, alt!.endDate)).toBe(5)
  })

  it('rounds to nearest quarter hour', () => {
    expect(applyRounding(37, 'nearest_quarter_hour')).toBe(30)
    expect(applyRounding(38, 'nearest_quarter_hour')).toBe(45)
  })

  it('builds a separate holiday-pay record', () => {
    const record = buildHolidayPayRecord({
      driverId: 'd1',
      leaveRequestId: 'lv1',
      leaveYearStart: '2026-01-01',
      minutesPaid: 5 * 480,
      method: 'fixed_days',
      usualWeeklyPayPence: 50_000,
    })
    expect(record.basis).toBe('usual_pay')
    expect(record.calculatedPayPence).toBeGreaterThan(0)
    expect(record.notes).toMatch(/usual contractual pay/i)
  })

  it('formats approximate days for irregular hours', () => {
    expect(formatApproximateDays(53.81 * 60, 480)).toMatch(/Approximately/)
  })
})
