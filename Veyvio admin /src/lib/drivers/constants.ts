import type {
  AccountStatus,
  AvailabilityStatus,
  ComplianceStatus,
  DutyStatus,
  EmploymentStatus,
  EmploymentType,
  OnboardingStepId,
  OperationalEligibility,
  OperationalStatus,
} from './types'

export const ONBOARDING_STEPS: { id: OnboardingStepId; label: string; description: string }[] = [
  { id: 'personal', label: 'Personal', description: 'Identity and contact details' },
  { id: 'employment', label: 'Employment', description: 'Depot, role and start date' },
  { id: 'documents', label: 'Licence and documents', description: 'Compliance evidence' },
  { id: 'capabilities', label: 'Training and capabilities', description: 'Work types and restrictions' },
  { id: 'account', label: 'App account', description: 'Invitation — no admin password' },
  { id: 'review', label: 'Review and activate', description: 'Eligibility before dispatch' },
]

export const WORK_PERMISSION_OPTIONS: { key: string; label: string }[] = [
  { key: 'psv', label: 'PSV / coach' },
  { key: 'phv', label: 'Private hire' },
  { key: 'school', label: 'School transport' },
  { key: 'send', label: 'SEND transport' },
  { key: 'accessible', label: 'Accessible transport' },
  { key: 'wheelchair', label: 'Wheelchair passengers' },
  { key: 'elderly', label: 'Elderly passenger transport' },
  { key: 'hospital', label: 'Hospital transport' },
  { key: 'community', label: 'Community transport' },
  { key: 'minibus', label: 'Minibus' },
  { key: 'coach', label: 'Coach' },
  { key: 'passenger_lift', label: 'Passenger lift trained' },
  { key: 'first_aid', label: 'First aid trained' },
  { key: 'safeguarding', label: 'Safeguarding trained' },
  { key: 'manual_handling', label: 'Manual handling trained' },
  { key: 'contract', label: 'Contract work' },
  { key: 'night_work', label: 'Night work' },
  { key: 'manual_vehicle', label: 'Manual vehicles' },
]

export const RESTRICTION_OPTIONS: { type: string; label: string }[] = [
  { type: 'automatic_only', label: 'Automatic vehicles only' },
  { type: 'max_vehicle_size', label: 'Maximum vehicle size' },
  { type: 'no_wheelchair', label: 'No wheelchair transport' },
  { type: 'depot_only', label: 'Specific depot only' },
  { type: 'day_shifts_only', label: 'Day shifts only' },
  { type: 'supervision_required', label: 'Supervision required' },
]

export const DOCUMENT_REQUIREMENT_OPTIONS: { type: string; label: string }[] = [
  { type: 'driving_licence', label: 'Driving licence' },
  { type: 'dqc', label: 'Driver CPC / DQC' },
  { type: 'tachograph', label: 'Tachograph card' },
  { type: 'dbs', label: 'DBS check' },
  { type: 'right_to_work', label: 'Right to work' },
  { type: 'medical', label: 'Medical certificate' },
]

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employee: 'Employee',
  contractor: 'Contractor',
  agency: 'Agency',
  temporary: 'Temporary',
}

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  draft: 'Draft',
  onboarding: 'Onboarding',
  pending_compliance: 'Pending compliance',
  eligible: 'Eligible',
  restricted: 'Restricted',
  suspended: 'Suspended',
  inactive: 'Inactive',
  left_company: 'Left company',
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  draft: 'Draft',
  invitation_pending: 'Invitation pending',
  setup_incomplete: 'Setup incomplete',
  pending_approval: 'Pending approval',
  active: 'Active',
  temporarily_suspended: 'Temporarily suspended',
  compliance_restricted: 'Compliance restricted',
  locked: 'Locked',
  offboarded: 'Offboarded',
  archived: 'Archived',
  invitation_expired: 'Invitation expired',
  password_reset_required: 'Password reset required',
}

export const INVITATION_HISTORY_LABELS: Record<import('./types').InvitationHistoryStage, string> = {
  invitation_sent: 'Invitation sent',
  delivered: 'Delivered',
  opened: 'Opened',
  identity_verified: 'Identity verified',
  password_created: 'Password created',
  onboarding_started: 'Onboarding started',
  onboarding_completed: 'Onboarding completed',
  awaiting_approval: 'Awaiting approval',
  activated: 'Activated',
  email_bounced: 'Email bounced',
  sms_undelivered: 'SMS undelivered',
  link_expired: 'Link expired',
  link_already_used: 'Link already used',
  verification_attempts_exceeded: 'Verification attempts exceeded',
  details_do_not_match: 'Details do not match',
  invitation_cancelled: 'Invitation cancelled',
}

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  applicant: 'Applicant',
  onboarding: 'Onboarding',
  employed: 'Employed',
  agency: 'Agency',
  contractor: 'Contractor',
  temporary: 'Temporary',
  on_leave: 'On leave',
  suspended: 'Suspended',
  employment_ended: 'Employment ended',
}

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: 'Compliant',
  compliant_with_warnings: 'Compliant with warnings',
  documents_expiring_soon: 'Documents expiring soon',
  missing_information: 'Missing information',
  under_review: 'Under review',
  non_compliant: 'Non-compliant',
  verification_failed: 'Verification failed',
}

export const ELIGIBILITY_LABELS: Record<OperationalEligibility, string> = {
  eligible: 'Eligible',
  eligible_with_warning: 'Eligible with warnings',
  not_eligible: 'Not eligible',
  restricted: 'Restricted',
  awaiting_approval: 'Awaiting approval',
  emergency_override_active: 'Emergency override active',
}

export const DUTY_STATUS_LABELS: Record<DutyStatus, string> = {
  off_duty: 'Off duty',
  scheduled: 'Scheduled',
  checking_in: 'Checking in',
  available: 'Available',
  assigned: 'Assigned',
  on_trip: 'On trip',
  on_break: 'On break',
  finishing_duty: 'Finishing duty',
  overdue: 'Overdue',
  signed_out: 'Signed out',
}

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  unavailable: 'Unavailable',
  holiday: 'Holiday',
  sick: 'Sick',
  training: 'Training',
  restricted_hours: 'Restricted hours',
  temporarily_unavailable: 'Temporarily unavailable',
}

export const DRIVER_DIRECTORY_CARDS: {
  id: keyof import('./types').DriverDirectorySummary
  label: string
  filterKey?: string
}[] = [
  { id: 'totalActive', label: 'Active drivers' },
  { id: 'eligibleToday', label: 'Eligible today', filterKey: 'eligible' },
  { id: 'notEligible', label: 'Not eligible', filterKey: 'not_eligible' },
  { id: 'documentsExpiringSoon', label: 'Expiring within 30 days', filterKey: 'expiring' },
  { id: 'invitePending', label: 'Invite pending', filterKey: 'invitation_pending' },
  { id: 'onDuty', label: 'On duty', filterKey: 'on_duty' },
  { id: 'onTrip', label: 'On a trip', filterKey: 'on_trip' },
  { id: 'suspendedOrRestricted', label: 'Suspended / restricted', filterKey: 'restricted' },
  { id: 'appNotRecentlySynced', label: 'App not recently synced', filterKey: 'stale_sync' },
]
