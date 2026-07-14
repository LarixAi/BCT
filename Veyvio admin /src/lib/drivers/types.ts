/** Driver domain types — separate status dimensions per Veyvio Driver Management spec. */

export type AccountStatus =
  | 'not_created'
  | 'invite_pending'
  | 'registration_started'
  | 'active'
  | 'locked'
  | 'password_reset_required'
  | 'suspended'
  | 'disabled'
  | 'offboarded'

export type EmploymentStatus =
  | 'applicant'
  | 'onboarding'
  | 'employed'
  | 'agency'
  | 'contractor'
  | 'temporary'
  | 'on_leave'
  | 'suspended'
  | 'employment_ended'

export type ComplianceStatus =
  | 'compliant'
  | 'compliant_with_warnings'
  | 'documents_expiring_soon'
  | 'missing_information'
  | 'under_review'
  | 'non_compliant'
  | 'verification_failed'

export type OperationalEligibility =
  | 'eligible'
  | 'eligible_with_warning'
  | 'not_eligible'
  | 'restricted'
  | 'awaiting_approval'
  | 'emergency_override_active'

export type DutyStatus =
  | 'off_duty'
  | 'scheduled'
  | 'checking_in'
  | 'available'
  | 'assigned'
  | 'on_trip'
  | 'on_break'
  | 'finishing_duty'
  | 'overdue'
  | 'signed_out'

export type AvailabilityStatus =
  | 'available'
  | 'unavailable'
  | 'holiday'
  | 'sick'
  | 'training'
  | 'restricted_hours'
  | 'temporarily_unavailable'

export type EmploymentType = 'employee' | 'contractor' | 'agency' | 'temporary'

export type InvitationStatus =
  | 'not_sent'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'registration_started'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type DocumentVerificationStatus =
  | 'not_supplied'
  | 'uploaded'
  | 'awaiting_review'
  | 'verified'
  | 'rejected'
  | 'expiring_soon'
  | 'expired'
  | 'revoked'
  | 'replaced'

export type DriverNoteCategory =
  | 'general'
  | 'operational'
  | 'compliance'
  | 'welfare'
  | 'performance'
  | 'investigation'
  | 'account_support'
  | 'restriction'
  | 'return_to_work'

export type RestrictionStatus = 'active' | 'pending_review' | 'expired' | 'lifted'

export interface DriverAccount {
  userAccountId: string | null
  accountStatus: AccountStatus
  invitationStatus: InvitationStatus
  invitationSentAt: string | null
  invitationExpiresAt: string | null
  invitationDestination: string | null
  registrationCompletedAt: string | null
  emailVerified: boolean
  phoneVerified: boolean
  mfaEnabled: boolean
  lastLoginAt: string | null
  failedLoginCount: number
  accountLocked: boolean
  lastPasswordResetAt: string | null
  activeSessionCount: number
  registeredDeviceCount: number
  pushNotificationsEnabled: boolean
  appVersion: string | null
  operatingSystem: string | null
  lastAppSyncAt: string | null
  locationPermissionGranted: boolean
  cameraPermissionGranted: boolean
}

export interface DriverWorkPermission {
  key: string
  label: string
  enabled: boolean
}

export interface DriverRestriction {
  id: string
  type: string
  label: string
  startDate: string
  reviewDate: string | null
  endDate: string | null
  reason: string
  createdBy: string
  approvedBy: string | null
  status: RestrictionStatus
  applicableWork: string | null
}

export interface DriverDocument {
  id: string
  requirementType: string
  label: string
  referenceNumber: string | null
  issuingOrganisation: string | null
  issueDate: string | null
  expiryDate: string | null
  verificationStatus: DocumentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  rejectionReason: string | null
  notes: string | null
  fileName: string | null
}

export interface DriverDocumentVersion {
  id: string
  documentId: string
  requirementType: string
  label: string
  referenceNumber: string | null
  expiryDate: string | null
  verificationStatus: DocumentVerificationStatus
  verifiedBy: string | null
  verifiedAt: string | null
  replacedAt: string
  replacedBy: string
  replacementReason: string | null
  fileName: string | null
}

export interface TrainingRequirement {
  id: string
  key: string
  label: string
  requiredFor: string
  status: 'complete' | 'expired' | 'due_soon' | 'missing' | 'failed'
  completedAt: string | null
  expiresAt: string | null
  trainer: string | null
}

