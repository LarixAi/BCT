import type { DefectSeverity, VehicleCheckType } from '@/lib/vehicles/types'

export type ChecksTab =
  | 'overview'
  | 'live'
  | 'submitted'
  | 'action'
  | 'overdue'
  | 'history'
  | 'templates'

export type CheckLifecycleStatus =
  | 'scheduled'
  | 'assigned'
  | 'started'
  | 'in_progress'
  | 'submitted'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'closed'
  | 'cancelled'
  | 'expired'
  | 'offline_pending_sync'

export type VehicleCheckReleaseStatus =
  | 'not_checked'
  | 'check_in_progress'
  | 'awaiting_review'
  | 'conditionally_ready'
  | 'ready'
  | 'blocked'
  | 'vor'
  | 'in_maintenance'
  | 'retest_required'

export type CheckWorkStatus = 'unassigned' | 'assigned' | 'live' | 'completed'

export type CheckSyncStatus = 'synced' | 'pending' | 'offline'

export interface ChecksSummary {
  vehiclesReady: number
  expiringSoon: number
  checksInProgress: number
  oldestInProgressMinutes: number | null
  actionRequired: number
  assignedDespiteIssue: number
  missingOrOverdue: number
  departureDueSoon: number
  vehiclesOffRoad: number
  awaitingMaintenanceReview: number
}

export interface ChecksOperationalRow {
  checkId: string
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  makeModel: string
  vehicleCategory: string
  depotId: string
  depotName: string
  operationalStatus: VehicleCheckReleaseStatus
  lifecycleStatus: CheckLifecycleStatus
  checkType: VehicleCheckType | null
  checkTypeLabel: string
  completedBy: string | null
  sourceApplication: string | null
  startedAt: string | null
  submittedAt: string | null
  result: 'pass' | 'fail' | 'pass_with_advisory' | null
  defectCount: number
  highestDefectSeverity: DefectSeverity | null
  evidenceCount: number
  evidenceMissing: boolean
  validUntil: string | null
  workStatus: CheckWorkStatus
  assignedRunReference: string | null
  nextDepartureTime: string | null
  reviewerName: string | null
  reviewStatus: string | null
  urgencyScore: number
  exceptionLabels: string[]
  syncStatus: CheckSyncStatus
  suspiciousFlagCount: number
}

export interface LiveCheckRow {
  checkId: string
  vehicleId: string
  registrationNumber: string
  performedBy: string
  checkType: VehicleCheckType
  checkTypeLabel: string
  startedAt: string
  currentSection: string
  completionPercent: number
  syncStatus: CheckSyncStatus
  lastSyncAt: string | null
  deviceLabel: string
  nextDepartureTime: string | null
  minutesSinceStart: number
}

export interface CheckEvidenceItem {
  id: string
  kind: 'photo' | 'video' | 'signature' | 'odometer' | 'fuel' | 'note'
  label: string
  capturedAt: string
  url: string | null
  sufficient: boolean
}

export interface CheckSectionAnswer {
  id: string
  section: string
  question: string
  answer: string
  answeredAt: string
  createdDefectId: string | null
  notes: string | null
}

export interface CheckTimelineEvent {
  id: string
  action: string
  actorName: string
  source: string
  occurredAt: string
  detail: string | null
}

export interface CheckDetailRecord extends ChecksOperationalRow {
  currentLocation: string | null
  vorStatus: boolean
  currentDriverName: string | null
  templateVersion: string
  sections: CheckSectionAnswer[]
  evidence: CheckEvidenceItem[]
  timeline: CheckTimelineEvent[]
  defectSummaries: { id: string; description: string; severity: DefectSeverity }[]
  operationalImpact: OperationalImpactSummary | null
  suspiciousFlags: SuspiciousFlag[]
  conditionalRelease: ConditionalReleaseRecord | null
  replacementCandidates: ReplacementVehicleOption[]
}

export interface OperationalImpactSummary {
  hasAssignedWork: boolean
  currentRunReference: string | null
  nextRunReference: string | null
  nextDepartureTime: string | null
  assignedDriverName: string | null
  routeName: string | null
  tripId: string | null
  tripStatus: string | null
  passengerCommitments: number
  wheelchairRequired: boolean
  minSeatingCapacity: number
  safeguardingPassengers: boolean
  depotName: string
  operationalImpact: string | null
}

export interface ReplacementVehicleOption {
  vehicleId: string
  registrationNumber: string
  makeModel: string
  seatingCapacity: number
  wheelchairCapacity: number
  depotName: string
  readinessLabel: string
  canAllocate: boolean
  estimatedPrepMinutes: number
}

export interface ConditionalReleaseRecord {
  authorisedBy: string
  authorisedAt: string
  reason: string
  restrictions: string
  requiredCompletionDate: string | null
}

export interface SuspiciousFlag {
  id: string
  code: string
  label: string
  severity: 'info' | 'warning' | 'critical'
  detail: string
  recommendedAction: string
}

export interface CheckTemplate {
  id: string
  name: string
  checkType: VehicleCheckType
  version: string
  vehicleCategories: string[]
  frequency: string
  validityHours: number
  evidenceRequired: string[]
  blockingAnswers: string[]
  escalationRules: string[]
  approvalRequired: boolean
  questionCount: number
  active: boolean
}

export interface ChecksIntelligenceSummary {
  suspiciousChecksToday: number
  recurringDefectVehicles: { vehicleId: string; registrationNumber: string; defectCount: number }[]
  driverQualityAlerts: { driverName: string; missedChecks: number }[]
  depotComparison: { depotName: string; passRate: number; overdueCount: number }[]
  templatePerformance: { templateName: string; failRate: number; avgDurationMinutes: number }[]
}

export interface ChecksHubData {
  operationalDate: string
  summary: ChecksSummary
  overview: ChecksOperationalRow[]
  liveChecks: LiveCheckRow[]
  submitted: ChecksOperationalRow[]
  actionQueue: ChecksOperationalRow[]
  overdue: ChecksOperationalRow[]
  history: ChecksOperationalRow[]
  depots: { id: string; name: string }[]
  templates: CheckTemplate[]
  intelligence: ChecksIntelligenceSummary
}

export interface StartAdminCheckInput {
  vehicleId: string
  checkType: VehicleCheckType
  notes?: string
}

export interface ReviewCheckInput {
  checkId: string
  decision: 'approve' | 'reject' | 'request_redo'
  reason?: string
}

export interface MarkCheckVorInput {
  checkId: string
  reason: string
}

export interface ConditionalReleaseInput {
  checkId: string
  reason: string
  restrictions: string
  requiredCompletionDate?: string
}

export interface ResolveCheckImpactInput {
  checkId: string
  replacementVehicleId: string
  reason: string
}
