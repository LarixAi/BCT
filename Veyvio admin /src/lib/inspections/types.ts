import type { PmiChecklistInstance } from '@/lib/maintenance/pmi-checklist'

export type InspectionType =
  | 'safety_pmi'
  | 'first_use'
  | 'intermediate'
  | 'annual_prep'
  | 'post_repair'
  | 'return_to_service'
  | 'body_condition'
  | 'specialist'

export type InspectionStatus =
  | 'due'
  | 'scheduled'
  | 'prepared'
  | 'in_progress'
  | 'completed'
  | 'rectification_pending'
  | 'awaiting_sign_off'
  | 'signed_off'
  | 'failed'
  | 'held'
  | 'incomplete'

export type InspectionOutcome =
  | 'pending'
  | 'pass'
  | 'pass_with_advisories'
  | 'rectification_required'
  | 'restricted'
  | 'fail_vor'
  | 'incomplete'
  | 'reinspection_required'

export type InspectionBookingStatus = 'unscheduled' | 'booked' | 'arrived' | 'in_progress' | 'complete'

export type InspectionTab = 'register' | 'calendar' | 'awaiting-repair' | 'providers'

export interface InspectionLinkedDefect {
  defectId: string
  component: string
  severity: string
  status: string
}

export interface InspectionLinkedWorkOrder {
  workOrderId: string
  title: string
  status: string
}

export interface InspectionRecord {
  id: string
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  vehicleType: string
  depot: string
  inspectionType: InspectionType
  intervalWeeks: number | null
  dueDate: string
  bookedDate: string | null
  odometer: number | null
  scheduledMileage: number | null
  provider: string
  inspectorName: string | null
  bookingStatus: InspectionBookingStatus
  status: InspectionStatus
  outcome: InspectionOutcome
  operationalStatus: string
  previousInspectionDate: string | null
  nextProjectedDate: string | null
  linkedDefects: InspectionLinkedDefect[]
  linkedWorkOrders: InspectionLinkedWorkOrder[]
  checklist: PmiChecklistInstance | null
  evidenceSummary: string[]
  signedOffAt: string | null
  signedOffBy: string | null
  importFileName: string | null
  driverInstruction: string | null
  createdAt: string
  updatedAt: string
}

export interface InspectionsSummary {
  dueToday: number
  dueWithin7Days: number
  overdue: number
  inProgress: number
  awaitingRectification: number
  awaitingSignOff: number
  failedVor: number
  complianceRate90d: number
}

export interface InspectionCalendarEvent {
  id: string
  date: string
  title: string
  inspectionId: string
  vehicleId: string
  registrationNumber: string
  eventKind: 'inspection' | 'mot' | 'brake' | 'tacho' | 'specialist'
  status: string
}

export interface InspectionProviderRow {
  id: string
  name: string
  type: 'internal' | 'external' | 'franchise'
  approved: boolean
  services: string[]
  slaHours: number
  contactEmail: string
}

export interface InspectionsHubData {
  summary: InspectionsSummary
  register: InspectionRecord[]
  calendar: InspectionCalendarEvent[]
  providers: InspectionProviderRow[]
}

/** Legacy thin shape kept for older consumers */
export interface LegacyInspectionRecord {
  id: string
  vehicleRegistration: string
  vehicleId: string
  inspectionType: string
  dueDate: string
  status: string
}
