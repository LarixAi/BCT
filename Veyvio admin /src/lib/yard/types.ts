/** Yard Operations domain — physical depot state separate from vehicle identity and legal availability. */

export type YardTab = 'live' | 'map' | 'tasks' | 'movements' | 'handover' | 'exceptions' | 'messages' | 'bodywork' | 'checks'

export interface YardVehicleCheckSection {
  id: string
  section: string
  question: string
  answer: string
  notes: string | null
  photoDataUrl?: string | null
}

export interface YardVehicleCheckEvidence {
  id: string
  kind: string
  label: string
  capturedAt?: string
  url: string | null
}

export interface YardVehicleCheckReport {
  id: string
  registrationNumber: string
  fleetNumber: string | null
  driverName: string | null
  checkType: string
  result: string
  odometer: number | string | null
  fuelLevel: string | null
  startedAt: string | null
  submittedAt: string | null
  sectionCount: number
  failCount: number
  evidenceCount: number
  odometerPhotoDataUrl: string | null
  href: string
  sections: YardVehicleCheckSection[]
  evidence: YardVehicleCheckEvidence[]
}

export interface YardBodyworkReport {
  id: string
  defectRef: string
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  description: string
  severity: string
  status: string
  zone: string | null
  damageType: string | null
  reportedAt: string
  photoDataUrl: string | null
  photoPath: string | null
  vehicleCheckId: string | null
  href: string
}

export interface YardDriverMessage {
  id: string
  conversationId: string
  driverId: string | null
  driverName: string
  subject: string
  body: string
  sentAt: string
  sourceApp: string
  audience: 'dispatch' | 'yard' | 'both' | string
}

export type YardPresenceState =
  | 'expected'
  | 'entering'
  | 'in_yard'
  | 'exiting'
  | 'off_site'
  | 'in_transit'
  | 'location_unknown'

export type YardActivityState =
  | 'parked'
  | 'awaiting_inspection'
  | 'under_inspection'
  | 'cleaning'
  | 'fuelling'
  | 'charging'
  | 'loading_equipment'
  | 'awaiting_maintenance'
  | 'in_workshop'
  | 'quarantined'
  | 'ready_for_release'

export type YardOperationalReadiness =
  | 'ready'
  | 'ready_with_advisory'
  | 'conditional'
  | 'blocked'
  | 'vor'
  | 'unknown'

export type YardCustodyState =
  | 'driver_custody'
  | 'yard_custody'
  | 'maintenance_custody'
  | 'contractor_custody'
  | 'depot_transfer'
  | 'unassigned'

export type YardLocationConfidence = 'confirmed' | 'estimated' | 'stale' | 'unknown'

export type YardMovementStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface YardSummary {
  onSite: number
  readyForService: number
  workRequired: number
  awaitingInspection: number
  vor: number
  departingSoon: number
  locationUnknown: number
}

export interface YardVehicleRow {
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  vehicleCategory: string
  makeModel: string
  depotId: string
  depotName: string
  zone: string
  bay: string | null
  presenceState: YardPresenceState
  activityState: YardActivityState
  readinessState: YardOperationalReadiness
  custodyState: YardCustodyState
  openTaskCount: number
  assignedStaffName: string | null
  nextDeparture: string | null
  lastMovementAt: string | null
  lastMovementBy: string | null
  lastUpdatedSource: string
  lastUpdatedAt: string
  exceptionLabels: string[]
  locationConfidence: YardLocationConfidence
}

export interface YardMovementRecord {
  id: string
  vehicleId: string
  registrationNumber: string
  fromLocation: string
  toLocation: string
  reason: string
  status: YardMovementStatus
  requestedBy: string
  completedBy: string | null
  startedAt: string
  completedAt: string | null
  depotId: string
  depotName: string
}

export interface YardAuditEvent {
  id: string
  action: string
  vehicleId: string | null
  registrationNumber: string | null
  actorName: string
  source: string
  occurredAt: string
  detail: string | null
}

