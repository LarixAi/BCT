import type { ExceptionCategory, ExceptionSeverity, OperationalException } from '@/lib/types'

export type ExceptionSmartFilter =
  | 'all'
  | 'critical'
  | 'assigned_to_me'
  | 'my_depot'
  | 'open'
  | 'escalated'
  | 'compliance'
  | 'journey'
  | 'vehicle'
  | 'driver'
  | 'today'
  | 'last_hour'
  | 'sla_breached'
  | 'awaiting_review'
  | 'customer'
  | 'dispatch'
  | 'yard'
  | 'resolved'

export const EXCEPTION_SMART_FILTERS: { id: ExceptionSmartFilter; label: string }[] = [
  { id: 'critical', label: 'Critical' },
  { id: 'assigned_to_me', label: 'Assigned to me' },
  { id: 'my_depot', label: 'My depot' },
  { id: 'open', label: 'Open' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'journey', label: 'Trips' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'driver', label: 'Drivers' },
  { id: 'customer', label: 'Customer' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'yard', label: 'Yard' },
  { id: 'today', label: 'Today' },
  { id: 'last_hour', label: 'Last hour' },
  { id: 'sla_breached', label: 'SLA Breached' },
  { id: 'awaiting_review', label: 'Awaiting Review' },
  { id: 'resolved', label: 'Resolved' },
]

export const EXCEPTION_MODULE_FILTERS: { id: ExceptionCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All modules' },
  { id: 'driver', label: 'Driver' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'journey', label: 'Trips' },
  { id: 'customer', label: 'Customer' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'yard', label: 'Yard' },
]

const OPEN_STATUSES = new Set([
  'new',
  'acknowledged',
  'assigned',
  'investigating',
  'action_in_progress',
  'awaiting_external',
  'monitoring',
  'reopened',
])

export function isOpenException(ex: OperationalException): boolean {
  return OPEN_STATUSES.has(ex.status) && ex.status !== 'resolved' && ex.status !== 'dismissed'
}

export function filterExceptions(
  rows: OperationalException[],
  opts: {
    smart: ExceptionSmartFilter
    module: ExceptionCategory | 'all'
    currentUserName?: string | null
    currentDepot?: string | null
  },
): OperationalException[] {
  const { smart, module, currentUserName, currentDepot } = opts

  return rows.filter((ex) => {
    if (module !== 'all' && ex.category !== module) return false

    switch (smart) {
      case 'all':
        return true
      case 'critical':
        return ex.severity === 'critical' || ex.severity === 'high'
      case 'assigned_to_me':
        return Boolean(currentUserName && ex.owner === currentUserName)
      case 'my_depot':
        if (!currentDepot || currentDepot === 'all') return true
        return ex.depot.toLowerCase().includes(currentDepot.toLowerCase().split(/\s+/)[0] ?? '')
          || currentDepot.toLowerCase().includes(ex.depot.toLowerCase())
      case 'open':
        return isOpenException(ex)
      case 'escalated':
        return Boolean(ex.escalated)
      case 'compliance':
        return ex.category === 'compliance'
      case 'journey':
        return ex.category === 'journey'
      case 'vehicle':
        return ex.category === 'vehicle'
      case 'driver':
        return ex.category === 'driver'
      case 'customer':
        return ex.category === 'customer'
      case 'dispatch':
        return ex.category === 'dispatch'
      case 'yard':
        return ex.category === 'yard'
      case 'today':
        return ex.ageMinutes < 24 * 60
      case 'last_hour':
        return ex.ageMinutes <= 60
      case 'sla_breached':
        return ex.slaMinutesRemaining != null && ex.slaMinutesRemaining < 0
      case 'awaiting_review':
        return ex.status === 'awaiting_external' || ex.typeCode === 'incident_awaiting_review'
      case 'resolved':
        return ex.status === 'resolved' || ex.status === 'dismissed'
      default:
        return true
    }
  })
}

export function countBySeverity(rows: OperationalException[]): Record<ExceptionSeverity, number> {
  return {
    critical: rows.filter((e) => e.severity === 'critical').length,
    high: rows.filter((e) => e.severity === 'high').length,
    medium: rows.filter((e) => e.severity === 'medium').length,
    low: rows.filter((e) => e.severity === 'low').length,
  }
}
