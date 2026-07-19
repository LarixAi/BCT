export type VehicleReportType =
  | 'damage'
  | 'defect'
  | 'equipment'
  | 'cleanliness'
  | 'inspection_observation'
  | 'adblue'
  | 'other'

export type VehicleReportSeverity = 'critical' | 'major' | 'moderate' | 'minor' | 'observation'

export type VehicleReportStage =
  | 'reported'
  | 'risk_assessed'
  | 'under_review'
  | 'action'
  | 'verification'
  | 'closed'

export type VehicleReportStatus =
  | 'open'
  | 'awaiting_review'
  | 'in_progress'
  | 'awaiting_verification'
  | 'closed'
  | 'duplicate'

export interface VehicleReportEvidence {
  id: string
  kind: 'photo' | 'video' | 'document' | 'voice'
  label: string
  capturedAt: string
  url: string | null
}

export interface VehicleReportTimelineEvent {
  id: string
  action: string
  actorName: string
  occurredAt: string
  detail: string | null
}

export interface VehicleReportRecord {
  id: string
  reference: string
  companyId?: string
  depotId: string | null
  depotName: string | null
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  reportType: VehicleReportType
  reportCategory: string
  severity: VehicleReportSeverity
  stage: VehicleReportStage
  status: VehicleReportStatus
  vehicleOperationalStatus: string
  title: string
  description: string
  vehicleArea: string | null
  reportedBy: string
  reportedByRole: string
  reportedAt: string
  mileage: number | null
  location: string | null
  passengersOnboard: boolean
  safeToMove: boolean | null
  vorRequired: boolean
  restrictionType: string | null
  linkedDefectId: string | null
  linkedWorkOrderId: string | null
  linkedVorId: string | null
  linkedIncidentId: string | null
  linkedCheckId: string | null
  assignedOwner: string | null
  dueAt: string | null
  evidence: VehicleReportEvidence[]
  timeline: VehicleReportTimelineEvent[]
  rootCause: string | null
  resolution: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  closedAt: string | null
  labourCost: number | null
  partsCost: number | null
  externalCost: number | null
  totalCost: number | null
  downtimeHours: number | null
  slaStatus: 'ok' | 'warning' | 'breached'
  nextAction: string
}

export interface CreateVehicleReportInput {
  vehicleId: string
  registrationNumber?: string
  fleetNumber?: string | null
  depotId?: string | null
  depotName?: string | null
  reportType: VehicleReportType
  reportCategory?: string
  severity?: VehicleReportSeverity
  title: string
  description: string
  vehicleArea?: string | null
  mileage?: number | null
  location?: string | null
  passengersOnboard?: boolean
  safeToMove?: boolean | null
  vorRequired?: boolean
  reportedByRole?: string
  evidenceLabels?: string[]
}

export interface ReviewVehicleReportInput {
  action:
    | 'accept'
    | 'request_info'
    | 'mark_duplicate'
    | 'escalate'
    | 'reduce_severity'
    | 'apply_vor'
    | 'restrict'
    | 'create_work_order'
    | 'close_no_fault'
  notes?: string
  severity?: VehicleReportSeverity
  restrictionType?: string
  workOrderTitle?: string
}

export interface VehicleReportsHubData {
  operationalDate: string
  summary: {
    openReports: number
    criticalReports: number
    vehiclesVor: number
    awaitingReview: number
    awaitingVerification: number
    overdueActions: number
    repeatDefects: number
    submittedToday: number
  }
  reports: VehicleReportRecord[]
}
