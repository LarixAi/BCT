import { addMinor } from './money'
import type { OrganisationId } from './types'

/**
 * Driver wage-cost hours + provisional gross (Cost Control).
 * Not PAYE, not a payslip engine — export approved inputs to a recognised payroll provider.
 */

/** Hours stored as centesimal units (8.50h → 850). */
export type HoursCenti = number

export type HourCategory =
  | 'basic'
  | 'overtime'
  | 'night'
  | 'weekend'
  | 'bank_holiday'
  | 'training'
  | 'other_work'
  | 'period_of_availability'
  | 'unpaid_break'
  | 'paid_absence'

export const HOUR_CATEGORY_LABELS: Record<HourCategory, string> = {
  basic: 'Basic hours',
  overtime: 'Overtime hours',
  night: 'Night hours',
  weekend: 'Weekend hours',
  bank_holiday: 'Bank-holiday hours',
  training: 'Training hours',
  other_work: 'Other work',
  period_of_availability: 'Period of availability',
  unpaid_break: 'Unpaid break',
  paid_absence: 'Paid absence',
}

/**
 * Payable categories (wage cost). Night / weekend / bank-holiday lines are
 * premium overlays — the underlying hours sit in basic (or other payable) lines.
 */
export const PAYABLE_HOUR_CATEGORIES: readonly HourCategory[] = [
  'basic',
  'overtime',
  'training',
  'other_work',
  'paid_absence',
] as const

/** Premium overlay categories — pay differential only; do not double-count hours. */
export const PREMIUM_OVERLAY_CATEGORIES: readonly HourCategory[] = [
  'night',
  'weekend',
  'bank_holiday',
] as const

/** Categories that count toward regulated working-time monitoring (DVSA-style). */
export const REGULATED_WORKING_TIME_CATEGORIES: readonly HourCategory[] = [
  'basic',
  'overtime',
  'training',
  'other_work',
  'period_of_availability',
] as const

export type HoursSource =
  | 'timesheet'
  | 'clock'
  | 'duty'
  | 'tachograph'
  | 'depot_attendance'
  | 'ops_import'

export type HourLine = {
  category: HourCategory
  /** Centesimal hours for this category on the driver-day. */
  hoursCenti: HoursCenti
}

export type DriverDayRecord = {
  id: string
  organisationId: OrganisationId
  employeeCostReferenceId: string
  payPeriodId: string
  workDate: string
  source: HoursSource
  lines: HourLine[]
  /** Dispute / correction flag — blocks export until cleared. */
  disputed: boolean
  notes?: string
}

export type EffectivePayRate = {
  id: string
  organisationId: OrganisationId
  employeeCostReferenceId: string
  /** Inclusive start (ISO date). */
  effectiveFrom: string
  /** Exclusive end; null = open. */
  effectiveTo: string | null
  basicHourlyMinor: number
  overtimeHourlyMinor: number
  nightPremiumHourlyMinor: number
  weekendPremiumHourlyMinor: number
  bankHolidayPremiumHourlyMinor: number
}

export type HolidayPayMode = 'leave_when_taken' | 'rolled_up_separate'

export type ProvisionalGrossInput = {
  days: DriverDayRecord[]
  rates: EffectivePayRate[]
  employeeCostReferenceId: string
  /** Fixed approved allowance for the period (minor). */
  approvedAllowanceMinor?: number
  bonusesMinor?: number
  backPayMinor?: number
  holidayPayMinor?: number
  sicknessOrStatutoryPayMinor?: number
  holidayPayMode?: HolidayPayMode
  /** Rolled-up holiday pay shown separately (never baked into hourly rate). */
  rolledUpHolidayPayMinor?: number
  /** Applicable NMW hourly rate (minor). Defaults to Apr-2026 placeholder. */
  nmwHourlyMinor?: number
}

export type ProvisionalGrossLine = {
  label: string
  hoursCenti: HoursCenti | null
  rateMinor: number | null
  amountMinor: number
  kind: 'hours' | 'premium' | 'fixed' | 'holiday'
}

export type ProvisionalGrossResult = {
  lines: ProvisionalGrossLine[]
  basicPayMinor: number
  overtimePayMinor: number
  premiumPayMinor: number
  holidayPayMinor: number
  rolledUpHolidayPayMinor: number
  sicknessOrStatutoryPayMinor: number
  allowancesMinor: number
  bonusesMinor: number
  backPayMinor: number
  grossPayMinor: number
  payableHoursCenti: HoursCenti
  regulatedWorkingTimeCenti: HoursCenti
  nmwCheck: {
    nmwHourlyMinor: number
    effectiveHourlyMinor: number
    workingTimeForNmwCenti: HoursCenti
    passed: boolean
    detail: string
  }
  formulaVersion: typeof WAGE_GROSS_FORMULA_VERSION
}

