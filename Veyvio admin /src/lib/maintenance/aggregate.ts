import type { VehicleProfile } from '@/lib/vehicles/types'
import { downtimeAnalytics } from './downtime'
import { computeMaintenanceIntelligence } from './intelligence'
import { SEED_PARTS, SEED_SUPPLIERS } from './suppliers'
import {
  compliancePosition,
  deriveMaintenanceStatus,
  downtimeHours,
  primaryOpenDefect,
  severityRank,
} from './status'
import { checklistProgress, isPmiChecklistComplete } from './pmi-checklist'
import type {
  FleetDefectRow,
  FleetWorkOrderRow,
  MaintenanceCalendarEvent,
  MaintenanceFleetRow,
  MaintenanceHubData,
  MaintenanceOverviewSummary,
  MaintenancePriorityItem,
  ServiceScheduleItem,
} from './types'

const WARN_DAYS = 30
const DUE_SOON_DAYS = 7
const DUE_14_DAYS = 14
const OPEN_WO_STATUSES = new Set([
  'requested', 'awaiting_review', 'approved', 'scheduled', 'vehicle_awaiting_workshop',
  'in_progress', 'awaiting_parts', 'awaiting_authorisation', 'quality_check',
])

function daysUntil(date: string | null): number | null {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function isOverdue(date: string | null): boolean {
  return date != null && new Date(date).getTime() < Date.now()
}

function isDueSoon(date: string | null, days = DUE_SOON_DAYS): boolean {
  const d = daysUntil(date)
  return d != null && d >= 0 && d <= days
}

function isDueToday(date: string | null): boolean {
  const d = daysUntil(date)
  return d === 0
}

function isApproaching(date: string | null, days = WARN_DAYS): boolean {
  const d = daysUntil(date)
  return d != null && d >= 0 && d <= days
}

export function buildMaintenanceHub(profiles: VehicleProfile[]): MaintenanceHubData {
  const active = profiles.filter((p) => p.lifecycleStatus === 'active' || p.lifecycleStatus === 'awaiting_onboarding')
  const fleetRows = active.map(buildFleetRow)
  const workOrders = flattenWorkOrders(active)
  const defects = flattenDefects(active)
  const schedule = buildSchedule(active, workOrders)
  const summary = computeSummary(active, workOrders, defects)
  const priorityQueue = buildPriorityQueue(active, workOrders)
  const calendar = buildCalendar(active, workOrders, schedule)

  return {
    summary,
    priorityQueue,
    fleetRows,
    workOrders,
    schedule,
    defects,
    calendar,
    suppliers: SEED_SUPPLIERS,
    parts: SEED_PARTS,
    downtime: downtimeAnalytics(active),
    intelligence: computeMaintenanceIntelligence(active),
  }
}

function buildFleetRow(profile: VehicleProfile): MaintenanceFleetRow {
  const defect = primaryOpenDefect(profile)
  const maintenanceStatus = deriveMaintenanceStatus(profile)
  const openOrders = profile.workOrders.filter((w) => OPEN_WO_STATUSES.has(w.status))
  const activeWo = openOrders[0]

  return {
    vehicleId: profile.id,
    registrationNumber: profile.registrationNumber,
    fleetNumber: profile.fleetNumber,
    depot: profile.currentDepotName,
    make: profile.make,
    model: profile.model,
    operationalStatus: profile.operationalStatus,
    maintenanceStatus,
    currentIssue: defect?.description ?? activeWo?.title ?? null,
    severity: defect?.severity ?? null,
    nextServiceDate: profile.nextMaintenanceDate,
    nextServiceMileage: profile.nextMaintenanceMileage,
    complianceSummary: compliancePosition(profile),
    downtimeHours: downtimeHours(profile),
    workshop: activeWo?.provider ?? null,
    expectedReturn: activeWo?.scheduledDate ?? profile.nextMaintenanceDate,
    openWorkOrders: openOrders.length,
    openDefects: profile.openDefectCount,
  }
}

function flattenWorkOrders(profiles: VehicleProfile[]): FleetWorkOrderRow[] {
  return profiles.flatMap((p) =>
    p.workOrders.map((w) => {
      const linkedDefect = w.defectId ? p.defects.find((d) => d.id === w.defectId) : null
      return {
        workOrderId: w.id,
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentDepotName,
        title: w.title,
        type: w.type,
        status: w.status,
        severity: linkedDefect?.severity ?? null,
        provider: w.provider,
        technicianName: w.technicianName,
        managerName: w.managerName,
        scheduledDate: w.scheduledDate,
        targetCompletionDate: w.targetCompletionDate,
        expectedCompletion: w.targetCompletionDate ?? w.scheduledDate,
        defectId: w.defectId,
        creationSource: w.creationSource,
        diagnosis: w.diagnosis,
        labourHours: w.labourHours,
        labourCost: w.labourCost,
        partsCost: w.partsCost,
        estimatedCost: w.estimatedCost,
        actualCost: w.actualCost,
        roadTestRequired: w.roadTestRequired,
        partsCount: w.parts.length,
        pmiChecklistProgress:
          w.type === 'pmi'
            ? {
                ...checklistProgress(w.pmiChecklist),
                complete: isPmiChecklistComplete(w.pmiChecklist),
              }
            : null,
        estimateStatus: w.estimate?.status ?? null,
        estimateTotal: w.estimate?.totalCost ?? null,
        createdAt: w.createdAt,
        createdBy: w.createdBy,
      }
    }),
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function flattenDefects(profiles: VehicleProfile[]): FleetDefectRow[] {
  return profiles.flatMap((p) =>
    p.defects.map((d) => {
      const linkedWo = p.workOrders.find((w) => w.defectId === d.id && !['completed', 'cancelled'].includes(w.status))
      return {
        id: d.id,
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentLocationLabel ?? p.currentDepotName,
        component: d.component,
        description: d.description,
        severity: d.severity,
        status: d.status,
        source: d.source,
        reportedBy: d.reportedBy,
        reportedAt: d.reportedAt,
        triageStatus:
          d.status === 'closed'
            ? 'closed'
            : d.linkedWorkOrderId
              ? 'work_order_linked'
              : d.triageStatus,
        operationalImpact: d.vorApplied || d.severity === 'dangerous' ? 'Vehicle off road' : d.severity === 'major' ? 'Restricted use' : 'Monitor',
        linkedWorkOrderId: d.linkedWorkOrderId ?? linkedWo?.id ?? null,
      }
    }),
  ).sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
}

function buildSchedule(profiles: VehicleProfile[], workOrders: FleetWorkOrderRow[]): ServiceScheduleItem[] {
  const fromProfile: ServiceScheduleItem[] = profiles
    .filter((p) => p.nextMaintenanceDate || p.nextMaintenanceMileage)
    .map((p) => {
      const overdue = isOverdue(p.nextMaintenanceDate)
      const dueSoon = isDueSoon(p.nextMaintenanceDate)
      const milesRemaining =
        p.nextMaintenanceMileage != null && p.mileage != null ? p.nextMaintenanceMileage - p.mileage : null
      return {
        id: `sched-${p.id}`,
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        depot: p.currentDepotName,
        serviceType: 'Scheduled service',
        dueDate: p.nextMaintenanceDate,
        dueMileage: p.nextMaintenanceMileage,
        currentMileage: p.mileage,
        milesRemaining,
        status: overdue ? 'overdue' as const : dueSoon ? 'due_soon' as const : 'scheduled' as const,
        workshop: null,
        owner: 'Fleet Workshop',
        source: 'profile' as const,
      }
    })

  const fromWo: ServiceScheduleItem[] = workOrders
    .filter((w) => ['scheduled', 'approved', 'requested'].includes(w.status) && w.scheduledDate)
    .map((w) => ({
      id: `sched-wo-${w.workOrderId}`,
      vehicleId: w.vehicleId,
      registrationNumber: w.registrationNumber,
      depot: w.depot,
      serviceType: w.title,
      dueDate: w.scheduledDate,
      dueMileage: null,
      currentMileage: null,
      milesRemaining: null,
      status: isOverdue(w.scheduledDate) ? 'overdue' as const : isDueSoon(w.scheduledDate) ? 'due_soon' as const : 'scheduled' as const,
      workshop: w.provider,
      owner: w.technicianName ?? w.managerName ?? w.provider,
      source: 'work_order' as const,
    }))

  return [...fromProfile, ...fromWo].sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
}

function computeSummary(
  profiles: VehicleProfile[],
  workOrders: FleetWorkOrderRow[],
  defects: FleetDefectRow[],
): MaintenanceOverviewSummary {
  const openWo = workOrders.filter((w) => OPEN_WO_STATUSES.has(w.status))
  const openDefects = defects.filter((d) => d.status !== 'closed')
  const readyForRelease = profiles.filter((p) => deriveMaintenanceStatus(p) === 'ready_for_release').length
  const awaitingParts = profiles.filter((p) => deriveMaintenanceStatus(p) === 'awaiting_parts').length
  const inWorkshop = profiles.filter((p) =>
    ['in_workshop', 'under_inspection'].includes(p.operationalStatus) || deriveMaintenanceStatus(p) === 'in_workshop',
  ).length
  const vor = profiles.filter((p) => p.operationalStatus === 'vor').length
  const safetyCritical = openDefects.filter((d) => d.severity === 'dangerous').length
  const overdue = profiles.filter((p) => isOverdue(p.nextMaintenanceDate)).length
  const dueToday = profiles.filter((p) => isDueToday(p.nextMaintenanceDate)).length
  const dueWithin14 = profiles.filter((p) => isDueSoon(p.nextMaintenanceDate, DUE_14_DAYS)).length

  return {
    attention: {
      dueToday,
      dueWithin14Days: dueWithin14,
      overdue,
      vor,
      safetyCriticalDefects: safetyCritical,
      inWorkshop,
      awaitingParts,
      readyForRelease,
    },
    fleetAvailability: {
      total: profiles.length,
      available: profiles.filter((p) => p.operationalStatus === 'available' && p.openDefectCount === 0).length,
      availableWithAdvisory: profiles.filter(
        (p) => p.operationalStatus === 'available' && p.openDefectCount > 0 && p.criticalDefectCount === 0,
      ).length,
      inMaintenance: profiles.filter((p) =>
        ['in_workshop', 'awaiting_parts', 'under_inspection'].includes(p.operationalStatus),
      ).length,
      vor,
      awaitingInspection: profiles.filter((p) => deriveMaintenanceStatus(p) === 'awaiting_inspection').length,
      awaitingParts,
      readyForRelease,
      dueSoonUsable: profiles.filter(
        (p) =>
          p.operationalStatus === 'available' &&
          isDueSoon(p.nextMaintenanceDate, DUE_14_DAYS) &&
          !isOverdue(p.nextMaintenanceDate),
      ).length,
    },
    maintenanceRisk: {
      overdueServices: overdue,
      dueWithin7Days: profiles.filter((p) => isDueSoon(p.nextMaintenanceDate)).length,
      safetyCriticalDefects: safetyCritical,
      repeatDefectVehicles: profiles.filter((p) => p.defects.filter((d) => d.status !== 'closed').length >= 2).length,
      motApproaching: profiles.filter((p) => isApproaching(p.motExpiry)).length,
      tachoApproaching: profiles.filter((p) => isApproaching(p.tachographCalibrationExpiry)).length,
      missingEvidence: openWo.filter(
        (w) =>
          w.type === 'pmi' &&
          ['quality_check', 'in_progress', 'awaiting_authorisation'].includes(w.status) &&
          w.pmiChecklistProgress != null &&
          !w.pmiChecklistProgress.complete,
      ).length,
    },
    workshopPosition: {
      notStarted: openWo.filter((w) => ['requested', 'awaiting_review', 'approved', 'scheduled'].includes(w.status)).length,
      inProgress: openWo.filter((w) => ['in_progress', 'vehicle_awaiting_workshop'].includes(w.status)).length,
      awaitingParts: openWo.filter((w) => w.status === 'awaiting_parts').length,
      awaitingApproval: openWo.filter((w) => w.status === 'awaiting_authorisation').length,
      readyForInspection: openWo.filter((w) => w.status === 'quality_check').length,
      readyForRelease,
    },
  }
}

function buildPriorityQueue(profiles: VehicleProfile[], workOrders: FleetWorkOrderRow[]): MaintenancePriorityItem[] {
  const items: MaintenancePriorityItem[] = []

  for (const p of profiles) {
    const dangerous = p.defects.find((d) => d.severity === 'dangerous' && d.status !== 'closed')
    if (dangerous || p.operationalStatus === 'vor') {
      const wo = workOrders.find((w) => w.vehicleId === p.id && OPEN_WO_STATUSES.has(w.status))
      items.push({
        id: `pri-vor-${p.id}`,
        priorityGroup: 'critical',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentDepotName,
        issue: dangerous?.description ?? 'Vehicle off road',
        severity: dangerous?.severity ?? 'dangerous',
        operationalImpact: 'Cannot dispatch',
        maintenanceStage: deriveMaintenanceStatus(p),
        responsiblePerson: wo?.technicianName ?? wo?.createdBy ?? null,
        expectedCompletion: wo?.scheduledDate ?? null,
        upcomingWork: p.nextRunReference ? `Allocated: ${p.nextRunReference}` : p.nextDepartureTime ? `Departure ${p.nextDepartureTime}` : null,
        recommendedAction: wo ? 'Progress work order and complete return-to-service' : 'Open VOR board and raise work order',
        deadline: wo?.targetCompletionDate ?? wo?.scheduledDate ?? null,
      })
    }

    if (p.motExpiry && isOverdue(p.motExpiry)) {
      items.push({
        id: `pri-mot-${p.id}`,
        priorityGroup: 'critical',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentDepotName,
        issue: 'MOT expired',
        severity: 'dangerous',
        operationalImpact: 'Release blocked',
        maintenanceStage: deriveMaintenanceStatus(p),
        responsiblePerson: null,
        expectedCompletion: null,
        upcomingWork: null,
        recommendedAction: 'Book MOT / annual test and attach certificate',
        deadline: p.motExpiry,
      })
    }

    if (isOverdue(p.nextMaintenanceDate)) {
      items.push({
        id: `pri-svc-${p.id}`,
        priorityGroup: 'urgent',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentDepotName,
        issue: 'PMI / service overdue',
        severity: 'major',
        operationalImpact: 'Schedule conflict risk',
        maintenanceStage: deriveMaintenanceStatus(p),
        responsiblePerson: null,
        expectedCompletion: p.nextMaintenanceDate,
        upcomingWork: p.nextRunReference,
        recommendedAction: 'Schedule PMI and hold dispatch until completed',
        deadline: p.nextMaintenanceDate,
      })
    }

    if (isDueSoon(p.motExpiry) && !isOverdue(p.motExpiry)) {
      items.push({
        id: `pri-mot-soon-${p.id}`,
        priorityGroup: 'urgent',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentDepotName,
        issue: `MOT due in ${daysUntil(p.motExpiry)} days`,
        severity: 'major',
        operationalImpact: 'Compliance risk',
        maintenanceStage: deriveMaintenanceStatus(p),
        responsiblePerson: null,
        expectedCompletion: p.motExpiry,
        upcomingWork: null,
        recommendedAction: 'Book annual test before assignment window',
        deadline: p.motExpiry,
      })
    }

    const pendingDefect = p.defects.find((d) => d.status === 'open' && d.severity !== 'dangerous')
    if (pendingDefect && !items.some((i) => i.vehicleId === p.id && i.priorityGroup === 'critical')) {
      items.push({
        id: `pri-def-${pendingDefect.id}`,
        priorityGroup: pendingDefect.severity === 'major' ? 'urgent' : 'attention',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        depot: p.currentDepotName,
        issue: pendingDefect.description,
        severity: pendingDefect.severity,
        operationalImpact: 'Defect awaiting review',
        maintenanceStage: deriveMaintenanceStatus(p),
        responsiblePerson: null,
        expectedCompletion: null,
        upcomingWork: null,
        recommendedAction: pendingDefect.linkedWorkOrderId
          ? 'Open linked work order'
          : 'Triage defect and create work order',
        deadline: null,
      })
    }
  }

  const rank = { critical: 0, urgent: 1, attention: 2 }
  return items.sort((a, b) => rank[a.priorityGroup] - rank[b.priorityGroup] || severityRank(b.severity) - severityRank(a.severity))
}

function buildCalendar(
  profiles: VehicleProfile[],
  workOrders: FleetWorkOrderRow[],
  schedule: ServiceScheduleItem[],
): MaintenanceCalendarEvent[] {
  const events: MaintenanceCalendarEvent[] = []

  for (const p of profiles) {
    if (p.motExpiry) {
      events.push({
        id: `cal-mot-${p.id}`,
        date: p.motExpiry,
        title: `MOT — ${p.registrationNumber}`,
        eventType: 'mot',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        depot: p.currentDepotName,
        status: isOverdue(p.motExpiry) ? 'overdue' : 'scheduled',
      })
    }
    if (p.tachographCalibrationExpiry) {
      events.push({
        id: `cal-tacho-${p.id}`,
        date: p.tachographCalibrationExpiry,
        title: `Tacho calibration — ${p.registrationNumber}`,
        eventType: 'calibration',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        depot: p.currentDepotName,
      })
    }
    if (p.wheelRetorqueDueAt) {
      events.push({
        id: `cal-retorque-${p.id}`,
        date: p.wheelRetorqueDueAt.slice(0, 10),
        title: `Wheel retorque — ${p.registrationNumber}`,
        eventType: 'retorque',
        vehicleId: p.id,
        registrationNumber: p.registrationNumber,
        depot: p.currentDepotName,
      })
    }
  }

  for (const s of schedule) {
    if (!s.dueDate) continue
    events.push({
      id: `cal-sched-${s.id}`,
      date: s.dueDate,
      title: `${s.serviceType} — ${s.registrationNumber}`,
      eventType: 'service',
      vehicleId: s.vehicleId,
      registrationNumber: s.registrationNumber,
      depot: s.depot,
      status: s.status,
    })
  }

  for (const w of workOrders.filter((wo) => wo.scheduledDate && OPEN_WO_STATUSES.has(wo.status))) {
    events.push({
      id: `cal-wo-${w.workOrderId}`,
      date: w.scheduledDate!,
      title: `${w.title} — ${w.registrationNumber}`,
      eventType: 'work_order',
      vehicleId: w.vehicleId,
      registrationNumber: w.registrationNumber,
      depot: w.depot,
      status: w.status,
    })
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export function filterFleetRows(rows: MaintenanceFleetRow[], filter: string, search: string): MaintenanceFleetRow[] {
  let list = rows
  if (filter === 'available') list = list.filter((r) => r.operationalStatus === 'available' && r.openDefects === 0)
  else if (filter === 'advisory') list = list.filter((r) => r.operationalStatus === 'available' && r.openDefects > 0)
  else if (filter === 'vor') list = list.filter((r) => r.operationalStatus === 'vor')
  else if (filter === 'in_maintenance') list = list.filter((r) => r.maintenanceStatus === 'in_workshop' || r.maintenanceStatus === 'awaiting_parts')
  else if (filter === 'awaiting_inspection') list = list.filter((r) => r.maintenanceStatus === 'awaiting_inspection')
  else if (filter === 'awaiting_parts') list = list.filter((r) => r.maintenanceStatus === 'awaiting_parts')
  else if (filter === 'overdue_service') list = list.filter((r) => r.nextServiceDate && isOverdue(r.nextServiceDate))
  else if (filter === 'due_today') list = list.filter((r) => r.nextServiceDate && isDueToday(r.nextServiceDate))
  else if (filter === 'due_soon') list = list.filter((r) => r.nextServiceDate && isDueSoon(r.nextServiceDate))
  else if (filter === 'due_14') list = list.filter((r) => r.nextServiceDate && isDueSoon(r.nextServiceDate, DUE_14_DAYS))
  else if (filter === 'safety_critical') list = list.filter((r) => r.severity === 'dangerous')
  else if (filter === 'wo_in_progress') list = list.filter((r) => r.maintenanceStatus === 'in_workshop')
  else if (filter === 'wo_awaiting_parts') list = list.filter((r) => r.maintenanceStatus === 'awaiting_parts')
  else if (filter === 'wo_ready_release') list = list.filter((r) => r.maintenanceStatus === 'ready_for_release')

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (r) =>
        r.registrationNumber.toLowerCase().includes(q) ||
        r.fleetNumber?.toLowerCase().includes(q) ||
        r.depot.toLowerCase().includes(q) ||
        r.currentIssue?.toLowerCase().includes(q) ||
        r.vehicleId.toLowerCase() === q,
    )
  }
  return list
}
