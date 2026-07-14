import { buildIncidentAuditTrail } from './audit'
import { DEFAULT_INCIDENT_AUTOMATION_RULES } from './automation'
import { defaultCctvAssetsForDepot } from './cctv'
import { listIncidentEvents } from './events'
import { INCIDENT_INSURER_CONNECTORS, defaultInsurerSubmission } from './insurer'
import { emptyLinkedEntities } from './linking'
import { detectRecurringIncidents } from './recurring'
import { computeIncidentRiskScore } from './risk-scoring'
import type {
  IncidentAnalytics,
  IncidentCorrectiveAction,
  IncidentDetailRecord,
  IncidentPriorityAlert,
  IncidentRegisterRow,
  IncidentsHubData,
  IncidentsSummary,
  StoredIncident,
} from './types'
import {
  buildInvolvedSummary,
  buildWarningFlags,
  computeAgeMinutes,
  computeUrgency,
  externalFlags,
  incidentRef,
  isActiveIncident,
  isOverdueIncident,
  nextDeadline,
} from './status'

function enrichStored(inc: StoredIncident): StoredIncident {
  return {
    ...inc,
    linkedEntities: inc.linkedEntities ?? emptyLinkedEntities(),
    cctvAssets: inc.cctvAssets ?? defaultCctvAssetsForDepot(inc.depotId),
    insurerSubmission:
      inc.insurerSubmission ??
      (inc.regulatoryAssessments.some((r) => r.authority === 'insurer') ? defaultInsurerSubmission() : null),
    telematicsSnapshot: inc.telematicsSnapshot ?? null,
  }
}

function buildRegisterRow(inc: StoredIncident, recurringCount = 0): IncidentRegisterRow {
  const stored = enrichStored(inc)
  const deadline = nextDeadline(inc)
  const warningFlags = buildWarningFlags(inc)
  const row: IncidentRegisterRow = {
    id: inc.id,
    incidentRef: inc.incidentRef,
    title: inc.title,
    shortDescription: inc.description.slice(0, 80),
    severity: inc.severity,
    status: inc.status,
    category: inc.category,
    reportingSource: inc.reportingSource,
    reportedAt: inc.reportedAt,
    occurredAt: inc.occurredAt,
    location: inc.location,
    depotId: inc.depotId,
    depotName: inc.depotName,
    ownerName: inc.ownerName,
    ownerId: inc.ownerId,
    involvedSummary: buildInvolvedSummary(inc),
    journeyReference: inc.runReference ?? inc.tripReference,
    vehicleRegistration: inc.vehicleRegistration,
    vehicleId: inc.vehicleId,
    driverName: inc.driverName,
    driverId: inc.driverId,
    isSafeguarding: inc.isSafeguarding,
    isAcknowledged: inc.isAcknowledged,
    acknowledgedAt: inc.acknowledgedAt,
    nextDeadline: deadline.at,
    nextDeadlineLabel: deadline.label,
    isOverdue: isOverdueIncident(inc),
    externalFlags: externalFlags(inc),
    warningFlags,
    confidentiality: inc.confidentiality,
    ageMinutes: computeAgeMinutes(inc.reportedAt),
    urgencyScore: 0,
    riskScore: computeIncidentRiskScore({
      severity: stored.severity,
      category: stored.category,
      isSafeguarding: stored.isSafeguarding,
      warningFlags: [],
      vehicleStillOperational: stored.vehicleStillOperational,
      driverStillAssigned: stored.driverStillAssigned,
      isAcknowledged: stored.isAcknowledged,
      recurringCount,
    }),
  }
  row.warningFlags = buildWarningFlags(stored)
  row.riskScore = computeIncidentRiskScore({
    severity: stored.severity,
    category: stored.category,
    isSafeguarding: stored.isSafeguarding,
    warningFlags: row.warningFlags,
    vehicleStillOperational: stored.vehicleStillOperational,
    driverStillAssigned: stored.driverStillAssigned,
    isAcknowledged: stored.isAcknowledged,
    recurringCount,
  })
  row.urgencyScore = computeUrgency(row)
  return row
}

