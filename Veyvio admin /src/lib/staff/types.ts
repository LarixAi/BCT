/** Staff domain — internal identity, access and operational responsibility (not drivers-as-primary-role). */

export type StaffEmploymentStatus =
  | 'draft'
  | 'active'
  | 'on_leave'
  | 'long_term_absence'
  | 'suspended'
  | 'notice_period'
  | 'left_company'
  | 'contractor_inactive'

export type StaffAccountStatus =
  | 'no_account'
  | 'invitation_pending'
  | 'active'
  | 'locked'
  | 'password_reset_required'
  | 'mfa_setup_required'
  | 'access_suspended'
  | 'deactivated'

export type StaffDutyStatus =
  | 'off_duty'
  | 'scheduled'
  | 'on_duty'
  | 'on_break'
  | 'unavailable'
  | 'on_leave'

export type StaffInvitationStatus =
  | 'not_sent'
  | 'scheduled'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'accepted'
  | 'expired'
  | 'cancelled'
  | 'delivery_failed'

export type StaffTrainingStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing' | 'awaiting_verification' | 'not_required'

export type StaffContractType = 'full_time' | 'part_time' | 'agency' | 'contractor'

export type StaffApplication = 'command' | 'yard' | 'maintenance' | 'driver' | 'reports' | 'customer_support'

export type StaffAccessScopeType = 'company' | 'depot' | 'department' | 'contract'

export type StaffTab =
  | 'all'
  | 'invitations'
  | 'access'
  | 'teams'
  | 'training'
  | 'availability'
  | 'former'

export interface StaffDepotAssignment {
  depotId: string
  depotName: string
  assignmentType: 'primary' | 'secondary' | 'cover' | 'emergency'
  roleAtDepot: string
  startDate: string
  endDate: string | null
  status: 'active' | 'temporary' | 'expired'
}

export interface StaffRoleAssignment {
  roleKey: string
  roleLabel: string
  scopeType: StaffAccessScopeType
  scopeLabel: string
  depotIds: string[]
  elevated: boolean
  effectiveFrom: string
  expiresAt: string | null
}

export interface StaffApplicationAccess {
  application: StaffApplication
  enabled: boolean
  status: 'enabled' | 'disabled' | 'invitation_pending' | 'suspended' | 'restricted'
}

export type StaffDocumentVerificationStatus = 'not_supplied' | 'uploaded' | 'awaiting_review' | 'verified' | 'rejected' | 'expired'

export interface StaffDocument {
  id: string
  requirementType: string
  label: string
  referenceNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  verificationStatus: StaffDocumentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  uploadedBy: string | null
  uploadedAt: string | null
  fileName: string | null
  sensitive: boolean
}

export interface StaffDocumentVersion {
  id: string
  documentId: string
  requirementType: string
  label: string
  referenceNumber: string | null
  expiryDate: string | null
  verificationStatus: StaffDocumentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  replacedAt: string
  replacedBy: string
  replacementReason: string | null
  fileName: string | null
}

export interface StaffSession {
  id: string
  deviceLabel: string
  application: StaffApplication | 'command'
  ipAddress: string
  location: string | null
  startedAt: string
  lastActiveAt: string
  current: boolean
}

export interface StaffDevice {
  id: string
  label: string
  platform: string
  registeredAt: string
  lastSeenAt: string
  trusted: boolean
  mfaRegistered: boolean
}

export interface StaffGovernanceAlert {
  id: string
  code: string
  severity: 'warning' | 'critical'
  message: string
  relatedRoles: string[]
}

export interface StaffAccessReview {
  id: string
  staffId: string
  staffName: string
  roleLabel: string
  lastReviewedAt: string | null
  dueAt: string | null
  status: 'due' | 'overdue' | 'completed'
  elevatedRoles: string[]
}

export interface StaffLifecycleStep {
  key: string
  label: string
  status: 'pending' | 'in_progress' | 'complete' | 'skipped'
  completedAt: string | null
}

export interface FleetSegregationAlertRow {
  staffId: string
  staffName: string
  roleLabel: string
  message: string
  severity: StaffGovernanceAlert['severity']
}

export interface StaffGovernanceSummary {
  accessReviewsDue: number
  segregationWarnings: number
  contractorsExpiring: number
  mfaNonCompliant: number
  ssoEnabledCount: number
}

export interface UploadStaffDocumentInput {
  requirementType: string
  label: string
  referenceNumber?: string | null
  issueDate?: string | null
  expiryDate?: string | null
  fileName: string
}

export interface CompleteStaffAccessReviewInput {
  notes?: string
  confirmRolesStillRequired?: boolean
}

export interface MoveStaffMemberInput {
  departmentId: string
  jobTitle: string
  roleKey: string
  lineManagerId?: string
  primaryDepotId?: string
  effectiveDate: string
  reason: string
}

