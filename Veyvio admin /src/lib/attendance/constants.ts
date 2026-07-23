import type {
  AttendanceLiveStatus,
  AttendanceScoreBand,
  LeaveRequestStatus,
  LeaveRequestType,
} from './types'

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceLiveStatus, string> = {
  on_time: 'On time',
  late: 'Late',
  not_arrived: 'Not arrived',
  approved_leave: 'Approved leave',
  sick: 'Sick',
  training: 'Training',
  unauthorised_absence: 'Unauthorised absence',
  not_scheduled: 'Not scheduled',
  cover_assigned: 'Cover assigned',
}

/** Badge / strip colours — never status by colour alone. */
export const ATTENDANCE_STATUS_TONE: Record<
  AttendanceLiveStatus,
  'ready' | 'attention' | 'critical' | 'info' | 'sick' | 'muted' | 'cover'
> = {
  on_time: 'ready',
  late: 'attention',
  not_arrived: 'critical',
  approved_leave: 'info',
  sick: 'sick',
  training: 'info',
  unauthorised_absence: 'critical',
  not_scheduled: 'muted',
  cover_assigned: 'cover',
}

export const ATTENDANCE_TONE_CLASS: Record<
  'ready' | 'attention' | 'critical' | 'info' | 'sick' | 'muted' | 'cover',
  string
> = {
  ready: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  attention: 'bg-amber-100 text-amber-950 ring-amber-200',
  critical: 'bg-red-100 text-red-900 ring-red-200',
  info: 'bg-sky-100 text-sky-950 ring-sky-200',
  sick: 'bg-violet-100 text-violet-950 ring-violet-200',
  muted: 'bg-surface-muted text-ink-soft ring-border',
  cover: 'bg-teal-100 text-teal-950 ring-teal-200',
}

export const ATTENDANCE_STRIP_CLASS: Record<
  'ready' | 'attention' | 'critical' | 'info' | 'sick' | 'muted' | 'cover',
  string
> = {
  ready: 'border-l-emerald-500',
  attention: 'border-l-amber-500',
  critical: 'border-l-red-600',
  info: 'border-l-sky-500',
  sick: 'border-l-violet-500',
  muted: 'border-l-border-strong',
  cover: 'border-l-teal-500',
}

export const LEAVE_TYPE_LABEL: Record<LeaveRequestType, string> = {
  annual_leave: 'Annual leave',
  unpaid_leave: 'Unpaid leave',
  sick_leave: 'Sick leave',
  emergency_leave: 'Emergency leave',
  medical_appointment: 'Medical appointment',
  family_emergency: 'Family emergency',
  bereavement: 'Bereavement / compassionate',
  jury_service: 'Jury service',
  training: 'Training',
  other: 'Other',
}

export const LEAVE_STATUS_LABEL: Record<LeaveRequestStatus, string> = {
  pending: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  moved: 'Moved',
}

export const SCORE_BAND_LABEL: Record<AttendanceScoreBand, string> = {
  excellent: 'Excellent',
  good: 'Good',
  needs_attention: 'Needs attention',
  attendance_concern: 'Attendance concern',
  critical_review: 'Critical review',
}

export function scoreBand(score: number): AttendanceScoreBand {
  if (score >= 95) return 'excellent'
  if (score >= 85) return 'good'
  if (score >= 70) return 'needs_attention'
  if (score >= 50) return 'attendance_concern'
  return 'critical_review'
}

export const ABSENCE_REASON_LABEL: Record<
  import('./types').AbsenceReasonCode,
  string
> = {
  transport_disruption: 'Transport disruption',
  traffic: 'Traffic',
  illness: 'Illness',
  family_emergency: 'Family emergency',
  medical_appointment: 'Medical appointment',
  shift_misunderstanding: 'Shift misunderstanding',
  vehicle_or_depot_issue: 'Vehicle or depot issue',
  forgot_clock_in: 'Forgot to clock in',
  other: 'Other',
}

export const MANAGER_CLASSIFICATION_LABEL: Record<
  import('./types').ManagerClassification,
  string
> = {
  authorised: 'Authorised',
  unauthorised: 'Unauthorised',
  operational_issue: 'Operational issue',
  recording_error: 'Recording error',
  under_review: 'Under review',
}

export const CALENDAR_MARK_LABEL: Record<import('./types').CalendarDayMark, string> = {
  on_time: 'On time',
  late: 'Late',
  sick: 'Sick',
  approved_leave: 'Approved leave',
  unauthorised: 'Unauthorised absence',
  rest: 'Rest day',
  empty: '—',
}
