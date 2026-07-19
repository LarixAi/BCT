export type AttendanceLiveStatus =
  | 'on_time'
  | 'late'
  | 'not_arrived'
  | 'approved_leave'
  | 'sick'
  | 'training'
  | 'unauthorised_absence'
  | 'not_scheduled'
  | 'cover_assigned'

export type LeaveRequestType =
  | 'annual_leave'
  | 'sick_leave'
  | 'emergency_leave'
  | 'medical_appointment'
  | 'family_emergency'
  | 'bereavement'
  | 'jury_service'
  | 'training'
  | 'other'

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'moved'

export type AttendanceScoreBand =
  | 'excellent'
  | 'good'
  | 'needs_attention'
  | 'attendance_concern'
  | 'critical_review'

export type AbsenceReasonCode =
  | 'transport_disruption'
  | 'traffic'
  | 'illness'
  | 'family_emergency'
  | 'medical_appointment'
  | 'shift_misunderstanding'
  | 'vehicle_or_depot_issue'
  | 'forgot_clock_in'
  | 'other'

export type ManagerClassification =
  | 'authorised'
  | 'unauthorised'
  | 'operational_issue'
  | 'recording_error'
  | 'under_review'

export interface AttendanceScoreBreakdown {
  attendanceRate: number
  punctualityRate: number
  unauthorisedAbsences: number
  missedClockIns: number
  earlyDepartures: number
  evidenceCompliance: number
  score: number
  band: AttendanceScoreBand
  periodDays: number
}

export interface AttendanceBoardRow {
  id: string
  personId: string
  personName: string
  role: 'driver' | 'yard_manager' | 'dispatcher' | 'staff'
  roleLabel: string
  depotName: string
  scheduledStart: string | null
  clockedInAt: string | null
  status: AttendanceLiveStatus
  differenceLabel: string | null
  currentDutyLabel: string | null
  dutyId: string | null
  vehicleRegistration: string | null
  passengersAtRisk: number
  schoolRoute: boolean
  attendanceScore: number
  scoreBand: AttendanceScoreBand
  reportedReason: AbsenceReasonCode | null
  managerClassification: ManagerClassification | null
}

export interface AttendanceDaySummary {
  operationalDate: string
  scheduled: number
  onTime: number
  late: number
  notArrived: number
  approvedLeave: number
  sick: number
  attendanceRatePercent: number
  uncoveredDuties: number
}

export interface LeaveImpact {
  tripsAffected: number
  schoolRoutesAffected: number
  passengersAffected: number
  replacementRequired: boolean
  readinessPercent: number
  readinessBand: 'low' | 'medium' | 'high'
  readinessSummary: string
}

export interface LeaveAuditEvent {
  id: string
  at: string
  actorName: string
  action: string
  detail: string
}

export interface LeaveRequestRecord {
  id: string
  reference: string
  personId: string
  personName: string
  personNumber: string
  role: 'driver' | 'staff'
  depotName: string
  leaveType: LeaveRequestType
  status: LeaveRequestStatus
  startDate: string
  endDate: string
  startTime: string | null
  endTime: string | null
  partialDay: boolean
  reason: string
  attachmentLabel: string | null
  submittedAt: string
  decidedAt: string | null
  decidedBy: string | null
  impact: LeaveImpact
  audit: LeaveAuditEvent[]
  /** Previous window when leave was moved */
  previousWindow: { startDate: string; endDate: string } | null
}

export interface AttendanceHubData {
  summary: AttendanceDaySummary
  board: AttendanceBoardRow[]
  leaveRequests: LeaveRequestRecord[]
  trends: AttendanceTrends
  graceMinutes: number
  lateMarkMinutes: number
  driverReminderMinutes: number
  dispatcherWarningMinutes: number
  operationsEscalationMinutes: number
}

export type AttendanceBoardFilter =
  | 'all'
  | 'on_time'
  | 'late'
  | 'not_arrived'
  | 'approved_leave'
  | 'sick'
  | 'attendance_concern'

export type CalendarDayMark =
  | 'on_time'
  | 'late'
  | 'sick'
  | 'approved_leave'
  | 'unauthorised'
  | 'rest'
  | 'empty'

export interface AttendanceTimelineEvent {
  id: string
  at: string
  label: string
  kind: 'schedule' | 'status' | 'clock' | 'report' | 'manager' | 'system' | 'geofence' | 'vehicle' | 'trip'
}

export interface AttendanceScoreContributor {
  id: string
  date: string
  label: string
  /** Negative or positive points contribution to the rolling score */
  impact: number
  category: string
}

export interface AttendancePersonProfile {
  personId: string
  personName: string
  personNumber: string
  roleLabel: string
  depotName: string
  score: AttendanceScoreBreakdown
  onTimeShiftsPercent: number
  attendanceRatePercent: number
  lateArrivals: number
  unauthorisedAbsences: number
  approvedSickness: number
  earlyDepartures: number
  averageLatenessMinutes: number
  totalMinutesLate: number
  currentAbsence: string | null
  upcomingLeave: LeaveRequestRecord[]
  calendarMonth: { year: number; month: number; days: Array<{ date: string; mark: CalendarDayMark }> }
  recentEvents: AttendanceTimelineEvent[]
  returnToWork: Array<{ id: string; date: string; summary: string; completed: boolean }>
  managerNotes: Array<{ id: string; at: string; author: string; note: string }>
  adjustments: Array<{
    id: string
    at: string
    actor: string
    original: string
    corrected: string
    reason: string
  }>
  scoreContributors: AttendanceScoreContributor[]
  liveStatus: AttendanceLiveStatus | null
}

export interface AttendanceTrends {
  punctualityByDepot: Array<{ depot: string; percent: number }>
  minutesLostToLateness: number
  unauthorisedAbsences: number
  sicknessFrequency: number
  returnToWorkOutstanding: number
  operationalDelaysFromAttendance: number
  standbyOvertimeCostEstimate: string
  strongestTeam: string
  mondayFridayPatternNote: string
  scoreChangesNote: string
}

export interface CoverCandidate {
  personId: string
  personName: string
  availabilityLabel: string
  statusLabel: string
  requirementsMet: boolean
  routeFamiliarity: 'high' | 'medium' | 'low'
  training: string[]
  selectable: boolean
  blockReason?: string
}

export type EscalationStage =
  | 'grace'
  | 'late'
  | 'driver_reminder'
  | 'dispatcher_warning'
  | 'operations_escalation'
