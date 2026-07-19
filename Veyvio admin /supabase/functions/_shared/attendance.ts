/** Live Attendance projections — duties for clock reality + leave/notes tables. */
import { admin, authenticate } from './supabase.ts'
import { apiError, json } from './http.ts'

type Row = Record<string, unknown>

const GRACE_MINUTES = 5
const LATE_MARK_MINUTES = 6
const DRIVER_REMINDER_MINUTES = 10
const DISPATCHER_WARNING_MINUTES = 15
const OPERATIONS_ESCALATION_MINUTES = 20

function scoreBand(score: number): string {
  if (score >= 95) return 'excellent'
  if (score >= 85) return 'good'
  if (score >= 70) return 'needs_attention'
  if (score >= 50) return 'attendance_concern'
  return 'critical_review'
}

function computeAttendanceScore(input: {
  shiftsScheduled: number
  shiftsAttended: number
  shiftsOnTime: number
  unauthorisedAbsences: number
  missedClockIns: number
  earlyDepartures: number
  evidenceCompliancePercent: number
  periodDays?: number
}) {
  const scheduled = Math.max(0, input.shiftsScheduled)
  const attended = Math.min(scheduled, Math.max(0, input.shiftsAttended))
  const onTime = Math.min(attended, Math.max(0, input.shiftsOnTime))
  const attendanceRate = scheduled === 0 ? 100 : (attended / scheduled) * 100
  const punctualityRate = attended === 0 ? 100 : (onTime / attended) * 100
  const unauthPenalty = Math.min(100, input.unauthorisedAbsences * 25)
  const missedPenalty = Math.min(100, input.missedClockIns * 10)
  const earlyPenalty = Math.min(100, input.earlyDepartures * 8)
  const evidence = Math.max(0, Math.min(100, input.evidenceCompliancePercent))
  const score = Math.round(
    attendanceRate * 0.4 +
      punctualityRate * 0.3 +
      (100 - unauthPenalty) * 0.15 +
      (100 - missedPenalty) * 0.05 +
      (100 - earlyPenalty) * 0.05 +
      evidence * 0.05,
  )
  const clamped = Math.max(0, Math.min(100, score))
  return {
    attendanceRate: Math.round(attendanceRate),
    punctualityRate: Math.round(punctualityRate),
    unauthorisedAbsences: input.unauthorisedAbsences,
    missedClockIns: input.missedClockIns,
    earlyDepartures: input.earlyDepartures,
    evidenceCompliance: Math.round(evidence),
    score: clamped,
    band: scoreBand(clamped),
    periodDays: input.periodDays ?? 90,
  }
}

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function clockLabel(value: unknown): string | null {
  if (!value) return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(11, 16)
}

function minutesLate(planned: unknown, actual: unknown): number | null {
  if (!planned || !actual) return null
  const p = new Date(String(planned)).getTime()
  const a = new Date(String(actual)).getTime()
  if (Number.isNaN(p) || Number.isNaN(a)) return null
  return Math.round((a - p) / 60_000)
}

function defaultImpact(): Row {
  return {
    tripsAffected: 0,
    schoolRoutesAffected: 0,
    passengersAffected: 0,
    replacementRequired: true,
    readinessPercent: 55,
    readinessBand: 'medium',
    readinessSummary: 'Cover may be required for school routes.',
  }
}

