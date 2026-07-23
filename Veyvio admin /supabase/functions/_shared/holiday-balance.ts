/** Holiday entitlement — minutes ledger + fixed_days balance (Phase 1). */
import { admin, authenticate } from './supabase.ts'
import { apiError, json, readJson } from './http.ts'
import { notifyCompanyAdmins, notifyDriverAppUser } from './notifications.ts'

type Row = Record<string, unknown>

export const DEFAULT_STANDARD_DAY_MINUTES = 480
export const DEFAULT_ENTITLEMENT_WEEKS = 5.6

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function parseIsoDate(value: string) {
  const [y, m, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y!, (m ?? 1) - 1, day ?? 1))
}

function addDays(iso: string, days: number) {
  const d = parseIsoDate(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return isoDate(d)
}

/** Inclusive weekday count — prefers profile working_weekdays (ISO 1=Mon…7=Sun). */
export function countWeekdaysInclusive(
  startIso: string,
  endIso: string,
  workingWeekdays?: number[],
): number {
  if (!startIso || !endIso || endIso < startIso) return 0
  const allowed = new Set(workingWeekdays?.length ? workingWeekdays : [1, 2, 3, 4, 5])
  let count = 0
  let cur = startIso
  let guard = 0
  while (cur <= endIso && guard < 400) {
    const jsDow = parseIsoDate(cur).getUTCDay() // 0 Sun … 6 Sat
    const isoDow = jsDow === 0 ? 7 : jsDow
    if (allowed.has(isoDow)) count += 1
    cur = addDays(cur, 1)
    guard += 1
  }
  return count
}

export function leaveMinutesForRequest(input: {
  startDate: string
  endDate: string
  partialDay?: boolean
  standardDayMinutes: number
  workingWeekdays?: number[]
}): number {
  const days = countWeekdaysInclusive(input.startDate, input.endDate, input.workingWeekdays)
  const dayMinutes = Math.max(1, input.standardDayMinutes || DEFAULT_STANDARD_DAY_MINUTES)
  if (input.partialDay) {
    return Math.round(days * dayMinutes * 0.5)
  }
  return days * dayMinutes
}

export function leaveTypeDeductsBalance(leaveType: string): boolean {
  return ['annual_leave', 'holiday', 'bereavement'].includes(leaveType)
}

export function computeEntitlementMinutes(input: {
  method: string
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
      Number(input.contractedHoursPerWeek || 40) * Number(input.entitlementWeeks || 5.6) * 60,
    )
  }
  if (method === 'irregular_hours') {
    return Math.round(input.manualAnnualMinutes ?? 0)
  }
  if (input.manualAnnualMinutes != null && input.manualAnnualMinutes > 0) {
    return Math.round(input.manualAnnualMinutes)
  }
  const days =
    Number(input.contractedDaysPerWeek || 5) * Number(input.entitlementWeeks || DEFAULT_ENTITLEMENT_WEEKS)
  return Math.round(days * Number(input.standardDayMinutes || DEFAULT_STANDARD_DAY_MINUTES))
}

