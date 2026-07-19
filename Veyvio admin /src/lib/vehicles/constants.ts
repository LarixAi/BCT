import type {
  ConditionStatus,
  FuelType,
  LifecycleStatus,
  OwnershipType,
  ReadinessStatus,
  ReleaseDecision,
  VehicleCategory,
  VehicleComplianceStatus,
  VehicleOperationalStatus,
  YardStatus,
} from './types'

export const VEHICLE_CAPABILITY_OPTIONS: { key: string; label: string }[] = [
  { key: 'school', label: 'School transport approved' },
  { key: 'wheelchair', label: 'Wheelchair accessible' },
  { key: 'private_hire', label: 'Private hire approved' },
  { key: 'contract', label: 'Contract use' },
  { key: 'psv', label: 'PSV licensed' },
  { key: 'low_emission', label: 'Low emission zone compliant' },
]

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = {
  minibus: 'Minibus',
  accessible: 'Accessible minibus',
  coach: 'Coach',
  car: 'Car',
  mpv: 'MPV',
  van: 'Van',
}

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: 'Diesel',
  petrol: 'Petrol',
  electric: 'Electric',
  hybrid: 'Hybrid',
  hydrogen: 'Hydrogen',
}

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipType, string> = {
  owned: 'Company-owned',
  leased: 'Financed / leased',
  hire_purchase: 'Hire purchase',
  rental: 'Short-term rental',
  long_term_hire: 'Long-term hire',
  temporary_hire: 'Temporary hire',
  migration: 'Migration import',
}

export const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  no_known_issues: 'No known issues',
  advisory: 'Advisory',
  repair_required: 'Repair required',
  safety_critical: 'Safety-critical',
  awaiting_assessment: 'Awaiting assessment',
}

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  draft: 'Draft',
  awaiting_onboarding: 'Awaiting onboarding',
  active: 'Active',
  temporarily_inactive: 'Temporarily inactive',
  sold: 'Sold',
  returned_to_lessor: 'Returned to lessor',
  written_off: 'Written off',
  archived: 'Archived',
}

export const OPERATIONAL_STATUS_LABELS: Record<VehicleOperationalStatus, string> = {
  available: 'Available',
  allocated: 'Allocated',
  in_service: 'In service',
  returning_to_depot: 'Returning to depot',
  awaiting_driver: 'Awaiting driver',
  reserved: 'Reserved',
  vor: 'VOR',
  under_inspection: 'Under inspection',
  in_workshop: 'In workshop',
  awaiting_parts: 'Awaiting parts',
  awaiting_recovery: 'Awaiting recovery',
}

export const COMPLIANCE_STATUS_LABELS: Record<VehicleComplianceStatus, string> = {
  compliant: 'Compliant',
  warning: 'Warning',
  expiring_soon: 'Expiring soon',
  non_compliant: 'Non-compliant',
  not_applicable: 'Not applicable',
  awaiting_verification: 'Awaiting verification',
}

export const YARD_STATUS_LABELS: Record<YardStatus, string> = {
  in_yard: 'In yard',
  at_bay: 'At bay',
  checked_out: 'Checked out',
  checked_in: 'Checked in',
  off_site_parking: 'Off-site parking',
  workshop: 'Workshop',
  recovery_compound: 'Recovery compound',
  external_contractor: 'External contractor',
  unknown_location: 'Unknown location',
}

export const READINESS_STATUS_LABELS: Record<ReadinessStatus, string> = {
  ready: 'Ready',
  cleaning_required: 'Cleaning required',
  fuelling_required: 'Fuelling required',
  charging_required: 'Charging required',
  equipment_replenishment_required: 'Equipment replenishment required',
  deep_clean_required: 'Deep clean required',
  biohazard_clean_required: 'Biohazard clean required',
}

export const RELEASE_DECISION_LABELS: Record<ReleaseDecision, string> = {
  released: 'Released',
  released_with_warning: 'Released with warning',
  restricted_use: 'Restricted use',
  blocked: 'Blocked',
  manual_authorisation_required: 'Manual authorisation required',
}

/** Six primary register KPI cards — filter on click. */
export const FLEET_PRIMARY_CARDS: {
  id: keyof import('./types').VehicleDirectorySummary
  label: string
  filterKey?: string
}[] = [
  { id: 'total', label: 'Total' },
  { id: 'availableNow', label: 'Available', filterKey: 'available' },
  { id: 'inService', label: 'In service', filterKey: 'in_service' },
  { id: 'attention', label: 'Attention', filterKey: 'attention' },
  { id: 'vor', label: 'VOR', filterKey: 'vor' },
  { id: 'complianceExpiring', label: 'Compliance expiring', filterKey: 'expiring' },
]

/** Secondary filter pills under the primary strip. */
export const FLEET_SECONDARY_CARDS: {
  id: keyof import('./types').VehicleDirectorySummary
  label: string
  filterKey?: string
}[] = [
  { id: 'totalActive', label: 'Active', filterKey: 'active' },
  { id: 'currentlyAllocated', label: 'Allocated', filterKey: 'allocated' },
  { id: 'inMaintenance', label: 'In maintenance', filterKey: 'maintenance' },
  { id: 'checksOverdue', label: 'Checks overdue', filterKey: 'checks_overdue' },
  { id: 'motDue', label: 'MOT due', filterKey: 'mot_due' },
  { id: 'tachographDue', label: 'Tachograph due', filterKey: 'tacho_due' },
  { id: 'wheelRetorqueDue', label: 'Wheel re-torque due', filterKey: 'retorque_due' },
  { id: 'unknownLocation', label: 'Unknown location', filterKey: 'unknown_location' },
]

/** @deprecated Use FLEET_PRIMARY_CARDS + FLEET_SECONDARY_CARDS */
export const FLEET_DIRECTORY_CARDS = [...FLEET_PRIMARY_CARDS, ...FLEET_SECONDARY_CARDS]
