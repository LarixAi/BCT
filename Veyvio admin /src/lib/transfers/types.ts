/** Operational job — one passenger pickup/drop-off work unit within a trip */
export type JobStatus =
  | 'unstarted'
  | 'waiting'
  | 'onboard'
  | 'completed'
  | 'cancelled'
  | 'transferred'

export interface OperationalJob {
  id: string
  tripId: string
  journeyId?: string | null
  sequence: number
  passengerId: string
  passengerName: string
  pickupAddress: string
  dropoffAddress: string
  plannedPickupTime: string
  plannedDropoffTime?: string | null
  actualPickupTime?: string | null
  actualDropoffTime?: string | null
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropoffLatitude?: number | null
  dropoffLongitude?: number | null
  status: JobStatus
  wheelchairRequired: boolean
  escortRequired: boolean
  safeguardingFlag: boolean
  assignedDriverId?: string | null
  assignedVehicleId?: string | null
  transferIndicator?: string | null
}

/** Passenger movement from origin to destination — may span one job */
export interface JourneyRecord {
  id: string
  bookingId?: string | null
  bookingTripId?: string | null
  passengerId: string
  passengerName: string
  origin: string
  destination: string
}

export type OperationalTripStatus =
  | 'planned'
  | 'assigned'
  | 'accepted'
  | 'released'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type AssignmentStatus = 'unassigned' | 'assigned' | 'accepted' | 'acknowledged'

/** Driver-facing work package — contains one or more jobs */
export interface OperationalTrip {
  id: string
  reference: string
  dutyId: string | null
  runReference: string | null
  status: OperationalTripStatus
  driverId: string | null
  driverName: string | null
  vehicleId: string | null
  vehicleRegistration: string | null
  depotId: string | null
  depotName: string | null
  dispatcherName?: string | null
  assignmentStatus: AssignmentStatus
  acceptedAt: string | null
  acknowledgedAt: string | null
  manifestVersion: number
  lastAppSync: string | null
  delayMinutes: number
  passengersOnboard: number
  completedJobCount: number
  totalJobCount: number
  activeJobId: string | null
  jobs: OperationalJob[]
  gpsLat: number | null
  gpsLng: number | null
  driverOnline: boolean
  routeName: string | null
  bookingId?: string | null
  bookingTripId?: string | null
}

export type TransferScope =
  | 'entire_trip'
  | 'selected_jobs'
  | 'remaining_jobs'
  | 'driver_only'
  | 'vehicle_only'
  | 'driver_and_vehicle'
  | 'swap_drivers'
  | 'split_trip'
  | 'return_to_queue'

export type TransferWorkflowType = 'reassignment' | 'live_transfer' | 'physical_handover'

export type TransferStatus =
  | 'draft'
  | 'validation_in_progress'
  | 'approval_required'
  | 'ready_to_confirm'
  | 'transfer_committed'
  | 'driver_notification_pending'
  | 'awaiting_acknowledgement'
  | 'accepted'
  | 'handover_required'
  | 'handover_completed'
  | 'transfer_completed'
  | 'validation_failed'
  | 'driver_rejected'
  | 'notification_failed'
  | 'driver_offline'
  | 'transfer_cancelled'
  | 'transfer_expired'
  | 'manager_declined'
  | 'handover_failed'

export type TransferReasonCategory =
  | 'driver_availability'
  | 'vehicle_problems'
  | 'operational_recovery'
  | 'customer_passenger_change'
  | 'administrative'

export interface TransferReasonCode {
  category: TransferReasonCategory
  code: string
  label: string
  requiresNotes?: boolean
}

export type ValidationLevel = 'error' | 'warning' | 'info'

export interface TransferValidationItem {
  level: ValidationLevel
  code: string
  message: string
}

export interface TransferCandidate {
  driverId: string
  driverName: string
  status: string
  vehicleId: string | null
  vehicleRegistration: string | null
  seatingCapacity: number
  wheelchairCapacity: number
  depotName: string | null
  isOnline: boolean
  estimatedTravelMinutes: number
  remainingDutyHours: number
  hasScheduleConflict: boolean
  licenceValid: boolean
  dbsValid: boolean
  punctualityScore: number
  familiarWithRoute: boolean
  predictedDelayMinutes: number
  rank: number
}

