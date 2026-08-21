import type { AttendanceHubData, AttendanceTrends } from '@/lib/attendance/types'

export function emptyAttendanceTrends(): AttendanceTrends {
  return {
    punctualityByDepot: [],
    minutesLostToLateness: 0,
    unauthorisedAbsences: 0,
    sicknessFrequency: 0,
    returnToWorkOutstanding: 0,
    operationalDelaysFromAttendance: 0,
    standbyOvertimeCostEstimate: '£0',
    strongestTeam: '—',
    mondayFridayPatternNote: '',
    scoreChangesNote: '',
  }
}

/** Fail-closed attendance hub when Command is unavailable — never demo fixtures. */
export function emptyAttendanceHub(operationalDate = new Date().toISOString().slice(0, 10)): AttendanceHubData {
  return {
    summary: {
      operationalDate,
      scheduled: 0,
      onTime: 0,
      late: 0,
      notArrived: 0,
      approvedLeave: 0,
      sick: 0,
      attendanceRatePercent: 100,
      uncoveredDuties: 0,
    },
    board: [],
    leaveRequests: [],
    trends: emptyAttendanceTrends(),
    graceMinutes: 5,
    lateMarkMinutes: 6,
    driverReminderMinutes: 10,
    dispatcherWarningMinutes: 15,
    operationsEscalationMinutes: 20,
  }
}
