import type { LeaveAuditEvent, LeaveRequestRecord } from './types'

function nowIso() {
  return new Date().toISOString()
}

function audit(
  actorName: string,
  action: string,
  detail: string,
): LeaveAuditEvent {
  return {
    id: `la-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: nowIso(),
    actorName,
    action,
    detail,
  }
}

/** Approve leave — records decision; does not delete history. */
export function approveLeaveRequest(
  row: LeaveRequestRecord,
  actorName: string,
  note?: string,
): LeaveRequestRecord {
  return {
    ...row,
    status: 'approved',
    decidedAt: nowIso(),
    decidedBy: actorName,
    audit: [
      ...row.audit,
      audit(actorName, 'Approved', note?.trim() || 'Leave approved — roster and payroll notified'),
    ],
  }
}

export function rejectLeaveRequest(
  row: LeaveRequestRecord,
  actorName: string,
  reason: string,
): LeaveRequestRecord {
  return {
    ...row,
    status: 'rejected',
    decidedAt: nowIso(),
    decidedBy: actorName,
    audit: [
      ...row.audit,
      audit(actorName, 'Rejected', reason.trim() || 'Leave rejected'),
    ],
  }
}

/** Cancel approved or pending leave — always audited. */
export function cancelLeaveRequest(
  row: LeaveRequestRecord,
  actorName: string,
  reason: string,
): LeaveRequestRecord {
  return {
    ...row,
    status: 'cancelled',
    decidedAt: nowIso(),
    decidedBy: actorName,
    audit: [
      ...row.audit,
      audit(
        actorName,
        'Cancelled',
        `${reason.trim() || 'Leave cancelled'} · previous window ${row.startDate} → ${row.endDate}`,
      ),
    ],
  }
}

/** Move leave to a new window — previous dates retained on the record and in audit. */
export function moveLeaveRequest(
  row: LeaveRequestRecord,
  actorName: string,
  next: { startDate: string; endDate: string; startTime?: string | null; endTime?: string | null },
  reason: string,
): LeaveRequestRecord {
  const previousWindow = { startDate: row.startDate, endDate: row.endDate }
  return {
    ...row,
    status: row.status === 'rejected' ? 'pending' : row.status === 'cancelled' ? 'pending' : 'moved',
    previousWindow,
    startDate: next.startDate,
    endDate: next.endDate,
    startTime: next.startTime ?? row.startTime,
    endTime: next.endTime ?? row.endTime,
    decidedAt: nowIso(),
    decidedBy: actorName,
    audit: [
      ...row.audit,
      audit(
        actorName,
        'Moved',
        `${previousWindow.startDate} → ${previousWindow.endDate} moved to ${next.startDate} → ${next.endDate}. ${reason.trim() || 'Dates changed'}`,
      ),
    ],
  }
}
