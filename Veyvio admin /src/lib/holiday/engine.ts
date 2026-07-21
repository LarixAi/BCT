/**
 * Holiday entitlement engine (Phase 1–3).
 * Canonical unit: minutes. Display days/hours via standardDayMinutes.
 */

export type HolidayCalculationMethod =
  | 'fixed_days'
  | 'fixed_hours'
  | 'irregular_hours'
  | 'manual'

export type RoundingPolicy =
  | 'none'
  | 'nearest_half_day'
  | 'nearest_quarter_hour'
  | 'nearest_hour'

/** ISO weekday: 1=Mon … 7=Sun (ISO-8601). Default Mon–Fri. */
export const DEFAULT_WORKING_WEEKDAYS = [1, 2, 3, 4, 5] as const

export const IRREGULAR_ACCRUAL_RATE = 0.1207

export const PAID_LEAVE_TYPES = new Set([
  'annual_leave',
  'holiday',
  'bereavement', // company-configurable; default paid for compassionate
])

export const DRIVER_LEAVE_TYPE_OPTIONS = [
  { id: 'holiday', leaveType: 'annual_leave', label: 'Annual leave', deductsBalance: true },
  { id: 'unpaid', leaveType: 'unpaid_leave', label: 'Unpaid leave', deductsBalance: false },
  { id: 'medical_appointment', leaveType: 'medical_appointment', label: 'Medical appointment', deductsBalance: false },
  { id: 'emergency', leaveType: 'emergency_leave', label: 'Emergency dependant leave', deductsBalance: false },
  { id: 'compassionate', leaveType: 'bereavement', label: 'Compassionate leave', deductsBalance: true },
  { id: 'sick', leaveType: 'sick_leave', label: 'Sickness', deductsBalance: false },
  { id: 'other', leaveType: 'other', label: 'Other', deductsBalance: false },
] as const

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function isoDateUTC(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export function parseIsoDateUTC(value: string) {
  const [y, m, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y!, (m ?? 1) - 1, day ?? 1))
}

export function addDaysIso(iso: string, days: number) {
  const d = parseIsoDateUTC(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return isoDateUTC(d)
}

/** ISO weekday 1–7 (Mon–Sun). */
export function isoWeekday(iso: string): number {
  const dow = parseIsoDateUTC(iso).getUTCDay() // 0 Sun … 6 Sat
  return dow === 0 ? 7 : dow
}

export function countWorkingDaysInRange(
  startIso: string,
  endIso: string,
  workingWeekdays: number[] = [...DEFAULT_WORKING_WEEKDAYS],
): number {
  if (!startIso || !endIso || endIso < startIso) return 0
  const allowed = new Set(workingWeekdays)
  let count = 0
  let cur = startIso
  let guard = 0
  while (cur <= endIso && guard < 400) {
    if (allowed.has(isoWeekday(cur))) count += 1
    cur = addDaysIso(cur, 1)
    guard += 1
  }
  return count
}

export function leaveMinutesForWindow(input: {
  startDate: string
  endDate: string
  partialDay?: boolean
  customHours?: number | null
  standardDayMinutes: number
  workingWeekdays?: number[]
}): number {
  const dayMinutes = Math.max(1, input.standardDayMinutes || 480)
  if (input.customHours != null && input.customHours > 0) {
    return Math.round(input.customHours * 60)
  }
  const days = countWorkingDaysInRange(
    input.startDate,
    input.endDate,
    input.workingWeekdays ?? [...DEFAULT_WORKING_WEEKDAYS],
  )
  if (input.partialDay) return Math.round(days * dayMinutes * 0.5)
  return days * dayMinutes
}

export function leaveTypeDeductsBalance(leaveType: string): boolean {
  return PAID_LEAVE_TYPES.has(leaveType)
}

export function computeEntitlementMinutes(input: {
  method: HolidayCalculationMethod | string
  contractedDaysPerWeek: number
  contractedHoursPerWeek: number
  entitlementWeeks: number
  standardDayMinutes: number
  manualAnnualMinutes?: number | null
}): number {
  const method = input.method || 'fixed_days'
  if (method === 'manual' && input.manualAnnualMinutes != null) {
    return Math.round(input.manualAnnualMinutes)
  }
  if (method === 'fixed_hours') {
    return Math.round(
      Number(input.contractedHoursPerWeek || 40) *
        Number(input.entitlementWeeks || 5.6) *
        60,
    )
  }
  if (method === 'irregular_hours') {
    // Opening balance for irregular is often zero; accrual posts later.
    return Math.round(input.manualAnnualMinutes ?? 0)
  }
  // fixed_days (and manual without minutes → fall back)
  if (input.manualAnnualMinutes != null && input.manualAnnualMinutes > 0) {
    return Math.round(input.manualAnnualMinutes)
  }
  const days =
    Number(input.contractedDaysPerWeek || 5) * Number(input.entitlementWeeks || 5.6)
  return Math.round(days * Number(input.standardDayMinutes || 480))
}

/** Accrue holiday for irregular / part-year workers at 12.07% of hours worked. */
export function accrueIrregularHours(hoursWorked: number): number {
  return Math.round(hoursWorked * IRREGULAR_ACCRUAL_RATE * 60)
}

export function applyRounding(minutes: number, policy: RoundingPolicy | string): number {
  if (policy === 'none' || !policy) return Math.round(minutes)
  if (policy === 'nearest_hour') return Math.round(minutes / 60) * 60
  if (policy === 'nearest_quarter_hour') return Math.round(minutes / 15) * 15
  if (policy === 'nearest_half_day') {
    // Half day = 0.5 * standard day — caller should pass already; use 240 as default half of 480
    return Math.round(minutes / 240) * 240
  }
  return Math.round(minutes)
}

export function minutesToDays(minutes: number, standardDayMinutes: number) {
  const day = Math.max(1, standardDayMinutes || 480)
  return Math.round((minutes / day) * 100) / 100
}

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100
}

