import { describe, expect, it } from 'vitest'
import { computeAttendanceScore } from './score'

describe('computeAttendanceScore', () => {
  it('scores strong attendance in the good/excellent band', () => {
    const result = computeAttendanceScore({
      shiftsScheduled: 50,
      shiftsAttended: 50,
      shiftsOnTime: 48,
      unauthorisedAbsences: 0,
      missedClockIns: 0,
      earlyDepartures: 0,
      evidenceCompliancePercent: 100,
    })
    expect(result.score).toBeGreaterThanOrEqual(85)
    expect(['excellent', 'good']).toContain(result.band)
  })

  it('penalises unauthorised absence more than approved leave gaps', () => {
    const clean = computeAttendanceScore({
      shiftsScheduled: 40,
      shiftsAttended: 40,
      shiftsOnTime: 40,
      unauthorisedAbsences: 0,
      missedClockIns: 0,
      earlyDepartures: 0,
      evidenceCompliancePercent: 100,
    })
    const withUnauth = computeAttendanceScore({
      shiftsScheduled: 40,
      shiftsAttended: 38,
      shiftsOnTime: 38,
      unauthorisedAbsences: 2,
      missedClockIns: 0,
      earlyDepartures: 0,
      evidenceCompliancePercent: 100,
    })
    expect(withUnauth.score).toBeLessThan(clean.score)
  })
})
