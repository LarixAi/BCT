import type {
  LiveDriverState,
  LiveExceptionLifecycle,
  LiveExceptionSeverity,
  LiveServiceHealth,
  LiveVehicleState,
  TripLifecycleState,
} from './canonical-trip-states'

export type LiveBoardFilter =
  | 'all'
  | 'active_runs'
  | 'late'
  | 'at_risk'
  | 'exceptions'
  | 'assistance'
  | 'stale_gps'
  | 'onboard'

export type LiveBoardTab = 'runs' | 'trips' | 'drivers' | 'vehicles' | 'exceptions'
export type LiveSavedView =
  | 'all'
  | 'late'
  | 'assistance'
  | 'vehicle_issues'
  | 'morning_school'
  | 'my_exceptions'

export interface LiveSummaryCards {
  activeRuns: number
  runsNotStarted: number
  runsCompleted: number
  activeTrips: number
  awaitingPickup: number
  onboard: number
  travelling: number
  onTime: number
  atRisk: number
  late: number
  driversActive: number
  driversOnBreak: number
  assistanceRequests: number
  vehiclesInService: number
  vehiclesRestricted: number
  criticalExceptions: number
  urgentExceptions: number
  warningExceptions: number
}

export interface LiveRunRow {
  id: string
  runReference: string
  serviceType: string
  driverName: string
  driverId: string | null
  vehicleRegistration: string
  progressLabel: string
  tripProgress: string | null
  health: LiveServiceHealth
  healthLabel: string
  delayMinutes: number
  nextStop: string | null
  nextAction: string
  stage: TripLifecycleState
  stageLabel: string
  lastUpdateLabel: string
  isStale: boolean
  isMoving: boolean
  hasException: boolean
  passengerOnboard: boolean
  wheelchair: boolean
  escortRequired: boolean
  latitude: number | null
  longitude: number | null
  href: string
}

export interface LiveTripRow {
  id: string
  tripReference: string
  runReference: string
  passengerStage: string
  driverName: string
  vehicleRegistration: string
  plannedTime: string | null
  health: LiveServiceHealth
  healthLabel: string
  delayMinutes: number
  stage: TripLifecycleState
  href: string
}

export interface LiveExceptionCard {
  id: string
  severity: LiveExceptionSeverity
  title: string
  detail: string
  runReference: string | null
  driverName: string | null
  vehicleRegistration: string | null
  detectedAtLabel: string
  owner: string | null
  recommendedAction: string
  lifecycle: LiveExceptionLifecycle
  href: string
  source: string
}

export interface LiveActivityItem {
  id: string
  timeLabel: string
  description: string
  actor: string
  category: 'trips' | 'drivers' | 'vehicles' | 'yard' | 'defects' | 'incidents' | 'admin'
  href?: string
}

export interface LiveConnectionBanner {
  status: 'live' | 'paused' | 'delayed' | 'offline' | 'gps_unavailable'
  message: string
  lastUpdatedLabel: string
}

export interface LiveOperationsModel {
  operationalDate: string
  generatedAt: string
  currentTimeLabel: string
  connection: LiveConnectionBanner
  summary: LiveSummaryCards
  runs: LiveRunRow[]
  trips: LiveTripRow[]
  exceptions: LiveExceptionCard[]
  activity: LiveActivityItem[]
  trackingEnabled: boolean
}

export interface LiveDrawerModel {
  run: LiveRunRow
  driverState: LiveDriverState
  vehicleState: LiveVehicleState
  locationSource: string
  locationAccuracyLabel: string
  nextStopEta: string | null
  timeline: LiveActivityItem[]
  openExceptions: LiveExceptionCard[]
}
