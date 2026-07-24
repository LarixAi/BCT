import { DEFAULT_DEFECT_SLA } from '@/lib/defects/sla'
import type {
  ChecksHubData,
  ChecksOperationalRow,
  ChecksSummary,
  LiveCheckRow,
} from '@/lib/checks/types'
import type { DefectAnalytics, DefectsHubData } from '@/lib/defects/types'
import type { IncidentAnalytics, IncidentsHubData } from '@/lib/incidents/types'
import type { MaintenanceIntelligence } from '@/lib/maintenance/intelligence'
import type { MaintenanceHubData } from '@/lib/maintenance/types'
import type { YardHubData, YardSummary } from '@/lib/yard/types'

const EMPTY_DEFECT_ANALYTICS: DefectAnalytics = {
  byDepot: [],
  byCategory: [],
  bySource: [],
  slaBreaches: 0,
  avgAgeHours: 0,
  reopenedCount: 0,
  closedThisWeek: 0,
}

const EMPTY_INCIDENT_ANALYTICS: IncidentAnalytics = {
  byType: [],
  bySeverity: [],
  byDepot: [],
  avgAcknowledgeHours: 0,
  avgContainHours: 0,
  overdueActions: 0,
  nearMissRate: 0,
  preventableCount: 0,
}

export const EMPTY_MAINTENANCE_INTELLIGENCE: MaintenanceIntelligence = {
  maintenanceCostPerMile: [],
  repeatDefectCategories: [],
  highCostVehicles: [],
  plannedVsUnplanned: { planned: 0, unplanned: 0 },
  warrantySavings: 0,
  supplierScores: [],
  fleetAvgCostPerMile: null,
  unplannedSharePercent: 0,
  costAlerts: [],
}

function emptyDefectSummary(): DefectsHubData['summary'] {
  return {
    openDefects: 0,
    addedToday: 0,
    safetyCritical: 0,
    allVor: 0,
    awaitingTriage: 0,
    oldestTriageHours: null,
    overdueRepairs: 0,
    overdueAffectingActive: 0,
    vehiclesVor: 0,
    awaitingVerification: 0,
  }
}

function emptyIncidentSummary(): IncidentsHubData['summary'] {
  return {
    openCritical: 0,
    awaitingTriage: 0,
    overdueActions: 0,
    externalAssessmentRequired: 0,
    openInvestigations: 0,
    incidentsThisMonth: 0,
    previousMonthCount: 0,
    nearMissThisMonth: 0,
  }
}

function emptyMaintenanceSummary(): MaintenanceHubData['summary'] {
  return {
    attention: {
      dueToday: 0,
      dueWithin14Days: 0,
      overdue: 0,
      vor: 0,
      safetyCriticalDefects: 0,
      inWorkshop: 0,
      awaitingParts: 0,
      readyForRelease: 0,
    },
    fleetAvailability: {
      total: 0,
      available: 0,
      availableWithAdvisory: 0,
      inMaintenance: 0,
      vor: 0,
      awaitingInspection: 0,
      awaitingParts: 0,
      readyForRelease: 0,
      dueSoonUsable: 0,
    },
    maintenanceRisk: {
      overdueServices: 0,
      dueWithin7Days: 0,
      safetyCriticalDefects: 0,
      repeatDefectVehicles: 0,
      motApproaching: 0,
      tachoApproaching: 0,
      missingEvidence: 0,
    },
    workshopPosition: {
      notStarted: 0,
      inProgress: 0,
      awaitingParts: 0,
      awaitingApproval: 0,
      readyForInspection: 0,
      readyForRelease: 0,
    },
  }
}