async function loadLeaveRows(companyId: string, personId?: string): Promise<Row[]> {
  let query = admin
    .from('attendance_leave_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false })
  if (personId) query = query.eq('person_id', personId)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const rows = data ?? []
  if (!rows.length) return []

  const ids = rows.map((r) => String(r.id))
  const { data: audits } = await admin
    .from('attendance_leave_audit')
    .select('*')
    .in('leave_request_id', ids)
    .order('at', { ascending: true })

  const auditByLeave = new Map<string, Row[]>()
  for (const row of audits ?? []) {
    const id = String(row.leave_request_id)
    const list = auditByLeave.get(id) ?? []
    list.push(row)
    auditByLeave.set(id, list)
  }

  return rows.map((row) => mapLeaveRecord(row, auditByLeave.get(String(row.id)) ?? []))
}

function mapLeaveRecord(row: Row, audits: Row[]): Row {
  const impact = (row.impact as Row | null) ?? defaultImpact()
  return {
    id: row.id,
    reference: row.reference,
    personId: row.person_id,
    personName: row.person_name,
    personNumber: row.person_number ?? '—',
    role: row.person_kind === 'staff' ? 'staff' : 'driver',
    depotName: row.depot_name ?? '—',
    leaveType: row.leave_type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    partialDay: Boolean(row.partial_day),
    reason: row.reason ?? '',
    attachmentLabel: row.attachment_label ?? null,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at ?? null,
    decidedBy: row.decided_by ?? null,
    impact,
    audit: audits.map((a) => ({
      id: a.id,
      at: a.at,
      actorName: a.actor_name,
      action: a.action,
      detail: a.detail ?? '',
    })),
    previousWindow: row.previous_window ?? null,
  }
}

function leaveCoversDate(leave: Row, date: string): boolean {
  const status = String(leave.status)
  if (status !== 'approved' && status !== 'moved' && status !== 'pending') return false
  // Pending does not block attendance status as approved; only approved/moved do for board
  if (status === 'pending') return false
  return String(leave.startDate) <= date && String(leave.endDate) >= date
}

function statusFromDuty(
  duty: Row,
  now: Date,
  override: Row | null,
  onApprovedLeave: boolean,
  leaveType: string | null,
): {
  status: string
  differenceLabel: string | null
  differenceMinutes: number | null
  clockedInAt: string | null
} {
  if (override?.status) {
    return {
      status: String(override.status),
      differenceLabel: null,
      differenceMinutes: null,
      clockedInAt: duty.actual_sign_on_at ? String(duty.actual_sign_on_at) : null,
    }
  }
  if (onApprovedLeave) {
    const sick = leaveType === 'sick_leave'
    return {
      status: sick ? 'sick' : 'approved_leave',
      differenceLabel: null,
      differenceMinutes: null,
      clockedInAt: null,
    }
  }

  const planned = duty.planned_sign_on_at
  const actual = duty.actual_sign_on_at
  const dutyStatus = String(duty.status ?? '')

  if (dutyStatus === 'cancelled') {
    return { status: 'not_scheduled', differenceLabel: null, differenceMinutes: null, clockedInAt: null }
  }

  if (actual) {
    const lateMins = minutesLate(planned, actual) ?? 0
    if (lateMins > LATE_MARK_MINUTES) {
      return {
        status: 'late',
        differenceLabel: `+${lateMins} min`,
        differenceMinutes: lateMins,
        clockedInAt: String(actual),
      }
    }
    return {
      status: 'on_time',
      differenceLabel: lateMins > 0 ? `+${lateMins} min` : null,
      differenceMinutes: lateMins,
      clockedInAt: String(actual),
    }
  }

  if (planned) {
    const plannedMs = new Date(String(planned)).getTime()
    const overdue = (now.getTime() - plannedMs) / 60_000
    if (overdue > GRACE_MINUTES) {
      return {
        status: 'not_arrived',
        differenceLabel: `+${Math.round(overdue)} min`,
        differenceMinutes: Math.round(overdue),
        clockedInAt: null,
      }
    }
  }

  return {
    status: 'not_arrived',
    differenceLabel: null,
    differenceMinutes: null,
    clockedInAt: null,
  }
}

async function loadDriverPeople(companyId: string): Promise<Map<string, Row>> {
  const { data, error } = await admin
    .from('drivers')
    .select('id, driver_number, status, primary_depot_id, staff_members(first_name, last_name)')
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)

  const depotIds = [...new Set((data ?? []).map((r) => r.primary_depot_id).filter(Boolean).map(String))]
  const depotById = new Map<string, string>()
  if (depotIds.length) {
    const { data: depots } = await admin.from('depots').select('id, name').in('id', depotIds)
    for (const d of depots ?? []) depotById.set(String(d.id), String(d.name ?? '—'))
  }

  const map = new Map<string, Row>()
  for (const row of data ?? []) {
    const staff = (row.staff_members as Row | null) ?? {}
    map.set(String(row.id), {
      id: row.id,
      personNumber: row.driver_number ?? '—',
      personName: [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || 'Driver',
      depotName: row.primary_depot_id ? depotById.get(String(row.primary_depot_id)) ?? '—' : '—',
      status: row.status,
    })
  }
  return map
}

async function scoreForPerson(
  companyId: string,
  personId: string,
  periodDays = 90,
): Promise<ReturnType<typeof computeAttendanceScore> & { lateArrivals: number; totalMinutesLate: number; averageLatenessMinutes: number }> {
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - periodDays)
  const fromDate = from.toISOString().slice(0, 10)

  const { data: duties } = await admin
    .from('duties')
    .select('id, service_date, status, planned_sign_on_at, actual_sign_on_at, planned_sign_off_at, actual_sign_off_at')
    .eq('company_id', companyId)
    .eq('driver_id', personId)
    .gte('service_date', fromDate)
    .neq('status', 'cancelled')

  const { data: overrides } = await admin
    .from('attendance_day_overrides')
    .select('*')
    .eq('company_id', companyId)
    .eq('person_id', personId)
    .gte('operational_date', fromDate)

  const overrideByDate = new Map<string, Row>()
  for (const row of overrides ?? []) {
    overrideByDate.set(String(row.operational_date), row)
  }

  let scheduled = 0
  let attended = 0
  let onTime = 0
  let unauthorised = 0
  let missedClockIns = 0
  let earlyDepartures = 0
  let lateArrivals = 0
  let totalMinutesLate = 0

  for (const duty of duties ?? []) {
    scheduled += 1
    const date = String(duty.service_date)
    const ov = overrideByDate.get(date)
    if (ov?.manager_classification === 'unauthorised' || ov?.status === 'unauthorised_absence') {
      unauthorised += 1
    }
    if (duty.actual_sign_on_at) {
      attended += 1
      const lateMins = minutesLate(duty.planned_sign_on_at, duty.actual_sign_on_at) ?? 0
      if (lateMins > LATE_MARK_MINUTES) {
        lateArrivals += 1
        totalMinutesLate += lateMins
      } else {
        onTime += 1
      }
    } else if (String(duty.status) !== 'planned') {
      // duty progressed without recorded clock — treat as missed clock-in
      missedClockIns += 1
    } else {
      const planned = duty.planned_sign_on_at ? new Date(String(duty.planned_sign_on_at)).getTime() : 0
      if (planned && planned < Date.now() - GRACE_MINUTES * 60_000) missedClockIns += 1
    }
    if (
      duty.actual_sign_off_at &&
      duty.planned_sign_off_at &&
      new Date(String(duty.actual_sign_off_at)).getTime() <
        new Date(String(duty.planned_sign_off_at)).getTime() - 10 * 60_000
    ) {
      earlyDepartures += 1
    }
  }

  const score = computeAttendanceScore({
    shiftsScheduled: scheduled,
    shiftsAttended: attended,
    shiftsOnTime: onTime,
    unauthorisedAbsences: unauthorised,
    missedClockIns,
    earlyDepartures,
    evidenceCompliancePercent: scheduled === 0 ? 100 : 92,
    periodDays,
  })

  return {
    ...score,
    lateArrivals,
    totalMinutesLate,
    averageLatenessMinutes: lateArrivals ? Math.round(totalMinutesLate / lateArrivals) : 0,
  }
}

