import type { VehicleProfile } from '@/lib/vehicles/types'
import type {
  DefectPriorityAlert,
  DefectRegisterRow,
  DefectsHubData,
  DefectsSummary,
  DefectSlaSettings,
} from './types'
import { DEFAULT_DEFECT_AUTOMATION_RULES } from './automation'
import { restrictionSummary } from './restrictions'
import { buildRecurringInsights, isComponentRecurring } from './recurring'
import { buildDefectAnalytics } from './analytics'
import {
  isSlaBreached,
  repairDueAt,
  slaMinutesRemaining,
  triageDueAt,
  DEFAULT_DEFECT_SLA,
} from './sla'
import {
  computeAgeMinutes,
  computeUrgency,
  defectRef,
  deriveVehicleAvailability,
  deriveWorkflowStatus,
  isOverdueRepair,
} from './status'

let slaSettings: DefectSlaSettings = { ...DEFAULT_DEFECT_SLA }

export function getDefectSlaSettings(): DefectSlaSettings {
  return slaSettings
}

export function setDefectSlaSettings(next: DefectSlaSettings): void {
  slaSettings = next
}

function assigneeFor(profile: VehicleProfile, defectId: string): string | null {
  const wo = profile.workOrders.find((w) => w.defectId === defectId && !['completed', 'cancelled'].includes(w.status))
  return wo?.technicianName ?? wo?.provider ?? null
}

function linkedCheckId(profile: VehicleProfile, defectId: string): string | null {
  const check = profile.checks.find((c) => c.defectIds.includes(defectId))
  return check?.id ?? null
}

function evidenceCountFor(d: import('@/lib/vehicles/types').VehicleDefectEntry): number {
  const stored = d.evidence?.length ?? 0
  if (stored > 0) return stored
  return d.severity === 'dangerous' ? 3 : d.severity === 'major' ? 2 : 1
}

export function buildDefectRow(profile: VehicleProfile, d: import('@/lib/vehicles/types').VehicleDefectEntry): DefectRegisterRow {
  const settings = getDefectSlaSettings()
  const repairDeadline = repairDueAt(d.reportedAt, d.severity, settings)
  const triageDeadline = triageDueAt(d.reportedAt, d.severity, settings)
  const activeDeadline = d.triageStatus === 'pending' ? triageDeadline : repairDeadline
  const slaRemaining = slaMinutesRemaining(activeDeadline)
  const linkedWo = d.linkedWorkOrderId ? profile.workOrders.find((w) => w.id === d.linkedWorkOrderId) : null
  const workflowStatus = deriveWorkflowStatus(d, linkedWo?.status ?? null)
  const availability = deriveVehicleAvailability(profile, d)
  const ageMinutes = computeAgeMinutes(d.reportedAt)
  const overdue = isOverdueRepair(d, repairDeadline) || (d.triageStatus === 'pending' && isSlaBreached(triageDeadline))

  const row: DefectRegisterRow = {
    id: d.id,
    defectRef: defectRef(d.id),
    vehicleId: profile.id,
    registrationNumber: profile.registrationNumber,
    fleetNumber: profile.fleetNumber,
    makeModel: `${profile.make} ${profile.model}`,
    depotId: profile.currentDepotId,
    depotName: profile.currentDepotName,
    title: d.description.slice(0, 60),
    description: d.description,
    category: d.category,
    component: d.component,
    severity: d.severity,
    workflowStatus,
    defectStatus: d.status,
    triageStatus: d.triageStatus,
    vehicleAvailability: availability,
    source: d.source.replace(/_/g, ' '),
    reportedBy: d.reportedBy,
    reportedAt: d.reportedAt,
    location: d.location,
    assignee: assigneeFor(profile, d.id),
    repairDeadline,
    triageDeadline,
    slaMinutesRemaining: slaRemaining,
    isSlaBreached: isSlaBreached(activeDeadline),
    ageMinutes,
    isOverdue: overdue,
    evidenceCount: evidenceCountFor(d),
    linkedWorkOrderId: d.linkedWorkOrderId,
    linkedCheckId: linkedCheckId(profile, d.id),
    urgencyScore: 0,
    operationalImpact:
      availability === 'vor'
        ? 'Vehicle off road'
        : restrictionSummary(profile)
          ? `Restricted: ${restrictionSummary(profile)}`
          : d.severity === 'major'
            ? 'Restricted use — review required'
            : overdue
              ? 'Repair overdue'
              : 'Monitor',
    assignedRunReference: profile.currentRunReference ?? profile.nextRunReference,
    nextDepartureTime: profile.nextDepartureTime,
    isRecurring: isComponentRecurring(profile, d.component, settings),
    closedAt: d.closedAt,
  }
  row.urgencyScore = computeUrgency(row)
  if (row.isSlaBreached) row.urgencyScore += 15
  return row
}

