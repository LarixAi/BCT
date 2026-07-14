import type { YardSummary, YardTab, YardZone } from './types'

import type { YardTaskPriority, YardTaskType } from './types'

export const YARD_TABS: { id: YardTab; label: string }[] = [
  { id: 'live', label: 'Live Yard' },
  { id: 'map', label: 'Yard Map' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'movements', label: 'Movements' },
  { id: 'handover', label: 'Handover' },
  { id: 'exceptions', label: 'Exceptions' },
]

export const YARD_TASK_TYPE_LABELS: Record<YardTaskType, string> = {
  return_inspection: 'Return inspection',
  pre_departure_inspection: 'Pre-departure inspection',
  move_vehicle: 'Move vehicle',
  clean_interior: 'Clean interior',
  clean_exterior: 'Clean exterior',
  refuel: 'Refuel',
  charge: 'Charge',
  check_fluids: 'Check fluids',
  check_tyres: 'Check tyres',
  replenish_equipment: 'Replenish equipment',
  remove_equipment: 'Remove equipment',
  damage_photography: 'Damage photography',
  transfer_to_workshop: 'Transfer to workshop',
  prepare_for_service: 'Prepare for service',
  key_handover: 'Key handover',
  contractor_handover: 'Contractor handover',
  quarantine_vehicle: 'Quarantine vehicle',
}

export const YARD_TASK_PRIORITY_LABELS: Record<YardTaskPriority, string> = {
  routine: 'Routine',
  important: 'Important',
  urgent: 'Urgent',
  safety_critical: 'Safety critical',
}

export const YARD_SUMMARY_CARDS: {
  id: keyof YardSummary
  label: string
  filterKey: string
}[] = [
  { id: 'onSite', label: 'Vehicles on site', filterKey: 'on_site' },
  { id: 'readyForService', label: 'Ready for service', filterKey: 'ready' },
  { id: 'workRequired', label: 'Work required', filterKey: 'work_required' },
  { id: 'awaitingInspection', label: 'Awaiting inspection', filterKey: 'awaiting_inspection' },
  { id: 'vor', label: 'VOR', filterKey: 'vor' },
  { id: 'departingSoon', label: 'Departing soon', filterKey: 'departing_soon' },
  { id: 'locationUnknown', label: 'Location unknown', filterKey: 'location_unknown' },
]

export const MOVEMENT_REASONS = [
  'Prepare for morning run',
  'Move to inspection area',
  'Move to wash bay',
  'Workshop transfer',
  'Charging',
  'Fuelling',
  'Bay reorganisation',
  'Quarantine',
  'Contractor collection',
  'Depot transfer',
] as const

export const PRESENCE_LABELS: Record<string, string> = {
  expected: 'Expected',
  entering: 'Entering',
  in_yard: 'In yard',
  exiting: 'Exiting',
  off_site: 'Off site',
  in_transit: 'In transit',
  location_unknown: 'Location unknown',
}

export const ACTIVITY_LABELS: Record<string, string> = {
  parked: 'Parked',
  awaiting_inspection: 'Awaiting inspection',
  under_inspection: 'Under inspection',
  cleaning: 'Cleaning',
  fuelling: 'Fuelling',
  charging: 'Charging',
  loading_equipment: 'Loading equipment',
  awaiting_maintenance: 'Awaiting maintenance',
  in_workshop: 'In workshop',
  quarantined: 'Quarantined',
  ready_for_release: 'Ready for release',
}

export const READINESS_LABELS: Record<string, string> = {
  ready: 'Ready',
  ready_with_advisory: 'Ready with advisory',
  conditional: 'Conditional',
  blocked: 'Blocked',
  vor: 'VOR',
  unknown: 'Unknown',
}

export const CUSTODY_LABELS: Record<string, string> = {
  driver_custody: 'Driver custody',
  yard_custody: 'Yard custody',
  maintenance_custody: 'Maintenance custody',
  contractor_custody: 'Contractor custody',
  depot_transfer: 'Depot transfer',
  unassigned: 'Unassigned',
}

export const DEPOT_ZONES: Record<string, YardZone[]> = {
  'depot-wembley': [
    { id: 'zone-bays-a', label: 'Parking bays A', kind: 'bay' },
    { id: 'zone-bays-b', label: 'Parking bays B', kind: 'bay' },
    { id: 'zone-inspection', label: 'Return inspection', kind: 'inspection' },
    { id: 'zone-workshop', label: 'Workshop', kind: 'workshop' },
    { id: 'zone-wash', label: 'Wash bay', kind: 'wash' },
    { id: 'zone-fuel', label: 'Fuel station', kind: 'fuel' },
    { id: 'zone-charge', label: 'EV charging', kind: 'charge' },
    { id: 'zone-quarantine', label: 'Quarantine', kind: 'quarantine' },
    { id: 'zone-unallocated', label: 'Unallocated', kind: 'unallocated' },
  ],
  'depot-croydon': [
    { id: 'zone-coach', label: 'Coach parking', kind: 'bay' },
    { id: 'zone-inspection', label: 'Inspection area', kind: 'inspection' },
    { id: 'zone-fuel', label: 'Fuel station', kind: 'fuel' },
    { id: 'zone-wash', label: 'Wash bay', kind: 'wash' },
    { id: 'zone-unallocated', label: 'Unallocated', kind: 'unallocated' },
  ],
  'depot-park-royal': [
    { id: 'zone-bays', label: 'Parking bays', kind: 'bay' },
    { id: 'zone-workshop', label: 'Workshop', kind: 'workshop' },
    { id: 'zone-charge', label: 'EV charging', kind: 'charge' },
    { id: 'zone-unallocated', label: 'Unallocated', kind: 'unallocated' },
  ],
}

/** @deprecated use DEPOT_ZONES[depotId] */
export const WEMBLEY_ZONES = DEPOT_ZONES['depot-wembley']!
