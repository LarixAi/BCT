/** Incident domain types — Veyvio Incidents Admin spec */

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low' | 'near_miss'

export type IncidentStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_triage'
  | 'immediate_response'
  | 'contained'
  | 'under_investigation'
  | 'awaiting_evidence'
  | 'awaiting_external'
  | 'corrective_actions_open'
  | 'pending_final_review'
  | 'closed'
  | 'reopened'
  | 'cancelled_duplicate'

export type IncidentCategory =
  | 'road_collision'
  | 'passenger_injury'
  | 'passenger_illness'
  | 'passenger_fall'
  | 'passenger_missing'
  | 'passenger_left_on_vehicle'
  | 'safeguarding'
  | 'vehicle_damage'
  | 'vehicle_fire'
  | 'vehicle_breakdown'
  | 'equipment_failure'
  | 'wheelchair_restraint_failure'
  | 'accessibility_failure'
  | 'driver_injury'
  | 'assault'
  | 'near_miss'
  | 'depot_incident'
  | 'data_security'
  | 'other'

export type IncidentReportingSource =
  | 'driver_app'
  | 'yard_app'
  | 'staff_portal'
  | 'admin'
  | 'customer'
  | 'school'
  | 'police'
  | 'telematics'
  | 'anonymous'

export type IncidentsTab = 'active' | 'all' | 'regulatory' | 'actions' | 'analytics'

export type ConfidentialityLevel = 'standard' | 'restricted' | 'safeguarding' | 'medical' | 'data_protection'

export interface IncidentsSummary {
  openCritical: number
  awaitingTriage: number
  overdueActions: number
  externalAssessmentRequired: number
  openInvestigations: number
  incidentsThisMonth: number
  previousMonthCount: number
  nearMissThisMonth: number
}

export interface IncidentRegisterRow {
  id: string
  incidentRef: string
  title: string
  shortDescription: string
  severity: IncidentSeverity
  status: IncidentStatus
  category: IncidentCategory
  reportingSource: IncidentReportingSource
  reportedAt: string
  occurredAt: string
  location: string | null
  depotId: string
  depotName: string
  ownerName: string | null
  ownerId: string | null
  involvedSummary: string
  journeyReference: string | null
  vehicleRegistration: string | null
  vehicleId: string | null
  driverName: string | null
  driverId: string | null
  isSafeguarding: boolean
  isAcknowledged: boolean
  acknowledgedAt: string | null
  nextDeadline: string | null
  nextDeadlineLabel: string | null
  isOverdue: boolean
  externalFlags: string[]
  warningFlags: IncidentWarningFlag[]
  confidentiality: ConfidentialityLevel
  ageMinutes: number
  urgencyScore: number
  riskScore: IncidentRiskScore
}

export type IncidentWarningFlag =
  | 'unacknowledged'
  | 'vehicle_still_operational'
  | 'driver_still_assigned'
  | 'evidence_missing'
  | 'external_deadline'
  | 'actions_overdue'

export interface IncidentPriorityAlert {
  id: string
  incidentId: string
  incidentRef: string
  title: string
  severity: IncidentSeverity
  summary: string
  reportedAt: string
  location: string
  ownerName: string | null
  isSafeguarding: boolean
  requiresAcknowledgement: boolean
}

export interface IncidentTimelineEvent {
  id: string
  action: string
  actorName: string
  occurredAt: string
  detail: string | null
  isSystem: boolean
}

export interface IncidentPersonInvolved {
  id: string
  name: string
  role: 'passenger' | 'driver' | 'staff' | 'witness' | 'public' | 'emergency_services'
  injuryStatus: 'none' | 'minor' | 'serious' | 'unknown'
  injuryDescription?: string | null
  firstAidProvided?: boolean
  ambulanceAttended?: boolean
  hospitalAttendance?: boolean
  contactNotified?: boolean
  welfareFollowUpRequired: boolean
  isRestricted: boolean
  hasMedicalDetails?: boolean
  medicalNotes?: string | null
  vulnerabilityNotes?: string | null
  contactPhone?: string | null
}

export interface IncidentImmediateAction {
  id: string
  action: string
  completedBy: string
  completedAt: string
  notes: string | null
  confirmed: boolean
}

export interface IncidentEvidenceItem {
  id: string
  kind: 'photo' | 'video' | 'document' | 'cctv' | 'statement' | 'telematics'
  label: string
  uploadedBy: string
  uploadedAt: string
  confidentiality: ConfidentialityLevel
  source: string
}

