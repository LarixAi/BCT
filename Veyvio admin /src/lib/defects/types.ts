import type { DefectSeverity, DefectStatus, DefectTriageStatus } from '@/lib/vehicles/types'

export type DefectsTab = 'overview' | 'critical' | 'awaiting_triage' | 'vor' | 'overdue' | 'verification' | 'recurring' | 'history' | 'rules'

export type VehicleAvailability =
  | 'available'
  | 'available_with_restriction'
  | 'pending_safety_assessment'
  | 'vor'
  | 'recovery_only'
  | 'workshop_movement_authorised'
  | 'awaiting_road_test'

export type DefectWorkflowStatus =
  | 'new'
  | 'awaiting_triage'
  | 'under_assessment'
  | 'action_required'
  | 'assigned'
  | 'scheduled_for_repair'
  | 'repair_in_progress'
  | 'awaiting_parts'
  | 'awaiting_verification'
  | 'temporarily_repaired'
  | 'deferred'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'duplicate'
  | 'reopened'

export interface DefectsSummary {
  openDefects: number
  addedToday: number
  safetyCritical: number
  allVor: number
  awaitingTriage: number
  oldestTriageHours: number | null
  overdueRepairs: number
  overdueAffectingActive: number
  vehiclesVor: number
  awaitingVerification: number
}

export interface DefectRegisterRow {
  id: string
  defectRef: string
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  makeModel: string
  depotId: string
  depotName: string
  title: string
  description: string
  category: string
  component: string
  severity: DefectSeverity
  workflowStatus: DefectWorkflowStatus
  defectStatus: DefectStatus
  triageStatus: DefectTriageStatus | string
  vehicleAvailability: VehicleAvailability
  source: string
  reportedBy: string
  reportedAt: string
  location: string | null
  assignee: string | null
  repairDeadline: string | null
  triageDeadline: string | null
  slaMinutesRemaining: number | null
  isSlaBreached: boolean
  ageMinutes: number
  isOverdue: boolean
  evidenceCount: number
  linkedWorkOrderId: string | null
  linkedCheckId: string | null
  urgencyScore: number
  operationalImpact: string
  assignedRunReference: string | null
  nextDepartureTime: string | null
  isRecurring: boolean
  closedAt: string | null
}

export interface DefectPriorityAlert {
  id: string
  defectId: string
  defectRef: string
  registrationNumber: string
  title: string
  severity: DefectSeverity
  reportedBy: string
  reportedAt: string
  location: string
  assignedRunReference: string | null
  nextDepartureTime: string | null
  vehicleAvailability: VehicleAvailability
  replacementAssigned: boolean
  replacementCandidates: number
  dispatchBlocked: boolean
  summary: string
}

export interface DefectEvidenceItem {
  id: string
  kind: 'photo' | 'video' | 'document' | 'check_answer'
  label: string
  uploadedBy: string
  capturedAt: string
  source: string
}

export interface DefectTimelineEvent {
  id: string
  action: string
  actorName: string
  occurredAt: string
  detail: string | null
}

export interface DefectOperationalImpact {
  currentRunReference: string | null
  nextRunReference: string | null
  nextDepartureTime: string | null
  assignedDriverName: string | null
  wheelchairRequired: boolean
  openDefectCount: number
  similarDefectCount: number
  replacementCandidates: number
  dispatchBlocked: boolean
  dispatchBlockReason: string | null
  impactSummary: string | null
}

export interface DefectDetailRecord extends Omit<DefectRegisterRow, 'operationalImpact'> {
  symptoms: string | null
  mileage: number | null
  vorApplied: boolean
  triagedBy: string | null
  triagedAt: string | null
  closureReason: string | null
  closedBy: string | null
  closedAt: string | null
  evidence: DefectEvidenceItem[]
  timeline: DefectTimelineEvent[]
  operationalImpact: DefectOperationalImpact
  recurringWarning: string | null
  restrictionLabel: string | null
  restrictions: DefectRestrictionInfo[]
  repair: DefectRepairInfo | null
  verification: DefectVerificationInfo | null
  sourceRecord: DefectSourceRecord
  auditTrail: DefectAuditEntry[]
  safetyContext: DefectSafetyContext | null
}

export interface DefectSafetyContext {
  passengersOnboard: boolean | null
  safeToMove: boolean | null
  recoveryRequired: boolean | null
  affectsAccessibility: boolean | null
  symptoms: string | null
}

export interface DefectsHubData {
  operationalDate: string
  summary: DefectsSummary
  register: DefectRegisterRow[]
  priorityAlerts: DefectPriorityAlert[]
  depots: { id: string; name: string }[]
  recurring: DefectRegisterRow[]
  recurringInsights: DefectRecurringInsight[]
  slaSettings: DefectSlaSettings
  automationRules: DefectAutomationRule[]
  analytics: DefectAnalytics
}

