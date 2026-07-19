import type { ReportCategoryId, ReportDefinition } from './types'

export const REPORT_CATEGORIES: {
  id: ReportCategoryId
  label: string
  description: string
}[] = [
  { id: 'operations', label: 'Operations', description: 'Daily position, dispatch and exceptions' },
  { id: 'trips', label: 'Trips & punctuality', description: 'On-time, cancellations and no-shows' },
  { id: 'drivers', label: 'Drivers', description: 'Readiness, working time and compliance' },
  { id: 'vehicles', label: 'Vehicles', description: 'Availability, utilisation and condition' },
  { id: 'yard', label: 'Yard', description: 'Movements, turnaround and equipment' },
  { id: 'maintenance', label: 'Maintenance', description: 'Work orders, PMI and downtime' },
  { id: 'safety', label: 'Safety & compliance', description: 'Checks, defects, incidents and expiry' },
  { id: 'passengers', label: 'Passengers', description: 'Journeys, handovers and service reliability' },
  { id: 'customers', label: 'Customers & contracts', description: 'Contract KPIs and SLA' },
  { id: 'commercial', label: 'Commercial', description: 'Revenue, cost and invoice support' },
  { id: 'communications', label: 'Communications', description: 'Messages, announcements and alerts' },
  { id: 'audit', label: 'Audit', description: 'Changes, access and system activity' },
  { id: 'custom', label: 'Custom reports', description: 'Saved views and report builder' },
]

/** Initial twelve management reports — all wired; gaps marked inside each page. */
export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'daily-operations',
    title: 'Daily operations summary',
    description: 'Planned runs, safety blockers, fleet position and exceptions for the period.',
    category: 'operations',
    href: '/reports/daily-operations',
    availability: 'live',
    actionHref: '/overview',
  },
  {
    id: 'exceptions',
    title: 'Unresolved exceptions',
    description: 'Open operational exceptions with severity and owners.',
    category: 'operations',
    href: '/reports/exceptions',
    availability: 'partial',
    actionHref: '/exceptions',
  },
  {
    id: 'on-time',
    title: 'On-time performance',
    description: 'Pickup and drop-off variance with contract tolerances.',
    category: 'trips',
    href: '/reports/on-time',
    availability: 'partial',
  },
  {
    id: 'trip-completion',
    title: 'Trip completion',
    description: 'Completed, cancelled and incomplete passenger outcomes.',
    category: 'trips',
    href: '/reports/trip-completion',
    availability: 'partial',
  },
  {
    id: 'driver-compliance',
    title: 'Driver readiness & compliance',
    description: 'Documents, training and blocks that prevent duty.',
    category: 'drivers',
    href: '/reports/driver-compliance',
    availability: 'live',
    actionHref: '/drivers',
  },
  {
    id: 'working-time',
    title: 'Driver working time',
    description: 'Weekly hours, breaks and breach risk from duty sign-on.',
    category: 'drivers',
    href: '/reports/working-time',
    availability: 'partial',
  },
  {
    id: 'fleet-availability',
    title: 'Vehicle availability',
    description: 'Available, assigned, VOR and maintenance counts.',
    category: 'vehicles',
    href: '/reports/fleet-availability',
    availability: 'live',
    actionHref: '/vehicles',
  },
  {
    id: 'checks-defects',
    title: 'Vehicle check & defect compliance',
    description: 'Walkarounds due, failed checks and open defects.',
    category: 'safety',
    href: '/reports/checks-defects',
    availability: 'live',
    actionHref: '/defects',
  },
  {
    id: 'vor-downtime',
    title: 'VOR & downtime',
    description: 'Vehicles off road and downtime by cause.',
    category: 'vehicles',
    href: '/reports/vor-downtime',
    availability: 'live',
    actionHref: '/vehicles/vor',
  },
  {
    id: 'maintenance-due',
    title: 'Maintenance due & overdue',
    description: 'PMI, planned work and overdue inspections.',
    category: 'maintenance',
    href: '/reports/maintenance-due',
    availability: 'live',
    actionHref: '/maintenance',
  },
  {
    id: 'incidents',
    title: 'Incident & safeguarding summary',
    description: 'Open investigations and restricted safeguarding cases.',
    category: 'safety',
    href: '/reports/incidents',
    availability: 'live',
    actionHref: '/incidents',
  },
  {
    id: 'contract-performance',
    title: 'Contract service performance',
    description: 'Delivered journeys, punctuality and SLA by contract.',
    category: 'customers',
    href: '/reports/contract-performance',
    availability: 'partial',
  },
  {
    id: 'yard-operations',
    title: 'Yard operations & turnaround',
    description: 'On-site position, movements, tasks and release blockers.',
    category: 'yard',
    href: '/reports/yard-operations',
    availability: 'live',
    actionHref: '/yard',
  },
  {
    id: 'communications',
    title: 'Communications effectiveness',
    description: 'Messages, announcements and notification follow-through.',
    category: 'communications',
    href: '/reports/communications',
    availability: 'partial',
    actionHref: '/messages',
  },
  {
    id: 'audit-activity',
    title: 'Audit activity',
    description: 'Record changes and privileged actions for the period.',
    category: 'audit',
    href: '/reports/audit-activity',
    availability: 'live',
    actionHref: '/audit',
  },
]

export const INITIAL_KEY_REPORT_IDS = [
  'daily-operations',
  'yard-operations',
  'driver-compliance',
  'fleet-availability',
] as const

export const SAVED_REPORT_STUBS = [
  { id: 'saved-send', title: 'SEND contract monthly', href: '/reports/contract-performance' },
  { id: 'saved-depot', title: 'Depot weekly performance', href: '/reports/daily-operations' },
  { id: 'saved-vor', title: 'Vehicle downtime by cause', href: '/reports/vor-downtime' },
  { id: 'saved-yard', title: 'Yard turnaround weekly', href: '/reports/yard-operations' },
]

export const SCHEDULED_REPORT_STUBS = [
  { id: 'sched-daily', title: 'Daily operations', cadence: 'Every day at 19:00', href: '/reports/daily-operations' },
  { id: 'sched-compliance', title: 'Compliance expiry', cadence: 'Every Monday at 08:00', href: '/reports/driver-compliance' },
  { id: 'sched-customer', title: 'Customer SLA', cadence: 'First day of each month', href: '/reports/contract-performance' },
  { id: 'sched-comms', title: 'Unread messages digest', cadence: 'Weekdays at 08:30', href: '/reports/communications' },
]

export function reportsInCategory(category: ReportCategoryId | 'all') {
  if (category === 'all') return REPORT_DEFINITIONS
  return REPORT_DEFINITIONS.filter((r) => r.category === category)
}