export interface IncidentCorrectiveAction {
  id: string
  title: string
  description: string
  actionType: string
  ownerName: string
  priority: 'immediate' | 'high' | 'medium' | 'low'
  dueDate: string
  status: 'open' | 'in_progress' | 'completed' | 'overdue'
  completedAt: string | null
}

export interface IncidentRegulatoryAssessment {
  id: string
  authority: 'police' | 'insurer' | 'riddor' | 'ico' | 'safeguarding' | 'local_authority' | 'school' | 'customer'
  label: string
  potentiallyRequired: boolean | null
  decision: string | null
  decidedBy: string | null
  decidedAt: string | null
  deadline: string | null
  externalReference: string | null
  status: 'pending' | 'assessed' | 'submitted' | 'not_required'
}

export interface IncidentSafetyControls {
  everyoneAccountedFor: boolean | null
  medicalTreatmentOngoing: boolean | null
  vehicleSafe: boolean | null
  driverFitToContinue: boolean | null
  locationSafe: boolean | null
  passengersAwaitingTransport: boolean | null
  criticalContactsNotified: boolean | null
  evidencePreserved: boolean | null
  isContained: boolean
}

export interface IncidentInvestigation {
  scope: string | null
  investigatorName: string | null
  targetCompletionDate: string | null
  confirmedFacts: string[]
  disputedInformation: string[]
  immediateCauses: string[]
  contributingFactors: string[]
  underlyingCauses: string[]
  findingsSummary: string | null
}

export interface IncidentOperationalLinks {
  vehicleId: string | null
  vehicleRegistration: string | null
  fleetNumber: string | null
  driverId: string | null
  driverName: string | null
  tripReference: string | null
  runReference: string | null
  bookingReference: string | null
  depotName: string
  linkedDefectId: string | null
  linkedCheckId: string | null
}

export interface IncidentLinkedEntities {
  schoolId: string | null
  schoolName: string | null
  contractId: string | null
  contractName: string | null
  customerId: string | null
  customerName: string | null
  passengerIds: string[]
  passengerNames: string[]
  manifestId: string | null
  manifestLabel: string | null
  manifestVersion: number | null
  manifestFrozen: boolean
}

export interface IncidentCctvAsset {
  id: string
  label: string
  depotId: string
  coverageArea: string
  retentionDays: number
  available: boolean
  clipRequested: boolean
  clipRequestedAt: string | null
  preservedUntil: string | null
}

export interface IncidentInsurerSubmission {
  id: string
  connectorId: string
  insurerName: string
  status: 'not_submitted' | 'pending' | 'submitted' | 'acknowledged' | 'failed'
  submittedAt: string | null
  externalReference: string | null
  lastError: string | null
}

export interface IncidentInsurerConnector {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  lastSyncAt: string | null
  supportsAutoSubmit: boolean
}

export interface IncidentRiskScore {
  score: number
  band: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
  preventableLikelihood: number
}

export interface IncidentTelematicsSnapshot {
  eventType: string
  reference: string
  occurredAt: string
  latitude: number | null
  longitude: number | null
  speedMph: number | null
  preserved: boolean
}

export type IncidentPlatformEventType =
  | 'incident.reported'
  | 'incident.telematics_received'
  | 'incident.cctv_preserved'
  | 'incident.insurer_submitted'
  | 'incident.entities_linked'
  | 'incident.risk_elevated'

export interface IncidentPlatformEvent {
  id: string
  type: IncidentPlatformEventType
  incidentId: string | null
  summary: string
  payload: Record<string, string | number | boolean | null>
  sourceApplication: 'command' | 'telematics' | 'cctv' | 'insurer' | 'system'
  actorName: string | null
  createdAt: string
}

export interface TelematicsIncidentFeedItem {
  id: string
  vehicleId: string
  vehicleRegistration: string
  driverId: string | null
  eventType: 'harsh_braking' | 'collision_detected' | 'rollover_detected'
  location: string
  occurredAt: string
  telematicsReference: string
  processed: boolean
  linkedIncidentId: string | null
}

