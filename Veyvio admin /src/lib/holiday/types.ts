export type HolidayCalculationMethod =
  | 'fixed_days'
  | 'fixed_hours'
  | 'irregular_hours'
  | 'manual'

export interface HolidayBalanceSlice {
  openingEntitlement: number
  accrued: number
  carriedForward: number
  positiveAdjustments: number
  negativeAdjustments: number
  taken: number
  approvedFuture: number
  pending: number
  remaining: number
  remainingIfPendingApproved: number
  entitlementTotal: number
}

export interface HolidayProfile {
  id: string
  driverId: string
  leaveYearMode: string
  leaveYearStart: string
  leaveYearEnd: string
  calculationMethod: HolidayCalculationMethod | string
  entitlementWeeks: number
  contractedDaysPerWeek: number
  contractedHoursPerWeek: number
  standardDayMinutes: number
  annualEntitlementMinutes: number
  /** ISO weekdays 1=Mon … 7=Sun */
  workingWeekdays?: number[]
  usualWeeklyPayPence?: number | null
  average52WeekPayPence?: number | null
  carriedForwardMinutes: number
  carryForwardExpiresAt: string | null
  bankHolidaysIncluded: boolean
  allowNegativeBalance: boolean
  maximumNegativeMinutes: number | null
  roundingPolicy: string
  employmentStartDate: string | null
  employmentEndDate: string | null
}

export interface HolidayLedgerEntry {
  id: string
  type: string
  minutes: number
  effectiveAt: string
  referenceId: string | null
  referenceType: string | null
  reason: string | null
  createdByName: string
  createdAt: string
}

export interface DriverHolidayRequestSummary {
  id: string
  reference: string
  leaveType: string
  status: string
  startDate: string
  endDate: string
  partialDay: boolean
  reason: string
  submittedAt: string
  decidedAt: string | null
  decidedBy: string | null
}

export interface DriverHolidayBundle {
  driverId: string
  leaveYearStart: string
  leaveYearEnd: string
  leaveYearLabel: string
  calculationMethod: string
  standardDayMinutes: number
  displayUnit: 'days' | 'hours' | string
  bankHolidaysIncluded: boolean
  contractedDaysPerWeek: number
  entitlementWeeks: number
  minutes: HolidayBalanceSlice
  days: HolidayBalanceSlice
  pendingRequestCount: number
  nextApprovedHoliday: {
    startDate: string
    endDate: string
    leaveType: string
    workingDays: number
    reference: string
  } | null
  profile: HolidayProfile
  ledger: HolidayLedgerEntry[]
  requests?: DriverHolidayRequestSummary[]
}

export interface UpdateDriverHolidayProfileInput {
  leaveYearMode?: string
  calculationMethod?: HolidayCalculationMethod | string
  entitlementWeeks?: number
  contractedDaysPerWeek?: number
  contractedHoursPerWeek?: number
  standardDayMinutes?: number
  annualEntitlementMinutes?: number
  workingWeekdays?: number[]
  usualWeeklyPayPence?: number | null
  average52WeekPayPence?: number | null
  carriedForwardMinutes?: number
  carryForwardExpiresAt?: string | null
  bankHolidaysIncluded?: boolean
  allowNegativeBalance?: boolean
  maximumNegativeMinutes?: number | null
  roundingPolicy?: string
  employmentStartDate?: string | null
  employmentEndDate?: string | null
}

export interface AdjustDriverHolidayInput {
  days?: number
  minutes?: number
  reason: string
  effectiveAt?: string
}
