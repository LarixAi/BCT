import type { DutyRecord } from '@/lib/api/types'
import type { OperationalTrip } from '@/lib/transfers/types'

export type RunBoardFilter = 'all' | 'active' | 'starting_soon' | 'completed' | 'delayed' | 'unassigned'

export function runDriverName(duty: DutyRecord) {
  return duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : null
}

export function isRunActive(status: string) {
  return ['in_progress', 'passenger_boarded', 'en_route', 'signed_on', 'assigned'].includes(status)
}

/** Parse duty start/finish — supports `HH:mm` and ISO timestamps. */
export function dutyClockMs(
  value: string | null | undefined,
  dutyDate?: string | null,
  now: Date = new Date(),
): number | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}T/.test(value) || /[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? null : t
  }
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const day =
    dutyDate && /^\d{4}-\d{2}-\d{2}/.test(dutyDate)
      ? dutyDate.slice(0, 10)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const [y, mo, d] = day.split('-').map(Number)
  return new Date(y, mo - 1, d, Number(match[1]), Number(match[2]), 0, 0).getTime()
}

/**
 * Minutes behind plan for a duty:
 * - still not underway after planned start → minutes past start
 * - still active after planned finish → minutes past finish
 */
export function runScheduleDelayMinutes(duty: DutyRecord, now: Date = new Date()): number {
  const status = (duty.status ?? '').toLowerCase().replace(/-/g, '_')
  if (['completed', 'signed_off', 'cancelled'].includes(status)) return 0

  const startMs = dutyClockMs(duty.startTime, duty.dutyDate, now)
  const endMs = dutyClockMs(duty.endTime ?? null, duty.dutyDate, now)
  const nowMs = now.getTime()

  const notUnderway = ['planned', 'assigned', 'signed_on', 'ready', 'accepted', 'unassigned'].includes(
    status,
  )

  if (endMs != null && nowMs > endMs && (notUnderway || isRunActive(status))) {
    return Math.max(0, Math.round((nowMs - endMs) / 60_000))
  }

  if (notUnderway && startMs != null && nowMs > startMs) {
    return Math.max(0, Math.round((nowMs - startMs) / 60_000))
  }

  return 0
}

export function formatDelayLabel(minutes: number): string {
  if (minutes <= 0) return '—'
  if (minutes < 60) return `+${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins ? `+${hours}h ${mins}m` : `+${hours}h`
}

export function formatDutyClock(value: string | null | undefined): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}T/.test(value) || /[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
  }
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`
  return value
}

const DELAY_THRESHOLD_MINUTES = 8

export function isRunDelayed(duty: DutyRecord, now: Date = new Date()) {
  if (duty.vehicle?.status === 'off_road' && isRunActive(duty.status)) return true
  return runScheduleDelayMinutes(duty, now) >= DELAY_THRESHOLD_MINUTES
}

export function runSummary(duties: DutyRecord[], now: Date = new Date()) {
  const nowMs = now.getTime()
  return {
    active: duties.filter((d) => isRunActive(d.status) && d.status !== 'completed' && d.status !== 'unassigned').length,
    startingSoon: duties.filter((d) => {
      if (!d.startTime || d.status === 'completed' || d.status === 'in_progress' || d.status === 'passenger_boarded') {
        return false
      }
      const startMs = dutyClockMs(d.startTime, d.dutyDate, now)
      if (startMs == null) return false
      const minsUntil = (startMs - nowMs) / 60_000
      return minsUntil >= 0 && minsUntil <= 90
    }).length,
    completed: duties.filter((d) => d.status === 'completed' || d.status === 'signed_off').length,
    delayed: duties.filter((d) => isRunDelayed(d, now)).length,
    unassigned: duties.filter((d) => d.status === 'unassigned' || !d.driver).length,
  }
}