export interface YardZone {
  id: string
  label: string
  kind: 'bay' | 'inspection' | 'workshop' | 'wash' | 'fuel' | 'charge' | 'quarantine' | 'unallocated'
}

export type YardTaskType =
  | 'return_inspection'
  | 'pre_departure_inspection'
  | 'move_vehicle'
  | 'clean_interior'
  | 'clean_exterior'
  | 'refuel'
  | 'charge'
  | 'check_fluids'
  | 'check_tyres'
  | 'replenish_equipment'
  | 'remove_equipment'
  | 'damage_photography'
  | 'transfer_to_workshop'
  | 'prepare_for_service'
  | 'key_handover'
  | 'contractor_handover'
  | 'quarantine_vehicle'

export type YardTaskPriority = 'routine' | 'important' | 'urgent' | 'safety_critical'

export type YardTaskStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_sync'

export type YardSyncStatus = 'synced' | 'pending' | 'failed' | 'conflict' | 'requires_review'

export type YardExceptionSeverity = 'info' | 'warning' | 'critical'

export type YardHandoverStatus = 'draft' | 'ready_for_handover' | 'awaiting_acceptance' | 'accepted' | 'reopened'

export interface YardTask {
  id: string
  depotId: string
  vehicleId: string
  registrationNumber: string
  taskType: YardTaskType
  title: string
  priority: YardTaskPriority
  status: YardTaskStatus
  assignedStaffId: string | null
  assignedStaffName: string | null
  dueAt: string | null
  instructions: string | null
  evidenceRequired: boolean
  blockingRelease: boolean
  syncStatus: YardSyncStatus
  createdAt: string
  completedAt: string | null
  createdBy: string
}

export interface YardException {
  id: string
  severity: YardExceptionSeverity
  vehicleId: string
  registrationNumber: string
  depotId: string
  title: string
  detail: string
  detectedAt: string
  operationalImpact: string
  ownerName: string | null
  recommendedAction: string
  escalationStatus: 'open' | 'acknowledged' | 'resolved'
}

export interface YardHandoverSection {
  label: string
  items: { id: string; label: string; vehicleId?: string; registrationNumber?: string }[]
}

export interface YardHandover {
  id: string
  depotId: string
  depotName: string
  shiftLabel: string
  status: YardHandoverStatus
  outgoingSupervisor: string
  incomingSupervisor: string | null
  notes: string | null
  sections: YardHandoverSection[]
  createdAt: string
  acceptedAt: string | null
  acceptedBy: string | null
}

export interface YardMapVehicleMarker {
  vehicleId: string
  registrationNumber: string
  zoneId: string
  bay: string | null
  readinessState: YardOperationalReadiness
  activityState: YardActivityState
  openTaskCount: number
  nextDeparture: string | null
  locationConfidence: YardLocationConfidence
}

export interface YardHubData {
  depotId: string
  depotName: string
  shiftLabel: string
  operationalDate: string
  summary: YardSummary
  vehicles: YardVehicleRow[]
  movements: YardMovementRecord[]
  auditEvents: YardAuditEvent[]
  tasks: YardTask[]
  exceptions: YardException[]
  handover: YardHandover | null
  mapMarkers: YardMapVehicleMarker[]
  depots: { id: string; name: string }[]
  zones: YardZone[]
  driverMessages?: YardDriverMessage[]
  bodyworkReports?: YardBodyworkReport[]
  vehicleChecks?: YardVehicleCheckReport[]
}

export interface RecordYardMovementInput {
  vehicleId: string
  destinationBay: string
  destinationZone?: string
  reason: string
  expectedCompletionAt?: string
}

export interface CreateYardTaskInput {
  vehicleId: string
  taskType: YardTaskType
  title?: string
  priority?: YardTaskPriority
  assignedStaffName?: string
  dueAt?: string
  instructions?: string
  evidenceRequired?: boolean
  blockingRelease?: boolean
}

export interface CompleteYardTaskInput {
  taskId: string
  notes?: string
  evidenceUploaded?: boolean
}

export interface AcceptYardHandoverInput {
  handoverId: string
  incomingSupervisor: string
  notes?: string
}