export interface TriageDefectHubInput {
  defectId: string
  vehicleId: string
  triageStatus: DefectTriageStatus
  notes?: string
  createWorkOrder?: boolean
  markVor?: boolean
}

export interface ReportDefectHubInput {
  vehicleId: string
  category: string
  component: string
  description: string
  severity: DefectSeverity
  location?: string
  markVor?: boolean
  symptoms?: string
  passengersOnboard?: boolean
  safeToMove?: boolean
  recoveryRequired?: boolean
  affectsAccessibility?: boolean
  linkedCheckId?: string
  emergencySupport?: boolean
}

export type DefectClosureReason =
  | 'permanently_repaired'
  | 'component_replaced'
  | 'no_defect_found'
  | 'duplicate'
  | 'vehicle_decommissioned'
  | 'included_in_larger_repair'
  | 'monitoring_plan'

export type VerificationLevel = 1 | 2 | 3 | 4

export interface DefectRepairInfo {
  linkedWorkOrderId: string | null
  workOrderStatus: string | null
  technicianName: string | null
  diagnosis: string | null
  workPerformed: string | null
  repairType: string | null
  completedAt: string | null
  completedBy: string | null
}

export interface DefectVerificationInfo {
  requiredLevel: VerificationLevel
  completedLevel: VerificationLevel | null
  result: 'pass' | 'fail' | null
  verifiedBy: string | null
  verifiedAt: string | null
  method: string | null
  notes: string | null
}

export interface DefectRestrictionInfo {
  id: string
  type: string
  label: string
  reason: string
  status: 'active' | 'lifted'
  createdBy: string
  createdAt: string
  expiresAt: string | null
}

export interface CompleteRepairHubInput {
  defectId: string
  vehicleId: string
  diagnosis: string
  workPerformed: string
  repairType?: 'permanent' | 'temporary' | 'adjustment' | 'replacement' | 'monitoring' | 'no_fault_found'
  notes?: string
}

export interface VerifyDefectHubInput {
  defectId: string
  vehicleId: string
  result: 'pass' | 'fail'
  level: VerificationLevel
  method: string
  notes?: string
}

export interface CloseDefectHubInput {
  defectId: string
  vehicleId: string
  reason: DefectClosureReason
  notes?: string
}

export interface ApplyDefectRestrictionInput {
  defectId: string
  vehicleId: string
  restrictionType: 'no_school' | 'no_wheelchair' | 'depot_only' | 'day_shift_only' | 'contract_only'
  label: string
  reason: string
  expiresAt?: string
}

export interface ReopenDefectHubInput {
  defectId: string
  vehicleId: string
  reason: string
}

export interface DefectSlaSettings {
  triageMinutes: Record<DefectSeverity, number>
  repairMinutes: Record<DefectSeverity, number>
  notifyRoles: string[]
  blockDispatchOnCritical: boolean
  blockDispatchOnPendingAssessment: boolean
  recurringComponentThreshold: number
  recurringWindowDays: number
}

export type DefectAutomationTrigger =
  | 'critical_defect_reported'
  | 'accessibility_defect'
  | 'temporary_repair_expired'
  | 'recurring_component'

export interface DefectAutomationRule {
  id: string
  name: string
  trigger: DefectAutomationTrigger
  enabled: boolean
  actions: string[]
  description: string
}

export interface DefectRecurringInsight {
  id: string
  vehicleId: string
  registrationNumber: string
  component: string
  occurrenceCount: number
  windowDays: number
  openDefectIds: string[]
  latestDefectRef: string
  depotName: string
  makeModel: string
  severity: DefectSeverity
  recommendation: string
}

export interface UploadDefectEvidenceInput {
  defectId: string
  vehicleId: string
  kind: 'photo' | 'video' | 'document'
  label: string
}

export type BulkDefectAction =
  | 'assign_technician'
  | 'set_target_date'
  | 'add_note'
  | 'export'

export interface BulkDefectActionInput {
  defectIds: string[]
  action: BulkDefectAction
  assignee?: string
  targetDate?: string
  note?: string
}

export interface DefectSourceRecord {
  type: 'vehicle_check' | 'yard_inspection' | 'maintenance_job' | 'incident' | 'manual' | 'telematics'
  reference: string
  label: string
  href: string | null
  reportedAt: string
  reporterName: string
}

export interface DefectAuditEntry {
  id: string
  action: string
  actorName: string
  role: string | null
  occurredAt: string
  previousValue: string | null
  newValue: string | null
  reason: string | null
  sourceApplication: string
}

export interface DefectAnalytics {
  byDepot: { depotName: string; openCount: number; criticalCount: number }[]
  byCategory: { category: string; count: number }[]
  bySource: { source: string; count: number }[]
  slaBreaches: number
  avgAgeHours: number
  reopenedCount: number
  closedThisWeek: number
}

export interface MarkDefectVorHubInput {
  defectId: string
  vehicleId: string
  reason: string
}
