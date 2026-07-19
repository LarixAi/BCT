import type { ServiceScheduleItem } from './types'

export type PlannerDueWindow = 'all' | 'overdue' | '7d' | '14d'

export interface PlannerFilters {
  depot: string
  eventType: string
  status: 'all' | 'overdue' | 'due_soon' | 'scheduled' | 'ok'
  dueWindow: PlannerDueWindow
}

const DAY_MS = 24 * 60 * 60 * 1000

export function filterPlannerRows(schedule: ServiceScheduleItem[], filters: PlannerFilters): ServiceScheduleItem[] {
  let list = schedule
  if (filters.depot !== 'all') list = list.filter((s) => s.depot === filters.depot)
  if (filters.eventType !== 'all') {
    const q = filters.eventType.toLowerCase()
    list = list.filter((s) => s.serviceType.toLowerCase().includes(q))
  }
  if (filters.status !== 'all') list = list.filter((s) => s.status === filters.status)
  if (filters.dueWindow === 'overdue') list = list.filter((s) => s.status === 'overdue')
  else if (filters.dueWindow === '7d' || filters.dueWindow === '14d') {
    const days = filters.dueWindow === '7d' ? 7 : 14
    const now = Date.now()
    const horizon = now + days * DAY_MS
    list = list.filter((s) => {
      if (!s.dueDate) return false
      const t = new Date(s.dueDate).getTime()
      return t >= now - DAY_MS && t <= horizon
    })
  }
  return list
}

export function uniquePlannerDepots(schedule: ServiceScheduleItem[]): string[] {
  return [...new Set(schedule.map((s) => s.depot).filter(Boolean))].sort()
}

export function uniquePlannerEventTypes(schedule: ServiceScheduleItem[]): string[] {
  const types = new Set<string>()
  for (const s of schedule) {
    const lower = s.serviceType.toLowerCase()
    if (lower.includes('pmi')) types.add('pmi')
    else if (lower.includes('mot') || lower.includes('annual')) types.add('mot')
    else if (lower.includes('brake') || lower.includes('repair') || lower.includes('defect')) types.add('repair')
    else types.add('service')
  }
  return [...types].sort()
}

export function mapEventTypeToWorkOrderType(serviceType: string): string {
  const lower = serviceType.toLowerCase()
  if (lower.includes('pmi')) return 'pmi'
  if (lower.includes('mot')) return 'mot_prep'
  if (lower.includes('tyre')) return 'tyre'
  if (lower.includes('tacho')) return 'tacho'
  if (lower.includes('body')) return 'bodywork'
  if (lower.includes('repair') || lower.includes('brake') || lower.includes('defect')) return 'repair'
  return 'scheduled_service'
}