export async function projectAttendanceHub(companyId: string) {
  const now = new Date()
  const date = todayIso(now)
  const [people, leaveRows, { data: duties }, { data: overrides }, { data: vehicles }] = await Promise.all([
    loadDriverPeople(companyId),
    loadLeaveRows(companyId),
    admin
      .from('duties')
      .select(
        'id, driver_id, service_date, status, planned_sign_on_at, actual_sign_on_at, planned_sign_off_at, vehicle_id, special_instructions, depots(name), vehicles(registration)',
      )
      .eq('company_id', companyId)
      .eq('service_date', date)
      .neq('status', 'cancelled'),
    admin
      .from('attendance_day_overrides')
      .select('*')
      .eq('company_id', companyId)
      .eq('operational_date', date),
    admin.from('vehicles').select('id, registration').eq('company_id', companyId),
  ])

  const overrideByPerson = new Map<string, Row>()
  for (const row of overrides ?? []) overrideByPerson.set(String(row.person_id), row)

  const vehicleById = new Map<string, string>()
  for (const v of vehicles ?? []) vehicleById.set(String(v.id), String(v.registration ?? ''))

  const board: Row[] = []
  const seen = new Set<string>()

  for (const duty of duties ?? []) {
    const driverId = duty.driver_id ? String(duty.driver_id) : ''
    if (!driverId || seen.has(driverId)) continue
    seen.add(driverId)
    const person = people.get(driverId) ?? {
      personName: 'Driver',
      personNumber: '—',
      depotName: ((duty.depots as Row | null)?.name as string) ?? '—',
    }
    const leave = leaveRows.find((l) => String(l.personId) === driverId && leaveCoversDate(l, date))
    const derived = statusFromDuty(
      duty,
      now,
      overrideByPerson.get(driverId) ?? null,
      Boolean(leave),
      leave ? String(leave.leaveType) : null,
    )
    const score = await scoreForPerson(companyId, driverId)
    const vehicleReg =
      (duty.vehicles as Row | null)?.registration != null
        ? String((duty.vehicles as Row).registration)
        : duty.vehicle_id
          ? vehicleById.get(String(duty.vehicle_id)) ?? null
          : null

    board.push({
      id: `att-${driverId}-${date}`,
      personId: driverId,
      personName: person.personName,
      role: 'driver',
      roleLabel: 'Driver',
      depotName: person.depotName,
      scheduledStart: clockLabel(duty.planned_sign_on_at),
      clockedInAt: clockLabel(derived.clockedInAt),
      status: derived.status,
      differenceLabel: derived.differenceLabel,
      currentDutyLabel: `DUTY-${String(duty.id).slice(0, 8).toUpperCase()}`,
      dutyId: duty.id,
      vehicleRegistration: vehicleReg,
      passengersAtRisk: 0,
      schoolRoute: true,
      attendanceScore: score.score,
      scoreBand: score.band,
      reportedReason: overrideByPerson.get(driverId)?.reported_reason ?? null,
      managerClassification: overrideByPerson.get(driverId)?.manager_classification ?? null,
    })
  }

  // People on approved leave today without a duty row
  for (const leave of leaveRows) {
    if (!leaveCoversDate(leave, date)) continue
    const personId = String(leave.personId)
    if (seen.has(personId)) continue
    seen.add(personId)
    const person = people.get(personId)
    const score = await scoreForPerson(companyId, personId)
    board.push({
      id: `att-${personId}-${date}`,
      personId,
      personName: leave.personName,
      role: leave.role,
      roleLabel: leave.role === 'staff' ? 'Staff' : 'Driver',
      depotName: leave.depotName,
      scheduledStart: null,
      clockedInAt: null,
      status: leave.leaveType === 'sick_leave' ? 'sick' : 'approved_leave',
      differenceLabel: null,
      currentDutyLabel: null,
      dutyId: null,
      vehicleRegistration: null,
      passengersAtRisk: 0,
      schoolRoute: false,
      attendanceScore: score.score,
      scoreBand: score.band,
      reportedReason: null,
      managerClassification: null,
    })
    void person
  }

  const scheduled = board.filter((b) => b.status !== 'not_scheduled').length
  const onTime = board.filter((b) => b.status === 'on_time').length
  const late = board.filter((b) => b.status === 'late').length
  const notArrived = board.filter((b) => b.status === 'not_arrived').length
  const approvedLeave = board.filter((b) => b.status === 'approved_leave').length
  const sick = board.filter((b) => b.status === 'sick').length
  const attendanceRatePercent =
    scheduled === 0 ? 100 : Math.round(((onTime + late) / scheduled) * 100)

  return {
    summary: {
      operationalDate: date,
      scheduled,
      onTime,
      late,
      notArrived,
      approvedLeave,
      sick,
      attendanceRatePercent,
      uncoveredDuties: notArrived,
    },
    board,
    leaveRequests: leaveRows,
    trends: {
      punctualityByDepot: aggregatePunctuality(board),
      minutesLostToLateness: board.reduce((sum, b) => {
        const m = String(b.differenceLabel ?? '').match(/\+(\d+)/)
        return sum + (m ? Number(m[1]) : 0)
      }, 0),
      unauthorisedAbsences: board.filter((b) => b.status === 'unauthorised_absence').length,
      sicknessFrequency: sick,
      returnToWorkOutstanding: 0,
      operationalDelaysFromAttendance: late + notArrived,
      standbyOvertimeCostEstimate: '—',
      strongestTeam: board[0] ? String(board[0].depotName) : '—',
      mondayFridayPatternNote: 'Punctuality is derived from planned vs actual duty sign-on.',
      scoreChangesNote: 'Scores update from live duty clock events over the last 90 days.',
    },
    graceMinutes: GRACE_MINUTES,
    lateMarkMinutes: LATE_MARK_MINUTES,
    driverReminderMinutes: DRIVER_REMINDER_MINUTES,
    dispatcherWarningMinutes: DISPATCHER_WARNING_MINUTES,
    operationsEscalationMinutes: OPERATIONS_ESCALATION_MINUTES,
  }
}