export function filterRuns(
  duties: DutyRecord[],
  filter: RunBoardFilter,
  search: string,
  now: Date = new Date(),
) {
  const q = search.trim().toLowerCase()
  return duties.filter((d) => {
    if (filter === 'active' && !(isRunActive(d.status) && d.status !== 'completed')) return false
    if (filter === 'starting_soon') {
      const s = runSummary([d], now)
      if (s.startingSoon === 0) return false
    }
    if (filter === 'completed' && !(d.status === 'completed' || d.status === 'signed_off')) return false
    if (filter === 'delayed' && !isRunDelayed(d, now)) return false
    if (filter === 'unassigned' && !(d.status === 'unassigned' || !d.driver)) return false
    if (!q) return true
    return [
      d.reference,
      d.route?.name,
      runDriverName(d),
      d.vehicle?.registrationNumber,
      d.status,
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })
}

export type TripBoardFilter = 'all' | 'active' | 'upcoming' | 'complete' | 'delayed' | 'cancelled'

export function tripSummary(trips: OperationalTrip[]) {
  return {
    total: trips.length,
    complete: trips.filter((t) => t.status === 'completed').length,
    active: trips.filter((t) => t.status === 'in_progress' || t.status === 'released').length,
    upcoming: trips.filter((t) => t.status === 'planned' || t.status === 'assigned' || t.status === 'accepted').length,
    delayed: trips.filter((t) => t.delayMinutes > 0 && t.status !== 'completed' && t.status !== 'cancelled').length,
    cancelled: trips.filter((t) => t.status === 'cancelled').length,
  }
}

export function filterTrips(trips: OperationalTrip[], filter: TripBoardFilter, search: string) {
  const q = search.trim().toLowerCase()
  return trips.filter((t) => {
    if (filter === 'active' && !(t.status === 'in_progress' || t.status === 'released')) return false
    if (filter === 'upcoming' && !['planned', 'assigned', 'accepted'].includes(t.status)) return false
    if (filter === 'complete' && t.status !== 'completed') return false
    if (filter === 'delayed' && !(t.delayMinutes > 0 && t.status !== 'completed')) return false
    if (filter === 'cancelled' && t.status !== 'cancelled') return false
    if (!q) return true
    return [
      t.reference,
      t.runReference,
      t.driverName,
      t.vehicleRegistration,
      t.routeName,
      ...(t.jobs ?? []).map((j) => j.passengerName),
    ]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })
}

export function scheduleServiceColour(routeName: string | null | undefined): string {
  const n = (routeName ?? '').toLowerCase()
  if (n.includes('school') || n.includes('sch')) return 'bg-command-100 text-command-900 ring-command-200'
  if (n.includes('hospital') || n.includes('hosp')) return 'bg-emerald-100 text-emerald-900 ring-emerald-200'
  if (n.includes('send')) return 'bg-amber-100 text-amber-900 ring-amber-200'
  if (n.includes('private') || n.includes('priv')) return 'bg-violet-100 text-violet-900 ring-violet-200'
  if (n.includes('cancel')) return 'bg-slate-200 text-slate-700 ring-slate-300'
  return 'bg-sky-100 text-sky-900 ring-sky-200'
}

export type ScheduleConflict = {
  id: string
  severity: 'critical' | 'warning'
  title: string
  detail: string
  dutyIds: string[]
}

export function detectScheduleConflicts(duties: DutyRecord[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []

  const byDriver = new Map<string, DutyRecord[]>()
  const byVehicle = new Map<string, DutyRecord[]>()

  for (const d of duties) {
    if (d.driver?.id) {
      const list = byDriver.get(d.driver.id) ?? []
      list.push(d)
      byDriver.set(d.driver.id, list)
    }
    if (d.vehicle?.id) {
      const list = byVehicle.get(d.vehicle.id) ?? []
      list.push(d)
      byVehicle.set(d.vehicle.id, list)
    }
    if (!d.driver || d.status === 'unassigned') {
      conflicts.push({
        id: `unassigned-${d.id}`,
        severity: 'critical',
        title: 'Run has no driver',
        detail: `${d.reference} is unassigned`,
        dutyIds: [d.id],
      })
    }
    if (d.vehicle?.status === 'off_road') {
      conflicts.push({
        id: `vor-${d.id}`,
        severity: 'critical',
        title: 'VOR vehicle scheduled',
        detail: `${d.vehicle.registrationNumber} is off road on ${d.reference}`,
        dutyIds: [d.id],
      })
    }
  }

  for (const [, list] of byDriver) {
    if (list.length < 2) continue
    const sameDay = new Map<string, DutyRecord[]>()
    for (const d of list) {
      const bucket = sameDay.get(d.dutyDate) ?? []
      bucket.push(d)
      sameDay.set(d.dutyDate, bucket)
    }
    for (const [date, dayList] of sameDay) {
      if (dayList.length < 2) continue
      conflicts.push({
        id: `driver-clash-${dayList[0].driver!.id}-${date}`,
        severity: 'warning',
        title: 'Driver double booked',
        detail: `${runDriverName(dayList[0])} has ${dayList.length} runs on ${date}`,
        dutyIds: dayList.map((d) => d.id),
      })
    }
  }

  for (const [, list] of byVehicle) {
    if (list.length < 2) continue
    const sameDay = new Map<string, DutyRecord[]>()
    for (const d of list) {
      const bucket = sameDay.get(d.dutyDate) ?? []
      bucket.push(d)
      sameDay.set(d.dutyDate, bucket)
    }
    for (const [date, dayList] of sameDay) {
      if (dayList.length < 2) continue
      conflicts.push({
        id: `vehicle-clash-${dayList[0].vehicle!.id}-${date}`,
        severity: 'warning',
        title: 'Vehicle double booked',
        detail: `${dayList[0].vehicle!.registrationNumber} has ${dayList.length} runs on ${date}`,
        dutyIds: dayList.map((d) => d.id),
      })
    }
  }

  return conflicts
}

export function weekDates(anchorIso: string): string[] {
  const anchor = new Date(anchorIso + 'T12:00:00')
  const day = anchor.getDay() // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() + mondayOffset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}
