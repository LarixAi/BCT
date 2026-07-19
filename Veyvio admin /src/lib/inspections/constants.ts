import type { InspectionTab, InspectionType } from './types'

export const INSPECTION_TABS: { id: InspectionTab; label: string }[] = [
  { id: 'register', label: 'Register' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'awaiting-repair', label: 'Awaiting repair' },
  { id: 'providers', label: 'Providers' },
]

export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  safety_pmi: 'Safety Inspection (PMI)',
  first_use: 'First-use inspection',
  intermediate: 'Intermediate inspection',
  annual_prep: 'Annual-test preparation',
  post_repair: 'Post-repair inspection',
  return_to_service: 'Return-to-service inspection',
  body_condition: 'Body-condition inspection',
  specialist: 'Specialist equipment inspection',
}

export const INSPECTION_STATUS_LABELS: Record<string, string> = {
  due: 'Due',
  scheduled: 'Scheduled',
  prepared: 'Vehicle prepared',
  in_progress: 'In progress',
  completed: 'Inspection completed',
  rectification_pending: 'Rectification pending',
  awaiting_sign_off: 'Awaiting sign-off',
  signed_off: 'Signed off',
  failed: 'Failed',
  held: 'Vehicle held',
  incomplete: 'Incomplete',
}

export const INSPECTION_OUTCOME_LABELS: Record<string, string> = {
  pending: 'Pending',
  pass: 'Passed — no defects',
  pass_with_advisories: 'Passed — advisories',
  rectification_required: 'Rectification required',
  restricted: 'Restricted operation',
  fail_vor: 'Failed — VOR',
  incomplete: 'Incomplete',
  reinspection_required: 'Reinspection required',
}

export const ATTENTION_CARDS = [
  { id: 'dueToday', label: 'Due today', filterKey: 'due_today' },
  { id: 'dueWithin7Days', label: 'Due within 7 days', filterKey: 'due_7' },
  { id: 'overdue', label: 'Overdue', filterKey: 'overdue', tone: 'critical' as const },
  { id: 'inProgress', label: 'In progress', filterKey: 'in_progress' },
  { id: 'awaitingRectification', label: 'Awaiting rectification', filterKey: 'awaiting_repair' },
  { id: 'awaitingSignOff', label: 'Awaiting sign-off', filterKey: 'awaiting_sign_off' },
  { id: 'failedVor', label: 'Failed / VOR', filterKey: 'failed_vor', tone: 'critical' as const },
  { id: 'complianceRate90d', label: 'On-time (90d)', filterKey: 'all', suffix: '%' },
]

export const SAVED_VIEWS: { id: string; label: string; filterKey: string }[] = [
  { id: 'due_week', label: 'Due this week', filterKey: 'due_7' },
  { id: 'overdue', label: 'Overdue', filterKey: 'overdue' },
  { id: 'awaiting_repair', label: 'Awaiting repairs', filterKey: 'awaiting_repair' },
  { id: 'awaiting_sign_off', label: 'Awaiting sign-off', filterKey: 'awaiting_sign_off' },
  { id: 'missing_brake', label: 'Missing brake evidence', filterKey: 'missing_brake' },
]

export const WORKFLOW_STEPS = [
  'due',
  'scheduled',
  'prepared',
  'in_progress',
  'completed',
  'rectification_pending',
  'awaiting_sign_off',
  'signed_off',
] as const
