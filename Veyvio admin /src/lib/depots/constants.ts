import type { DepotStatus, DepotWizardStepId } from './types'

export const DEPOT_STATUS_LABELS: Record<DepotStatus, string> = {
  operational: 'Operational',
  planned: 'Planned',
  closed: 'Closed',
  maintenance_warning: 'Maintenance warning',
}

export const DEPOT_WIZARD_STEPS: { id: DepotWizardStepId; label: string; description: string }[] = [
  { id: 'basic', label: 'Basic information', description: 'Name, code, address and status' },
  { id: 'operations', label: 'Operations', description: 'Capacity, fuel types and hours' },
  { id: 'management', label: 'Management', description: 'Managers and emergency contacts' },
  { id: 'assignment', label: 'Fleet assignment', description: 'Vehicles, drivers and yard staff' },
  { id: 'facilities', label: 'Facilities', description: 'Wash, CCTV, chargers and access' },
  { id: 'compliance', label: 'Compliance & documents', description: 'Site plans and certificates' },
  { id: 'review', label: 'Review & create', description: 'Validate capacity and activate' },
]

export const DEPOT_WIZARD_STEP_INDEX: Record<DepotWizardStepId, number> = Object.fromEntries(
  DEPOT_WIZARD_STEPS.map((s, i) => [s.id, i]),
) as Record<DepotWizardStepId, number>

export const DEPOT_WORKSPACE_TABS = [
  'Overview',
  'Vehicles',
  'Drivers',
  'Yard',
  'Maintenance',
  'Equipment',
  'Security',
  'Fuel',
  'Documents',
  'Settings',
] as const

export type DepotWorkspaceTab = (typeof DEPOT_WORKSPACE_TABS)[number]

export const DEFAULT_DEPOT_CAPACITY = {
  vehicleCapacity: 80,
  parkingBays: 60,
  workshopBays: 4,
  washBays: 2,
  chargingPoints: 4,
  fuelPumps: 2,
}

export const DEFAULT_DEPOT_FACILITIES = {
  fuelDiesel: true,
  fuelPetrol: false,
  fuelAdBlue: true,
  evCharging: true,
  vehicleWash: true,
  cleaningArea: true,
  inspectionLane: true,
  secureParking: true,
  cctv: true,
  accessControl: true,
}