export interface IncidentDetailRecord extends IncidentRegisterRow {
  fullDescription: string
  discoveredAt: string | null
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  reportedBy: string
  operationalSummary: string | null
  safetyControls: IncidentSafetyControls
  timeline: IncidentTimelineEvent[]
  people: IncidentPersonInvolved[]
  immediateActions: IncidentImmediateAction[]
  evidence: IncidentEvidenceItem[]
  investigation: IncidentInvestigation
  regulatoryAssessments: IncidentRegulatoryAssessment[]
  correctiveActions: IncidentCorrectiveAction[]
  operationalLinks: IncidentOperationalLinks
  closureReason: string | null
  closedBy: string | null
  closedAt: string | null
  vehicleStillOperational: boolean
  driverStillAssigned: boolean
  auditTrail: IncidentAuditEntry[]
  linkedEntities: IncidentLinkedEntities
  cctvAssets: IncidentCctvAsset[]
  insurerSubmission: IncidentInsurerSubmission | null
  telematicsSnapshot: IncidentTelematicsSnapshot | null
  riskScore: IncidentRiskScore
  platformEvents: IncidentPlatformEvent[]
  driverReport?: DriverReportMetadata
}

export interface IncidentAuditEntry {
  id: string
  incidentRef: string
  action: string
  actorName: string
  role: string
  occurredAt: string
  detail: string | null
  sourceApplication: string
}

export interface DriverIncidentSummary {
  id: string
  incidentRef: string
  title: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  occurredAt: string
  outcomeSummary: string | null
  isAllegation: boolean
  trainingActionRequired: boolean
}

export interface IncidentsHubData {
  operationalDate: string
  summary: IncidentsSummary
  register: IncidentRegisterRow[]
  priorityAlerts: IncidentPriorityAlert[]
  depots: { id: string; name: string }[]
  regulatory: IncidentRegisterRow[]
  correctiveActions: IncidentCorrectiveAction[]
  analytics: IncidentAnalytics
  automationRules: IncidentAutomationRule[]
  recurringAlerts: RecurringIncidentAlert[]
  telematicsFeed: TelematicsIncidentFeedItem[]
  insurerConnectors: IncidentInsurerConnector[]
  riskSummary: { highRiskCount: number; avgScore: number }
  settings?: IncidentSettings
}

export interface IncidentAutomationRule {
  id: string
  name: string
  trigger: IncidentCategory | 'telematics_alert'
  enabled: boolean
  actions: string[]
  description: string
}

export interface RecurringIncidentAlert {
  id: string
  category: IncidentCategory
  depotName: string
  count: number
  incidentRefs: string[]
  summary: string
}

export interface IncidentSettings {
  requireSeniorAckForCritical: boolean
  autoBlockVehicleOnCritical: boolean
  autoPauseDriverOnCritical: boolean
  icoAssessmentHours: number
  riddorAssessmentDays: number
  nearMissTrackingEnabled: boolean
  welfareFollowUpDays: number
  notifyRoles: string[]
}

export interface IncidentAnalytics {
  byType: { category: string; count: number }[]
  bySeverity: { severity: IncidentSeverity; count: number }[]
  byDepot: { depotName: string; count: number }[]
  avgAcknowledgeHours: number
  avgContainHours: number
  overdueActions: number
  nearMissRate: number
  preventableCount: number
}

export interface DriverReportMetadata {
  localIncidentId: string
  stage: 'draft' | 'initial_submitted' | 'completing' | 'complete'
  completenessScore: number
  formDefinitionVersion: number
  schemaVersion: number
  driverAppVersion: string
  originalAnswers: Record<string, { value: unknown; source: string; enteredAt: string; confidence?: string }>
  offlineCapture?: {
    occurredAt: string
    locallySubmittedAt: string
    serverReceivedAt: string
  }
}

export interface ReportIncidentHubInput {
  immediateDanger: 'yes' | 'emergency_contacted' | 'no' | 'unknown'
  occurredAt: string
  location: string
  depotId?: string
  category: IncidentCategory
  title: string
  description: string
  severity: IncidentSeverity
  reportingSource?: IncidentReportingSource
  vehicleId?: string
  driverId?: string
  driverName?: string
  runReference?: string
  isSafeguarding?: boolean
  markVehicleVor?: boolean
  createDefect?: boolean
  immediateActionsTaken?: string[]
  passengerInvolved?: boolean
  schoolId?: string
  contractId?: string
  bookingReference?: string
  passengerIds?: string[]
  manifestId?: string
  driverReportMetadata?: DriverReportMetadata
  updateType?: 'initial' | 'completion'
}

export interface ContainIncidentInput {
  incidentId: string
  everyoneAccountedFor?: boolean
  vehicleSafe?: boolean
  driverFitToContinue?: boolean
  criticalContactsNotified?: boolean
  evidencePreserved?: boolean
  notes?: string
}