export interface EligibilityOverride {
  id: string
  checkCode: string
  label: string
  reason: string
  evidence: string | null
  requestedBy: string
  approvedBy: string
  startsAt: string
  expiresAt: string
  jobReference: string | null
  status: 'active' | 'expired' | 'revoked'
}

export interface UploadDriverDocumentInput {
  requirementType: string
  label: string
  referenceNumber?: string | null
  issuingOrganisation?: string | null
  issueDate?: string | null
  expiryDate?: string | null
  fileName: string
  notes?: string | null
}

export interface AddDriverRestrictionInput {
  type: string
  label: string
  reason: string
  applicableWork?: string | null
  reviewDate?: string | null
  endDate?: string | null
}

export interface GrantEligibilityOverrideInput {
  checkCode: string
  label: string
  reason: string
  evidence?: string | null
  expiresAt: string
  jobReference?: string | null
}

export interface DriverNote {
  id: string
  category: DriverNoteCategory
  body: string
  author: string
  createdAt: string
  visibleToDriver: boolean
}

export interface DriverAuditEvent {
  id: string
  action: string
  actor: string
  actorRole: string
  createdAt: string
  previousValue: string | null
  newValue: string | null
  reason: string | null
}

export interface EligibilityFailure {
  code: string
  message: string
  severity: 'block' | 'warning'
  category: 'compliance' | 'account' | 'employment' | 'restriction' | 'operational' | 'app'
}

export interface DriverEligibilityResult {
  operationalEligibility: OperationalEligibility
  failures: EligibilityFailure[]
  warnings: EligibilityFailure[]
  canAssign: boolean
  canStartTrip: boolean
  summary: string
}

export interface CreateDriverInput {
  firstName: string
  lastName: string
  preferredName?: string | null
  email: string
  phone: string
  employmentType: EmploymentType
  depotId: string
  employeeNumber?: string | null
  startDate?: string | null
  workPermissionKeys: string[]
  sendInvitation?: boolean
  invitationChannel?: 'email' | 'sms' | 'both'
}

export interface UpdateDriverInput {
  firstName?: string
  lastName?: string
  preferredName?: string | null
  email?: string
  phone?: string
  employmentType?: EmploymentType
  depotId?: string
  employeeNumber?: string | null
  startDate?: string | null
  workPermissionKeys?: string[]
  homeAddress?: string | null
  emergencyContact?: string | null
}

export interface DriverDirectorySummary {
  totalActive: number
  eligibleToday: number
  notEligible: number
  documentsExpiringSoon: number
  invitePending: number
  onDuty: number
  onTrip: number
  suspendedOrRestricted: number
  appNotRecentlySynced: number
}

export interface DriverProfile {
  id: string
  reference: string
  firstName: string
  lastName: string
  preferredName: string | null
  /** Legacy field — mirrors dutyStatus for dispatch dropdowns */
  status?: string
  email: string | null
  phone: string | null
  depotId: string | null
  depotName: string | null
  secondaryDepotIds: string[]
  secondaryDepotNames: string[]
  employeeNumber: string | null
  employmentType: EmploymentType
  employmentStatus: EmploymentStatus
  complianceStatus: ComplianceStatus
  operationalEligibility: OperationalEligibility
  dutyStatus: DutyStatus
  availabilityStatus: AvailabilityStatus
  startDate: string | null
  managerName: string | null
  homeAddress: string | null
  emergencyContact: string | null
  licenceNumber: string | null
  licenceExpiry: string | null
  cpcExpiry: string | null
  dbsExpiry: string | null
  medicalExpiry: string | null
  workPermissions: DriverWorkPermission[]
  account: DriverAccount
  restrictions: DriverRestriction[]
  documents: DriverDocument[]
  documentVersions: DriverDocumentVersion[]
  trainingRequirements: TrainingRequirement[]
  eligibilityOverrides: EligibilityOverride[]
  notes: DriverNote[]
  auditEvents: DriverAuditEvent[]
  eligibility: DriverEligibilityResult
  nextDutyReference: string | null
  nextDutyTime: string | null
  nearestExpiryDate: string | null
  nearestExpiryLabel: string | null
  createdAt: string
  updatedAt: string
}
