import type {
  DriverHolidayBundle,
  UpdateDriverHolidayProfileInput,
} from './types'
import { computeEntitlementMinutes, formatApproximateDays } from './engine'

const YEAR = new Date().getUTCFullYear()

export function buildMockDriverHoliday(
  driverId: string,
  patch?: UpdateDriverHolidayProfileInput,
): DriverHolidayBundle {
  const contractedDays = Number(patch?.contractedDaysPerWeek ?? 5)
  const contractedHours = Number(patch?.contractedHoursPerWeek ?? 40)
  const weeks = Number(patch?.entitlementWeeks ?? 5.6)
  const standardDayMinutes = Number(patch?.standardDayMinutes ?? 480)
  const method = String(patch?.calculationMethod ?? 'fixed_days')
  const entitlementMinutes =
    patch?.annualEntitlementMinutes != null
      ? Number(patch.annualEntitlementMinutes)
      : computeEntitlementMinutes({
          method,
          contractedDaysPerWeek: contractedDays,
          contractedHoursPerWeek: contractedHours,
          entitlementWeeks: weeks,
          standardDayMinutes,
        })
  const entitlementDays = entitlementMinutes / standardDayMinutes
  const takenDays = 10
  const approvedFutureDays = 3
  const pendingDays = 2
  const remainingDays = entitlementDays - takenDays - approvedFutureDays
  const toMin = (d: number) => Math.round(d * standardDayMinutes)
  const displayUnit =
    method === 'fixed_hours' || method === 'irregular_hours' ? 'hours' : 'days'

  return {
    driverId,
    leaveYearStart: `${YEAR}-01-01`,
    leaveYearEnd: `${YEAR}-12-31`,
    leaveYearLabel: `1 January–31 December ${YEAR}`,
    calculationMethod: method,
    standardDayMinutes,
    displayUnit,
    bankHolidaysIncluded: patch?.bankHolidaysIncluded ?? true,
    contractedDaysPerWeek: contractedDays,
    entitlementWeeks: weeks,
    minutes: {
      openingEntitlement: entitlementMinutes,
      accrued: 0,
      carriedForward: Number(patch?.carriedForwardMinutes ?? 0),
      positiveAdjustments: 0,
      negativeAdjustments: 0,
      taken: toMin(takenDays),
      approvedFuture: toMin(approvedFutureDays),
      pending: toMin(pendingDays),
      remaining: toMin(remainingDays),
      remainingIfPendingApproved: toMin(remainingDays - pendingDays),
      entitlementTotal: entitlementMinutes,
    },
    days: {
      openingEntitlement: entitlementDays,
      accrued: 0,
      carriedForward: Number(patch?.carriedForwardMinutes ?? 0) / standardDayMinutes,
      positiveAdjustments: 0,
      negativeAdjustments: 0,
      taken: takenDays,
      approvedFuture: approvedFutureDays,
      pending: pendingDays,
      remaining: remainingDays,
      remainingIfPendingApproved: remainingDays - pendingDays,
      entitlementTotal: entitlementDays,
    },
    pendingRequestCount: 1,
    nextApprovedHoliday: {
      startDate: `${YEAR}-08-12`,
      endDate: `${YEAR}-08-16`,
      leaveType: 'annual_leave',
      workingDays: 5,
      reference: 'LV-DEMO0001',
    },
    profile: {
      id: `mock-hol-${driverId}`,
      driverId,
      leaveYearMode: String(patch?.leaveYearMode ?? 'calendar'),
      leaveYearStart: `${YEAR}-01-01`,
      leaveYearEnd: `${YEAR}-12-31`,
      calculationMethod: method,
      entitlementWeeks: weeks,
      contractedDaysPerWeek: contractedDays,
      contractedHoursPerWeek: contractedHours,
      standardDayMinutes,
      annualEntitlementMinutes: entitlementMinutes,
      workingWeekdays: patch?.workingWeekdays ?? [1, 2, 3, 4, 5],
      usualWeeklyPayPence: patch?.usualWeeklyPayPence ?? 50_000,
      average52WeekPayPence: patch?.average52WeekPayPence ?? null,
      carriedForwardMinutes: Number(patch?.carriedForwardMinutes ?? 0),
      carryForwardExpiresAt: patch?.carryForwardExpiresAt ?? null,
      bankHolidaysIncluded: patch?.bankHolidaysIncluded ?? true,
      allowNegativeBalance: patch?.allowNegativeBalance ?? false,
      maximumNegativeMinutes: patch?.maximumNegativeMinutes ?? null,
      roundingPolicy: String(patch?.roundingPolicy ?? 'nearest_quarter_hour'),
      employmentStartDate: patch?.employmentStartDate ?? null,
      employmentEndDate: patch?.employmentEndDate ?? null,
    },
    ledger: [
      {
        id: 'mock-open',
        type: 'opening_entitlement',
        minutes: entitlementMinutes,
        effectiveAt: `${YEAR}-01-01`,
        referenceId: null,
        referenceType: null,
        reason:
          displayUnit === 'hours'
            ? formatApproximateDays(entitlementMinutes, standardDayMinutes)
            : 'Opening entitlement for leave year',
        createdByName: 'System',
        createdAt: new Date().toISOString(),
      },
    ],
    requests: [],
  }
}
