import type { OperationalTripStatus } from '@/lib/transfers/types'

export type SequenceStopKind = 'depot_depart' | 'pickup' | 'dropoff' | 'depot_return'

export type JourneyLegDirection = 'outbound' | 'return'

export type SequenceEditCapability =
  | 'full'
  | 'notify_required'
  | 'active_warning'
  | 'correction_only'
  | 'reinstate_only'
  | 'read_only'

export type ReorganiseReasonCode =
  | 'traffic_or_road_closure'
  | 'passenger_requirement'
  | 'late_running_recovery'
  | 'vehicle_capacity'
  | 'driver_request'
  | 'school_request'
  | 'parent_carer_request'
  | 'operational_optimisation'
  | 'safeguarding_requirement'
  | 'other'

export type LinkedReturnDecision = 'keep_unchanged' | 'review_return' | 'move_both'

export type NotificationAudience =
  | 'driver'
  | 'parent_carer'
  | 'school'
  | 'escort'
  | 'new_driver'
  | 'original_driver'
  | 'control'
  | 'contract_contact'

export interface SequenceStop {
  id: string
  kind: SequenceStopKind
  label: string
  position: number
  jobId: string | null
  passengerId: string | null
  passengerName: string | null
  address: string | null
  plannedTime: string | null
  estimatedTime: string | null
  status: string
  wheelchairRequired: boolean
  escortRequired: boolean
  locked: boolean
}

export interface LinkedJourneyLeg {
  jobId: string
  tripId: string
  tripReference: string
  runReference: string | null
  passengerId: string
  passengerName: string
  direction: JourneyLegDirection
  fromAddress: string
  toAddress: string
  plannedPickupTime: string
  plannedDropoffTime: string | null
  driverName: string | null
  vehicleRegistration: string | null
  tripStatus: OperationalTripStatus
  jobStatus: string
}

export interface PassengerTimeDelta {
  passengerName: string
  oldPickup: string
  newPickup: string
  minutesDelta: number
}

export interface SequenceChangePreview {
  tripId: string
  tripReference: string
  capability: SequenceEditCapability
  movedPassengerName: string | null
  oldPosition: number | null
  newPosition: number | null
  pickupDeltas: PassengerTimeDelta[]
  distanceMiles: { from: number; to: number }
  durationMinutes: { from: number; to: number }
  affectedPassengerCount: number
  schoolArrival: { from: string; to: string }
  linkedReturn: LinkedJourneyLeg | null
  linkedReturnDecision: LinkedReturnDecision
  notifications: Array<{
    audience: NotificationAudience
    notify: boolean
    reason: string
  }>
  acknowledgementRequired: boolean
  activeTripWarning: boolean
  stops: SequenceStop[]
}

export interface SequenceCommitInput {
  tripId: string
  orderedPickupJobIds: string[]
  reason: ReorganiseReasonCode
  reasonNotes?: string
  linkedReturnDecision: LinkedReturnDecision
  sendNotifications: boolean
  actorName: string
}

export interface SequenceAuditEvent {
  id: string
  at: string
  actorName: string
  tripId: string
  tripReference: string
  summary: string
  reason: ReorganiseReasonCode
  reasonNotes?: string
  linkedReturnDecision: LinkedReturnDecision
  notificationsSent: NotificationAudience[]
  acknowledgementRequired: boolean
  originalPickupOrder: string[]
  newPickupOrder: string[]
}

export interface JourneySequenceWorkspace {
  tripId: string
  tripReference: string
  runReference: string | null
  routeName: string | null
  tripStatus: OperationalTripStatus
  capability: SequenceEditCapability
  stops: SequenceStop[]
  pickupJobIds: string[]
  linkedLegsByPassengerId: Record<string, LinkedJourneyLeg[]>
  acknowledgement: DriverAckRecord | null
}

export type DriverAckStatus =
  | 'not_required'
  | 'sent'
  | 'delivered'
  | 'viewed'
  | 'acknowledged'
  | 'declined'
  | 'failed'

export type DriverDeclineReason =
  | 'already_driving'
  | 'timing_impossible'
  | 'passenger_not_suitable'
  | 'capacity_problem'
  | 'route_conflict'
  | 'missing_passenger_information'
  | 'other'

export interface DriverAckRecord {
  id: string
  tripId: string
  status: DriverAckStatus
  sentAt: string | null
  deliveredAt: string | null
  viewedAt: string | null
  acknowledgedAt: string | null
  declinedAt: string | null
  declineReason: DriverDeclineReason | null
  summary: string
  escalateAfterMinutes: number
}

export type MoveJourneyAction =
  | 'move_to_run'
  | 'create_new_run'
  | 'assign_standby'
  | 'leave_unassigned'

export interface DestinationRunOption {
  tripId: string
  tripReference: string
  runReference: string | null
  routeName: string | null
  driverName: string | null
  vehicleRegistration: string | null
  tripStatus: OperationalTripStatus
  jobCount: number
  wheelchairSpacesHint: number
}

export interface MoveCheckResult {
  code: string
  level: 'error' | 'warning' | 'info'
  message: string
}

export interface MoveJourneyPreview {
  sourceTripId: string
  destinationTripId: string | null
  action: MoveJourneyAction
  jobIds: string[]
  passengerNames: string[]
  checks: MoveCheckResult[]
  blocked: boolean
  suggestedOptions: string[]
}