function aggregatePunctuality(board: Row[]): Array<{ depot: string; percent: number }> {
  const byDepot = new Map<string, { total: number; onTime: number }>()
  for (const row of board) {
    if (row.status === 'not_scheduled' || row.status === 'approved_leave' || row.status === 'sick') continue
    const depot = String(row.depotName ?? '—')
    const cur = byDepot.get(depot) ?? { total: 0, onTime: 0 }
    cur.total += 1
    if (row.status === 'on_time') cur.onTime += 1
    byDepot.set(depot, cur)
  }
  return [...byDepot.entries()].map(([depot, v]) => ({
    depot,
    percent: v.total ? Math.round((v.onTime / v.total) * 100) : 100,
  }))
}

export async function projectAttendanceProfile(
  companyId: string,
  personId?: string | null,
  personName?: string | null,
) {
  const people = await loadDriverPeople(companyId)
  let id = personId ? String(personId) : ''
  let person = id ? people.get(id) : undefined

  if (!person && personName) {
    const key = personName.trim().toLowerCase()
    for (const [pid, row] of people) {
      if (String(row.personName).toLowerCase() === key) {
        id = pid
        person = row
        break
      }
    }
  }

  if (!person || !id) return null

  const now = new Date()
  const date = todayIso(now)
  const score = await scoreForPerson(companyId, id)
  const leaveRows = await loadLeaveRows(companyId, id)

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  const fromDate = monthStart.toISOString().slice(0, 10)
  const toDate = monthEnd.toISOString().slice(0, 10)

  const [{ data: monthDuties }, { data: notes }, { data: rtw }, { data: overrides }, hub] =
    await Promise.all([
      admin
        .from('duties')
        .select('id, service_date, status, planned_sign_on_at, actual_sign_on_at')
        .eq('company_id', companyId)
        .eq('driver_id', id)
        .gte('service_date', fromDate)
        .lte('service_date', toDate)
        .neq('status', 'cancelled'),
      admin
        .from('attendance_notes')
        .select('*')
        .eq('company_id', companyId)
        .eq('person_id', id)
        .order('at', { ascending: false })
        .limit(20),
      admin
        .from('attendance_return_to_work')
        .select('*')
        .eq('company_id', companyId)
        .eq('person_id', id)
        .order('interview_date', { ascending: false })
        .limit(10),
      admin
        .from('attendance_day_overrides')
        .select('*')
        .eq('company_id', companyId)
        .eq('person_id', id)
        .gte('operational_date', fromDate)
        .lte('operational_date', toDate),
      projectAttendanceHub(companyId),
    ])

  const dutyByDate = new Map<string, Row>()
  for (const d of monthDuties ?? []) dutyByDate.set(String(d.service_date), d)
  const overrideByDate = new Map<string, Row>()
  for (const o of overrides ?? []) overrideByDate.set(String(o.operational_date), o)

  const days: Array<{ date: string; mark: string }> = []
  for (let day = 1; day <= monthEnd.getUTCDate(); day += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
    const iso = d.toISOString().slice(0, 10)
    const dow = d.getUTCDay()
    if (dow === 0 || dow === 6) {
      days.push({ date: iso, mark: 'rest' })
      continue
    }
    const leave = leaveRows.find((l) => leaveCoversDate(l, iso))
    if (leave) {
      days.push({
        date: iso,
        mark: leave.leaveType === 'sick_leave' ? 'sick' : 'approved_leave',
      })
      continue
    }
    const duty = dutyByDate.get(iso)
    const ov = overrideByDate.get(iso)
    if (ov?.status === 'unauthorised_absence' || ov?.manager_classification === 'unauthorised') {
      days.push({ date: iso, mark: 'unauthorised' })
      continue
    }
    if (!duty) {
      days.push({ date: iso, mark: 'empty' })
      continue
    }
    if (duty.actual_sign_on_at) {
      const lateMins = minutesLate(duty.planned_sign_on_at, duty.actual_sign_on_at) ?? 0
      days.push({ date: iso, mark: lateMins > LATE_MARK_MINUTES ? 'late' : 'on_time' })
    } else {
      days.push({ date: iso, mark: iso < date ? 'unauthorised' : 'empty' })
    }
  }

  const live = hub.board.find((b) => String(b.personId) === id) ?? null
  const todayDuty = (monthDuties ?? []).find((d) => String(d.service_date) === date)

  const recentEvents: Row[] = []
  if (todayDuty?.planned_sign_on_at) {
    recentEvents.push({
      id: `ev-sched-${id}`,
      at: todayDuty.planned_sign_on_at,
      label: 'Duty scheduled',
      kind: 'schedule',
    })
  }
  if (todayDuty?.actual_sign_on_at) {
    recentEvents.push({
      id: `ev-clock-${id}`,
      at: todayDuty.actual_sign_on_at,
      label: 'Driver signed on',
      kind: 'clock',
    })
  }
  if (live?.status === 'late') {
    recentEvents.push({
      id: `ev-late-${id}`,
      at: todayDuty?.actual_sign_on_at ?? now.toISOString(),
      label: `Late arrival ${live.differenceLabel ?? ''}`.trim(),
      kind: 'status',
    })
  }

  const scoreContributors: Row[] = []
  for (const d of [...(monthDuties ?? [])].reverse().slice(0, 8)) {
    if (!d.actual_sign_on_at) continue
    const lateMins = minutesLate(d.planned_sign_on_at, d.actual_sign_on_at) ?? 0
    if (lateMins > LATE_MARK_MINUTES) {
      scoreContributors.push({
        id: `sc-${d.id}`,
        date: d.service_date,
        label: `Late sign-on (${lateMins} min)`,
        impact: -Math.min(8, Math.ceil(lateMins / 5)),
        category: 'Punctuality',
      })
    }
  }

  const scheduled = score.periodDays
  void scheduled

  return {
    personId: id,
    personName: person.personName,
    personNumber: person.personNumber,
    roleLabel: 'Driver',
    depotName: person.depotName,
    score: {
      attendanceRate: score.attendanceRate,
      punctualityRate: score.punctualityRate,
      unauthorisedAbsences: score.unauthorisedAbsences,
      missedClockIns: score.missedClockIns,
      earlyDepartures: score.earlyDepartures,
      evidenceCompliance: score.evidenceCompliance,
      score: score.score,
      band: score.band,
      periodDays: score.periodDays,
    },
    onTimeShiftsPercent: score.punctualityRate,
    attendanceRatePercent: score.attendanceRate,
    lateArrivals: score.lateArrivals,
    unauthorisedAbsences: score.unauthorisedAbsences,
    approvedSickness: leaveRows.filter((l) => l.leaveType === 'sick_leave' && l.status === 'approved')
      .length,
    earlyDepartures: score.earlyDepartures,
    averageLatenessMinutes: score.averageLatenessMinutes,
    totalMinutesLate: score.totalMinutesLate,
    currentAbsence: live?.status === 'sick' || live?.status === 'approved_leave'
      ? String(live.status).replace(/_/g, ' ')
      : null,
    upcomingLeave: leaveRows.filter(
      (l) =>
        (l.status === 'pending' || l.status === 'approved' || l.status === 'moved') &&
        String(l.endDate) >= date,
    ),
    calendarMonth: {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      days,
    },
    recentEvents,
    returnToWork: (rtw ?? []).map((r) => ({
      id: r.id,
      date: r.interview_date,
      summary: r.summary,
      completed: Boolean(r.completed),
    })),
    managerNotes: (notes ?? [])
      .filter((n) => n.kind === 'manager')
      .map((n) => ({
        id: n.id,
        at: n.at,
        author: n.author,
        note: n.note,
      })),
    adjustments: (notes ?? [])
      .filter((n) => n.kind === 'adjustment')
      .map((n) => ({
        id: n.id,
        at: n.at,
        actor: n.author,
        original: 'Recorded status',
        corrected: 'Adjusted',
        reason: n.note,
      })),
    scoreContributors,
    liveStatus: live ? String(live.status) : null,
  }
}

