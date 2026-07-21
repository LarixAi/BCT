/** Driver domain types — separate status dimensions per Veyvio Driver Management spec. */

/** Operational lifecycle — independent of app login. */
export type OperationalStatus =
  | 'draft'
  | 'onboarding'
  | 'pending_compliance'
  | 'eligible'
  | 'restricted'
  | 'suspended'
  | 'inactive'
  | 'left_company'

/**
 * Driver app account lifecycle — separate from operational eligibility.
 * Do not collapse this into a single active boolean.
 */
export type AccountStatus =
  | 'draft'
  | 'invitation_pending'
  | 'setup_incomplete'
  | 'pending_approval'
  | 'active'
  | 'temporarily_suspended'
  | 'compliance_restricted'
  | 'locked'
  | 'offboarded'
  | 'archived'
  /** Invitation expired before acceptance — re-invite required */
  | 'invitation_expired'
  /** Credentials must be reset before normal access resumes */
  | 'password_reset_required'

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

export type InvitationChannel = 'email' | 'sms' | 'both'

export type SuspendReasonCategory =
  | 'employment_issue'
  | 'safeguarding_concern'
  | 'security_concern'
  | 'compliance_failure'
  | 'driver_requested'
  | 'investigation'
  | 'other'

export type SuspensionDuration = 'until_restored' | 'until_datetime'

export type DriverAuthMethod = 'none' | 'password' | 'passkey' | 'password_and_mfa' | 'passkey_and_biometric'

export type InvitationHistoryStage =
  | 'invitation_sent'
  | 'delivered'
  | 'opened'
  | 'identity_verified'
  | 'password_created'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'awaiting_approval'
  | 'activated'
  | 'email_bounced'
  | 'sms_undelivered'
  | 'link_expired'
  | 'link_already_used'
  | 'verification_attempts_exceeded'
  | 'details_do_not_match'
  | 'invitation_cancelled'

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

export type OnboardingStepId =
  | 'personal'
  | 'employment'
  | 'documents'
  | 'capabilities'
  | 'account'
  | 'review'

export interface DriverDevice {
  id: string
  label: string
  platform: string
  appVersion: string | null
  operatingSystem: string | null
  registeredAt: string
  lastSeenAt: string
  trusted: boolean
  biometricUnlock: boolean
  biometricMethod?: string | null
  biometricEnabledAt?: string | null
  lastBiometricUnlockAt?: string | null
  pushNotificationsEnabled: boolean
  locationAccess: 'while_on_duty' | 'always' | 'denied' | 'unknown'
  securityStatus: 'trusted' | 'untrusted' | 'revoked'
  requirePasswordNextLogin?: boolean
}

export interface DriverSession {
  id: string
  deviceId: string | null
  deviceLabel: string
  startedAt: string
  lastActiveAt: string
  current: boolean
  ipAddress: string | null
}

export interface DriverInvitationHistoryEntry {
  id: string
  stage: InvitationHistoryStage
  channel: InvitationChannel | null
  destination: string | null
  createdAt: string
  actor: string | null
  detail: string | null
}

export interface DriverAccessSuspension {
  reasonCategory: SuspendReasonCategory
  reason: string
  driverMessage: string | null
  suspendedAt: string
  suspendedBy: string
  duration: SuspensionDuration
  restoreAt: string | null
  reviewDate: string | null
}

