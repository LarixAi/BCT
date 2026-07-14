import type { DefectsSummary, DefectsTab } from './types'

export const DEFECTS_TABS: { id: DefectsTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'critical', label: 'Critical' },
  { id: 'awaiting_triage', label: 'Awaiting triage' },
  { id: 'vor', label: 'VOR vehicles' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'verification', label: 'Awaiting verification' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'history', label: 'Recently closed' },
  { id: 'rules', label: 'Rules & SLA' },
]

export const DEFECTS_SUMMARY_CARDS: {
  id: keyof DefectsSummary
  label: string
  filterKey: string
  subKey?: keyof DefectsSummary
}[] = [
  { id: 'openDefects', label: 'Open defects', filterKey: 'open', subKey: 'addedToday' },
  { id: 'safetyCritical', label: 'Safety-critical', filterKey: 'critical', subKey: 'allVor' },
  { id: 'awaitingTriage', label: 'Awaiting triage', filterKey: 'awaiting_triage', subKey: 'oldestTriageHours' },
  { id: 'overdueRepairs', label: 'Overdue repairs', filterKey: 'overdue', subKey: 'overdueAffectingActive' },
  { id: 'vehiclesVor', label: 'Vehicles VOR', filterKey: 'vor' },
  { id: 'awaitingVerification', label: 'Awaiting verification', filterKey: 'verification' },
]

export const SAVED_VIEWS = [
  { id: 'critical', label: 'Critical defects' },
  { id: 'awaiting_triage', label: 'Awaiting triage' },
  { id: 'vor', label: 'VOR vehicles' },
  { id: 'overdue', label: 'Overdue defects' },
  { id: 'verification', label: 'Awaiting verification' },
  { id: 'driver_reported', label: 'Driver reported' },
  { id: 'reopened', label: 'Reopened' },
  { id: 'temporary_repairs', label: 'Temporary repairs' },
] as const

export const SEVERITY_DISPLAY: Record<string, string> = {
  dangerous: 'Critical',
  major: 'Major',
  minor: 'Minor',
  advisory: 'Advisory',
}

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  awaiting_triage: 'Awaiting triage',
  under_assessment: 'Under assessment',
  action_required: 'Action required',
  assigned: 'Assigned',
  scheduled_for_repair: 'Scheduled for repair',
  repair_in_progress: 'Repair in progress',
  awaiting_parts: 'Awaiting parts',
  awaiting_verification: 'Awaiting verification',
  temporarily_repaired: 'Temporarily repaired',
  deferred: 'Deferred',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
  reopened: 'Reopened',
}

export const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Available',
  available_with_restriction: 'Restricted',
  pending_safety_assessment: 'Pending assessment',
  vor: 'VOR',
  recovery_only: 'Recovery only',
  workshop_movement_authorised: 'Workshop movement',
  awaiting_road_test: 'Awaiting road test',
}
