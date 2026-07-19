import type { VehicleProfile } from '@/lib/vehicles/types'
import { INSPECTION_TYPE_LABELS } from './constants'
import { daysUntil, hasMissingBrakeEvidence, isDueToday, isDueWithin, isOverdueDate } from './due'
import { INSPECTION_PROVIDERS } from './seed'
import type {
  InspectionCalendarEvent,
  InspectionRecord,
  InspectionsHubData,
  InspectionsSummary,
} from './types'

export function buildInspectionsSummary(register: InspectionRecord[]): InspectionsSummary {
  const active = register.filter((r) => r.status !== 'signed_off' || isRecent(r.signedOffAt, 90))
  const open = register.filter((r) => r.status !== 'signed_off')

  const dueToday = open.filter((r) => isDueToday(r.dueDate) || r.dueDate === todayIso()).length
  const dueWithin7Days = open.filter((r) => isDueWithin(r.dueDate, 7)).length
  const overdue = open.filter((r) => isOverdueDate(r.dueDate) || r.status === 'failed').length
  const inProgress = open.filter((r) => r.status === 'in_progress' || r.status === 'prepared').length
  const awaitingRectification = open.filter((r) => r.status === 'rectification_pending').length
  const awaitingSignOff = open.filter((r) => r.status === 'awaiting_sign_off').length
  const failedVor = open.filter((r) => r.outcome === 'fail_vor' || r.status === 'failed' || r.status === 'held').length

  const completed90d = active.filter((r) => r.status === 'signed_off' && isRecent(r.signedOffAt, 90))
  const onTime = completed90d.filter((r) => {
    if (!r.signedOffAt) return false
    return new Date(r.signedOffAt).getTime() <= new Date(r.dueDate).getTime() + 24 * 60 * 60 * 1000
  }).length
  const complianceRate90d =
    completed90d.length === 0 ? 100 : Math.round((onTime / completed90d.length) * 100)

  return {
    dueToday,
    dueWithin7Days,
    overdue,
    inProgress,
    awaitingRectification,
    awaitingSignOff,
    failedVor,
    complianceRate90d,
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isRecent(iso: string | null, days: number): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000
}

export function buildInspectionCalendar(register: InspectionRecord[]): InspectionCalendarEvent[] {
  return register
    .map((r) => ({
      id: `cal-${r.id}`,
      date: r.bookedDate ?? r.dueDate,
      title: `${INSPECTION_TYPE_LABELS[r.inspectionType]} — ${r.registrationNumber}`,
      inspectionId: r.id,
      vehicleId: r.vehicleId,
      registrationNumber: r.registrationNumber,
      eventKind:
        r.inspectionType === 'annual_prep'
          ? ('mot' as const)
          : r.inspectionType === 'specialist'
            ? ('specialist' as const)
            : ('inspection' as const),
      status: r.status,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Enrich seed rows with live vehicle operational status when available. */
export function enrichInspectionsFromProfiles(
  seed: InspectionRecord[],
  profiles: VehicleProfile[],
): InspectionRecord[] {
  const byId = new Map(profiles.map((p) => [p.id, p]))
  return seed.map((row) => {
    const p = byId.get(row.vehicleId)
    if (!p) return row
    return {
      ...row,
      registrationNumber: p.registrationNumber,
      fleetNumber: p.fleetNumber,
      vehicleType: p.vehicleCategory,
      depot: p.currentDepotName || p.homeDepotName,
      operationalStatus: p.operationalStatus,
      intervalWeeks: row.intervalWeeks ?? p.pmiInterval?.intervalWeeks ?? null,
      odometer: row.odometer ?? p.mileage,
    }
  })
}

export function buildInspectionsHub(
  seed: InspectionRecord[],
  profiles: VehicleProfile[] = [],
): InspectionsHubData {
  const register = enrichInspectionsFromProfiles(seed, profiles).sort((a, b) => {
    const aOver = isOverdueDate(a.dueDate) ? 0 : 1
    const bOver = isOverdueDate(b.dueDate) ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    return a.dueDate.localeCompare(b.dueDate)
  })

  return {
    summary: buildInspectionsSummary(register),
    register,
    calendar: buildInspectionCalendar(register),
    providers: INSPECTION_PROVIDERS,
  }
}

export function filterInspectionRegister(
  rows: InspectionRecord[],
  filterKey: string,
  search: string,
): InspectionRecord[] {
  const q = search.trim().toLowerCase()
  let filtered = rows

  switch (filterKey) {
    case 'due_today':
      filtered = rows.filter((r) => r.status !== 'signed_off' && isDueToday(r.dueDate))
      break
    case 'due_7':
      filtered = rows.filter((r) => r.status !== 'signed_off' && isDueWithin(r.dueDate, 7))
      break
    case 'overdue':
      filtered = rows.filter(
        (r) => r.status !== 'signed_off' && (isOverdueDate(r.dueDate) || r.status === 'failed'),
      )
      break
    case 'in_progress':
      filtered = rows.filter((r) => r.status === 'in_progress' || r.status === 'prepared')
      break
    case 'awaiting_repair':
      filtered = rows.filter((r) => r.status === 'rectification_pending')
      break
    case 'awaiting_sign_off':
      filtered = rows.filter((r) => r.status === 'awaiting_sign_off')
      break
    case 'failed_vor':
      filtered = rows.filter((r) => r.outcome === 'fail_vor' || r.status === 'failed' || r.status === 'held')
      break
    case 'missing_brake':
      filtered = rows.filter((r) => hasMissingBrakeEvidence(r) && r.status !== 'signed_off')
      break
    default:
      break
  }

  if (!q) return filtered
  return filtered.filter(
    (r) =>
      r.registrationNumber.toLowerCase().includes(q) ||
      (r.fleetNumber?.toLowerCase().includes(q) ?? false) ||
      r.depot.toLowerCase().includes(q) ||
      r.provider.toLowerCase().includes(q) ||
      INSPECTION_TYPE_LABELS[r.inspectionType].toLowerCase().includes(q),
  )
}

export function vehicleInspectionSummary(rows: InspectionRecord[], vehicleId: string) {
  const forVehicle = rows.filter((r) => r.vehicleId === vehicleId)
  const open = forVehicle.filter((r) => r.status !== 'signed_off')
  const nextPmi = open
    .filter((r) => r.inspectionType === 'safety_pmi')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const lastSigned = forVehicle
    .filter((r) => r.status === 'signed_off')
    .sort((a, b) => (b.signedOffAt ?? '').localeCompare(a.signedOffAt ?? ''))[0]
  const overdue = open.filter((r) => isOverdueDate(r.dueDate))

  return {
    nextPmi,
    lastSigned,
    overdueCount: overdue.length,
    openCount: open.length,
    daysUntilNext: nextPmi ? daysUntil(nextPmi.dueDate) : null,
  }
}
