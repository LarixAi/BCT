import type { DutyRecord } from '@/lib/api/types'
import { runDriverName } from '@/lib/ops/runs-trips-schedule'
import type { AttendanceBoardRow, AttendanceLiveStatus, LeaveRequestRecord } from './types'

export type ScheduleAttendanceFilter =
  | 'all'
  | 'on_time'
  | 'late'
  | 'not_arrived'
  | 'approved_leave'
  | 'sick'
  | 'cover_required'
  | 'attendance_concern'

export type DutyReadiness =
  | 'ready'
  | 'preparing'
  | 'waiting_for_driver'
  | 'waiting_for_vehicle'
  | 'at_risk'
  | 'cover_required'
  | 'delayed'
  | 'departed'
  | 'completed'
  | 'cancelled'

export function findAttendanceForDuty(
  duty: DutyRecord,
  board: AttendanceBoardRow[],
): AttendanceBoardRow | null {
  const name = (runDriverName(duty) ?? '').trim().toLowerCase()
  if (!name || name === 'unassigned') return null
  return board.find((r) => r.personName.trim().toLowerCase() === name) ?? null
}

export function findLeaveForPerson(
  personName: string | null | undefined,
  leave: LeaveRequestRecord[],
  onDate: string,
): LeaveRequestRecord | null {
  const name = (personName ?? '').trim().toLowerCase()
  if (!name) return null
  return (
    leave.find(
      (r) =>
        r.personName.trim().toLowerCase() === name &&
        (r.status === 'approved' || r.status === 'moved' || r.status === 'pending') &&
        r.startDate <= onDate &&
        r.endDate >= onDate,
    ) ?? null
  )
}

export function dutyMatchesAttendanceFilter(
  duty: DutyRecord,
  board: AttendanceBoardRow[],
  filter: ScheduleAttendanceFilter,
): boolean {
  if (filter === 'all') return true
  const row = findAttendanceForDuty(duty, board)
  if (filter === 'cover_required') {
    return (
      !duty.driver ||
      row?.status === 'not_arrived' ||
      row?.status === 'approved_leave' ||
      row?.status === 'sick' ||
      row?.status === 'unauthorised_absence'
    )
  }
  if (filter === 'attendance_concern') {
    return Boolean(row && row.attendanceScore < 85)
  }
  return row?.status === filter
}

export function resolveDutyReadiness(
  duty: DutyRecord,
  attendance: AttendanceBoardRow | null,
): DutyReadiness {
  if (duty.status === 'cancelled') return 'cancelled'
  if (duty.status === 'completed') return 'completed'
  if (duty.status === 'in_progress') return 'departed'
  if (!duty.driver || attendance?.status === 'approved_leave' || attendance?.status === 'sick') {
    return 'cover_required'
  }
  if (attendance?.status === 'not_arrived' || attendance?.status === 'unauthorised_absence') {
    return attendance.schoolRoute || attendance.passengersAtRisk > 0 ? 'at_risk' : 'waiting_for_driver'
  }
  if (attendance?.status === 'late') {
    return attendance.schoolRoute || attendance.passengersAtRisk > 0 ? 'at_risk' : 'preparing'
  }
  if (duty.vehicle?.status === 'off_road' || !duty.vehicle) return 'waiting_for_vehicle'
  if (attendance?.status === 'on_time' || attendance?.status === 'cover_assigned') return 'ready'
  return 'preparing'
}

export const DUTY_READINESS_LABEL: Record<DutyReadiness, string> = {
  ready: 'Ready',
  preparing: 'Preparing',
  waiting_for_driver: 'Waiting for driver',
  waiting_for_vehicle: 'Waiting for vehicle',
  at_risk: 'At risk',
  cover_required: 'Cover required',
  delayed: 'Delayed',
  departed: 'Departed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function weekCellLabel(
  status: AttendanceLiveStatus | null,
  leaveStatus: LeaveRequestRecord['status'] | null,
  isFuture: boolean,
): string {
  if (leaveStatus === 'pending') return 'Pending leave'
  if (leaveStatus === 'approved' || leaveStatus === 'moved' || status === 'approved_leave') {
    return 'Approved leave'
  }
  if (status === 'sick') return 'Sick'
  if (status === 'training') return 'Training'
  if (isFuture) {
    if (!status || status === 'not_scheduled') return 'Scheduled'
    return 'Scheduled'
  }
  if (!status) return 'Scheduled'
  if (status === 'on_time') return 'On time'
  if (status === 'late') return 'Late'
  if (status === 'not_arrived') return 'Absent'
  if (status === 'unauthorised_absence') return 'Absent'
  if (status === 'cover_assigned') return 'Cover'
  return 'Scheduled'
}