export interface EscalateIncidentInput {
  incidentId: string
  severity: IncidentSeverity
  reason: string
}

export interface ReopenIncidentInput {
  incidentId: string
  reason: string
}

export interface CreateDefectFromIncidentInput {
  incidentId: string
  component: string
  description: string
}

export interface MarkIncidentVehicleVorInput {
  incidentId: string
  reason: string
}

export interface RecordRegulatoryDecisionInput {
  incidentId: string
  assessmentId: string
  potentiallyRequired: boolean
  decision: string
  externalReference?: string
}

export interface AcknowledgeIncidentInput {
  incidentId: string
  notes?: string
}

export interface AssignIncidentInput {
  incidentId: string
  ownerName: string
}

export interface AddIncidentUpdateInput {
  incidentId: string
  update: string
}

export interface CloseIncidentInput {
  incidentId: string
  reason: string
  notes?: string
}

export interface AddIncidentActionInput {
  incidentId: string
  title: string
  description: string
  ownerName: string
  dueDate: string
  priority: IncidentCorrectiveAction['priority']
}

export interface UploadIncidentEvidenceInput {
  incidentId: string
  kind: IncidentEvidenceItem['kind']
  label: string
}

export interface UpdateInvestigationInput {
  incidentId: string
  scope?: string
  investigatorName?: string
  targetCompletionDate?: string
  confirmedFacts?: string[]
  disputedInformation?: string[]
  immediateCauses?: string[]
  contributingFactors?: string[]
  underlyingCauses?: string[]
  findingsSummary?: string
}

export interface UpdatePersonWelfareInput {
  incidentId: string
  personId: string
  injuryStatus?: IncidentPersonInvolved['injuryStatus']
  injuryDescription?: string
  firstAidProvided?: boolean
  ambulanceAttended?: boolean
  hospitalAttendance?: boolean
  contactNotified?: boolean
  welfareFollowUpRequired?: boolean
  medicalNotes?: string
  vulnerabilityNotes?: string
}

export interface CreateTelematicsIncidentInput {
  vehicleId: string
  driverId?: string
  eventType: 'harsh_braking' | 'collision_detected' | 'rollover_detected'
  location: string
  occurredAt: string
  telematicsReference: string
}

export interface LinkIncidentEntitiesInput {
  incidentId: string
  schoolId?: string
  contractId?: string
  bookingReference?: string
  passengerIds?: string[]
  manifestId?: string
  manifestLabel?: string
  manifestVersion?: number
  freezeManifest?: boolean
}

export interface RequestCctvPreservationInput {
  incidentId: string
  assetId: string
  retentionHours?: number
}

export interface SubmitIncidentToInsurerInput {
  incidentId: string
  connectorId: string
}

export interface ProcessTelematicsFeedInput {
  feedItemId: string
}

/** Stored incident record in mock API */
export interface StoredIncident {
  id: string
  incidentRef: string
  title: string
  description: string
  category: IncidentCategory
  severity: IncidentSeverity
  status: IncidentStatus
  reportingSource: IncidentReportingSource
  reportedBy: string
  reportedAt: string
  occurredAt: string
  discoveredAt: string | null
  location: string | null
  depotId: string
  depotName: string
  ownerName: string | null
  ownerId: string | null
  vehicleId: string | null
  vehicleRegistration: string | null
  fleetNumber: string | null
  driverId: string | null
  driverName: string | null
  runReference: string | null
  tripReference: string | null
  bookingReference: string | null
  isSafeguarding: boolean
  isAcknowledged: boolean
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  confidentiality: ConfidentialityLevel
  operationalSummary: string | null
  safetyControls: IncidentSafetyControls
  timeline: IncidentTimelineEvent[]
  people: IncidentPersonInvolved[]
  immediateActions: IncidentImmediateAction[]
  evidence: IncidentEvidenceItem[]
  investigation: IncidentInvestigation
  regulatoryAssessments: IncidentRegulatoryAssessment[]
  correctiveActions: IncidentCorrectiveAction[]
  linkedDefectId: string | null
  linkedCheckId: string | null
  closureReason: string | null
  closedBy: string | null
  closedAt: string | null
  vehicleStillOperational: boolean
  driverStillAssigned: boolean
  linkedEntities?: IncidentLinkedEntities
  cctvAssets?: IncidentCctvAsset[]
  insurerSubmission?: IncidentInsurerSubmission | null
  telematicsSnapshot?: IncidentTelematicsSnapshot | null
  driverReport?: DriverReportMetadata
}
