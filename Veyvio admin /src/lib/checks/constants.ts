import type { ChecksSummary, ChecksTab } from './types'

export const CHECKS_TABS: { id: ChecksTab; label: string; phase?: number }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live checks' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'action', label: 'Action required' },
  { id: 'overdue', label: 'Missed & overdue' },
  { id: 'history', label: 'Check history' },
  { id: 'templates', label: 'Templates & rules' },
]

export const CHECKS_SUMMARY_CARDS: {
  id: keyof ChecksSummary
  label: string
  filterKey: string
  subKey?: keyof ChecksSummary
}[] = [
  { id: 'vehiclesReady', label: 'Vehicles ready', filterKey: 'ready', subKey: 'expiringSoon' },
  { id: 'checksInProgress', label: 'Checks in progress', filterKey: 'in_progress', subKey: 'oldestInProgressMinutes' },
  { id: 'actionRequired', label: 'Action required', filterKey: 'action', subKey: 'assignedDespiteIssue' },
  { id: 'missingOrOverdue', label: 'Missing or overdue', filterKey: 'overdue', subKey: 'departureDueSoon' },
  { id: 'vehiclesOffRoad', label: 'Vehicles off road', filterKey: 'vor', subKey: 'awaitingMaintenanceReview' },
]

export const RELEASE_STATUS_LABELS: Record<string, string> = {
  not_checked: 'Not checked',
  check_in_progress: 'Check in progress',
  awaiting_review: 'Awaiting review',
  conditionally_ready: 'Conditionally ready',
  ready: 'Ready',
  blocked: 'Blocked',
  vor: 'VOR',
  in_maintenance: 'In maintenance',
  retest_required: 'Retest required',
}

export const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  assigned: 'Assigned',
  started: 'Started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  awaiting_review: 'Awaiting review',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed',
  closed: 'Closed',
  cancelled: 'Cancelled',
  expired: 'Expired',
  offline_pending_sync: 'Offline pending sync',
}

export const SEVERITY_ORDER: Record<string, number> = {
  dangerous: 0,
  major: 1,
  minor: 2,
  advisory: 3,
}
