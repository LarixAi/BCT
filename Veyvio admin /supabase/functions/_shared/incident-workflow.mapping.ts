/**
 * Pure incident row-mapping and validation — zero imports so this module is
 * importable from both Deno (command-api) and plain Node (unit tests),
 * unlike incident-workflow.ts which pulls in the Deno-only admin client.
 */
type Row = Record<string, unknown>

export type IncidentTimelineEntry = {
  id: string
  action: string
  actorName: string
  occurredAt: string
  detail: string | null
  isSystem: boolean
}

export type IncidentMetadata = {
  timeline?: IncidentTimelineEntry[]
  acknowledgedAt?: string | null
  acknowledgedBy?: string | null
  acknowledgedByName?: string | null
  acknowledgementNotes?: string | null
  escalatedAt?: string | null
  escalatedBy?: string | null
  escalatedByName?: string | null
  escalationReason?: string | null
  ownerName?: string | null
  driverReceipt?: {
    reference: string
    submittedAt: string
    source?: string
  }
}

export function parseMetadata(raw: unknown): IncidentMetadata {
  if (!raw || typeof raw !== 'object') return {}
  return raw as IncidentMetadata
}

export function timelineId() {
  return `tl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function appendTimeline(meta: IncidentMetadata, entry: Omit<IncidentTimelineEntry, 'id'>): IncidentMetadata {
  const timeline = Array.isArray(meta.timeline) ? [...meta.timeline] : []
  timeline.push({ id: timelineId(), ...entry })
  return { ...meta, timeline }
}

export function severityRank(value: string): number {
  const s = value.toLowerCase()
  if (s === 'critical') return 4
  if (s === 'high') return 3
  if (s === 'medium') return 2
  if (s === 'low' || s === 'near_miss') return 1
  return 0
}

export function mapSeverity(raw: unknown): string {
  const s = String(raw ?? 'medium').toLowerCase()
  if (s === 'critical' || s === 'high' || s === 'low' || s === 'near_miss') return s
  return 'medium'
}

export function mapStatus(raw: unknown): string {
  const s = String(raw ?? 'open')
  if (s === 'closed') return 'closed'
  if (s === 'under_investigation') return 'under_investigation'
  if (s === 'immediate_response') return 'immediate_response'
  return s === 'open' ? 'awaiting_triage' : s
}

/** Escalation may only raise severity, never lower it. */
export function validateEscalation(
  currentSeverity: string,
  nextSeverity: string,
): { ok: true } | { ok: false; message: string } {
  if (severityRank(nextSeverity) < severityRank(currentSeverity)) {
    return { ok: false, message: 'Escalation severity cannot be lower than the current severity.' }
  }
  return { ok: true }
}

export function mapIncidentRegisterRow(row: Row, depot?: Row | null) {
  const meta = parseMetadata(row.metadata)
  const vehicle = (row.vehicles as Row | null) ?? {}
  const driver = (row.drivers as Row | null) ?? {}
  const incidentType = String(row.incident_type ?? 'other')
  const isSafeguarding =
    incidentType === 'safeguarding' || incidentType.includes('safeguarding')
  const acknowledgedAt = meta.acknowledgedAt ? String(meta.acknowledgedAt) : null
  const isAcknowledged = Boolean(acknowledgedAt)
  const severity = mapSeverity(row.severity)

  return {
    id: String(row.id),
    incidentRef: String(row.incident_reference ?? ''),
    title: incidentType.replace(/_/g, ' '),
    shortDescription: String(row.description ?? ''),
    severity,
    status: mapStatus(row.status),
    category: incidentType,
    reportingSource: String(row.source_app ?? 'command').toLowerCase(),
    reportedAt: String(row.reported_at ?? row.created_at ?? ''),
    occurredAt: String(row.occurred_at ?? row.reported_at ?? ''),
    location:
      typeof row.location === 'object' && row.location
        ? JSON.stringify(row.location)
        : row.location
          ? String(row.location)
          : null,
    depotId: depot?.id ? String(depot.id) : '',
    depotName: depot?.name ? String(depot.name) : 'Depot',
    ownerName: meta.ownerName ? String(meta.ownerName) : null,
    ownerId: null,
    involvedSummary:
      Array.isArray(row.passenger_ids) && row.passenger_ids.length
        ? `${row.passenger_ids.length} passenger(s)`
        : 'No passengers linked',
    journeyReference: row.trip_id ? String(row.trip_id) : null,
    vehicleRegistration: vehicle.registration ? String(vehicle.registration) : null,
    vehicleId: row.vehicle_id ? String(row.vehicle_id) : null,
    driverName: driver.driver_number ? String(driver.driver_number) : null,
    driverId: row.driver_id ? String(row.driver_id) : null,
    isSafeguarding,
    isAcknowledged,
    acknowledgedAt,
    nextDeadline: null,
    nextDeadlineLabel: null,
    isOverdue: !isAcknowledged && severityRank(severity) >= 3,
    externalFlags: [],
    warningFlags: isAcknowledged ? [] : ['unacknowledged'],
    confidentiality: isSafeguarding ? 'safeguarding' : 'standard',
    ageMinutes: 0,
    urgencyScore: severityRank(severity),
    riskScore: { level: severity, score: severityRank(severity) * 25 },
  }
}

export function mapIncidentDetail(row: Row, depot?: Row | null) {
  const base = mapIncidentRegisterRow(row, depot)
  const meta = parseMetadata(row.metadata)
  const vehicle = (row.vehicles as Row | null) ?? {}

  return {
    ...base,
    description: String(row.description ?? ''),
    timeline: meta.timeline ?? [],
    safetyControls: {
      everyoneAccountedFor: null,
      medicalTreatmentOngoing: null,
      vehicleSafe: null,
      driverFitToContinue: null,
      locationSafe: null,
      passengersAwaitingTransport: null,
      criticalContactsNotified: null,
      evidencePreserved: null,
      isContained: false,
    },
    operationalLinks: {
      vehicleId: base.vehicleId,
      vehicleRegistration: base.vehicleRegistration,
      fleetNumber: null,
      driverId: base.driverId,
      driverName: base.driverName,
      tripReference: base.journeyReference,
      runReference: row.run_id ? String(row.run_id) : null,
      bookingReference: null,
      depotName: base.depotName,
      linkedDefectId: null,
      linkedCheckId: null,
    },
    linkedEntities: {
      schoolId: null,
      schoolName: null,
      contractId: null,
      contractName: null,
      customerId: null,
      customerName: null,
      passengerIds: Array.isArray(row.passenger_ids) ? row.passenger_ids.map(String) : [],
      passengerNames: [],
      manifestId: null,
      manifestLabel: null,
      manifestVersion: null,
      manifestFrozen: false,
    },
    peopleInvolved: [],
    evidence: [],
    correctiveActions: [],
    investigation: {
      scope: null,
      investigatorName: null,
      targetCompletionDate: null,
      confirmedFacts: [],
      disputedInformation: [],
      immediateCauses: [],
      contributingFactors: [],
      underlyingCauses: [],
      findingsSummary: null,
    },
    driverReport: meta.driverReceipt
      ? {
          reference: meta.driverReceipt.reference,
          submittedAt: meta.driverReceipt.submittedAt,
          source: meta.driverReceipt.source ?? 'driver_app',
        }
      : null,
    escalationReason: meta.escalationReason ?? null,
    vehicleMake: vehicle.make ? String(vehicle.make) : null,
    vehicleModel: vehicle.model ? String(vehicle.model) : null,
  }
}

export function buildDriverIncidentMetadata(input: {
  actorName: string
  reference: string
  submittedAt: string
  isSafeguarding?: boolean
}) {
  let meta: IncidentMetadata = {
    driverReceipt: {
      reference: input.reference,
      submittedAt: input.submittedAt,
      source: 'driver_app',
    },
    timeline: [],
  }
  meta = appendTimeline(meta, {
    action: 'reported',
    actorName: input.actorName,
    occurredAt: input.submittedAt,
    detail: input.isSafeguarding
      ? 'Safeguarding concern submitted from Driver app.'
      : 'Incident submitted from Driver app.',
    isSystem: false,
  })
  return meta
}