export function formatApproximateDays(minutes: number, standardDayMinutes: number) {
  const days = minutesToDays(minutes, standardDayMinutes)
  return `Approximately ${days} standard day${days === 1 ? '' : 's'}`
}

export function computeOfficialBalance(input: {
  opening: number
  accrued: number
  carriedForward: number
  positiveAdj: number
  taken: number
  approvedFuture: number
  negativeAdj: number
}) {
  return (
    input.opening +
    input.accrued +
    input.carriedForward +
    input.positiveAdj -
    input.taken -
    input.approvedFuture -
    input.negativeAdj
  )
}

export type LeaveWarningCode =
  | 'low_balance'
  | 'negative_balance'
  | 'overlap_pending'
  | 'overlap_approved'
  | 'assigned_trips'
  | 'blackout'

export interface LeaveWarning {
  code: LeaveWarningCode
  severity: 'info' | 'attention' | 'block'
  message: string
}

export function buildLeaveRequestWarnings(input: {
  leaveType: string
  requestMinutes: number
  remainingMinutes: number
  allowNegative: boolean
  maximumNegativeMinutes?: number | null
  overlappingPending: boolean
  overlappingApproved: boolean
  assignedTripsCount: number
  isBlackout?: boolean
}): LeaveWarning[] {
  const warnings: LeaveWarning[] = []
  const deducts = leaveTypeDeductsBalance(input.leaveType)

  if (input.isBlackout) {
    warnings.push({
      code: 'blackout',
      severity: 'block',
      message: 'These dates fall in a restricted blackout period configured by your operator.',
    })
  }

  if (input.overlappingApproved) {
    warnings.push({
      code: 'overlap_approved',
      severity: 'attention',
      message: 'You already have approved leave covering part of this period.',
    })
  }

  if (input.overlappingPending) {
    warnings.push({
      code: 'overlap_pending',
      severity: 'info',
      message: 'You already have a pending request that overlaps these dates.',
    })
  }

  if (input.assignedTripsCount > 0) {
    warnings.push({
      code: 'assigned_trips',
      severity: 'attention',
      message: `You are assigned to ${input.assignedTripsCount} trip${input.assignedTripsCount === 1 ? '' : 's'} during this period. Submitting will alert Operations to arrange cover.`,
    })
  }

  if (deducts) {
    const projected = input.remainingMinutes - input.requestMinutes
    if (projected < 0 && !input.allowNegative) {
      warnings.push({
        code: 'negative_balance',
        severity: 'attention',
        message: 'This request would take your holiday balance below zero. Your manager will review.',
      })
    } else if (
      projected < 0 &&
      input.allowNegative &&
      input.maximumNegativeMinutes != null &&
      Math.abs(projected) > input.maximumNegativeMinutes
    ) {
      warnings.push({
        code: 'negative_balance',
        severity: 'attention',
        message: 'This request exceeds the maximum negative balance allowed.',
      })
    } else if (projected < input.requestMinutes && projected >= 0) {
      warnings.push({
        code: 'low_balance',
        severity: 'info',
        message: 'This request uses a large share of your remaining holiday.',
      })
    }
  }

  return warnings
}