export function buildIncidentDetail(inc: StoredIncident, recurringCount = 0): IncidentDetailRecord {
  const stored = enrichStored(inc)
  const row = buildRegisterRow(stored, recurringCount)
  return {
    ...row,
    fullDescription: stored.description,
    discoveredAt: stored.discoveredAt,
    acknowledgedAt: stored.acknowledgedAt,
    acknowledgedBy: stored.acknowledgedBy,
    reportedBy: stored.reportedBy,
    operationalSummary: stored.operationalSummary,
    safetyControls: stored.safetyControls,
    timeline: stored.timeline,
    people: stored.people,
    immediateActions: stored.immediateActions,
    evidence: stored.evidence,
    investigation: stored.investigation,
    regulatoryAssessments: stored.regulatoryAssessments,
    correctiveActions: stored.correctiveActions,
    operationalLinks: {
      vehicleId: stored.vehicleId,
      vehicleRegistration: stored.vehicleRegistration,
      fleetNumber: stored.fleetNumber,
      driverId: stored.driverId,
      driverName: stored.driverName,
      tripReference: stored.tripReference,
      runReference: stored.runReference,
      bookingReference: stored.bookingReference,
      depotName: stored.depotName,
      linkedDefectId: stored.linkedDefectId,
      linkedCheckId: stored.linkedCheckId,
    },
    closureReason: stored.closureReason,
    closedBy: stored.closedBy,
    closedAt: stored.closedAt,
    vehicleStillOperational: stored.vehicleStillOperational,
    driverStillAssigned: stored.driverStillAssigned,
    auditTrail: buildIncidentAuditTrail(stored.timeline, stored.incidentRef),
    linkedEntities: stored.linkedEntities ?? emptyLinkedEntities(),
    cctvAssets: stored.cctvAssets ?? defaultCctvAssetsForDepot(stored.depotId),
    insurerSubmission: stored.insurerSubmission ?? null,
    telematicsSnapshot: stored.telematicsSnapshot ?? null,
    riskScore: row.riskScore,
    platformEvents: listIncidentEvents(stored.id),
    driverReport: stored.driverReport,
  }
}

