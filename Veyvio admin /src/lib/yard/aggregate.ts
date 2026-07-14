import type { VehicleProfile } from '@/lib/vehicles/types'
import { DEPOT_ZONES } from './constants'
import { buildYardExceptions } from './exceptions'
import { buildYardHandoverDraft } from './handovers'
import { buildMapMarkers } from './map'
import { isOnSite, vehicleCountsAsOnSite, vehicleToYardRow } from './status'
import type {
  YardAuditEvent,
  YardHandover,
  YardHubData,
  YardMovementRecord,
  YardSummary,
  YardTask,
  YardVehicleRow,
} from './types'

const DEPARTING_SOON_HOURS = 8

function isDepartingSoon(nextDeparture: string | null): boolean {
  if (!nextDeparture) return false
  const [h, m] = nextDeparture.split(':').map(Number)
  if (h == null || m == null) return false
  const now = new Date()
  const dep = new Date(now)
  dep.setHours(h, m, 0, 0)
  if (dep.getTime() < now.getTime()) dep.setDate(dep.getDate() + 1)
  const diff = dep.getTime() - now.getTime()
  return diff > 0 && diff <= DEPARTING_SOON_HOURS * 60 * 60 * 1000
}

export function computeYardSummary(rows: YardVehicleRow[]): YardSummary {
  return {
    onSite: rows.filter((r) => isOnSite(r.presenceState)).length,
    readyForService: rows.filter((r) => r.readinessState === 'ready' || r.readinessState === 'ready_with_advisory').length,
    workRequired: rows.filter((r) => r.openTaskCount > 0 && r.readinessState !== 'vor').length,
    awaitingInspection: rows.filter((r) => r.activityState === 'awaiting_inspection' || r.activityState === 'under_inspection').length,
    vor: rows.filter((r) => r.readinessState === 'vor').length,
    departingSoon: rows.filter((r) => isDepartingSoon(r.nextDeparture)).length,
    locationUnknown: rows.filter((r) => r.presenceState === 'location_unknown').length,
  }
}

const STAFF_BY_DEPOT: Record<string, string> = {
  'depot-wembley': 'Sarah James',
  'depot-croydon': 'Alice Brown',
  'depot-park-royal': 'Michael Brown',
}

export function filterYardRows(rows: YardVehicleRow[], filter: string, search: string): YardVehicleRow[] {
  let list = rows
  if (filter === 'on_site') list = list.filter((r) => isOnSite(r.presenceState))
  else if (filter === 'ready') list = list.filter((r) => r.readinessState === 'ready' || r.readinessState === 'ready_with_advisory')
  else if (filter === 'work_required') list = list.filter((r) => r.openTaskCount > 0)
  else if (filter === 'awaiting_inspection') list = list.filter((r) => ['awaiting_inspection', 'under_inspection'].includes(r.activityState))
  else if (filter === 'vor') list = list.filter((r) => r.readinessState === 'vor')
  else if (filter === 'departing_soon') list = list.filter((r) => isDepartingSoon(r.nextDeparture))
  else if (filter === 'location_unknown') list = list.filter((r) => r.presenceState === 'location_unknown')

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (r) =>
        r.registrationNumber.toLowerCase().includes(q) ||
        r.fleetNumber?.toLowerCase().includes(q) ||
        r.bay?.toLowerCase().includes(q) ||
        r.zone.toLowerCase().includes(q) ||
        r.makeModel.toLowerCase().includes(q),
    )
  }
  return list
}

export function vehicleToYardRowWithTasks(
  v: VehicleProfile,
  assignedStaffName: string | null,
  openYardTasks: number,
): YardVehicleRow {
  const row = vehicleToYardRow(v, assignedStaffName)
  return { ...row, openTaskCount: Math.max(row.openTaskCount, openYardTasks) }
}

export function buildYardHub(
  vehicles: VehicleProfile[],
  movements: YardMovementRecord[],
  auditEvents: YardAuditEvent[],
  tasks: YardTask[],
  handover: YardHandover | null,
  depots: { id: string; name: string }[],
  depotId: string,
): YardHubData {
  const depot = depots.find((d) => d.id === depotId) ?? depots[0]!
  const depotVehicles = vehicles.filter((v) => v.currentDepotId === depotId && v.lifecycleStatus === 'active')
  const depotTasks = tasks.filter((t) => t.depotId === depotId)

  const rows = depotVehicles.map((v) => {
    const vehicleTasks = depotTasks.filter((t) => t.vehicleId === v.id && !['completed', 'cancelled'].includes(t.status))
    const assigned = vehicleTasks.find((t) => t.assignedStaffName)?.assignedStaffName ?? STAFF_BY_DEPOT[depotId] ?? null
    return vehicleToYardRowWithTasks(v, assigned, vehicleTasks.length)
  })

  const today = new Date()
  const shiftLabel = today.getHours() < 14 ? 'Day shift' : 'Evening shift'
  const exceptions = buildYardExceptions(vehicles, rows, depotId)
  const activeHandover =
    handover ??
    buildYardHandoverDraft(depot.id, depot.name, shiftLabel, rows, depotTasks, STAFF_BY_DEPOT[depotId] ?? 'Yard supervisor')

  return {
    depotId: depot.id,
    depotName: depot.name,
    shiftLabel,
    operationalDate: today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    summary: computeYardSummary(rows),
    vehicles: rows.sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber)),
    movements: movements.filter((m) => m.depotId === depotId).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    auditEvents: auditEvents.filter((e) => !e.vehicleId || depotVehicles.some((v) => v.id === e.vehicleId)).slice(0, 30),
    tasks: depotTasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    exceptions,
    handover: activeHandover,
    mapMarkers: buildMapMarkers(rows, depotId),
    depots,
    zones: DEPOT_ZONES[depotId] ?? DEPOT_ZONES['depot-wembley']!,
  }
}

export function vehiclesOnSiteAtDepot(vehicles: VehicleProfile[], depotId: string): number {
  return vehicles.filter((v) => v.currentDepotId === depotId && vehicleCountsAsOnSite(v)).length
}