export function buildDefectsHub(vehicles: VehicleProfile[]): DefectsHubData {
  const settings = getDefectSlaSettings()
  const active = vehicles.filter((v) => v.lifecycleStatus === 'active' || v.lifecycleStatus === 'awaiting_onboarding')
  const register = active
    .flatMap((p) => p.defects.map((d) => buildDefectRow(p, d)))
    .sort((a, b) => b.urgencyScore - a.urgencyScore)

  const open = register.filter((r) => r.defectStatus !== 'closed')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const awaitingTriage = open.filter((r) => r.workflowStatus === 'awaiting_triage')
  const critical = open.filter((r) => r.severity === 'dangerous')
  const overdue = open.filter((r) => r.isOverdue || r.isSlaBreached)
  const verification = open.filter((r) => r.workflowStatus === 'awaiting_verification')
  const vorVehicles = new Set(open.filter((r) => r.vehicleAvailability === 'vor').map((r) => r.vehicleId))

  const summary: DefectsSummary = {
    openDefects: open.length,
    addedToday: open.filter((r) => new Date(r.reportedAt) >= todayStart).length,
    safetyCritical: critical.length,
    allVor: critical.filter((r) => r.vehicleAvailability === 'vor').length,
    awaitingTriage: awaitingTriage.length,
    oldestTriageHours: awaitingTriage.length
      ? Math.max(...awaitingTriage.map((r) => Math.round(r.ageMinutes / 60)))
      : null,
    overdueRepairs: overdue.length,
    overdueAffectingActive: overdue.filter((r) => r.assignedRunReference).length,
    vehiclesVor: vorVehicles.size,
    awaitingVerification: verification.length,
  }

  const priorityAlerts: DefectPriorityAlert[] = critical
    .filter((r) => r.defectStatus !== 'closed')
    .slice(0, 3)
    .map((r) => {
      const profile = active.find((v) => v.id === r.vehicleId)
      const readyCount = active.filter(
        (v) => v.id !== r.vehicleId && v.operationalStatus !== 'vor' && v.seatingCapacity >= (profile?.seatingCapacity ?? 0),
      ).length
      return {
        id: `alert-${r.id}`,
        defectId: r.id,
        defectRef: r.defectRef,
        registrationNumber: r.registrationNumber,
        title: r.title,
        severity: r.severity,
        reportedBy: r.reportedBy,
        reportedAt: r.reportedAt,
        location: r.location ?? r.depotName,
        assignedRunReference: r.assignedRunReference,
        nextDepartureTime: r.nextDepartureTime,
        vehicleAvailability: r.vehicleAvailability,
        replacementAssigned: false,
        replacementCandidates: readyCount,
        dispatchBlocked: settings.blockDispatchOnCritical,
        summary: r.description,
      }
    })

  const depots = [...new Map(active.map((v) => [v.currentDepotId, { id: v.currentDepotId, name: v.currentDepotName }])).values()]
  const recurringInsights = buildRecurringInsights(active, settings)
  const today = new Date()

  return {
    operationalDate: today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    summary,
    register,
    priorityAlerts,
    depots,
    recurring: register.filter((r) => r.isRecurring && r.defectStatus !== 'closed'),
    recurringInsights,
    slaSettings: settings,
    automationRules: DEFAULT_DEFECT_AUTOMATION_RULES,
    analytics: buildDefectAnalytics(register),
  }
}

export function filterDefectRows(
  rows: DefectRegisterRow[],
  filter: string,
  search: string,
  depotId?: string,
  tab?: string,
): DefectRegisterRow[] {
  let list = rows

  if (depotId && depotId !== 'all') list = list.filter((r) => r.depotId === depotId)

  if (tab === 'history') {
    list = list.filter((r) => r.defectStatus === 'closed')
  } else if (tab !== 'rules') {
    list = list.filter((r) => r.defectStatus !== 'closed')

    if (tab === 'critical') list = list.filter((r) => r.severity === 'dangerous')
    else if (tab === 'awaiting_triage') list = list.filter((r) => r.workflowStatus === 'awaiting_triage')
    else if (tab === 'vor') list = list.filter((r) => r.vehicleAvailability === 'vor')
    else if (tab === 'overdue') list = list.filter((r) => r.isOverdue || r.isSlaBreached)
    else if (tab === 'verification') list = list.filter((r) => r.workflowStatus === 'awaiting_verification')
    else if (tab === 'recurring') list = list.filter((r) => r.isRecurring)
    else if (filter === 'critical') list = list.filter((r) => r.severity === 'dangerous')
    else if (filter === 'awaiting_triage') list = list.filter((r) => r.workflowStatus === 'awaiting_triage')
    else if (filter === 'vor') list = list.filter((r) => r.vehicleAvailability === 'vor')
    else if (filter === 'overdue') list = list.filter((r) => r.isOverdue || r.isSlaBreached)
    else if (filter === 'verification') list = list.filter((r) => r.workflowStatus === 'awaiting_verification')
    else if (filter === 'driver_reported') list = list.filter((r) => r.source.includes('driver'))
    else if (filter === 'reopened') list = list.filter((r) => r.workflowStatus === 'reopened')
    else if (filter === 'temporary_repairs') list = list.filter((r) => r.workflowStatus === 'temporarily_repaired')
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (r) =>
        r.registrationNumber.toLowerCase().includes(q) ||
        r.defectRef.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.reportedBy.toLowerCase().includes(q) ||
        r.component.toLowerCase().includes(q),
    )
  }

  return list.sort((a, b) => b.urgencyScore - a.urgencyScore)
}
