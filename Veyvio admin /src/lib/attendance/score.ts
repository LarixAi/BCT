import { scoreBand } from './constants'
import type { AttendanceScoreBreakdown } from './types'

export interface AttendanceScoreInput {
  shiftsScheduled: number
  shiftsAttended: number
  shiftsOnTime: number
  unauthorisedAbsences: number
  missedClockIns: number
  earlyDepartures: number
  /** 0–100 share of late/absent events with reason + evidence where required */
  evidenceCompliancePercent: number
  periodDays?: number
}

/**
 * Weighted rolling attendance score.
 * Approved leave / training / jury / bereavement are excluded from scheduled denominators upstream.
 */
export function computeAttendanceScore(input: AttendanceScoreInput): AttendanceScoreBreakdown {
  const scheduled = Math.max(0, input.shiftsScheduled)
  const attended = Math.min(scheduled, Math.max(0, input.shiftsAttended))
  const onTime = Math.min(attended, Math.max(0, input.shiftsOnTime))

  const attendanceRate = scheduled === 0 ? 100 : (attended / scheduled) * 100
  const punctualityRate = attended === 0 ? 100 : (onTime / attended) * 100

  const unauthPenalty = Math.min(100, input.unauthorisedAbsences * 25)
  const missedPenalty = Math.min(100, input.missedClockIns * 10)
  const earlyPenalty = Math.min(100, input.earlyDepartures * 8)
  const evidence = Math.max(0, Math.min(100, input.evidenceCompliancePercent))

  const score = Math.round(
    attendanceRate * 0.4 +
      punctualityRate * 0.3 +
      (100 - unauthPenalty) * 0.15 +
      (100 - missedPenalty) * 0.05 +
      (100 - earlyPenalty) * 0.05 +
      evidence * 0.05,
  )

  const clamped = Math.max(0, Math.min(100, score))
  return {
    attendanceRate: Math.round(attendanceRate),
    punctualityRate: Math.round(punctualityRate),
    unauthorisedAbsences: input.unauthorisedAbsences,
    missedClockIns: input.missedClockIns,
    earlyDepartures: input.earlyDepartures,
    evidenceCompliance: Math.round(evidence),
    score: clamped,
    band: scoreBand(clamped),
    periodDays: input.periodDays ?? 90,
  }
}
