import type { OperationalException } from '@/lib/types'
import { isOpenException } from './exception-filters'

export type ExceptionKpis = {
  criticalOpen: number
  averageResolutionMinutes: number | null
  slaBreached: number
  awaitingAssignment: number
  resolvedToday: number
  escalated: number
}

export function buildExceptionKpis(rows: OperationalException[]): ExceptionKpis {
  const open = rows.filter(isOpenException)
  const resolved = rows.filter((e) => e.status === 'resolved' || e.status === 'dismissed')

  const resolutionSamples = resolved
    .map((e) => e.ageMinutes)
    .filter((n) => Number.isFinite(n) && n >= 0)

  const averageResolutionMinutes =
    resolutionSamples.length === 0
      ? null
      : Math.round(resolutionSamples.reduce((a, b) => a + b, 0) / resolutionSamples.length)

  return {
    criticalOpen: open.filter((e) => e.severity === 'critical').length,
    averageResolutionMinutes,
    slaBreached: open.filter((e) => e.slaMinutesRemaining != null && e.slaMinutesRemaining < 0).length,
    awaitingAssignment: open.filter((e) => !e.owner).length,
    resolvedToday: resolved.filter((e) => e.ageMinutes < 24 * 60).length,
    escalated: open.filter((e) => e.escalated).length,
  }
}