/** Suggest the next clear Mon–Fri window of the same length after the requested end. */
export function suggestAlternativeDates(input: {
  startDate: string
  endDate: string
  workingWeekdays?: number[]
  blockedRanges?: Array<{ startDate: string; endDate: string }>
  searchHorizonDays?: number
}): { startDate: string; endDate: string } | null {
  const working = input.workingWeekdays ?? [...DEFAULT_WORKING_WEEKDAYS]
  const spanDays = countWorkingDaysInRange(input.startDate, input.endDate, working)
  if (spanDays <= 0) return null

  const horizon = input.searchHorizonDays ?? 90
  let cursor = addDaysIso(input.endDate, 1)
  const last = addDaysIso(input.endDate, horizon)

  while (cursor <= last) {
    // Find next working day as start
    while (cursor <= last && !working.includes(isoWeekday(cursor))) {
      cursor = addDaysIso(cursor, 1)
    }
    if (cursor > last) break

    // Grow until we have spanDays working days
    let end = cursor
    let collected = 0
    while (end <= last && collected < spanDays) {
      if (working.includes(isoWeekday(end))) collected += 1
      if (collected < spanDays) end = addDaysIso(end, 1)
    }
    if (collected < spanDays) break

    const overlaps = (input.blockedRanges ?? []).some(
      (r) => !(end < r.startDate || cursor > r.endDate),
    )
    if (!overlaps) return { startDate: cursor, endDate: end }
    cursor = addDaysIso(cursor, 1)
  }
  return null
}

/**
 * Holiday pay is tracked separately from time entitlement.
 * Fixed pay: usual pay. Variable / irregular: average of previous 52 paid weeks (payroll feeds rates).
 */
export type HolidayPayBasis = 'usual_pay' | 'average_52_weeks'

export interface HolidayPayCalculationRecord {
  driverId: string
  leaveRequestId: string
  leaveYearStart: string
  minutesPaid: number
  basis: HolidayPayBasis
  averageWeeklyPayPence: number | null
  calculatedPayPence: number | null
  notes: string
  calculatedAt: string
}

export function buildHolidayPayRecord(input: {
  driverId: string
  leaveRequestId: string
  leaveYearStart: string
  minutesPaid: number
  method: HolidayCalculationMethod | string
  usualWeeklyPayPence?: number | null
  average52WeekPayPence?: number | null
}): HolidayPayCalculationRecord {
  const irregular =
    input.method === 'irregular_hours' || input.average52WeekPayPence != null
  const basis: HolidayPayBasis = irregular ? 'average_52_weeks' : 'usual_pay'
  const weekly =
    basis === 'average_52_weeks'
      ? input.average52WeekPayPence ?? null
      : input.usualWeeklyPayPence ?? null

  let calculatedPayPence: number | null = null
  if (weekly != null && weekly > 0) {
    // Pro-rata: minutes / (contract week minutes approx 5*480) * weekly
    const weekMinutes = 5 * 480
    calculatedPayPence = Math.round((input.minutesPaid / weekMinutes) * weekly)
  }

  return {
    driverId: input.driverId,
    leaveRequestId: input.leaveRequestId,
    leaveYearStart: input.leaveYearStart,
    minutesPaid: input.minutesPaid,
    basis,
    averageWeeklyPayPence: weekly,
    calculatedPayPence,
    notes:
      basis === 'average_52_weeks'
        ? 'Holiday pay based on average pay over the previous 52 paid weeks (payroll).'
        : 'Holiday pay based on usual contractual pay for fixed-hours workers.',
    calculatedAt: new Date().toISOString(),
  }
}

export function carryForwardExpiryDate(
  leaveYearStart: string,
  expiryMonths: number,
): string {
  const d = parseIsoDateUTC(leaveYearStart)
  d.setUTCMonth(d.getUTCMonth() + Math.max(0, expiryMonths))
  d.setUTCDate(d.getUTCDate() - 1)
  return isoDateUTC(d)
}

export function shouldExpireCarryForward(input: {
  carryForwardExpiresAt: string | null | undefined
  asOf?: string
}): boolean {
  if (!input.carryForwardExpiresAt) return false
  const asOf = input.asOf ?? isoDateUTC(new Date())
  return asOf > input.carryForwardExpiresAt.slice(0, 10)
}

/** True when driver has approved/moved leave covering the operational date. */
export function driverBlockedByApprovedLeave(input: {
  leaveRows: Array<{ status: string; startDate: string; endDate: string; personId?: string }>
  driverId: string
  onDate: string
}): boolean {
  return input.leaveRows.some(
    (r) =>
      (r.personId == null || r.personId === input.driverId) &&
      (r.status === 'approved' || r.status === 'moved') &&
      r.startDate <= input.onDate &&
      r.endDate >= input.onDate,
  )
}
