import type { MaintenanceSummaryCard } from './types'

export const MAINTENANCE_TABS = [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'work-orders' as const, label: 'Work orders' },
  { id: 'schedule' as const, label: 'Service schedule' },
  { id: 'defects' as const, label: 'Defects' },
  { id: 'calendar' as const, label: 'Calendar' },
  { id: 'downtime' as const, label: 'Downtime' },
  { id: 'suppliers' as const, label: 'Suppliers & parts' },
  { id: 'costs' as const, label: 'Costs & reports' },
]

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
  pmi: 'Preventative maintenance',
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

export const SUMMARY_CARD_GROUPS: { title: string; cards: MaintenanceSummaryCard[] }[] = [
  {
    title: 'Fleet availability',
    cards: [
      { id: 'total', group: 'fleetAvailability', label: 'Total fleet', filterKey: 'all' },
      { id: 'available', group: 'fleetAvailability', label: 'Available', filterKey: 'available' },
      { id: 'inMaintenance', group: 'fleetAvailability', label: 'In maintenance', filterKey: 'in_maintenance' },
      { id: 'vor', group: 'fleetAvailability', label: 'VOR', filterKey: 'vor' },
      { id: 'awaitingInspection', group: 'fleetAvailability', label: 'Awaiting inspection', filterKey: 'awaiting_inspection' },
      { id: 'awaitingParts', group: 'fleetAvailability', label: 'Awaiting parts', filterKey: 'awaiting_parts' },
    ],
  },
  {
    title: 'Maintenance risk',
    cards: [
      { id: 'overdueServices', group: 'maintenanceRisk', label: 'Overdue services', filterKey: 'overdue_service' },
      { id: 'dueWithin7Days', group: 'maintenanceRisk', label: 'Due within 7 days', filterKey: 'due_soon' },
      { id: 'safetyCriticalDefects', group: 'maintenanceRisk', label: 'Safety-critical defects', filterKey: 'safety_critical' },
      { id: 'repeatDefectVehicles', group: 'maintenanceRisk', label: 'Repeat defects', filterKey: 'repeat_defect' },
      { id: 'motApproaching', group: 'maintenanceRisk', label: 'MOT approaching', filterKey: 'mot_approaching' },
      { id: 'tachoApproaching', group: 'maintenanceRisk', label: 'Tacho calibration due', filterKey: 'tacho_approaching' },
    ],
  },
  {
    title: 'Workshop position',
    cards: [
      { id: 'notStarted', group: 'workshopPosition', label: 'Not started', filterKey: 'wo_not_started' },
      { id: 'inProgress', group: 'workshopPosition', label: 'In progress', filterKey: 'wo_in_progress' },
      { id: 'awaitingParts', group: 'workshopPosition', label: 'Awaiting parts', filterKey: 'wo_awaiting_parts' },
      { id: 'awaitingApproval', group: 'workshopPosition', label: 'Awaiting approval', filterKey: 'wo_awaiting_approval' },
      { id: 'readyForInspection', group: 'workshopPosition', label: 'Ready for inspection', filterKey: 'wo_ready_inspection' },
      { id: 'readyForRelease', group: 'workshopPosition', label: 'Ready to return', filterKey: 'wo_ready_release' },
    ],
  },
]
