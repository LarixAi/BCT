import type { DefectSeverity, DefectStatus, VehicleDowntimeEvent, VehicleProfile, WorkOrderStatus } from '@/lib/vehicles/types'
import type { MaintenanceIntelligence } from './intelligence'

export type VehicleMaintenanceStatus =
  | 'no_action'
  | 'scheduled'
  | 'in_workshop'
  | 'awaiting_parts'
  | 'awaiting_inspection'
  | 'ready_for_release'

export type MaintenancePriorityGroup = 'critical' | 'urgent' | 'attention'

export type MaintenanceTab =
  | 'overview'
  | 'planner'
  | 'work-orders'
  | 'technician'
  | 'pmi'
  | 'service'
  | 'vor'
  | 'parts'
  | 'costs'
  | 'compliance'
  /** @deprecated legacy tabs kept for redirects */
  | 'schedule'
  | 'defects'
  | 'calendar'
  | 'downtime'
  | 'suppliers'

export interface MaintenanceSupplier {
  id: string
  name: string
  type: 'internal' | 'external' | 'franchise' | 'parts'
  approved: boolean
  contactEmail: string
  services: string[]
  labourRate: number | null
  slaHours: number
  performanceScore: number
  depotCoverage: string[]
}

export interface PartsCatalogItem {
  id: string
  name: string
  partNumber: string
  supplierId: string
  unitCost: number
  vehicleTypes: string[]
  reorderLevel: number
  /** On-hand warehouse quantity (Phase 2b) */
  stockOnHand: number
  location: string | null
  bin: string | null
}

export interface DowntimeAnalytics {
  averageDowntimeHours: number
  vehiclesOnDowntime: number
  repeatVorEvents: number
  averageApprovalDelayHours: number
  averagePartsWaitHours: number
  recentEvents: Array<VehicleDowntimeEvent & { vehicleId: string; registration: string }>
}

export interface MaintenanceOverviewSummary {
  /** Primary attention strip (brief Phase 1) */
  attention: {
    dueToday: number
    dueWithin14Days: number
    overdue: number
    vor: number
    safetyCriticalDefects: number
    inWorkshop: number
    awaitingParts: number
    readyForRelease: number
  }
  fleetAvailability: {
    total: number
    available: number
    availableWithAdvisory: number
    inMaintenance: number
    vor: number
    awaitingInspection: number
    awaitingParts: number
    readyForRelease: number
    dueSoonUsable: number
  }
  maintenanceRisk: {
    overdueServices: number
    dueWithin7Days: number
    safetyCriticalDefects: number
    repeatDefectVehicles: number
    motApproaching: number
    tachoApproaching: number
    missingEvidence: number
  }
  workshopPosition: {
    notStarted: number
    inProgress: number
    awaitingParts: number
    awaitingApproval: number
    readyForInspection: number
    readyForRelease: number
  }
}

export interface MaintenanceSummaryCard {
  id: string
  group: 'attention' | 'fleetAvailability' | 'maintenanceRisk' | 'workshopPosition'
  label: string
  filterKey: string
  tone?: 'critical' | 'default'
}

export interface MaintenancePriorityItem {
  id: string
  priorityGroup: MaintenancePriorityGroup
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  depot: string
  issue: string
  severity: string
  operationalImpact: string
  maintenanceStage: string
  responsiblePerson: string | null
  expectedCompletion: string | null
  upcomingWork: string | null
  recommendedAction: string | null
  deadline: string | null
}

export interface MaintenanceFleetRow {
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  depot: string
  make: string
  model: string
  operationalStatus: VehicleProfile['operationalStatus']
  maintenanceStatus: VehicleMaintenanceStatus
  currentIssue: string | null
  severity: DefectSeverity | null
  nextServiceDate: string | null
  nextServiceMileage: number | null
  complianceSummary: string
  downtimeHours: number | null
  workshop: string | null
  expectedReturn: string | null
  openWorkOrders: number
  openDefects: number
}

export interface FleetWorkOrderRow {
  workOrderId: string
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  depot: string
  title: string
  type: string
  status: WorkOrderStatus
  severity: DefectSeverity | null
  provider: string | null
  technicianName: string | null
  managerName: string | null
  scheduledDate: string | null
  targetCompletionDate: string | null
  expectedCompletion: string | null
  defectId: string | null
  creationSource: string
  diagnosis: string | null
  labourHours: number | null
  labourCost: number | null
  partsCost: number | null
  estimatedCost: number | null
  actualCost: number | null
  roadTestRequired: boolean
  partsCount: number
  /** PMI digital checklist progress when type === pmi */
  pmiChecklistProgress: {
    total: number
    answered: number
    failed: number
    advisory: number
    complete: boolean
  } | null
  estimateStatus: import('@/lib/vehicles/types').EstimateApprovalStatus | null
  estimateTotal: number | null
  createdAt: string
  createdBy: string
}

export interface ServiceScheduleItem {
  id: string
  vehicleId: string
  registrationNumber: string
  depot: string
  serviceType: string
  dueDate: string | null
  dueMileage: number | null
  currentMileage: number | null
  milesRemaining: number | null
  status: 'overdue' | 'due_soon' | 'scheduled' | 'ok'
  workshop: string | null
  owner: string | null
  source: 'work_order' | 'profile'
}

export interface FleetDefectRow {
  id: string
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  depot: string
  component: string
  description: string
  severity: DefectSeverity
  status: DefectStatus
  source: string
  reportedBy: string
  reportedAt: string
  triageStatus: string
  operationalImpact: string
  linkedWorkOrderId: string | null
}

export interface MaintenanceCalendarEvent {
  id: string
  date: string
  title: string
  eventType: 'service' | 'mot' | 'inspection' | 'workshop' | 'calibration' | 'retorque' | 'return' | 'work_order'
  vehicleId: string
  registrationNumber: string
  depot: string
  status?: string
}

export interface MaintenanceHubData {
  summary: MaintenanceOverviewSummary
  priorityQueue: MaintenancePriorityItem[]
  fleetRows: MaintenanceFleetRow[]
  workOrders: FleetWorkOrderRow[]
  schedule: ServiceScheduleItem[]
  defects: FleetDefectRow[]
  calendar: MaintenanceCalendarEvent[]
  suppliers: MaintenanceSupplier[]
  parts: PartsCatalogItem[]
  downtime: DowntimeAnalytics
  intelligence: MaintenanceIntelligence
}
