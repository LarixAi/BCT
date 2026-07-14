import type { DefectSeverity } from '@/lib/vehicles/types'
import type { DefectSlaSettings } from './types'

export const DEFAULT_DEFECT_SLA: DefectSlaSettings = {
  triageMinutes: {
    dangerous: 0,
    major: 30,
    minor: 480,
    advisory: 1440,
  },
  repairMinutes: {
    dangerous: 0,
    major: 240,
    minor: 1440,
    advisory: 4320,
  },
  notifyRoles: ['operations_manager', 'maintenance_manager', 'yard_manager'],
  blockDispatchOnCritical: true,
  blockDispatchOnPendingAssessment: true,
  recurringComponentThreshold: 2,
  recurringWindowDays: 60,
}

const MS_MIN = 60 * 1000

export function triageDueAt(reportedAt: string, severity: DefectSeverity, settings = DEFAULT_DEFECT_SLA): string {
  const base = new Date(reportedAt)
  const mins = settings.triageMinutes[severity]
  if (mins === 0) return base.toISOString()
  base.setTime(base.getTime() + mins * MS_MIN)
  return base.toISOString()
}

export function repairDueAt(reportedAt: string, severity: DefectSeverity, settings = DEFAULT_DEFECT_SLA): string | null {
  const base = new Date(reportedAt)
  const mins = settings.repairMinutes[severity]
  if (mins === 0) return base.toISOString()
  base.setTime(base.getTime() + mins * MS_MIN)
  return base.toISOString()
}

export function slaMinutesRemaining(deadline: string | null): number | null {
  if (!deadline) return null
  return Math.round((new Date(deadline).getTime() - Date.now()) / MS_MIN)
}

export function isSlaBreached(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline).getTime() < Date.now()
}

export function formatSlaRemaining(minutes: number | null): string {
  if (minutes == null) return '—'
  if (minutes < 0) return `${Math.abs(minutes)} min overdue`
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr`
  return `${Math.round(minutes / 1440)} d`
}
