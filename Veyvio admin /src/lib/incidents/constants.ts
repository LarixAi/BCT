import type { IncidentsSummary, IncidentsTab } from './types'

export const INCIDENTS_TABS: { id: IncidentsTab; label: string }[] = [
  { id: 'active', label: 'Active incidents' },
  { id: 'all', label: 'All incidents' },
  { id: 'regulatory', label: 'Regulatory assessments' },
  { id: 'actions', label: 'Corrective actions' },
  { id: 'analytics', label: 'Analytics' },
]

export const INCIDENTS_SUMMARY_CARDS: {
  id: keyof IncidentsSummary
  label: string
  filterKey: string
  subKey?: keyof IncidentsSummary
}[] = [
  { id: 'openCritical', label: 'Open critical', filterKey: 'critical' },
  { id: 'awaitingTriage', label: 'Awaiting triage', filterKey: 'awaiting_triage' },
  { id: 'overdueActions', label: 'Overdue actions', filterKey: 'overdue_actions' },
  { id: 'externalAssessmentRequired', label: 'External assessment', filterKey: 'external' },
  { id: 'openInvestigations', label: 'Open investigations', filterKey: 'investigating' },
  { id: 'incidentsThisMonth', label: 'This month', filterKey: 'this_month', subKey: 'previousMonthCount' },
]

export const SAVED_VIEWS = [
  { id: 'critical', label: 'Critical & high' },
  { id: 'awaiting_triage', label: 'Awaiting triage' },
  { id: 'safeguarding', label: 'Safeguarding' },
  { id: 'collisions', label: 'Vehicle collisions' },
  { id: 'passenger_injury', label: 'Passenger injuries' },
  { id: 'near_miss', label: 'Near misses' },
  { id: 'overdue', label: 'Overdue investigations' },
  { id: 'data_breach', label: 'Data assessments' },
] as const

export const SEVERITY_DISPLAY: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  near_miss: 'Near miss',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  awaiting_triage: 'Awaiting triage',
  immediate_response: 'Immediate response',
  contained: 'Contained',
  under_investigation: 'Under investigation',
  awaiting_evidence: 'Awaiting evidence',
  awaiting_external: 'Awaiting external',
  corrective_actions_open: 'Corrective actions open',
  pending_final_review: 'Pending final review',
  closed: 'Closed',
  reopened: 'Reopened',
  cancelled_duplicate: 'Cancelled duplicate',
}

export const CATEGORY_LABELS: Record<string, string> = {
  road_collision: 'Road collision',
  passenger_injury: 'Passenger injury',
  passenger_illness: 'Passenger illness',
  passenger_fall: 'Passenger fall',
  passenger_missing: 'Passenger missing',
  passenger_left_on_vehicle: 'Passenger left on vehicle',
  safeguarding: 'Safeguarding',
  vehicle_damage: 'Vehicle damage',
  vehicle_fire: 'Vehicle fire',
  vehicle_breakdown: 'Vehicle breakdown',
  equipment_failure: 'Equipment failure',
  wheelchair_restraint_failure: 'Wheelchair restraint failure',
  accessibility_failure: 'Accessibility failure',
  driver_injury: 'Driver injury',
  assault: 'Assault or abuse',
  near_miss: 'Near miss',
  depot_incident: 'Depot incident',
  data_security: 'Data security',
  other: 'Other',
}

export const REPORTING_SOURCE_LABELS: Record<string, string> = {
  driver_app: 'Driver app',
  yard_app: 'Yard app',
  staff_portal: 'Staff portal',
  admin: 'Admin',
  customer: 'Customer',
  school: 'School',
  police: 'Police',
  telematics: 'Telematics',
  anonymous: 'Anonymous',
}

export const INCIDENT_CATEGORIES = Object.keys(CATEGORY_LABELS) as import('./types').IncidentCategory[]