export const WAGE_GROSS_FORMULA_VERSION = 'cost-control.driver-wage-gross.v1' as const

/** Placeholder NMW 21+ from Apr 2026 planning — override per organisation. */
export const DEFAULT_NMW_HOURLY_MINOR = 12_21

export function hoursFromCenti(centi: HoursCenti): number {
  return centi / 100
}

export function formatHoursCenti(centi: HoursCenti): string {
  return hoursFromCenti(centi).toFixed(2)
}

export function sumCategoryHours(lines: HourLine[], categories: readonly HourCategory[]): HoursCenti {
  const set = new Set(categories)
  return lines.reduce((s, line) => (set.has(line.category) ? s + line.hoursCenti : s), 0)
}

export function payableHoursForDay(day: DriverDayRecord): HoursCenti {
  return sumCategoryHours(day.lines, PAYABLE_HOUR_CATEGORIES)
}

export function regulatedWorkingTimeForDay(day: DriverDayRecord): HoursCenti {
  return sumCategoryHours(day.lines, REGULATED_WORKING_TIME_CATEGORIES)
}

export function sumHoursByCategory(days: DriverDayRecord[]): Record<HourCategory, HoursCenti> {
  const out = Object.fromEntries(
    (Object.keys(HOUR_CATEGORY_LABELS) as HourCategory[]).map((k) => [k, 0]),
  ) as Record<HourCategory, HoursCenti>
  for (const day of days) {
    for (const line of day.lines) {
      out[line.category] += line.hoursCenti
    }
  }
  return out
}