/** Prevent Defects blank screens when live hub omits nested analytics/SLA shapes. */
export function safeDefectsHub(hub: DefectsHubData): DefectsHubData {
  const sla = hub.slaSettings
  const triageLooksNested = sla && typeof sla.triageMinutes === 'object' && sla.triageMinutes !== null
  return {
    ...hub,
    operationalDate: hub.operationalDate ?? new Date().toISOString().slice(0, 10),
    summary: { ...emptyDefectSummary(), ...(hub.summary ?? {}) },
    register: hub.register ?? [],
    priorityAlerts: hub.priorityAlerts ?? [],
    depots: hub.depots ?? [],
    recurring: hub.recurring ?? [],
    recurringInsights: hub.recurringInsights ?? [],
    slaSettings: triageLooksNested ? sla : { ...DEFAULT_DEFECT_SLA },
    automationRules: hub.automationRules ?? [],
    analytics: {
      ...EMPTY_DEFECT_ANALYTICS,
      ...(hub.analytics ?? {}),
      byDepot: Array.isArray(hub.analytics?.byDepot) ? hub.analytics.byDepot : [],
      byCategory: Array.isArray(hub.analytics?.byCategory) ? hub.analytics.byCategory : [],
      bySource: Array.isArray(hub.analytics?.bySource) ? hub.analytics.bySource : [],
    },
  }
}

/** Prevent Incidents blank screens when live analytics is an incomplete object. */
export function safeIncidentsHub(hub: IncidentsHubData): IncidentsHubData {
  return {
    ...hub,
    operationalDate: hub.operationalDate ?? new Date().toISOString().slice(0, 10),
    summary: { ...emptyIncidentSummary(), ...(hub.summary ?? {}) },
    register: hub.register ?? [],
    priorityAlerts: hub.priorityAlerts ?? [],
    depots: hub.depots ?? [],
    regulatory: hub.regulatory ?? [],
    correctiveActions: hub.correctiveActions ?? [],
    analytics: {
      ...EMPTY_INCIDENT_ANALYTICS,
      ...(hub.analytics ?? {}),
      byType: Array.isArray(hub.analytics?.byType) ? hub.analytics.byType : [],
      bySeverity: Array.isArray(hub.analytics?.bySeverity) ? hub.analytics.bySeverity : [],
      byDepot: Array.isArray(hub.analytics?.byDepot) ? hub.analytics.byDepot : [],
    },
    automationRules: hub.automationRules ?? [],
    recurringAlerts: hub.recurringAlerts ?? [],
    telematicsFeed: hub.telematicsFeed ?? [],
    insurerConnectors: hub.insurerConnectors ?? [],
    riskSummary: hub.riskSummary ?? { highRiskCount: 0, avgScore: 0 },
    settings: hub.settings ?? {
      requireSeniorAckForCritical: true,
      autoBlockVehicleOnCritical: true,
      autoPauseDriverOnCritical: false,
      icoAssessmentHours: 72,
      riddorAssessmentDays: 10,
      nearMissTrackingEnabled: true,
      welfareFollowUpDays: 7,
      notifyRoles: ['transport_manager', 'compliance'],
    },
  }
}

