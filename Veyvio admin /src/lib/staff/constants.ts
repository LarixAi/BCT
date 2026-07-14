import type { StaffDirectorySummary, StaffTab } from './types'

export const STAFF_TABS: { id: StaffTab; label: string }[] = [
  { id: 'all', label: 'All Staff' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'access', label: 'Access and Roles' },
  { id: 'teams', label: 'Teams and Departments' },
  { id: 'training', label: 'Training and Qualifications' },
  { id: 'availability', label: 'Availability' },
  { id: 'former', label: 'Former Staff' },
]

export const STAFF_DIRECTORY_CARDS: {
  id: keyof StaffDirectorySummary
  label: string
  filterKey: string
}[] = [
  { id: 'total', label: 'Total staff', filterKey: 'all' },
  { id: 'active', label: 'Active staff', filterKey: 'active' },
  { id: 'onDuty', label: 'Currently on duty', filterKey: 'on_duty' },
  { id: 'invitationsPending', label: 'Invitations pending', filterKey: 'invitation_pending' },
  { id: 'accessIssues', label: 'Access issues', filterKey: 'access_issues' },
  { id: 'trainingExpiring', label: 'Training expiring', filterKey: 'training_expiring' },
  { id: 'unassigned', label: 'Unassigned staff', filterKey: 'unassigned' },
]

export const DEPARTMENTS = [
  { id: 'dept-executive', name: 'Executive', teams: ['Senior leadership'] },
  { id: 'dept-operations', name: 'Operations', teams: ['Morning control', 'Evening control', 'School transport', 'Emergency cover'] },
  { id: 'dept-dispatch', name: 'Dispatch', teams: ['Duty controllers', 'Assignment desk'] },
  { id: 'dept-depot', name: 'Depot Operations', teams: ['Depot managers'] },
  { id: 'dept-yard', name: 'Yard Operations', teams: ['Yard day shift', 'Yard evening'] },
  { id: 'dept-maintenance', name: 'Maintenance', teams: ['Workshop', 'Parts'] },
  { id: 'dept-compliance', name: 'Safety and Compliance', teams: ['Compliance review'] },
  { id: 'dept-safeguarding', name: 'Safeguarding', teams: ['Safeguarding leads'] },
  { id: 'dept-customer', name: 'Customer Service', teams: ['Contact centre'] },
  { id: 'dept-commercial', name: 'Commercial', teams: ['Contracts'] },
  { id: 'dept-finance', name: 'Finance', teams: ['Accounts'] },
  { id: 'dept-hr', name: 'Human Resources', teams: ['People team'] },
  { id: 'dept-it', name: 'IT and Systems', teams: ['Systems support'] },
] as const

export const STAFF_ROLES = [
  { key: 'company_owner', label: 'Company Owner', description: 'Full company access', elevated: true, applications: ['command', 'yard', 'maintenance', 'driver', 'reports'] as const },
  { key: 'company_admin', label: 'Company Administrator', description: 'Manage staff, roles and settings', elevated: true, applications: ['command', 'reports'] as const },
  { key: 'operations_manager', label: 'Operations Manager', description: 'Oversee dispatch and fleet operations', elevated: false, applications: ['command', 'reports'] as const },
  { key: 'dispatcher', label: 'Dispatcher', description: 'Bookings, assignments and transfers', elevated: false, applications: ['command'] as const },
  { key: 'depot_manager', label: 'Depot Manager', description: 'Depot-scoped operations', elevated: false, applications: ['command', 'yard'] as const },
  { key: 'yard_manager', label: 'Yard Manager', description: 'Yard board and vehicle movements', elevated: false, applications: ['command', 'yard'] as const },
  { key: 'yard_operative', label: 'Yard Operative', description: 'Yard checks and movements', elevated: false, applications: ['yard'] as const },
  { key: 'maintenance_manager', label: 'Maintenance Manager', description: 'Workshop coordination and approvals', elevated: false, applications: ['command', 'maintenance'] as const },
  { key: 'technician', label: 'Maintenance Technician', description: 'Repair work and parts', elevated: false, applications: ['maintenance'] as const },
  { key: 'compliance_manager', label: 'Compliance Manager', description: 'Compliance rules and incidents', elevated: true, applications: ['command', 'reports'] as const },
  { key: 'safeguarding_officer', label: 'Safeguarding Officer', description: 'Safeguarding records and incidents', elevated: true, applications: ['command'] as const },
  { key: 'customer_service', label: 'Customer Service', description: 'Customer enquiries and complaints', elevated: false, applications: ['command', 'customer_support'] as const },
  { key: 'finance_manager', label: 'Finance Manager', description: 'Pricing and commercial reporting', elevated: true, applications: ['command', 'reports'] as const },
  { key: 'report_viewer', label: 'Report Viewer', description: 'Read-only reporting access', elevated: false, applications: ['reports'] as const },
  { key: 'auditor', label: 'Auditor', description: 'Read-only audit and compliance view', elevated: false, applications: ['command', 'reports'] as const },
  { key: 'contractor', label: 'Contractor', description: 'Limited temporary access', elevated: false, applications: ['yard'] as const },
  { key: 'passenger_assistant', label: 'Passenger Assistant', description: 'Passenger care on journeys', elevated: false, applications: [] as const },
] as const

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  on_leave: 'On leave',
  long_term_absence: 'Long-term absence',
  suspended: 'Suspended',
  notice_period: 'Notice period',
  left_company: 'Left company',
  contractor_inactive: 'Contractor inactive',
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  no_account: 'No account',
  invitation_pending: 'Invitation pending',
  active: 'Active',
  locked: 'Locked',
  password_reset_required: 'Password reset required',
  mfa_setup_required: 'MFA setup required',
  access_suspended: 'Access suspended',
  deactivated: 'Deactivated',
}

export const DUTY_STATUS_LABELS: Record<string, string> = {
  off_duty: 'Off duty',
  scheduled: 'Scheduled',
  on_duty: 'On duty',
  on_break: 'On break',
  unavailable: 'Unavailable',
  on_leave: 'On leave',
}

export const TRAINING_STATUS_LABELS: Record<string, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
  missing: 'Missing',
  awaiting_verification: 'Awaiting verification',
  not_required: 'Not required',
}

export const APPLICATION_LABELS: Record<string, string> = {
  command: 'Veyvio Command',
  yard: 'Veyvio Yard',
  maintenance: 'Veyvio Maintenance',
  driver: 'Veyvio Driver',
  reports: 'Reports portal',
  customer_support: 'Customer support',
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  agency: 'Agency',
  contractor: 'Contractor',
}

export function roleLabel(key: string): string {
  return STAFF_ROLES.find((r) => r.key === key)?.label ?? key.replace(/_/g, ' ')
}

export function departmentName(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id
}