function assertCentesimalHours(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer (centesimal hours)`)
  }
}

function rateCoversDate(rate: EffectivePayRate, workDate: string): boolean {
  if (workDate < rate.effectiveFrom) return false
  if (rate.effectiveTo && workDate >= rate.effectiveTo) return false
  return true
}

export function resolveRateForDate(
  rates: EffectivePayRate[],
  employeeCostReferenceId: string,
  workDate: string,
): EffectivePayRate {
  const matches = rates
    .filter((r) => r.employeeCostReferenceId === employeeCostReferenceId)
    .filter((r) => rateCoversDate(r, workDate))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  if (!matches.length) {
    throw new Error(`No effective pay rate for ${employeeCostReferenceId} on ${workDate}`)
  }
  return matches[0]
}

function payForHours(hoursCenti: HoursCenti, hourlyMinor: number): number {
  // (hoursCenti / 100) * hourlyMinor, rounded to nearest minor.
  return Math.round((hoursCenti * hourlyMinor) / 100)
}

/**
 * Provisional gross wage cost for one worker across the supplied driver-days.
 * Splits hours across effective-dated rates when a mid-period change occurs.
 */
export function computeProvisionalGross(input: ProvisionalGrossInput): ProvisionalGrossResult {
  const days = input.days.filter((d) => d.employeeCostReferenceId === input.employeeCostReferenceId)
  for (const day of days) {
    for (const line of day.lines) assertCentesimalHours(line.hoursCenti, line.category)
  }

  let basicPayMinor = 0
  let overtimePayMinor = 0
  let nightPremiumMinor = 0
  let weekendPremiumMinor = 0
  let bankHolidayPremiumMinor = 0
  let trainingPayMinor = 0
  let otherWorkPayMinor = 0
  let paidAbsencePayMinor = 0

  const rateBuckets = new Map<
    string,
    { rate: EffectivePayRate; byCat: Partial<Record<HourCategory, HoursCenti>> }
  >()

  for (const day of days) {
    const rate = resolveRateForDate(input.rates, input.employeeCostReferenceId, day.workDate)
    const bucket = rateBuckets.get(rate.id) ?? { rate, byCat: {} }
    for (const line of day.lines) {
      bucket.byCat[line.category] = (bucket.byCat[line.category] ?? 0) + line.hoursCenti
    }
    rateBuckets.set(rate.id, bucket)
  }

  const detailLines: ProvisionalGrossLine[] = []

  for (const { rate, byCat } of rateBuckets.values()) {
    const basicH = byCat.basic ?? 0
    const otH = byCat.overtime ?? 0
    const nightH = byCat.night ?? 0
    const weekendH = byCat.weekend ?? 0
    const bhH = byCat.bank_holiday ?? 0
    const trainH = byCat.training ?? 0
    const otherH = byCat.other_work ?? 0
    const absenceH = byCat.paid_absence ?? 0

    const basicAmt = payForHours(basicH, rate.basicHourlyMinor)
    const otAmt = payForHours(otH, rate.overtimeHourlyMinor)
    // Night / weekend / BH: premium overlay only (underlying hours already in basic).
    const nightPrem = payForHours(nightH, rate.nightPremiumHourlyMinor)
    const weekendPrem = payForHours(weekendH, rate.weekendPremiumHourlyMinor)
    const bhPrem = payForHours(bhH, rate.bankHolidayPremiumHourlyMinor)
    const trainAmt = payForHours(trainH, rate.basicHourlyMinor)
    const otherAmt = payForHours(otherH, rate.basicHourlyMinor)
    const absenceAmt = payForHours(absenceH, rate.basicHourlyMinor)

    basicPayMinor += basicAmt + trainAmt + otherAmt + absenceAmt
    overtimePayMinor += otAmt
    nightPremiumMinor += nightPrem
    weekendPremiumMinor += weekendPrem
    bankHolidayPremiumMinor += bhPrem
    trainingPayMinor += trainAmt
    otherWorkPayMinor += otherAmt
    paidAbsencePayMinor += absenceAmt

    if (basicH) {
      detailLines.push({
        label: `Basic hours (${rate.effectiveFrom})`,
        hoursCenti: basicH,
        rateMinor: rate.basicHourlyMinor,
        amountMinor: basicAmt,
        kind: 'hours',
      })
    }
    if (otH) {
      detailLines.push({
        label: `Overtime hours (${rate.effectiveFrom})`,
        hoursCenti: otH,
        rateMinor: rate.overtimeHourlyMinor,
        amountMinor: otAmt,
        kind: 'hours',
      })
    }
    if (nightH) {
      detailLines.push({
        label: `Night premium (${rate.effectiveFrom})`,
        hoursCenti: nightH,
        rateMinor: rate.nightPremiumHourlyMinor,
        amountMinor: nightPrem,
        kind: 'premium',
      })
    }
    if (weekendH) {
      detailLines.push({
        label: `Weekend premium (${rate.effectiveFrom})`,
        hoursCenti: weekendH,
        rateMinor: rate.weekendPremiumHourlyMinor,
        amountMinor: weekendPrem,
        kind: 'premium',
      })
    }
    if (bhH) {
      detailLines.push({
        label: `Bank-holiday premium (${rate.effectiveFrom})`,
        hoursCenti: bhH,
        rateMinor: rate.bankHolidayPremiumHourlyMinor,
        amountMinor: bhPrem,
        kind: 'premium',
      })
    }
    if (trainH) {
      detailLines.push({
        label: `Training hours (${rate.effectiveFrom})`,
        hoursCenti: trainH,
        rateMinor: rate.basicHourlyMinor,
        amountMinor: trainAmt,
        kind: 'hours',
      })
    }
    if (otherH) {
      detailLines.push({
        label: `Other work (${rate.effectiveFrom})`,
        hoursCenti: otherH,
        rateMinor: rate.basicHourlyMinor,
        amountMinor: otherAmt,
        kind: 'hours',
      })
    }
    if (absenceH) {
      detailLines.push({
        label: `Paid absence (${rate.effectiveFrom})`,
        hoursCenti: absenceH,
        rateMinor: rate.basicHourlyMinor,
        amountMinor: absenceAmt,
        kind: 'hours',
      })
    }
  }

  void trainingPayMinor
  void otherWorkPayMinor
  void paidAbsencePayMinor

  const premiumPayMinor = addMinor(nightPremiumMinor, weekendPremiumMinor, bankHolidayPremiumMinor)
  const allowancesMinor = input.approvedAllowanceMinor ?? 0
  const bonusesMinor = input.bonusesMinor ?? 0
  const backPayMinor = input.backPayMinor ?? 0
  const holidayPayMinor = input.holidayPayMinor ?? 0
  const rolledUpHolidayPayMinor =
    input.holidayPayMode === 'rolled_up_separate' ? (input.rolledUpHolidayPayMinor ?? 0) : 0
  const sicknessOrStatutoryPayMinor = input.sicknessOrStatutoryPayMinor ?? 0

  if (allowancesMinor) {
    detailLines.push({
      label: 'Approved allowance',
      hoursCenti: null,
      rateMinor: null,
      amountMinor: allowancesMinor,
      kind: 'fixed',
    })
  }
  if (bonusesMinor) {
    detailLines.push({
      label: 'Bonus',
      hoursCenti: null,
      rateMinor: null,
      amountMinor: bonusesMinor,
      kind: 'fixed',
    })
  }
  if (backPayMinor) {
    detailLines.push({
      label: 'Back pay',
      hoursCenti: null,
      rateMinor: null,
      amountMinor: backPayMinor,
      kind: 'fixed',
    })
  }
  if (holidayPayMinor) {
    detailLines.push({
      label: 'Holiday pay',
      hoursCenti: null,
      rateMinor: null,
      amountMinor: holidayPayMinor,
      kind: 'holiday',
    })
  }
  if (rolledUpHolidayPayMinor) {
    detailLines.push({
      label: 'Rolled-up holiday pay (separate)',
      hoursCenti: null,
      rateMinor: null,
      amountMinor: rolledUpHolidayPayMinor,
      kind: 'holiday',
    })
  }
  if (sicknessOrStatutoryPayMinor) {
    detailLines.push({
      label: 'Sickness / statutory pay',
      hoursCenti: null,
      rateMinor: null,
      amountMinor: sicknessOrStatutoryPayMinor,
      kind: 'fixed',
    })
  }

  const grossPayMinor = addMinor(
    basicPayMinor,
    overtimePayMinor,
    premiumPayMinor,
    holidayPayMinor,
    rolledUpHolidayPayMinor,
    sicknessOrStatutoryPayMinor,
    allowancesMinor,
    bonusesMinor,
    backPayMinor,
  )

  const payableHoursCenti = days.reduce((s, d) => s + payableHoursForDay(d), 0)
  const regulatedWorkingTimeCenti = days.reduce((s, d) => s + regulatedWorkingTimeForDay(d), 0)

  // NMW: working time beyond driving may count — use regulated working time excl. unpaid breaks.
  const workingTimeForNmwCenti = regulatedWorkingTimeCenti
  const nmwHourlyMinor = input.nmwHourlyMinor ?? DEFAULT_NMW_HOURLY_MINOR
  const effectiveHourlyMinor =
    workingTimeForNmwCenti > 0 ? Math.floor((grossPayMinor * 100) / workingTimeForNmwCenti) : 0
  const passed = workingTimeForNmwCenti === 0 || effectiveHourlyMinor >= nmwHourlyMinor

  return {
    lines: detailLines,
    basicPayMinor,
    overtimePayMinor,
    premiumPayMinor,
    holidayPayMinor,
    rolledUpHolidayPayMinor,
    sicknessOrStatutoryPayMinor,
    allowancesMinor,
    bonusesMinor,
    backPayMinor,
    grossPayMinor,
    payableHoursCenti,
    regulatedWorkingTimeCenti,
    nmwCheck: {
      nmwHourlyMinor,
      effectiveHourlyMinor,
      workingTimeForNmwCenti,
      passed,
      detail: passed
        ? `Effective hourly pay ${formatMoneyMinor(effectiveHourlyMinor)} meets NMW ${formatMoneyMinor(nmwHourlyMinor)}.`
        : `Effective hourly pay ${formatMoneyMinor(effectiveHourlyMinor)} is below NMW ${formatMoneyMinor(nmwHourlyMinor)}.`,
    },
    formulaVersion: WAGE_GROSS_FORMULA_VERSION,
  }
}

function formatMoneyMinor(minor: number): string {
  const major = Math.floor(minor / 100)
  const pence = String(minor % 100).padStart(2, '0')
  return `£${major}.${pence}`
}

export type HoursValidationIssue = {
  code: string
  severity: 'attention' | 'critical'
  title: string
  detail: string
  driverDayId?: string
  employeeCostReferenceId?: string
}

/** Validate driver-days before approval / export. */
export function validateDriverDays(input: {
  days: DriverDayRecord[]
  rates: EffectivePayRate[]
}): HoursValidationIssue[] {
  const issues: HoursValidationIssue[] = []
  for (const day of input.days) {
    if (day.disputed) {
      issues.push({
        code: 'disputed_hours',
        severity: 'critical',
        title: `Disputed hours on ${day.workDate}`,
        detail: 'No disputed hours may reach the payroll provider.',
        driverDayId: day.id,
        employeeCostReferenceId: day.employeeCostReferenceId,
      })
    }
    const payable = payableHoursForDay(day)
    const tachographOnly =
      day.source === 'tachograph' &&
      day.lines.every((l) => l.category === 'basic' || l.category === 'overtime') &&
      !day.lines.some((l) =>
        ['other_work', 'training', 'period_of_availability'].includes(l.category),
      )
    if (tachographOnly && payable > 0) {
      issues.push({
        code: 'tachograph_incomplete_payable',
        severity: 'attention',
        title: `Tachograph-only day ${day.workDate}`,
        detail:
          'Tachograph driving time is not the whole payable day. Confirm checks, cleaning, loading and other work separately.',
        driverDayId: day.id,
        employeeCostReferenceId: day.employeeCostReferenceId,
      })
    }
    try {
      resolveRateForDate(input.rates, day.employeeCostReferenceId, day.workDate)
    } catch {
      issues.push({
        code: 'missing_pay_rate',
        severity: 'critical',
        title: `No pay rate on ${day.workDate}`,
        detail: 'Effective-dated pay rules are required before wage cost can be calculated.',
        driverDayId: day.id,
        employeeCostReferenceId: day.employeeCostReferenceId,
      })
    }
  }
  return issues
}
