import { describe, expect, it } from 'vitest'
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  moveLeaveRequest,
  rejectLeaveRequest,
} from './leave-workflow'
import type { LeaveRequestRecord } from './types'

const base: LeaveRequestRecord = {
  id: 'leave-t',
  reference: 'LR-T',
  personId: 'p1',
  personName: 'Test Driver',
  personNumber: 'D-1',
  role: 'driver',
  depotName: 'Streatham',
  leaveType: 'annual_leave',
  status: 'pending',
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  startTime: null,
  endTime: null,
  partialDay: false,
  reason: 'Holiday',
  attachmentLabel: null,
  submittedAt: '2026-07-01T10:00:00.000Z',
  decidedAt: null,
  decidedBy: null,
  impact: {
    tripsAffected: 2,
    schoolRoutesAffected: 1,
    passengersAffected: 10,
    replacementRequired: true,
    readinessPercent: 80,
    readinessBand: 'medium',
    readinessSummary: 'Cover needed',
  },
  audit: [],
  previousWindow: null,
}

describe('leave-workflow', () => {
  it('approves with audit', () => {
    const next = approveLeaveRequest(base, 'Ops Manager', 'Cover ready')
    expect(next.status).toBe('approved')
    expect(next.decidedBy).toBe('Ops Manager')
    expect(next.audit.at(-1)?.action).toBe('Approved')
  })

  it('rejects with reason in audit', () => {
    const next = rejectLeaveRequest(base, 'Ops Manager', 'Insufficient notice')
    expect(next.status).toBe('rejected')
    expect(next.audit.at(-1)?.detail).toContain('Insufficient notice')
  })

  it('cancels and records previous window', () => {
    const approved = approveLeaveRequest(base, 'Ops Manager')
    const next = cancelLeaveRequest(approved, 'Ops Manager', 'Driver returned early')
    expect(next.status).toBe('cancelled')
    expect(next.audit.at(-1)?.detail).toContain('2026-08-01')
  })

  it('moves leave and keeps previous window', () => {
    const approved = approveLeaveRequest(base, 'Ops Manager')
    const next = moveLeaveRequest(
      approved,
      'Ops Manager',
      { startDate: '2026-09-01', endDate: '2026-09-05' },
      'School term clash',
    )
    expect(next.status).toBe('moved')
    expect(next.startDate).toBe('2026-09-01')
    expect(next.previousWindow).toEqual({ startDate: '2026-08-01', endDate: '2026-08-05' })
    expect(next.audit.at(-1)?.action).toBe('Moved')
  })
})