export function resolveLeaveYearBounds(input: {
  mode: string
  asOf?: string
  employmentStartDate?: string | null
  customStartMonth?: number | null
  customStartDay?: number | null
}): { start: string; end: string } {
  const asOf = input.asOf ?? isoDate(new Date())
  const asOfDate = parseIsoDate(asOf)
  const year = asOfDate.getUTCFullYear()
  const mode = input.mode || 'calendar'

  if (mode === 'financial') {
    // UK financial year 6 Apr – 5 Apr
    const startYear = asOfDate.getUTCMonth() > 3 || (asOfDate.getUTCMonth() === 3 && asOfDate.getUTCDate() >= 6)
      ? year
      : year - 1
    return {
      start: `${startYear}-04-06`,
      end: `${startYear + 1}-04-05`,
    }
  }

  if (mode === 'anniversary' && input.employmentStartDate) {
    const start = parseIsoDate(input.employmentStartDate)
    const month = start.getUTCMonth()
    const day = start.getUTCDate()
    let startYear = year
    const candidate = new Date(Date.UTC(year, month, day))
    if (asOfDate < candidate) startYear = year - 1
    const startIso = `${startYear}-${pad2(month + 1)}-${pad2(day)}`
    const endDate = new Date(Date.UTC(startYear + 1, month, day))
    endDate.setUTCDate(endDate.getUTCDate() - 1)
    return { start: startIso, end: isoDate(endDate) }
  }

  if (mode === 'custom' && input.customStartMonth && input.customStartDay) {
    const month = input.customStartMonth - 1
    const day = input.customStartDay
    let startYear = year
    const candidate = new Date(Date.UTC(year, month, day))
    if (asOfDate < candidate) startYear = year - 1
    const startIso = `${startYear}-${pad2(month + 1)}-${pad2(day)}`
    const endDate = new Date(Date.UTC(startYear + 1, month, day))
    endDate.setUTCDate(endDate.getUTCDate() - 1)
    return { start: startIso, end: isoDate(endDate) }
  }

  // calendar
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export function minutesToDisplayDays(minutes: number, standardDayMinutes: number) {
  const day = Math.max(1, standardDayMinutes || DEFAULT_STANDARD_DAY_MINUTES)
  const days = minutes / day
  return Math.round(days * 100) / 100
}

export function formatLeaveYearLabel(start: string, end: string) {
  const fmt = (iso: string) => {
    const d = parseIsoDate(iso)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  return `${fmt(start)}–${fmt(end)}`
}

async function ensureCompanyDefaults(companyId: string, userId?: string | null) {
  const { data: existing } = await admin
    .from('company_holiday_defaults')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()
  if (existing) return existing as Row

  const row = {
    company_id: companyId,
    leave_year_mode: 'calendar',
    entitlement_weeks: DEFAULT_ENTITLEMENT_WEEKS,
    bank_holidays_included: true,
    carry_over_limit_days: 5,
    carry_over_expiry_months: 3,
    requests_require_approval: true,
    standard_day_minutes: DEFAULT_STANDARD_DAY_MINUTES,
    rounding_policy: 'nearest_quarter_hour',
    allow_negative_balance: false,
    default_calculation_method: 'fixed_days',
    default_contracted_days_per_week: 5,
    default_contracted_hours_per_week: 40,
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null,
  }
  const { data, error } = await admin
    .from('company_holiday_defaults')
    .upsert(row)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Row
}

export async function ensureDriverHolidayProfile(input: {
  companyId: string
  driverId: string
  userId?: string | null
  patch?: Row
}) {
  const defaults = await ensureCompanyDefaults(input.companyId, input.userId)
  const { data: existing } = await admin
    .from('driver_holiday_profiles')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .maybeSingle()

  const mode = String(
    input.patch?.leave_year_mode ?? existing?.leave_year_mode ?? defaults.leave_year_mode ?? 'calendar',
  )
  const year = resolveLeaveYearBounds({
    mode,
    employmentStartDate: (input.patch?.employment_start_date ??
      existing?.employment_start_date) as string | null,
    customStartMonth: defaults.custom_leave_year_start_month as number | null,
    customStartDay: defaults.custom_leave_year_start_day as number | null,
  })

  const contractedDays = Number(
    input.patch?.contracted_days_per_week ??
      existing?.contracted_days_per_week ??
      defaults.default_contracted_days_per_week ??
      5,
  )
  const entitlementWeeks = Number(
    input.patch?.entitlement_weeks ?? existing?.entitlement_weeks ?? defaults.entitlement_weeks ?? 5.6,
  )
  const standardDayMinutes = Number(
    input.patch?.standard_day_minutes ??
      existing?.standard_day_minutes ??
      defaults.standard_day_minutes ??
      DEFAULT_STANDARD_DAY_MINUTES,
  )
  const method = String(
    input.patch?.calculation_method ??
      existing?.calculation_method ??
      defaults.default_calculation_method ??
      'fixed_days',
  )

  const contractedHours = Number(
    input.patch?.contracted_hours_per_week ??
      existing?.contracted_hours_per_week ??
      defaults.default_contracted_hours_per_week ??
      40,
  )
  const annualEntitlementMinutes = computeEntitlementMinutes({
    method,
    contractedDaysPerWeek: contractedDays,
    contractedHoursPerWeek: contractedHours,
    entitlementWeeks,
    standardDayMinutes,
    manualAnnualMinutes:
      input.patch?.annual_entitlement_minutes != null
        ? Number(input.patch.annual_entitlement_minutes)
        : existing?.annual_entitlement_minutes != null && Number(existing.annual_entitlement_minutes) > 0
          ? Number(existing.annual_entitlement_minutes)
          : null,
  })

  // If profile already has explicit minutes and no patch override entitlement calc fields, keep unless zero.
  let entitlementMinutes = annualEntitlementMinutes
  if (
    existing &&
    !input.patch?.annual_entitlement_minutes &&
    !input.patch?.contracted_days_per_week &&
    !input.patch?.contracted_hours_per_week &&
    !input.patch?.entitlement_weeks &&
    !input.patch?.standard_day_minutes &&
    !input.patch?.calculation_method &&
    Number(existing.annual_entitlement_minutes) > 0
  ) {
    entitlementMinutes = Number(existing.annual_entitlement_minutes)
  }

  const workingWeekdays = Array.isArray(input.patch?.working_weekdays)
    ? (input.patch!.working_weekdays as number[])
    : Array.isArray(existing?.working_weekdays)
      ? (existing!.working_weekdays as number[])
      : [1, 2, 3, 4, 5]

  const payload: Row = {
    company_id: input.companyId,
    driver_id: input.driverId,
    leave_year_mode: mode,
    leave_year_start: year.start,
    leave_year_end: year.end,
    calculation_method: method,
    entitlement_weeks: entitlementWeeks,
    contracted_days_per_week: contractedDays,
    contracted_hours_per_week: contractedHours,
    standard_day_minutes: standardDayMinutes,
    annual_entitlement_minutes: entitlementMinutes,
    working_weekdays: workingWeekdays,
    usual_weekly_pay_pence:
      input.patch?.usual_weekly_pay_pence ?? existing?.usual_weekly_pay_pence ?? null,
    average_52_week_pay_pence:
      input.patch?.average_52_week_pay_pence ?? existing?.average_52_week_pay_pence ?? null,
    carried_forward_minutes: Number(
      input.patch?.carried_forward_minutes ?? existing?.carried_forward_minutes ?? 0,
    ),
    carry_forward_expires_at:
      input.patch?.carry_forward_expires_at ?? existing?.carry_forward_expires_at ?? null,
    bank_holidays_included: Boolean(
      input.patch?.bank_holidays_included ??
        existing?.bank_holidays_included ??
        defaults.bank_holidays_included ??
        true,
    ),
    allow_negative_balance: Boolean(
      input.patch?.allow_negative_balance ??
        existing?.allow_negative_balance ??
        defaults.allow_negative_balance ??
        false,
    ),
    maximum_negative_minutes:
      input.patch?.maximum_negative_minutes ??
      existing?.maximum_negative_minutes ??
      defaults.maximum_negative_minutes ??
      null,
    rounding_policy: String(
      input.patch?.rounding_policy ?? existing?.rounding_policy ?? defaults.rounding_policy ?? 'nearest_quarter_hour',
    ),
    approval_manager_user_id:
      input.patch?.approval_manager_user_id ?? existing?.approval_manager_user_id ?? null,
    employment_start_date:
      input.patch?.employment_start_date ?? existing?.employment_start_date ?? null,
    employment_end_date: input.patch?.employment_end_date ?? existing?.employment_end_date ?? null,
    updated_at: new Date().toISOString(),
    updated_by: input.userId ?? null,
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from('driver_holiday_profiles')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Row
  }

  const { data, error } = await admin
    .from('driver_holiday_profiles')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Row
}

async function ensureOpeningLedgerEntries(input: {
  companyId: string
  driverId: string
  profile: Row
  userId?: string | null
  actorName?: string
}) {
  const yearStart = String(input.profile.leave_year_start)
  const yearEnd = String(input.profile.leave_year_end)
  const { data: existing } = await admin
    .from('holiday_ledger_entries')
    .select('id, entry_type')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('leave_year_start', yearStart)
    .in('entry_type', ['opening_entitlement', 'carry_forward'])

  const types = new Set((existing ?? []).map((r) => String(r.entry_type)))
  const rows: Row[] = []

  if (!types.has('opening_entitlement')) {
    rows.push({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_year_start: yearStart,
      leave_year_end: yearEnd,
      entry_type: 'opening_entitlement',
      minutes: Number(input.profile.annual_entitlement_minutes ?? 0),
      effective_at: yearStart,
      reason: 'Opening entitlement for leave year',
      created_by: input.userId ?? null,
      created_by_name: input.actorName ?? 'System',
    })
  }

  const carry = Number(input.profile.carried_forward_minutes ?? 0)
  if (carry > 0 && !types.has('carry_forward')) {
    rows.push({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_year_start: yearStart,
      leave_year_end: yearEnd,
      entry_type: 'carry_forward',
      minutes: carry,
      effective_at: yearStart,
      reason: 'Carried forward from previous leave year',
      created_by: input.userId ?? null,
      created_by_name: input.actorName ?? 'System',
    })
  }

  if (rows.length) {
    const { error } = await admin.from('holiday_ledger_entries').insert(rows)
    if (error) throw new Error(error.message)
  }
}

export async function computeHolidayBalance(input: {
  companyId: string
  driverId: string
  userId?: string | null
}) {
  const profile = await ensureDriverHolidayProfile({
    companyId: input.companyId,
    driverId: input.driverId,
    userId: input.userId,
  })
  await ensureOpeningLedgerEntries({
    companyId: input.companyId,
    driverId: input.driverId,
    profile,
    userId: input.userId,
  })

  const yearStart = String(profile.leave_year_start)
  const yearEnd = String(profile.leave_year_end)
  const standardDayMinutes = Number(profile.standard_day_minutes ?? DEFAULT_STANDARD_DAY_MINUTES)
  const today = isoDate(new Date())

  const [{ data: ledger }, { data: leaveRows }] = await Promise.all([
    admin
      .from('holiday_ledger_entries')
      .select('*')
      .eq('company_id', input.companyId)
      .eq('driver_id', input.driverId)
      .eq('leave_year_start', yearStart)
      .order('effective_at', { ascending: true }),
    admin
      .from('attendance_leave_requests')
      .select('*')
      .eq('company_id', input.companyId)
      .eq('person_id', input.driverId)
      .eq('person_kind', 'driver')
      .in('status', ['pending', 'approved', 'moved']),
  ])

  let opening = 0
  let accrued = 0
  let carriedForward = 0
  let positiveAdj = 0
  let negativeAdj = 0
  let taken = 0
  let approvedFuture = 0

  const carryExpires = profile.carry_forward_expires_at
    ? String(profile.carry_forward_expires_at).slice(0, 10)
    : null
  const carryExpired = Boolean(carryExpires && today > carryExpires)

  for (const raw of ledger ?? []) {
    const row = raw as Row
    const type = String(row.entry_type)
    const minutes = Number(row.minutes ?? 0)
    const effective = String(row.effective_at ?? '').slice(0, 10)

    if (type === 'opening_entitlement') opening += minutes
    else if (type === 'accrual') accrued += minutes
    else if (type === 'carry_forward') {
      if (!carryExpired) carriedForward += minutes
    } else if (type === 'manual_adjustment') {
      if (minutes >= 0) positiveAdj += minutes
      else negativeAdj += Math.abs(minutes)
    } else if (type === 'approved_leave') {
      const abs = Math.abs(minutes)
      if (effective > today) approvedFuture += abs
      else taken += abs
    } else if (type === 'leave_reversal') {
      if (effective > today) approvedFuture = Math.max(0, approvedFuture - minutes)
      else taken = Math.max(0, taken - minutes)
    } else if (type === 'expiry' || type === 'termination_payment') {
      negativeAdj += Math.abs(minutes)
    }
  }

  const remainingMinutes =
    opening + accrued + carriedForward + positiveAdj - taken - approvedFuture - negativeAdj

  const pendingAnnual = (leaveRows ?? []).filter((r) => {
    const row = r as Row
    return (
      String(row.status) === 'pending' &&
      ['annual_leave', 'holiday'].includes(String(row.leave_type))
    )
  })

  let pendingMinutes = 0
  for (const raw of pendingAnnual) {
    const row = raw as Row
    pendingMinutes += leaveMinutesForRequest({
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      partialDay: Boolean(row.partial_day),
      standardDayMinutes,
    })
  }

  const approvedLeaveRows = (leaveRows ?? []).filter((r) => {
    const s = String((r as Row).status)
    return s === 'approved' || s === 'moved'
  })

  const nextApproved = [...approvedLeaveRows]
    .map((r) => r as Row)
    .filter((r) => String(r.end_date) >= today)
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0]

  const entitlementMinutes = opening + carriedForward + accrued + positiveAdj
  const toDays = (m: number) => minutesToDisplayDays(m, standardDayMinutes)

  return {
    driverId: input.driverId,
    leaveYearStart: yearStart,
    leaveYearEnd: yearEnd,
    leaveYearLabel: formatLeaveYearLabel(yearStart, yearEnd),
    calculationMethod: String(profile.calculation_method),
    standardDayMinutes,
    displayUnit:
      profile.calculation_method === 'fixed_hours' || profile.calculation_method === 'irregular_hours'
        ? 'hours'
        : 'days',
    bankHolidaysIncluded: Boolean(profile.bank_holidays_included),
    contractedDaysPerWeek: Number(profile.contracted_days_per_week),
    entitlementWeeks: Number(profile.entitlement_weeks),
    minutes: {
      openingEntitlement: opening,
      accrued,
      carriedForward,
      positiveAdjustments: positiveAdj,
      negativeAdjustments: negativeAdj,
      taken,
      approvedFuture,
      pending: pendingMinutes,
      remaining: remainingMinutes,
      remainingIfPendingApproved: remainingMinutes - pendingMinutes,
      entitlementTotal: entitlementMinutes,
    },
    days: {
      openingEntitlement: toDays(opening),
      accrued: toDays(accrued),
      carriedForward: toDays(carriedForward),
      positiveAdjustments: toDays(positiveAdj),
      negativeAdjustments: toDays(negativeAdj),
      taken: toDays(taken),
      approvedFuture: toDays(approvedFuture),
      pending: toDays(pendingMinutes),
      remaining: toDays(remainingMinutes),
      remainingIfPendingApproved: toDays(remainingMinutes - pendingMinutes),
      entitlementTotal: toDays(entitlementMinutes),
    },
    pendingRequestCount: pendingAnnual.length,
    nextApprovedHoliday: nextApproved
      ? {
          startDate: String(nextApproved.start_date),
          endDate: String(nextApproved.end_date),
          leaveType: String(nextApproved.leave_type),
          workingDays: countWeekdaysInclusive(
            String(nextApproved.start_date),
            String(nextApproved.end_date),
          ),
          reference: String(nextApproved.reference ?? ''),
        }
      : null,
    profile: mapHolidayProfile(profile),
    ledger: (ledger ?? []).map((r) => mapLedgerEntry(r as Row)),
  }
}

function mapHolidayProfile(row: Row) {
  return {
    id: row.id,
    driverId: row.driver_id,
    leaveYearMode: row.leave_year_mode,
    leaveYearStart: row.leave_year_start,
    leaveYearEnd: row.leave_year_end,
    calculationMethod: row.calculation_method,
    entitlementWeeks: Number(row.entitlement_weeks),
    contractedDaysPerWeek: Number(row.contracted_days_per_week),
    contractedHoursPerWeek: Number(row.contracted_hours_per_week),
    standardDayMinutes: Number(row.standard_day_minutes),
    annualEntitlementMinutes: Number(row.annual_entitlement_minutes),
    workingWeekdays: Array.isArray(row.working_weekdays) ? row.working_weekdays : [1, 2, 3, 4, 5],
    usualWeeklyPayPence: row.usual_weekly_pay_pence ?? null,
    average52WeekPayPence: row.average_52_week_pay_pence ?? null,
    carriedForwardMinutes: Number(row.carried_forward_minutes),
    carryForwardExpiresAt: row.carry_forward_expires_at ?? null,
    bankHolidaysIncluded: Boolean(row.bank_holidays_included),
    allowNegativeBalance: Boolean(row.allow_negative_balance),
    maximumNegativeMinutes: row.maximum_negative_minutes ?? null,
    roundingPolicy: row.rounding_policy,
    employmentStartDate: row.employment_start_date ?? null,
    employmentEndDate: row.employment_end_date ?? null,
  }
}

function mapLedgerEntry(row: Row) {
  return {
    id: row.id,
    type: row.entry_type,
    minutes: Number(row.minutes),
    effectiveAt: row.effective_at,
    referenceId: row.reference_id ?? null,
    referenceType: row.reference_type ?? null,
    reason: row.reason ?? null,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  }
}

export async function postApprovedLeaveLedger(input: {
  companyId: string
  driverId: string
  leaveRequestId: string
  startDate: string
  endDate: string
  partialDay?: boolean
  leaveType: string
  userId?: string | null
  actorName: string
}) {
  if (!leaveTypeDeductsBalance(input.leaveType)) return null

  const profile = await ensureDriverHolidayProfile({
    companyId: input.companyId,
    driverId: input.driverId,
    userId: input.userId,
  })
  await ensureOpeningLedgerEntries({
    companyId: input.companyId,
    driverId: input.driverId,
    profile,
    userId: input.userId,
    actorName: input.actorName,
  })

  // Idempotent: skip if already posted for this leave request
  const { data: existing } = await admin
    .from('holiday_ledger_entries')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('reference_type', 'leave_request')
    .eq('reference_id', input.leaveRequestId)
    .eq('entry_type', 'approved_leave')
    .maybeSingle()
  if (existing) return existing

  const workingWeekdays = Array.isArray(profile.working_weekdays)
    ? (profile.working_weekdays as number[])
    : [1, 2, 3, 4, 5]
  const minutes = leaveMinutesForRequest({
    startDate: input.startDate,
    endDate: input.endDate,
    partialDay: input.partialDay,
    standardDayMinutes: Number(profile.standard_day_minutes),
    workingWeekdays,
  })
  if (minutes <= 0) return null

  const { data, error } = await admin
    .from('holiday_ledger_entries')
    .insert({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_year_start: profile.leave_year_start,
      leave_year_end: profile.leave_year_end,
      entry_type: 'approved_leave',
      minutes: -minutes,
      effective_at: input.startDate,
      reference_id: input.leaveRequestId,
      reference_type: 'leave_request',
      reason: `Approved leave ${input.startDate} → ${input.endDate}`,
      created_by: input.userId ?? null,
      created_by_name: input.actorName,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)

  // Separate holiday-pay calculation record (payroll), not entitlement.
  try {
    const method = String(profile.calculation_method ?? 'fixed_days')
    const irregular = method === 'irregular_hours'
    const weekly = irregular
      ? (profile.average_52_week_pay_pence as number | null)
      : (profile.usual_weekly_pay_pence as number | null)
    const weekMinutes = 5 * 480
    const calculatedPayPence =
      weekly != null && weekly > 0 ? Math.round((minutes / weekMinutes) * Number(weekly)) : null
    await admin.from('holiday_pay_records').insert({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_request_id: input.leaveRequestId,
      leave_year_start: profile.leave_year_start,
      minutes_paid: minutes,
      basis: irregular ? 'average_52_weeks' : 'usual_pay',
      average_weekly_pay_pence: weekly,
      calculated_pay_pence: calculatedPayPence,
      notes: irregular
        ? 'Holiday pay based on average pay over the previous 52 paid weeks (payroll).'
        : 'Holiday pay based on usual contractual pay for fixed-hours workers.',
      created_by: input.userId ?? null,
    })
  } catch {
    // Pay table may not exist yet in older envs — entitlement still posts.
  }
  return data
}

export async function reverseApprovedLeaveLedger(input: {
  companyId: string
  driverId: string
  leaveRequestId: string
  userId?: string | null
  actorName: string
  reason: string
}) {
  const { data: original } = await admin
    .from('holiday_ledger_entries')
    .select('*')
    .eq('company_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('reference_type', 'leave_request')
    .eq('reference_id', input.leaveRequestId)
    .eq('entry_type', 'approved_leave')
    .maybeSingle()
  if (!original) return null

  const minutes = Math.abs(Number(original.minutes ?? 0))
  if (minutes <= 0) return null

  const { data: already } = await admin
    .from('holiday_ledger_entries')
    .select('id')
    .eq('reference_type', 'leave_request')
    .eq('reference_id', input.leaveRequestId)
    .eq('entry_type', 'leave_reversal')
    .maybeSingle()
  if (already) return already

  const { data, error } = await admin
    .from('holiday_ledger_entries')
    .insert({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_year_start: original.leave_year_start,
      leave_year_end: original.leave_year_end,
      entry_type: 'leave_reversal',
      minutes,
      effective_at: original.effective_at,
      reference_id: input.leaveRequestId,
      reference_type: 'leave_request',
      reason: input.reason,
      created_by: input.userId ?? null,
      created_by_name: input.actorName,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function postManualHolidayAdjustment(input: {
  companyId: string
  driverId: string
  minutes: number
  reason: string
  effectiveAt?: string
  userId?: string | null
  actorName: string
}) {
  if (!input.reason.trim()) throw new Error('Adjustment reason is required')
  const profile = await ensureDriverHolidayProfile({
    companyId: input.companyId,
    driverId: input.driverId,
    userId: input.userId,
  })
  await ensureOpeningLedgerEntries({
    companyId: input.companyId,
    driverId: input.driverId,
    profile,
    userId: input.userId,
    actorName: input.actorName,
  })

  const { data, error } = await admin
    .from('holiday_ledger_entries')
    .insert({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_year_start: profile.leave_year_start,
      leave_year_end: profile.leave_year_end,
      entry_type: 'manual_adjustment',
      minutes: Math.round(input.minutes),
      effective_at: (input.effectiveAt ?? isoDate(new Date())).slice(0, 10),
      reason: input.reason.trim(),
      created_by: input.userId ?? null,
      created_by_name: input.actorName,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

const DRIVER_LEAVE_TYPE_MAP: Record<string, string> = {
  holiday: 'annual_leave',
  annual_leave: 'annual_leave',
  unpaid: 'unpaid_leave',
  unpaid_leave: 'unpaid_leave',
  sick: 'sick_leave',
  sick_leave: 'sick_leave',
  training: 'training',
  medical_appointment: 'medical_appointment',
  emergency: 'emergency_leave',
  emergency_leave: 'emergency_leave',
  compassionate: 'bereavement',
  bereavement: 'bereavement',
  other: 'other',
}

/** Accrue irregular-hours entitlement at 12.07% of hours worked. */
export async function postIrregularHoursAccrual(input: {
  companyId: string
  driverId: string
  hoursWorked: number
  effectiveAt?: string
  reason?: string
  userId?: string | null
  actorName: string
}) {
  const hours = Number(input.hoursWorked)
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('Hours worked must be a positive number')
  }
  const profile = await ensureDriverHolidayProfile({
    companyId: input.companyId,
    driverId: input.driverId,
    userId: input.userId,
  })
  await ensureOpeningLedgerEntries({
    companyId: input.companyId,
    driverId: input.driverId,
    profile,
    userId: input.userId,
    actorName: input.actorName,
  })
  const minutes = Math.round(hours * 0.1207 * 60)
  const { data, error } = await admin
    .from('holiday_ledger_entries')
    .insert({
      company_id: input.companyId,
      driver_id: input.driverId,
      leave_year_start: profile.leave_year_start,
      leave_year_end: profile.leave_year_end,
      entry_type: 'accrual',
      minutes,
      effective_at: (input.effectiveAt ?? isoDate(new Date())).slice(0, 10),
      reason: input.reason?.trim() || `Irregular hours accrual (${hours}h × 12.07%)`,
      created_by: input.userId ?? null,
      created_by_name: input.actorName,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function resolveDriverFromAuth(context: {
  companyId: string
  user: { id: string }
}) {
  const { data: appAccount, error } = await admin
    .from('driver_app_accounts')
    .select('driver_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (error) throw new Error('Driver account could not be loaded')
  if (!appAccount?.driver_id) return null
  return String(appAccount.driver_id)
}

async function loadDriverPerson(companyId: string, driverId: string) {
  const { data, error } = await admin
    .from('drivers')
    .select('id, driver_number, staff_members(first_name, last_name), primary_depot_id')
    .eq('company_id', companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const staff = (data.staff_members as Row | Row[] | null) ?? null
  const staffRow = Array.isArray(staff) ? staff[0] ?? null : staff
  let depotName: string | null = null
  if (data.primary_depot_id) {
    const { data: depot } = await admin
      .from('depots')
      .select('name')
      .eq('id', data.primary_depot_id)
      .maybeSingle()
    depotName = depot?.name ? String(depot.name) : null
  }
  const first = String(staffRow?.first_name ?? '')
  const last = String(staffRow?.last_name ?? '')
  return {
    personName: `${first} ${last}`.trim() || 'Driver',
    personNumber: data.driver_number ? String(data.driver_number) : null,
    depotName,
  }
}

function mapLeaveForDriver(row: Row) {
  const leaveType = String(row.leave_type)
  const status = String(row.status)
  const statusMap: Record<string, string> = {
    pending: 'requested',
    approved: 'approved',
    rejected: 'rejected',
    cancelled: 'cancelled',
    moved: 'approved',
  }
  const typeMap: Record<string, string> = {
    annual_leave: 'holiday',
    sick_leave: 'sick',
    training: 'training',
  }
  return {
    id: row.id,
    absenceType: typeMap[leaveType] ?? leaveType,
    absenceLabel:
      leaveType === 'annual_leave'
        ? 'Holiday'
        : leaveType === 'sick_leave'
          ? 'Sickness'
          : leaveType.replace(/_/g, ' '),
    status: statusMap[status] ?? status,
    statusLabel:
      status === 'pending'
        ? 'Pending approval'
        : status === 'approved' || status === 'moved'
          ? 'Approved'
          : status === 'rejected'
            ? 'Declined'
            : status.replace(/_/g, ' '),
    dateFrom: row.start_date,
    dateTo: row.end_date,
    partOfDay: row.partial_day ? 'am' : 'full_day',
    reason: row.reason ?? '',
    notes: null,
    createdAt: row.submitted_at ?? row.created_at,
    decidedAt: row.decided_at ?? null,
    decidedBy: row.decided_by ?? null,
    reference: row.reference,
    leaveType,
    source: 'command',
  }
}

/** GET /driver/holiday/balance */
export async function driverHolidayBalance(request: Request) {
  const context = await authenticate(request)
  const driverId = await resolveDriverFromAuth(context)
  if (!driverId) return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  try {
    const balance = await computeHolidayBalance({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
    })
    return json(balance)
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : 'Holiday balance failed')
  }
}

/** GET /driver/holiday/requests */
export async function driverHolidayListRequests(request: Request) {
  const context = await authenticate(request)
  const driverId = await resolveDriverFromAuth(context)
  if (!driverId) return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')

  const { data, error } = await admin
    .from('attendance_leave_requests')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('person_id', driverId)
    .eq('person_kind', 'driver')
    .order('start_date', { ascending: false })
    .limit(50)
  if (error) return apiError(500, error.message)
  return json({
    driverId,
    items: (data ?? []).map((r) => mapLeaveForDriver(r as Row)),
  })
}

/** POST /driver/holiday/requests */
export async function driverHolidaySubmitRequest(request: Request) {
  const context = await authenticate(request)
  const driverId = await resolveDriverFromAuth(context)
  if (!driverId) return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')

  const body = await readJson<Row>(request)
  const dateFrom = String(body.dateFrom ?? body.startDate ?? '').slice(0, 10)
  const dateTo = String(body.dateTo ?? body.endDate ?? '').slice(0, 10)
  const absenceType = String(body.absenceType ?? body.leaveType ?? 'holiday')
  const leaveType = DRIVER_LEAVE_TYPE_MAP[absenceType] ?? 'other'
  const partOfDay = String(body.partOfDay ?? 'full_day')
  const reason = String(body.reason ?? body.notes ?? '').trim()

  if (!dateFrom || !dateTo) return apiError(400, 'Choose a start and end date.')
  if (dateTo < dateFrom) return apiError(400, 'End date must be on or after the start date.')
  if (leaveType === 'sick_leave' && !reason) {
    return apiError(400, 'Add a short reason for sickness leave.')
  }

  const person = await loadDriverPerson(context.companyId, driverId)
  if (!person) return apiError(404, 'Driver not found', 'not_found')

  const profile = await ensureDriverHolidayProfile({
    companyId: context.companyId,
    driverId,
    userId: context.user.id,
  })

  const partialDay = partOfDay === 'am' || partOfDay === 'pm' || partOfDay === 'half_day'
  const requestMinutes =
    leaveType === 'annual_leave'
      ? leaveMinutesForRequest({
          startDate: dateFrom,
          endDate: dateTo,
          partialDay,
          standardDayMinutes: Number(profile.standard_day_minutes),
        })
      : 0

  const id = crypto.randomUUID()
  const reference = `LV-${id.slice(0, 8).toUpperCase()}`
  const workingDays = countWeekdaysInclusive(dateFrom, dateTo)

  const payload = {
    id,
    company_id: context.companyId,
    person_id: driverId,
    person_kind: 'driver',
    person_name: person.personName,
    person_number: person.personNumber,
    depot_name: person.depotName,
    reference,
    leave_type: leaveType,
    status: 'pending',
    start_date: dateFrom,
    end_date: dateTo,
    start_time: null,
    end_time: null,
    partial_day: partialDay,
    reason: reason || `${person.personName} requested time off`,
    attachment_label: null,
    submitted_at: new Date().toISOString(),
    decided_at: null,
    decided_by: null,
    impact: {
      tripsAffected: 0,
      schoolRoutesAffected: 0,
      passengersAffected: 0,
      replacementRequired: false,
      readinessPercent: 100,
      readinessBand: 'high',
      readinessSummary: 'Impact not calculated yet — review before approval.',
      requestMinutes,
      workingDays,
    },
    previous_window: null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('attendance_leave_requests')
    .insert(payload)
    .select('*')
    .single()
  if (error) return apiError(500, error.message)

  await admin.from('attendance_leave_audit').insert({
    company_id: context.companyId,
    leave_request_id: id,
    actor_name: person.personName,
    action: 'Submitted',
    detail: `Driver submitted ${leaveType.replace(/_/g, ' ')} ${dateFrom} → ${dateTo}`,
  })

  try {
    await notifyCompanyAdmins({
      companyId: context.companyId,
      type: 'leave_request_submitted',
      title: 'New holiday request',
      body: `${person.personName} has requested ${workingDays} day${workingDays === 1 ? '' : 's'} (${dateFrom} → ${dateTo}).`,
      severity: 'attention',
      actionUrl: `/time-off`,
      sourceEntityType: 'leave_request',
      sourceEntityId: id,
    })
  } catch (err) {
    console.error('leave submit notify admins failed', err)
  }

  try {
    await notifyDriverAppUser({
      companyId: context.companyId,
      driverId,
      type: 'leave_request_submitted',
      title: 'Time off request submitted',
      body: `Your request for ${dateFrom} → ${dateTo} is with your transport manager for approval.`,
      severity: 'info',
      actionUrl: '/holiday',
    })
  } catch (err) {
    console.error('leave submit notify driver failed', err)
  }

  return json({
    ok: true,
    item: mapLeaveForDriver(data as Row),
    requestMinutes,
    workingDays,
  })
}

/** Admin: GET /drivers/:id/holiday */
export async function adminDriverHolidayGet(request: Request, driverId: string) {
  const context = await authenticate(request)
  try {
    const balance = await computeHolidayBalance({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
    })
    const { data: leave } = await admin
      .from('attendance_leave_requests')
      .select('*')
      .eq('company_id', context.companyId)
      .eq('person_id', driverId)
      .eq('person_kind', 'driver')
      .order('start_date', { ascending: false })
      .limit(40)
    return json({
      ...balance,
      requests: (leave ?? []).map((r) => {
        const row = r as Row
        return {
          id: row.id,
          reference: row.reference,
          leaveType: row.leave_type,
          status: row.status,
          startDate: row.start_date,
          endDate: row.end_date,
          partialDay: Boolean(row.partial_day),
          reason: row.reason,
          submittedAt: row.submitted_at,
          decidedAt: row.decided_at,
          decidedBy: row.decided_by,
        }
      }),
    })
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : 'Holiday load failed')
  }
}

/** Admin: PATCH /drivers/:id/holiday/profile */
export async function adminDriverHolidayPatchProfile(request: Request, driverId: string) {
  const context = await authenticate(request)
  const body = await readJson<Row>(request)
  try {
    const patch: Row = {}
    const map: Record<string, string> = {
      leaveYearMode: 'leave_year_mode',
      calculationMethod: 'calculation_method',
      entitlementWeeks: 'entitlement_weeks',
      contractedDaysPerWeek: 'contracted_days_per_week',
      contractedHoursPerWeek: 'contracted_hours_per_week',
      standardDayMinutes: 'standard_day_minutes',
      annualEntitlementMinutes: 'annual_entitlement_minutes',
      workingWeekdays: 'working_weekdays',
      usualWeeklyPayPence: 'usual_weekly_pay_pence',
      average52WeekPayPence: 'average_52_week_pay_pence',
      carriedForwardMinutes: 'carried_forward_minutes',
      carryForwardExpiresAt: 'carry_forward_expires_at',
      bankHolidaysIncluded: 'bank_holidays_included',
      allowNegativeBalance: 'allow_negative_balance',
      maximumNegativeMinutes: 'maximum_negative_minutes',
      roundingPolicy: 'rounding_policy',
      employmentStartDate: 'employment_start_date',
      employmentEndDate: 'employment_end_date',
    }
    for (const [camel, snake] of Object.entries(map)) {
      if (body[camel] !== undefined) patch[snake] = body[camel]
    }

    // If days/weeks change and no explicit minutes override, recalculate by clearing stored minutes
    if (
      (body.contractedDaysPerWeek != null || body.entitlementWeeks != null) &&
      body.annualEntitlementMinutes == null
    ) {
      patch.annual_entitlement_minutes = 0
    }

    const profile = await ensureDriverHolidayProfile({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
      patch,
    })

    // Refresh opening entitlement if leave year / entitlement changed
    const yearStart = String(profile.leave_year_start)
    const { data: opening } = await admin
      .from('holiday_ledger_entries')
      .select('id, minutes')
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('leave_year_start', yearStart)
      .eq('entry_type', 'opening_entitlement')
      .maybeSingle()

    if (opening && Number(opening.minutes) !== Number(profile.annual_entitlement_minutes)) {
      await admin
        .from('holiday_ledger_entries')
        .update({
          minutes: Number(profile.annual_entitlement_minutes),
          reason: 'Entitlement updated from driver holiday profile',
        })
        .eq('id', opening.id)
    } else if (!opening) {
      await ensureOpeningLedgerEntries({
        companyId: context.companyId,
        driverId,
        profile,
        userId: context.user.id,
        actorName: String(body.actorName ?? 'Admin'),
      })
    }

    const balance = await computeHolidayBalance({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
    })
    return json(balance)
  } catch (err) {
    return apiError(400, err instanceof Error ? err.message : 'Could not update holiday profile')
  }
}

/** Admin: POST /drivers/:id/holiday/adjustments */
export async function adminDriverHolidayAdjust(request: Request, driverId: string) {
  const context = await authenticate(request)
  const body = await readJson<Row>(request)
  try {
    const days = body.days != null ? Number(body.days) : null
    const minutes =
      body.minutes != null
        ? Number(body.minutes)
        : days != null
          ? Math.round(days * DEFAULT_STANDARD_DAY_MINUTES)
          : NaN
    if (!Number.isFinite(minutes) || minutes === 0) {
      return apiError(400, 'Provide a non-zero days or minutes adjustment')
    }
    await postManualHolidayAdjustment({
      companyId: context.companyId,
      driverId,
      minutes,
      reason: String(body.reason ?? ''),
      effectiveAt: body.effectiveAt ? String(body.effectiveAt) : undefined,
      userId: context.user.id,
      actorName: String(body.actorName ?? 'Admin'),
    })
    const balance = await computeHolidayBalance({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
    })
    return json(balance)
  } catch (err) {
    return apiError(400, err instanceof Error ? err.message : 'Adjustment failed')
  }
}

/** Admin: POST /drivers/:id/holiday/accruals */
export async function adminDriverHolidayAccrue(request: Request, driverId: string) {
  const context = await authenticate(request)
  const body = await readJson<Row>(request)
  try {
    await postIrregularHoursAccrual({
      companyId: context.companyId,
      driverId,
      hoursWorked: Number(body.hoursWorked ?? body.hours ?? 0),
      effectiveAt: body.effectiveAt ? String(body.effectiveAt) : undefined,
      reason: body.reason ? String(body.reason) : undefined,
      userId: context.user.id,
      actorName: String(body.actorName ?? 'Admin'),
    })
    const balance = await computeHolidayBalance({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
    })
    return json(balance)
  } catch (err) {
    return apiError(400, err instanceof Error ? err.message : 'Accrual failed')
  }
}

export async function syncLeaveDecisionToHolidayLedger(input: {
  companyId: string
  previousStatus: string | null
  next: Row
  userId?: string | null
  actorName: string
}) {
  const personKind = String(input.next.person_kind ?? input.next.personKind ?? 'driver')
  if (personKind !== 'driver') return

  const driverId = String(input.next.person_id ?? input.next.personId ?? '')
  const leaveId = String(input.next.id ?? '')
  const leaveType = String(input.next.leave_type ?? input.next.leaveType ?? '')
  const status = String(input.next.status ?? '')
  if (!driverId || !leaveId) return

  const prev = input.previousStatus

  if (status === 'approved' || status === 'moved') {
    if (prev !== 'approved' && prev !== 'moved') {
      await postApprovedLeaveLedger({
        companyId: input.companyId,
        driverId,
        leaveRequestId: leaveId,
        startDate: String(input.next.start_date ?? input.next.startDate),
        endDate: String(input.next.end_date ?? input.next.endDate),
        partialDay: Boolean(input.next.partial_day ?? input.next.partialDay),
        leaveType,
        userId: input.userId,
        actorName: input.actorName,
      })
    }
  }

  if (
    (status === 'cancelled' || status === 'rejected') &&
    (prev === 'approved' || prev === 'moved')
  ) {
    await reverseApprovedLeaveLedger({
      companyId: input.companyId,
      driverId,
      leaveRequestId: leaveId,
      userId: input.userId,
      actorName: input.actorName,
      reason:
        status === 'cancelled'
          ? 'Approved leave cancelled — balance restored'
          : 'Approved leave rejected — balance restored',
    })
  }

  // Notify driver on decision
  if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
    try {
      const balance = await computeHolidayBalance({
        companyId: input.companyId,
        driverId,
        userId: input.userId,
      })
      const days = balance.days.remaining
      const start = String(input.next.start_date ?? input.next.startDate)
      const end = String(input.next.end_date ?? input.next.endDate)
      if (status === 'approved') {
        await notifyDriverAppUser({
          companyId: input.companyId,
          driverId,
          type: 'leave_request_approved',
          title: 'Holiday request approved',
          body: `Your annual leave from ${start} to ${end} has been approved. Remaining balance: ${days} days.`,
          severity: 'info',
          actionUrl: '/holiday',
        })
      } else if (status === 'rejected') {
        await notifyDriverAppUser({
          companyId: input.companyId,
          driverId,
          type: 'leave_request_declined',
          title: 'Holiday request declined',
          body: `Your request for ${start} → ${end} was declined. Remaining balance: ${days} days.`,
          severity: 'attention',
          actionUrl: '/holiday',
        })
      } else {
        await notifyDriverAppUser({
          companyId: input.companyId,
          driverId,
          type: 'leave_request_cancelled',
          title: 'Holiday cancelled',
          body: `Leave ${start} → ${end} was cancelled. Remaining balance: ${days} days.`,
          severity: 'attention',
          actionUrl: '/holiday',
        })
      }
    } catch (err) {
      console.error('leave decision notify failed', err)
    }
  }
}
