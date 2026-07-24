import type { LeaveRequestRecord } from '@/lib/attendance/types'
import {
  buildLeaveRequestWarnings,
  countWorkingDaysInRange,
  leaveMinutesForWindow,
  leaveTypeDeductsBalance,
  minutesToDays,
} from '@/lib/holiday/engine'
import type { DriverHolidayBundle } from '@/lib/holiday/types'

export const LEAVE_APPROVAL_STEPS = [
  { id: 'review', label: 'Request' },
  { id: 'balance', label: 'Balance' },
  { id: 'impact', label: 'Impact' },
  { id: 'decision', label: 'Decision' },
  { id: 'confirm', label: 'Done' },
] as const

export type LeaveApprovalStepId = (typeof LEAVE_APPROVAL_STEPS)[number]['id']

export type LeaveApprovalDecision = 'approve' | 'decline' | 'suggest'

export function formatLeaveWindow(row: LeaveRequestRecord) {
  if (row.startDate === row.endDate) {
    return `${row.startDate}${row.startTime ? ` ${row.startTime}` : ''}${row.endTime ? `–${row.endTime}` : ''}`
  }
  return `${row.startDate} → ${row.endDate}`
}

export function leaveRequestWorkingDays(row: LeaveRequestRecord, workingWeekdays?: number[]) {
  return countWorkingDaysInRange(row.startDate, row.endDate, workingWeekdays)
}

export function buildBalanceContext(
  row: LeaveRequestRecord,
  holiday: DriverHolidayBundle | null | undefined,
) {
  if (!holiday) {
    return {
      requestDays: leaveRequestWorkingDays(row),
      requestMinutes: 0,
      deductsBalance: leaveTypeDeductsBalance(row.leaveType),
      warnings: [] as ReturnType<typeof buildLeaveRequestWarnings>,
      remainingDays: null as number | null,
      projectedDays: null as number | null,
    }
  }

  const standardDayMinutes = holiday.standardDayMinutes || 480
  const workingWeekdays = holiday.profile.workingWeekdays ?? [1, 2, 3, 4, 5]
  const requestMinutes = leaveMinutesForWindow({
    startDate: row.startDate,
    endDate: row.endDate,
    partialDay: row.partialDay,
    standardDayMinutes,
    workingWeekdays,
  })
  const remainingMinutes = holiday.minutes.remaining
  const warnings = buildLeaveRequestWarnings({
    leaveType: row.leaveType,
    requestMinutes,
    remainingMinutes,
    allowNegative: holiday.profile.allowNegativeBalance,
    maximumNegativeMinutes: holiday.profile.maximumNegativeMinutes,
    overlappingPending: false,
    overlappingApproved: false,
    assignedTripsCount: row.impact.tripsAffected,
  })

  return {
    requestDays: leaveRequestWorkingDays(row, workingWeekdays),
    requestMinutes,
    deductsBalance: leaveTypeDeductsBalance(row.leaveType),
    warnings,
    remainingDays: minutesToDays(remainingMinutes, standardDayMinutes),
    projectedDays: minutesToDays(remainingMinutes - requestMinutes, standardDayMinutes),
  }
}