/** Prevent Maintenance blank screens (especially Costs tab). */
export function safeMaintenanceHub(hub: MaintenanceHubData): MaintenanceHubData {
  const summary = hub.summary ?? emptyMaintenanceSummary()
  return {
    ...hub,
    summary: {
      attention: { ...emptyMaintenanceSummary().attention, ...(summary.attention ?? {}) },
      fleetAvailability: { ...emptyMaintenanceSummary().fleetAvailability, ...(summary.fleetAvailability ?? {}) },
      maintenanceRisk: { ...emptyMaintenanceSummary().maintenanceRisk, ...(summary.maintenanceRisk ?? {}) },
      workshopPosition: { ...emptyMaintenanceSummary().workshopPosition, ...(summary.workshopPosition ?? {}) },
    },
    priorityQueue: (hub.priorityQueue ?? []).map((item) => ({
      ...item,
      recommendedAction: item.recommendedAction ?? null,
      deadline: item.deadline ?? item.expectedCompletion ?? null,
    })),
    fleetRows: hub.fleetRows ?? [],
    workOrders: (hub.workOrders ?? []).map((w) => ({
      ...w,
      pmiChecklistProgress: w.pmiChecklistProgress ?? null,
      estimateStatus: w.estimateStatus ?? null,
      estimateTotal: w.estimateTotal ?? null,
    })),
    parts: (hub.parts ?? []).map((p) => ({
      ...p,
      stockOnHand: p.stockOnHand ?? 0,
      location: p.location ?? null,
      bin: p.bin ?? null,
    })),
    schedule: (hub.schedule ?? []).map((s) => ({
      ...s,
      owner: s.owner ?? s.workshop ?? null,
    })),
    defects: (hub.defects ?? []).map((d) => {
      const row = d as Partial<MaintenanceHubData['defects'][number]> & {
        status?: string
        reference?: string
      }
      return {
        id: String(row.id ?? ''),
        vehicleId: String(row.vehicleId ?? ''),
        registrationNumber: row.registrationNumber ?? '—',
        fleetNumber: row.fleetNumber ?? null,
        depot: row.depot ?? '—',
        component: row.component ?? '—',
        description: row.description ?? '—',
        severity: (row.severity as MaintenanceHubData['defects'][number]['severity']) ?? 'advisory',
        status: (row.status as MaintenanceHubData['defects'][number]['status']) ?? 'open',
        source: row.source ?? 'command',
        reportedBy: row.reportedBy ?? 'system',
        reportedAt: row.reportedAt ?? new Date().toISOString(),
        triageStatus: row.triageStatus ?? (row.status === 'open' ? 'pending' : 'validated'),
        operationalImpact: row.operationalImpact ?? '—',
        linkedWorkOrderId: row.linkedWorkOrderId ?? null,
      }
    }),
    calendar: hub.calendar ?? [],
    suppliers: hub.suppliers ?? [],
    downtime: hub.downtime ?? {
      averageDowntimeHours: 0,
      vehiclesOnDowntime: 0,
      repeatVorEvents: 0,
      averageApprovalDelayHours: 0,
      averagePartsWaitHours: 0,
      recentEvents: [],
    },
    intelligence: {
      ...EMPTY_MAINTENANCE_INTELLIGENCE,
      ...(hub.intelligence ?? {}),
      plannedVsUnplanned: {
        planned: hub.intelligence?.plannedVsUnplanned?.planned ?? 0,
        unplanned: hub.intelligence?.plannedVsUnplanned?.unplanned ?? 0,
      },
      maintenanceCostPerMile: hub.intelligence?.maintenanceCostPerMile ?? [],
      highCostVehicles: hub.intelligence?.highCostVehicles ?? [],
      repeatDefectCategories: hub.intelligence?.repeatDefectCategories ?? [],
      supplierScores: hub.intelligence?.supplierScores ?? [],
      fleetAvgCostPerMile: hub.intelligence?.fleetAvgCostPerMile ?? null,
      unplannedSharePercent: hub.intelligence?.unplannedSharePercent ?? 0,
      costAlerts: hub.intelligence?.costAlerts ?? [],
    },
  }
}

function emptyYardSummary(): YardSummary {
  return {
    onSite: 0,
    readyForService: 0,
    workRequired: 0,
    awaitingInspection: 0,
    vor: 0,
    departingSoon: 0,
    locationUnknown: 0,
  }
}

function emptyChecksSummary(): ChecksSummary {
  return {
    vehiclesReady: 0,
    expiringSoon: 0,
    checksInProgress: 0,
    oldestInProgressMinutes: null,
    actionRequired: 0,
    assignedDespiteIssue: 0,
    missingOrOverdue: 0,
    departureDueSoon: 0,
    vehiclesOffRoad: 0,
    awaitingMaintenanceReview: 0,
  }
}