export interface TransferImpactSnapshot {
  driverName: string | null
  vehicleRegistration: string | null
  pickupEta: string | null
  jobCount: number
  delayMinutes: number
  passengersOnboard: number
}

export interface TransferImpactPreview {
  before: TransferImpactSnapshot
  after: TransferImpactSnapshot
  affectedPassengers: string[]
  jobsRemainingWithOriginal: string[]
  jobsMoving: string[]
  notificationsToSend: string[]
  slaImpact: string | null
  managerApprovalRequired: boolean
  additionalDeadMileageKm: number
  arrivalImprovementMinutes: number | null
}

export interface TransferNotificationStatus {
  channel: 'driver_original' | 'driver_receiving' | 'passenger' | 'customer' | 'operations'
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'acknowledged' | 'rejected' | 'failed' | 'offline'
  at?: string | null
}

export interface TransferRecord {
  id: string
  companyId: string
  depotId: string | null
  createdAt: string
  confirmedAt: string | null
  createdBy: string
  approvedBy: string | null
  workflowType: TransferWorkflowType
  scope: TransferScope
  status: TransferStatus
  sourceTripId: string
  destinationTripId: string | null
  sourceJobIds: string[]
  originalDriverId: string | null
  newDriverId: string | null
  originalVehicleId: string | null
  newVehicleId: string | null
  tripStatusAtTransfer: string
  passengersOnboardAtTransfer: number
  reasonCategory: TransferReasonCategory
  reasonCode: string
  adminNotes: string | null
  overrideReason: string | null
  impact: TransferImpactPreview | null
  notifications: TransferNotificationStatus[]
  handoverLocation: string | null
  handoverAuthorisedBy: string | null
}

export interface AssignmentHistoryEntry {
  id: string
  tripId: string
  dutyId: string | null
  changeType: string
  fromDriverId: string | null
  fromDriverName: string | null
  toDriverId: string | null
  toDriverName: string | null
  fromVehicleId: string | null
  fromVehicleRegistration: string | null
  toVehicleId: string | null
  toVehicleRegistration: string | null
  reason: string
  adminName: string
  at: string
  transferId: string | null
  immutable: boolean
}

export interface CreateTransferInput {
  sourceTripId: string
  scope: TransferScope
  workflowType: TransferWorkflowType
  sourceJobIds?: string[]
  destinationTripId?: string | null
  newDriverId?: string | null
  newVehicleId?: string | null
  swapWithTripId?: string | null
  reasonCategory: TransferReasonCategory
  reasonCode: string
  adminNotes?: string | null
  overrideWarnings?: boolean
  overrideReason?: string | null
  handoverLocation?: string | null
  handoverAuthorisedBy?: string | null
}

export interface OperationalPosition {
  trip: OperationalTrip
  completedJobs: OperationalJob[]
  activeJob: OperationalJob | null
  remainingJobs: OperationalJob[]
  onboardPassengers: OperationalJob[]
}

export type RecoveryWorkflow =
  | 'continue_to_destination'
  | 'physical_handover'
  | 'vehicle_replacement'
  | 'rescue_handover'
  | 'escalation'

export interface HandoverInput {
  tripId: string
  workflow: RecoveryWorkflow
  handoverLocation: string
  receivingDriverId: string
  receivingVehicleId?: string | null
  passengerJobIds: string[]
  authorisedBy: string
  safeguardingConfirmed: boolean
  belongingsConfirmed: boolean
  notes?: string | null
}

export interface TransferReportSummary {
  periodFrom: string
  periodTo: string
  totalTransfers: number
  byReason: Array<{ reason: string; count: number }>
  byDepot: Array<{ depot: string; count: number }>
  driverCaused: number
  vehicleCaused: number
  lateRecovery: number
  managerOverrides: number
  avgRecoveryMinutes: number
  passengersAffected: number
  recentTransfers: TransferRecord[]
}
