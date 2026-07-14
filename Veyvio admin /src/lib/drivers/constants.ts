import type {
  AccountStatus,
  AvailabilityStatus,
  ComplianceStatus,
  DutyStatus,
  EmploymentStatus,
  EmploymentType,
  OperationalEligibility,
} from './types'

export const WORK_PERMISSION_OPTIONS: { key: string; label: string }[] = [
  { key: 'psv', label: 'PSV / coach' },
  { key: 'phv', label: 'Private hire' },
  { key: 'school', label: 'School transport' },
  { key: 'accessible', label: 'Accessible transport' },
  { key: 'wheelchair', label: 'Wheelchair passengers' },
  { key: 'contract', label: 'Contract work' },
  { key: 'night_work', label: 'Night work' },
  { key: 'manual_vehicle', label: 'Manual vehicles' },
]

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  employee: 'Employee',
  contractor: 'Contractor',
  agency: 'Agency',
  temporary: 'Temporary',
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  not_created: 'Not created',
  invite_pending: 'Invite pending',
  registration_started: 'Registration started',
  active: 'Active',
  locked: 'Locked',
  password_reset_required: 'Password reset required',
  suspended: 'Suspended',
  disabled: 'Disabled',
  offboarded: 'Offboarded',
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
  { id: 'invitePending', label: 'Invite pending', filterKey: 'invite_pending' },
  { id: 'onDuty', label: 'On duty', filterKey: 'on_duty' },
  { id: 'onTrip', label: 'On a trip', filterKey: 'on_trip' },
  { id: 'suspendedOrRestricted', label: 'Suspended / restricted', filterKey: 'restricted' },
  { id: 'appNotRecentlySynced', label: 'App not recently synced', filterKey: 'stale_sync' },
]