export async function attendanceHub(request: Request) {
  const context = await authenticateRequest(request)
  try {
    return json(await projectAttendanceHub(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Attendance hub failed')
  }
}

export async function attendanceLeaveList(request: Request) {
  const context = await authenticateRequest(request)
  try {
    return json(await loadLeaveRows(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Leave list failed')
  }
}

export async function attendanceLeaveUpsert(request: Request) {
  const context = await authenticateRequest(request)
  try {
    const body = (await request.json()) as Row
    const id = body.id ? String(body.id) : crypto.randomUUID()
    const payload = {
      id,
      company_id: context.companyId,
      person_id: body.personId,
      person_kind: body.role === 'staff' ? 'staff' : 'driver',
      person_name: body.personName,
      person_number: body.personNumber ?? null,
      depot_name: body.depotName ?? null,
      reference: body.reference ?? `LV-${id.slice(0, 8).toUpperCase()}`,
      leave_type: body.leaveType,
      status: body.status,
      start_date: body.startDate,
      end_date: body.endDate,
      start_time: body.startTime ?? null,
      end_time: body.endTime ?? null,
      partial_day: Boolean(body.partialDay),
      reason: body.reason ?? '',
      attachment_label: body.attachmentLabel ?? null,
      submitted_at: body.submittedAt ?? new Date().toISOString(),
      decided_at: body.decidedAt ?? null,
      decided_by: body.decidedBy ?? null,
      impact: body.impact ?? defaultImpact(),
      previous_window: body.previousWindow ?? null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await admin
      .from('attendance_leave_requests')
      .upsert(payload)
      .select('*')
      .single()
    if (error) return apiError(500, error.message)

    const audit = Array.isArray(body.audit) ? (body.audit as Row[]) : []
    const latest = audit[audit.length - 1]
    if (latest) {
      await admin.from('attendance_leave_audit').insert({
        company_id: context.companyId,
        leave_request_id: id,
        at: latest.at ?? new Date().toISOString(),
        actor_name: latest.actorName ?? 'Operations',
        action: latest.action ?? 'updated',
        detail: latest.detail ?? '',
      })
    }

    const rows = await loadLeaveRows(context.companyId)
    return json(rows.find((r) => String(r.id) === id) ?? mapLeaveRecord(data as Row, []))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Leave update failed')
  }
}

export async function attendanceProfile(request: Request) {
  const context = await authenticateRequest(request)
  try {
    const url = new URL(request.url)
    const personId = url.searchParams.get('personId')
    const personName = url.searchParams.get('personName')
    const profile = await projectAttendanceProfile(context.companyId, personId, personName)
    if (!profile) return apiError(404, 'Attendance profile not found', 'not_found')
    return json(profile)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Attendance profile failed')
  }
}

export async function attendanceClassify(request: Request) {
  const context = await authenticateRequest(request)
  try {
    const body = (await request.json()) as Row
    const rowId = String(body.rowId ?? '')
    // rowId format att-{personId}-{date}
    const parts = rowId.split('-')
    const date = parts[parts.length - 1] ?? todayIso()
    const personId = rowId.replace(/^att-/, '').replace(new RegExp(`-${date}$`), '')
    if (!personId) return apiError(400, 'Invalid attendance row')

    const classification = body.classification ? String(body.classification) : null
    let status: string | null = null
    if (classification === 'unauthorised') status = 'unauthorised_absence'
    if (classification === 'authorised') status = 'approved_leave'
    if (classification === 'operational_issue') status = 'late'
    if (classification === 'recording_error') status = 'on_time'

    await admin.from('attendance_day_overrides').upsert({
      company_id: context.companyId,
      person_id: personId,
      operational_date: date,
      status,
      reported_reason: body.reason ?? null,
      manager_classification: classification,
      note: body.note ?? null,
      actor_name: body.actorName ?? 'Operations',
      updated_at: new Date().toISOString(),
    })

    const hub = await projectAttendanceHub(context.companyId)
    return json(hub.board.find((b) => String(b.id) === rowId) ?? null)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Classify failed')
  }
}

export async function attendanceCoverCandidates(request: Request) {
  const context = await authenticateRequest(request)
  try {
    const people = await loadDriverPeople(context.companyId)
    const hub = await projectAttendanceHub(context.companyId)
    const busy = new Set(
      hub.board
        .filter((b) => !['approved_leave', 'sick', 'not_scheduled'].includes(String(b.status)))
        .map((b) => String(b.personId)),
    )
    const leaveBusy = new Set(
      hub.leaveRequests
        .filter((l) => leaveCoversDate(l, todayIso()) && l.status === 'approved')
        .map((l) => String(l.personId)),
    )

    const candidates = [...people.entries()]
      .filter(([id]) => !busy.has(id) && !leaveBusy.has(id))
      .slice(0, 12)
      .map(([id, p]) => ({
        personId: id,
        personName: p.personName,
        availabilityLabel: `Available · ${p.depotName}`,
        statusLabel: 'Clear for cover',
        requirementsMet: true,
        routeFamiliarity: 'medium',
        training: ['School transport'],
        selectable: true,
      }))

    return json(candidates)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Cover candidates failed')
  }
}

export async function attendanceAssignCover(request: Request) {
  const context = await authenticateRequest(request)
  try {
    const body = (await request.json()) as Row
    const dutyId = body.dutyId ? String(body.dutyId) : null
    const coverPersonId = body.coverPersonId ? String(body.coverPersonId) : null
    if (!dutyId || !coverPersonId) return apiError(400, 'dutyId and coverPersonId are required')

    const { error } = await admin
      .from('duties')
      .update({ driver_id: coverPersonId })
      .eq('company_id', context.companyId)
      .eq('id', dutyId)
    if (error) return apiError(500, error.message)

    return json({
      ok: true,
      message: 'Cover assigned to duty',
      actorName: body.actorName ?? 'Operations',
    })
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Assign cover failed')
  }
}

async function authenticateRequest(request: Request) {
  return authenticate(request)
}