export interface DriverAccount {
  userAccountId: string | null
  /** Login identity for the linked Driver app account (may differ from contact email). */
  loginEmail?: string | null
  accountStatus: AccountStatus
  invitationStatus: InvitationStatus
  invitationSentAt: string | null
  invitationExpiresAt: string | null
  invitationDestination: string | null
  invitationChannel: InvitationChannel | null
  registrationCompletedAt: string | null
  emailVerified: boolean
  phoneVerified: boolean
  mfaEnabled: boolean
  authenticationMethod: DriverAuthMethod
  passkeyEnabled: boolean
  lastLoginAt: string | null
  lastFailedLoginAt: string | null
  failedLoginCount: number
  accountLocked: boolean
  lastPasswordResetAt: string | null
  lastAppActivityAt: string | null
  activeSessionCount: number
  registeredDeviceCount: number
  pushNotificationsEnabled: boolean
  appVersion: string | null
  operatingSystem: string | null
  lastAppSyncAt: string | null
  locationPermissionGranted: boolean
  cameraPermissionGranted: boolean
  devices: DriverDevice[]
  sessions: DriverSession[]
  invitationHistory: DriverInvitationHistoryEntry[]
  suspension: DriverAccessSuspension | null
  /** One-time invitation token for Driver accept URL (also returned after successful email send). */
  devInvitationToken?: string | null
  /** Present when the platform attempted email delivery for this invite. */
  emailDeliveryStatus?: 'sent' | 'failed' | 'manual' | null
  /** Absolute Driver accept URL after a successful send. */
  inviteUrl?: string | null
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
  fileObjectId: string | null
  createdAt?: string
  updatedAt?: string
  sourceApp?: string
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
  status: 'complete' | 'expired' | 'due_soon' | 'missing' | 'failed' | 'assigned' | 'in_progress'
  completedAt: string | null
  expiresAt: string | null
  trainer: string | null
  /** 0–100 when the driver has started the Veyvio module */
  progressPercentage?: number | null
  /** Assessment / quiz score when recorded */
  assessmentScore?: number | null
  /** Present when built from the Section 19/22 catalogue */
  category?: 'mandatory' | 'role'
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

/** Admin records a completed (or cleared) training course against the catalogue. */
export interface RecordDriverTrainingInput {
  trainingKey: string
  /** ISO date YYYY-MM-DD — required unless `clear` is true */
  completedAt?: string
  /** ISO date YYYY-MM-DD — omit to use catalogue renewalMonths from completedAt */
  expiresAt?: string | null
  trainer?: string | null
  provider?: string | null
  certificateNumber?: string | null
  notes?: string | null
  /** When true, also creates a verified certificate document for evidence linking */
  attachCertificate?: boolean
  /** Set status to missing and clear completion (admin correction) */
  clear?: boolean
}

export type RequirementDeliveryChannel = 'in_app' | 'email' | 'sms'

export interface DriverRequirementState {
  id: string
  definitionKey: string
  requirementType: string
  statusOverride: string | null
  assignedToName: string | null
  dueAt: string | null
  lastRequestedAt: string | null
  lastRequestedChannels: RequirementDeliveryChannel[]
  openedAt: string | null
  requestCount: number
  reminderCount: number
  lastReminderAt: string | null
  rejectionReason: string | null
  internalNote: string | null
  updatedAt: string | null
}

export interface RequestDriverRequirementsInput {
  definitionKeys: string[]
  channels: RequirementDeliveryChannel[]
  dueAt: string | null
  message?: string
  mode?: 'request' | 'resend'
  minHoursSinceLastRequest?: number
  remindAfter2Days?: boolean
  remindBefore24h?: boolean
  escalateWhenOverdue?: boolean
}

export interface AssignDriverTrainingInput {
  definitionKey: string
  delivery: 'veyvio_module' | 'in_person' | 'external' | 'manager_signoff'
  trainer: string
  deadline: string
  evidenceCompletion?: boolean
  evidenceAssessment?: boolean
  evidenceCertificate?: boolean
}

export interface RejectDriverRequirementInput {
  reasonCode:
    | 'unreadable'
    | 'expired'
    | 'name_mismatch'
    | 'incorrect_document'
    | 'pages_missing'
    | 'other'
  instructions: string
  deadline: string
}

export interface DriverRequirementHistoryItem {
  id: string
  channels: RequirementDeliveryChannel[]
  status: string
  message: string | null
  dueAt: string | null
  sentAt: string
  openedAt: string | null
  requestedByName: string
  reminderCount: number
  lastReminderAt: string | null
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

/** Step 1 — create draft only. Never creates an app login. */
export interface CreateDriverInput {
  firstName: string
  lastName: string
  preferredName?: string | null
  dateOfBirth?: string | null
  email: string
  phone: string
  homeAddress?: string | null
  emergencyContact?: string | null
  employmentType: EmploymentType
  depotId: string
  employeeNumber?: string | null
  startDate?: string | null
  workPermissionKeys?: string[]
  /** @deprecated Prefer createDriverAppAccount after onboarding. Default false. */
  sendInvitation?: boolean
  invitationChannel?: InvitationChannel
}

export interface UpdateDriverInput {
  firstName?: string
  lastName?: string
  preferredName?: string | null
  dateOfBirth?: string | null
  email?: string
  phone?: string
  /** Required when changing login email or mobile — recorded in access audit */
  contactChangeReason?: string
  employmentType?: EmploymentType
  depotId?: string
  secondaryDepotIds?: string[]
  employeeNumber?: string | null
  startDate?: string | null
  workPermissionKeys?: string[]
  homeAddress?: string | null
  emergencyContact?: string | null
  managerName?: string | null
  licenceNumber?: string | null
  licenceCountry?: string | null
  licenceExpiry?: string | null
  licenceCategories?: string | null
  cpcExpiry?: string | null
  dqcNumber?: string | null
  dbsExpiry?: string | null
  medicalExpiry?: string | null
  rightToWorkStatus?: string | null
  tachoCardNumber?: string | null
  tachoCardExpiry?: string | null
  operationalStatus?: OperationalStatus
  employmentStatus?: EmploymentStatus
  onboardingStep?: OnboardingStepId
}

export interface CreateDriverAppAccountInput {
  channel: InvitationChannel
  resend?: boolean
}

export interface ActivateDriverInput {
  overrideWarningCodes?: string[]
  overrideReason?: string
}

export interface SuspendDriverInput {
  reasonCategory: SuspendReasonCategory
  /** Detailed reason — required for audit */
  reason: string
  duration: SuspensionDuration
  /** Required when duration is until_datetime */
  restoreAt?: string | null
  reviewDate?: string | null
  driverMessage?: string | null
  effectiveAt?: string
  reassignActiveTrips?: boolean
  notifyDriver?: boolean
}

export interface ReinstateDriverInput {
  reason: string
}

export interface UnlockDriverInput {
  reason: string
}

export interface OffboardDriverInput {
  reason: string
  employmentEndDate: string
  reassignActiveTrips?: boolean
  notifyDriver?: boolean
}

export interface RevokeDriverDeviceInput {
  reason: string
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
  dateOfBirth: string | null
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
  /** Operational lifecycle independent of app account */
  operationalStatus: OperationalStatus
  complianceStatus: ComplianceStatus
  operationalEligibility: OperationalEligibility
  dutyStatus: DutyStatus
  availabilityStatus: AvailabilityStatus
  startDate: string | null
  managerName: string | null
  homeAddress: string | null
  emergencyContact: string | null
  licenceNumber: string | null
  licenceCountry: string | null
  licenceExpiry: string | null
  licenceCategories: string | null
  cpcExpiry: string | null
  dqcNumber: string | null
  dbsExpiry: string | null
  medicalExpiry: string | null
  rightToWorkStatus: string | null
  tachoCardNumber: string | null
  tachoCardExpiry: string | null
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
  onboardingStep: OnboardingStepId
  createdAt: string
  updatedAt: string
}