export interface ExtendContractorAccessInput {
  expiresAt: string
  reason: string
}

export interface StaffUserAccount {
  userAccountId: string | null
  loginEmail: string | null
  accountStatus: StaffAccountStatus
  invitationStatus: StaffInvitationStatus
  invitationSentAt: string | null
  invitationAcceptedAt: string | null
  invitationExpiresAt: string | null
  accountCreatedAt: string | null
  lastLoginAt: string | null
  lastFailedLoginAt: string | null
  mfaEnabled: boolean
  authProvider: string
  activeSessionCount: number
  temporaryAccessExpiresAt: string | null
  lastAccessReviewAt?: string | null
  accessReviewDueAt?: string | null
  ssoEnabled?: boolean
  mfaPolicy?: 'standard' | 'elevated_required' | 'enforced'
  contractorAccessExpiresAt?: string | null
  /** Dev-only: returned when email delivery is not configured. */
  devInvitationToken?: string | null
}

export interface StaffQualification {
  id: string
  trainingType: string
  provider: string | null
  certificateNumber: string | null
  completedDate: string | null
  expiryDate: string | null
  status: StaffTrainingStatus
  verifiedBy: string | null
  evidenceFileName?: string | null
}

export interface StaffTrainingRequirement {
  id: string
  key: string
  label: string
  requiredFor: string
  category: 'mandatory' | 'role' | 'depot' | 'application'
  status: StaffTrainingStatus
  qualificationId: string | null
  completedDate: string | null
  expiryDate: string | null
  blocksAccess: boolean
  blockedPermission: string | null
}

export interface FleetTrainingGapRow {
  staffId: string
  staffName: string
  roleLabel: string
  requirementKey: string
  requirementLabel: string
  status: StaffTrainingStatus
  expiryDate: string | null
  blocksAccess: boolean
}

export interface StaffTrainingComplianceSummary {
  staffWithGaps: number
  expiringSoon: number
  accessBlocked: number
  awaitingVerification: number
}

export interface StaffAuditEvent {
  id: string
  action: string
  actorName: string
  occurredAt: string
  detail: string | null
  application: string
}

export interface StaffTask {
  id: string
  title: string
  dueDate: string | null
  status: 'open' | 'overdue' | 'completed' | 'escalated'
  priority: 'low' | 'medium' | 'high'
  category: string
  assignedBy: string | null
  relatedRecord: string | null
  relatedHref: string | null
}

export interface StaffWorkingPattern {
  label: string
  days: string[]
  startTime: string
  endTime: string
  breakMinutes: number
}

export interface StaffShift {
  id: string
  date: string
  depotId: string
  depotName: string
  startTime: string
  endTime: string
  role: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes: string | null
}

export interface StaffDutySession {
  id: string
  startedAt: string
  endedAt: string | null
  depotId: string
  depotName: string
  role: string
  status: 'active' | 'on_break' | 'ended'
}

export interface StaffHandover {
  id: string
  fromStaffId: string
  fromStaffName: string
  toStaffId: string | null
  toStaffName: string | null
  depotId: string
  depotName: string
  responsibility: string
  openExceptionCount: number
  notes: string | null
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: string
  completedAt: string | null
  completedBy: string | null
}

export interface FleetStaffShiftRow {
  shiftId: string
  staffId: string
  staffName: string
  jobTitle: string
  depotName: string
  date: string
  startTime: string
  endTime: string
  status: StaffShift['status']
  dutyStatus: StaffDutyStatus
}

export interface FleetStaffTaskRow {
  taskId: string
  staffId: string
  staffName: string
  title: string
  category: string
  dueDate: string | null
  status: StaffTask['status']
  priority: StaffTask['priority']
  relatedHref: string | null
}

export interface StaffProfile {
  id: string
  personId: string
  reference: string
  firstName: string
  lastName: string
  preferredName: string | null
  employeeNumber: string | null
  pronouns: string | null
  jobTitle: string
  department: string
  departmentId: string
  team: string | null
  employmentStatus: StaffEmploymentStatus
  dutyStatus: StaffDutyStatus
  contractType: StaffContractType
  startDate: string | null
  endDate: string | null
  lineManagerId: string | null
  lineManagerName: string | null
  costCentre: string | null
  workEmail: string
  personalEmail: string | null
  workPhone: string | null
  mobilePhone: string | null
  preferredContactMethod: 'email' | 'phone' | 'mobile'
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  primaryDepotId: string
  primaryDepotName: string
  depotAssignments: StaffDepotAssignment[]
  roleAssignments: StaffRoleAssignment[]
  applications: StaffApplicationAccess[]
  account: StaffUserAccount
  qualifications: StaffQualification[]
  documents: StaffDocument[]
  documentVersions: StaffDocumentVersion[]
  sessions: StaffSession[]
  devices: StaffDevice[]
  governanceAlerts: StaffGovernanceAlert[]
  lifecycleWorkflow: StaffLifecycleStep[]
  trainingRequirements: StaffTrainingRequirement[]
  trainingStatus: StaffTrainingStatus
  trainingAccessBlocks: string[]
  linkedDriverId: string | null
  linkedDriverName: string | null
  openTaskCount: number
  overdueTaskCount: number
  tasks: StaffTask[]
  workingPattern: StaffWorkingPattern | null
  shifts: StaffShift[]
  dutySessions: StaffDutySession[]
  currentDutySessionId: string | null
  onCall: boolean
  overtimeAvailable: boolean
  responsibilities: string[]
  operationalAlerts: string[]
  auditEvents: StaffAuditEvent[]
  createdAt: string
  updatedAt: string
}

