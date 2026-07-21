import { driverBlockedByApprovedLeave } from './engine'
import type { LeaveRequestRecord } from '@/lib/attendance/types'

/** Hard block for dispatch: approved leave only (pending is a warning). */
export function assertDriverAssignableOnDate(input: {
  driverId: string
  driverName?: string
  onDate: string
  leaveRequests: LeaveRequestRecord[]
}): { ok: true } | { ok: false; code: 'approved_leave'; message: string; leave: LeaveRequestRecord } {
  const covering = input.leaveRequests.find(
    (r) =>
      r.personId === input.driverId &&
      (r.status === 'approved' || r.status === 'moved') &&
      r.startDate <= input.onDate &&
      r.endDate >= input.onDate,
  )

  if (covering) {
    const name = input.driverName ?? covering.personName ?? 'This driver'
    return {
      ok: false,
      code: 'approved_leave',
      message: `${name} is on approved annual leave from ${covering.startDate} to ${covering.endDate}.`,
      leave: covering,
    }
  }

  if (
    driverBlockedByApprovedLeave({
      driverId: input.driverId,
      onDate: input.onDate,
      leaveRows: input.leaveRequests.map((r) => ({
        personId: r.personId,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
      })),
    })
  ) {
    const any = input.leaveRequests.find(
      (r) =>
        (r.status === 'approved' || r.status === 'moved') &&
        r.startDate <= input.onDate &&
        r.endDate >= input.onDate,
    )
    if (any) {
      return {
        ok: false,
        code: 'approved_leave',
        message: `${input.driverName ?? any.personName} is on approved leave ${any.startDate} → ${any.endDate}.`,
        leave: any,
      }
    }
  }

  return { ok: true }
}

export function pendingLeaveWarningOnDate(input: {
  driverId: string
  onDate: string
  leaveRequests: LeaveRequestRecord[]
}): LeaveRequestRecord | null {
  return (
    input.leaveRequests.find(
      (r) =>
        r.personId === input.driverId &&
        r.status === 'pending' &&
        r.startDate <= input.onDate &&
        r.endDate >= input.onDate,
    ) ?? null
  )
}