function buildAnalytics(register: IncidentRegisterRow[]): IncidentAnalytics {
  const open = register.filter((r) => r.status !== 'closed' && r.status !== 'cancelled_duplicate')
  const typeMap = new Map<string, number>()
  const sevMap = new Map<string, number>()
  const depotMap = new Map<string, number>()
  for (const r of open) {
    typeMap.set(r.category, (typeMap.get(r.category) ?? 0) + 1)
    sevMap.set(r.severity, (sevMap.get(r.severity) ?? 0) + 1)
    depotMap.set(r.depotName, (depotMap.get(r.depotName) ?? 0) + 1)
  }
  const acknowledged = register.filter((r) => r.isAcknowledged && r.acknowledgedAt)
  const avgAck =
    acknowledged.length > 0
      ? Math.round(
          acknowledged.reduce((s, r) => s + computeAgeMinutes(r.acknowledgedAt!), 0) / acknowledged.length / 60,
        )
      : 0

  return {
    byType: [...typeMap.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    bySeverity: [...sevMap.entries()].map(([severity, count]) => ({ severity: severity as import('./types').IncidentSeverity, count })),
    byDepot: [...depotMap.entries()].map(([depotName, count]) => ({ depotName, count })).sort((a, b) => b.count - a.count),
    avgAcknowledgeHours: avgAck,
    avgContainHours: 4,
    overdueActions: register.filter((r) => r.warningFlags.includes('actions_overdue')).length,
    nearMissRate: register.filter((r) => r.severity === 'near_miss').length,
    preventableCount: register.filter((r) => ['near_miss', 'medium', 'low'].includes(r.severity)).length,
  }
}

export function buildIncidentsHub(
  incidents: StoredIncident[],
  telematicsFeed: import('./types').TelematicsIncidentFeedItem[] = [],
): IncidentsHubData {
  const recurringAlerts = detectRecurringIncidents(
    incidents.map((i) => buildRegisterRow(enrichStored(i))),
  )
  const recurringMap = new Map(recurringAlerts.map((a) => [`${a.category}::${incidents.find((i) => i.incidentRef === a.incidentRefs[0])?.depotId}`, a.count]))
  const register = incidents
    .map((inc) => {
      const key = `${inc.category}::${inc.depotId}`
      return buildRegisterRow(inc, recurringMap.get(key) ?? 0)
    })
    .sort((a, b) => b.urgencyScore - a.urgencyScore)
  const active = register.filter((r) => isActiveIncident(r.status))
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const prevMonthStart = new Date(monthStart)
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)

  const summary: IncidentsSummary = {
    openCritical: active.filter((r) => r.severity === 'critical').length,
    awaitingTriage: active.filter((r) => r.status === 'awaiting_triage' || r.status === 'submitted').length,
    overdueActions: active.filter((r) => r.warningFlags.includes('actions_overdue')).length,
    externalAssessmentRequired: active.filter((r) => r.externalFlags.length > 0).length,
    openInvestigations: active.filter((r) => r.status === 'under_investigation').length,
    incidentsThisMonth: register.filter((r) => new Date(r.reportedAt) >= monthStart).length,
    previousMonthCount: register.filter(
      (r) => new Date(r.reportedAt) >= prevMonthStart && new Date(r.reportedAt) < monthStart,
    ).length,
    nearMissThisMonth: register.filter((r) => r.severity === 'near_miss' && new Date(r.reportedAt) >= monthStart).length,
  }

  const priorityAlerts: IncidentPriorityAlert[] = active
    .filter((r) => r.severity === 'critical' || (r.severity === 'high' && !r.isAcknowledged))
    .slice(0, 3)
    .map((r) => ({
      id: `alert-${r.id}`,
      incidentId: r.id,
      incidentRef: r.incidentRef,
      title: r.title,
      severity: r.severity,
      summary: r.shortDescription,
      reportedAt: r.reportedAt,
      location: r.location ?? r.depotName,
      ownerName: r.ownerName,
      isSafeguarding: r.isSafeguarding,
      requiresAcknowledgement: !r.isAcknowledged,
    }))

  const depots = [...new Map(incidents.map((i) => [i.depotId, { id: i.depotId, name: i.depotName }])).values()]
  const regulatory = active.filter((r) => r.externalFlags.length > 0)
  const correctiveActions: IncidentCorrectiveAction[] = incidents
    .flatMap((i) => i.correctiveActions.map((a) => ({ ...a, incidentRef: i.incidentRef, incidentId: i.id })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) as IncidentCorrectiveAction[]

  return {
    operationalDate: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    summary,
    register,
    priorityAlerts,
    depots,
    regulatory,
    correctiveActions,
    analytics: buildAnalytics(register),
    automationRules: DEFAULT_INCIDENT_AUTOMATION_RULES,
    recurringAlerts,
    telematicsFeed,
    insurerConnectors: INCIDENT_INSURER_CONNECTORS,
    riskSummary: {
      highRiskCount: register.filter((r) => r.riskScore.band === 'high' || r.riskScore.band === 'critical').length,
      avgScore: register.length ? Math.round(register.reduce((s, r) => s + r.riskScore.score, 0) / register.length) : 0,
    },
  }
}

export function filterIncidentRows(
  rows: IncidentRegisterRow[],
  filter: string,
  search: string,
  depotId?: string,
  tab?: string,
): IncidentRegisterRow[] {
  let list = rows

  if (depotId && depotId !== 'all') list = list.filter((r) => r.depotId === depotId)

  if (tab === 'all') {
    // all history
  } else if (tab === 'regulatory') {
    list = list.filter((r) => r.externalFlags.length > 0 && isActiveIncident(r.status))
  } else if (tab === 'actions') {
    list = list.filter((r) => r.warningFlags.includes('actions_overdue') || r.status === 'corrective_actions_open')
  } else if (tab !== 'analytics') {
    list = list.filter((r) => isActiveIncident(r.status))
    if (filter === 'critical') list = list.filter((r) => r.severity === 'critical' || r.severity === 'high')
    else if (filter === 'awaiting_triage') list = list.filter((r) => r.status === 'awaiting_triage' || r.status === 'submitted')
    else if (filter === 'overdue_actions') list = list.filter((r) => r.warningFlags.includes('actions_overdue'))
    else if (filter === 'external') list = list.filter((r) => r.externalFlags.length > 0)
    else if (filter === 'investigating') list = list.filter((r) => r.status === 'under_investigation')
    else if (filter === 'this_month') {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      list = list.filter((r) => new Date(r.reportedAt) >= monthStart)
    }
    else if (filter === 'safeguarding') list = list.filter((r) => r.isSafeguarding)
    else if (filter === 'collisions') list = list.filter((r) => r.category === 'road_collision')
    else if (filter === 'passenger_injury') list = list.filter((r) => r.category === 'passenger_injury')
    else if (filter === 'near_miss') list = list.filter((r) => r.severity === 'near_miss')
    else if (filter === 'data_breach') list = list.filter((r) => r.category === 'data_security')
    else if (filter === 'overdue') list = list.filter((r) => r.isOverdue)
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (r) =>
        r.incidentRef.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.shortDescription.toLowerCase().includes(q) ||
        (r.driverName?.toLowerCase().includes(q) ?? false) ||
        (r.vehicleRegistration?.toLowerCase().includes(q) ?? false) ||
        (r.journeyReference?.toLowerCase().includes(q) ?? false) ||
        (r.ownerName?.toLowerCase().includes(q) ?? false),
    )
  }

  return list.sort((a, b) => b.urgencyScore - a.urgencyScore)
}

export { incidentRef }
