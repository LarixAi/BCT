import type { MaintenanceSummaryCard } from './types'

export const MAINTENANCE_TABS = [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'planner' as const, label: 'Planner' },
  { id: 'work-orders' as const, label: 'Work Orders' },
  { id: 'technician' as const, label: 'Technician' },
  { id: 'pmi' as const, label: 'PMI & Safety' },
  { id: 'service' as const, label: 'Service & Statutory' },
  { id: 'vor' as const, label: 'VOR Board' },
  { id: 'parts' as const, label: 'Parts & Suppliers' },
  { id: 'costs' as const, label: 'Costs' },
  { id: 'compliance' as const, label: 'Compliance' },
]

/** Legacy tab ids → current tab */
export const MAINTENANCE_TAB_ALIASES: Record<string, string> = {
  schedule: 'planner',
  calendar: 'planner',
  /** Legacy URL — still resolves to defects register (not in primary strip) */
  downtime: 'costs',
  suppliers: 'parts',
  work_orders: 'work-orders',
}

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  no_action: 'No action',
  scheduled: 'Scheduled',
  in_workshop: 'In workshop',
  awaiting_parts: 'Awaiting parts',
  awaiting_inspection: 'Awaiting inspection',
  ready_for_release: 'Ready for release',
}

export const WORK_ORDER_TYPE_LABELS: Record<string, string> = {
  scheduled_service: 'Scheduled service',
  routine_service: 'Routine service',
  repair: 'Defect repair',
  pmi: 'PMI / safety inspection',
  mot_prep: 'MOT preparation',
  tyre: 'Tyre replacement',
  bodywork: 'Bodywork repair',
  tacho: 'Tachograph work',
  external: 'External workshop',
}

export const PRIORITY_GROUP_LABELS = {
  critical: 'Critical',
  urgent: 'Urgent',
  attention: 'Attention required',
} as const

/** Primary Overview strip — brief Phase 1 cards */
export const ATTENTION_CARDS: MaintenanceSummaryCard[] = [
  { id: 'dueToday', group: 'attention', label: 'Due today', filterKey: 'due_today' },
  { id: 'dueWithin14Days', group: 'attention', label: 'Due within 14 days', filterKey: 'due_14' },
  { id: 'overdue', group: 'attention', label: 'Overdue', filterKey: 'overdue_service', tone: 'critical' },
  { id: 'vor', group: 'attention', label: 'Vehicles VOR', filterKey: 'vor', tone: 'critical' },
  { id: 'safetyCriticalDefects', group: 'attention', label: 'Open safety-critical defects', filterKey: 'safety_critical', tone: 'critical' },
  { id: 'inWorkshop', group: 'attention', label: 'In workshop', filterKey: 'in_maintenance' },
  { id: 'awaitingParts', group: 'attention', label: 'Awaiting parts', filterKey: 'awaiting_parts' },
  { id: 'readyForRelease', group: 'attention', label: 'Ready for release', filterKey: 'wo_ready_release' },
]

export const SUMMARY_CARD_GROUPS: { title: string; cards: MaintenanceSummaryCard[] }[] = [
  {
    title: 'Fleet availability',
    cards: [
      { id: 'total', group: 'fleetAvailability', label: 'Total fleet', filterKey: 'all' },
      { id: 'available', group: 'fleetAvailability', label: 'Available', filterKey: 'available' },
      { id: 'availableWithAdvisory', group: 'fleetAvailability', label: 'Available with advisory', filterKey: 'advisory' },
      { id: 'inMaintenance', group: 'fleetAvailability', label: 'In maintenance', filterKey: 'in_maintenance' },
      { id: 'vor', group: 'fleetAvailability', label: 'VOR', filterKey: 'vor' },
      { id: 'dueSoonUsable', group: 'fleetAvailability', label: 'Due soon (still usable)', filterKey: 'due_14' },
    ],
  },
]