/** Prevent Yard blank screens when live hub omits nested arrays. */
export function safeYardHub(hub: YardHubData | null | undefined): YardHubData {
  const empty = emptyYardSummary()
  return {
    depotId: hub?.depotId ?? '',
    depotName: hub?.depotName ?? 'Depot',
    depotCode: hub?.depotCode ?? null,
    yardMapEnabled: hub?.yardMapEnabled ?? false,
    yardLayout: hub?.yardLayout ?? null,
    shiftLabel: hub?.shiftLabel ?? 'Day shift',
    operationalDate: hub?.operationalDate ?? new Date().toISOString().slice(0, 10),
    summary: { ...empty, ...(hub?.summary ?? {}) },
    vehicles: hub?.vehicles ?? [],
    movements: hub?.movements ?? [],
    auditEvents: hub?.auditEvents ?? [],
    tasks: hub?.tasks ?? [],
    exceptions: hub?.exceptions ?? [],
    handover: hub?.handover ?? null,
    mapMarkers: hub?.mapMarkers ?? [],
    depots: hub?.depots?.length
      ? hub.depots
      : [{ id: hub?.depotId || 'default', name: hub?.depotName || 'Depot' }],
    zones: hub?.zones ?? [],
    driverMessages: hub?.driverMessages ?? [],
    bodyworkReports: hub?.bodyworkReports ?? [],
    vehicleChecks: hub?.vehicleChecks ?? [],
  }
}

/** Fill gaps when live `/checks/hub` returns a slim row shape. */
export function normalizeChecksOperationalRow(
  row: Partial<ChecksOperationalRow> & Record<string, unknown>,
): ChecksOperationalRow {
  const resultRaw = row.result != null ? String(row.result) : null
  const result =
    resultRaw === 'fail' || resultRaw === 'failed'
      ? 'fail'
      : resultRaw === 'pass_with_advisory' || resultRaw === 'advisory'
        ? 'pass_with_advisory'
        : resultRaw === 'pass' || resultRaw === 'passed' || resultRaw === 'nil_defect'
          ? 'pass'
          : resultRaw
            ? (resultRaw as ChecksOperationalRow['result'])
            : null
  const failed = result === 'fail'
  const advisory = result === 'pass_with_advisory' || result === 'advisory'
  const checkType = (row.checkType as ChecksOperationalRow['checkType']) ?? null
  const checkTypeLabel =
    row.checkTypeLabel ??
    (checkType ? String(checkType).replace(/_/g, ' ') : 'Vehicle check')
  const completedBy =
    row.completedBy ??
    (typeof row.driverName === 'string' ? row.driverName : null) ??
    null
  const submittedAt =
    row.submittedAt ??
    (typeof row.completedAt === 'string' ? row.completedAt : null) ??
    null
  const exceptionLabels = Array.isArray(row.exceptionLabels)
    ? row.exceptionLabels.map(String)
    : failed
      ? ['Failed check']
      : advisory
        ? ['Advisory']
        : []

  return {
    checkId: String(row.checkId ?? ''),
    vehicleId: String(row.vehicleId ?? ''),
    registrationNumber: String(row.registrationNumber ?? '—'),
    fleetNumber: row.fleetNumber != null ? String(row.fleetNumber) : null,
    makeModel: row.makeModel ? String(row.makeModel) : '—',
    vehicleCategory: row.vehicleCategory ? String(row.vehicleCategory) : 'vehicle',
    depotId: String(row.depotId ?? ''),
    depotName: String(row.depotName ?? '—'),
    operationalStatus: (row.operationalStatus as ChecksOperationalRow['operationalStatus']) ?? 'ready',
    lifecycleStatus: (row.lifecycleStatus as ChecksOperationalRow['lifecycleStatus']) ?? 'assigned',
    checkType,
    checkTypeLabel,
    completedBy,
    sourceApplication: row.sourceApplication != null ? String(row.sourceApplication) : null,
    startedAt: row.startedAt != null ? String(row.startedAt) : null,
    submittedAt,
    result,
    defectCount: typeof row.defectCount === 'number' ? row.defectCount : 0,
    highestDefectSeverity: (row.highestDefectSeverity as ChecksOperationalRow['highestDefectSeverity']) ?? null,
    evidenceCount: typeof row.evidenceCount === 'number' ? row.evidenceCount : 0,
    evidenceMissing: Boolean(row.evidenceMissing),
    validUntil: row.validUntil != null ? String(row.validUntil) : null,
    workStatus: (row.workStatus as ChecksOperationalRow['workStatus']) ?? 'unassigned',
    assignedRunReference: row.assignedRunReference != null ? String(row.assignedRunReference) : null,
    nextDepartureTime: row.nextDepartureTime != null ? String(row.nextDepartureTime) : null,
    reviewerName: row.reviewerName != null ? String(row.reviewerName) : null,
    reviewStatus: row.reviewStatus != null ? String(row.reviewStatus) : null,
    urgencyScore:
      typeof row.urgencyScore === 'number' ? row.urgencyScore : failed ? 80 : advisory ? 35 : 10,
    exceptionLabels,
    syncStatus: (row.syncStatus as ChecksOperationalRow['syncStatus']) ?? 'synced',
    suspiciousFlagCount: typeof row.suspiciousFlagCount === 'number' ? row.suspiciousFlagCount : 0,
  }
}