export interface StaffDirectoryRow {
  staffId: string
  reference: string
  firstName: string
  lastName: string
  employeeNumber: string | null
  jobTitle: string
  department: string
  primaryDepotName: string
  additionalDepotCount: number
  roleLabel: string
  employmentStatus: StaffEmploymentStatus
  accountStatus: StaffAccountStatus
  dutyStatus: StaffDutyStatus
  trainingStatus: StaffTrainingStatus
  lastLoginAt: string | null
  hasDriverProfile: boolean
  invitationStatus: StaffInvitationStatus
}

export interface StaffDirectorySummary {
  total: number
  active: number
  onDuty: number
  invitationsPending: number
  accessIssues: number
  trainingExpiring: number
  unassigned: number
}

export interface StaffHubData {
  summary: StaffDirectorySummary
  rows: StaffDirectoryRow[]
  invitations: StaffDirectoryRow[]
  former: StaffDirectoryRow[]
  departments: StaffDepartmentSummary[]
  roles: StaffRoleDefinition[]
  shiftsToday: FleetStaffShiftRow[]
  openTasks: FleetStaffTaskRow[]
  pendingHandovers: StaffHandover[]
  controllersOnDuty: StaffDirectoryRow[]
  trainingGaps: FleetTrainingGapRow[]
  trainingCompliance: StaffTrainingComplianceSummary
  requirementCatalog: { key: string; label: string; category: string; requiredFor: string; renewalMonths: number | null }[]
  pendingAccessReviews: StaffAccessReview[]
  segregationAlerts: FleetSegregationAlertRow[]
  contractorsExpiring: StaffDirectoryRow[]
  governanceSummary: StaffGovernanceSummary
  ssoPolicy: { enabled: boolean; provider: string; enforcedForElevated: boolean }
}

export interface StaffDepartmentSummary {
  id: string
  name: string
  headName: string | null
  staffCount: number
  teams: string[]
}

export interface StaffRoleDefinition {
  key: string
  label: string
  description: string
  elevated: boolean
  applications: StaffApplication[]
}

export interface CreateStaffInput {
  firstName: string
  lastName: string
  preferredName?: string
  workEmail: string
  mobilePhone?: string
  employeeNumber?: string
  isContractor?: boolean
  jobTitle: string
  departmentId: string
  lineManagerId?: string
  startDate?: string
  contractType: StaffContractType
  primaryDepotId: string
  additionalDepotIds?: string[]
  team?: string
  roleKey: string
  scopeType: StaffAccessScopeType
  scopeDepotIds?: string[]
  applications: StaffApplication[]
  sendInvitation?: boolean
}

export interface UpdateStaffInput {
  firstName?: string
  lastName?: string
  preferredName?: string
  jobTitle?: string
  departmentId?: string
  lineManagerId?: string
  workEmail?: string
  mobilePhone?: string
  workPhone?: string
  employmentStatus?: StaffEmploymentStatus
  dutyStatus?: StaffDutyStatus
  primaryDepotId?: string
  team?: string
}

export interface SendStaffInvitationInput {
  email?: string
  expiresInDays?: number
}

export interface SuspendStaffAccessInput {
  reason: string
  suspendAccount?: boolean
  removeElevated?: boolean
}

export interface StaffDutyActionInput {
  depotId?: string
  notes?: string
}

export interface CreateStaffHandoverInput {
  toStaffId: string
  responsibility: string
  openExceptionCount: number
  notes?: string
}

export interface AssignStaffTaskInput {
  title: string
  category: string
  dueDate?: string
  priority?: StaffTask['priority']
  relatedRecord?: string
  relatedHref?: string
}

export interface AddStaffQualificationInput {
  trainingType: string
  provider?: string
  certificateNumber?: string
  completedDate?: string
  expiryDate?: string
  fileName?: string
}