function normalizeLiveCheckRow(row: Partial<LiveCheckRow> & Record<string, unknown>): LiveCheckRow {
  const checkType = (row.checkType as LiveCheckRow['checkType']) ?? 'driver_pre_use'
  return {
    checkId: String(row.checkId ?? ''),
    vehicleId: String(row.vehicleId ?? ''),
    registrationNumber: String(row.registrationNumber ?? '—'),
    performedBy:
      (typeof row.performedBy === 'string' && row.performedBy) ||
      (typeof row.driverName === 'string' && row.driverName) ||
      (typeof row.completedBy === 'string' && row.completedBy) ||
      '—',
    checkType,
    checkTypeLabel: row.checkTypeLabel
      ? String(row.checkTypeLabel)
      : String(checkType).replace(/_/g, ' '),
    startedAt: String(row.startedAt ?? row.submittedAt ?? row.completedAt ?? new Date().toISOString()),
    currentSection: String(row.currentSection ?? 'In progress'),
    completionPercent: typeof row.completionPercent === 'number' ? row.completionPercent : 0,
    syncStatus: (row.syncStatus as LiveCheckRow['syncStatus']) ?? 'pending',
    lastSyncAt: row.lastSyncAt != null ? String(row.lastSyncAt) : null,
    deviceLabel: String(row.deviceLabel ?? 'Driver app'),
    nextDepartureTime: row.nextDepartureTime != null ? String(row.nextDepartureTime) : null,
    minutesSinceStart: typeof row.minutesSinceStart === 'number' ? row.minutesSinceStart : 0,
  }
}

/** Prevent Checks blank screens when live hub omits nested arrays. */
export function safeChecksHub(hub: ChecksHubData | null | undefined): ChecksHubData {
  const overview = (hub?.overview ?? []).map((row) =>
    normalizeChecksOperationalRow(row as Partial<ChecksOperationalRow> & Record<string, unknown>),
  )
  const submitted = (hub?.submitted ?? []).map((row) =>
    normalizeChecksOperationalRow(row as Partial<ChecksOperationalRow> & Record<string, unknown>),
  )
  const actionQueue = (hub?.actionQueue ?? []).map((row) =>
    normalizeChecksOperationalRow(row as Partial<ChecksOperationalRow> & Record<string, unknown>),
  )
  const overdue = (hub?.overdue ?? []).map((row) =>
    normalizeChecksOperationalRow(row as Partial<ChecksOperationalRow> & Record<string, unknown>),
  )
  const history = (hub?.history ?? []).map((row) =>
    normalizeChecksOperationalRow(row as Partial<ChecksOperationalRow> & Record<string, unknown>),
  )
  const liveChecks = (hub?.liveChecks ?? []).map((row) =>
    normalizeLiveCheckRow(row as Partial<LiveCheckRow> & Record<string, unknown>),
  )

  return {
    operationalDate: hub?.operationalDate ?? new Date().toISOString().slice(0, 10),
    summary: { ...emptyChecksSummary(), ...(hub?.summary ?? {}) },
    overview,
    liveChecks,
    submitted,
    actionQueue,
    overdue,
    history,
    depots: hub?.depots ?? [],
    templates: hub?.templates ?? [],
    intelligence: hub?.intelligence ?? {
      suspiciousChecksToday: 0,
      recurringDefectVehicles: [],
      driverQualityAlerts: [],
      depotComparison: [],
      templatePerformance: [],
    },
  }
}
