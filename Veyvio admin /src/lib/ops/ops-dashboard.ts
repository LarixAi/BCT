import type { ConnectionStatus } from '@/lib/types'
import type {
  DriverDutyState,
  OpsActionSeverity,
  RunState,
  VehicleReadinessState,
} from './canonical-states'

export interface DriverBlockedReason {
  reason: string
  count: number
  href: string
}

export interface DriverReadinessCard {
  scheduled: number
  signedOn: number
  notSignedOn: number
  eligible: number
  blocked: number
  onBreak: number | null
  currentlyDriving: number | null
  withoutAssignments: number | null
  blockedReasons: DriverBlockedReason[]
}

export interface VehicleReadinessStages {
  yardReady: number
  driverChecked: number
  operationallyReleased: number
}

export interface VehicleReadinessCard {
  required: number
  ready: number
  preparing: number
  awaitingCheck: number
  allocated: number
  inService: number
  unavailable: number
  vor: number
  stages: VehicleReadinessStages
}

export interface ReadinessPipelineRow {
  id: string
  runReference: string
  driverName: string
  vehicleRegistration: string
  yardLabel: string
  driverCheckLabel: string
  releaseLabel: string
  runState: RunState
  vehicleState: VehicleReadinessState
  driverState: DriverDutyState
  blocker: string | null
  href: string
}

export interface LiveTripRow {
  id: string
  tripReference: string
  runReference: string
  driverName: string
  vehicleRegistration: string
  stage: string
  plannedTime: string | null
  delayMinutes: number
  lastUpdateLabel: string
  isStale: boolean
  hasException: boolean
  wheelchairRequired: boolean
  escortRequired: boolean
  href: string
}

export interface YardSnapshotCard {
  onSite: number
  offSite: number
  locationUnknown: number
  preparing: number
  awaitingCleaning: number
  awaitingFuel: number
  awaitingCharge: number
  awaitingEquipment: number
  inInspection: number
  inMaintenance: number
  readyForCollection: number
  openTasks: number
  overdueTasks: number
  safetyCriticalTasks: number
}

export interface ChecksSnapshotCard {
  required: number
  passed: number
  failed: number
  incomplete: number
  notSynced: number
  failedRows: Array<{
    id: string
    registration: string
    driverOrPerformer: string
    runReference: string | null
    failure: string
    href: string
  }>
}

export interface DefectsVorCard {
  newToday: number
  critical: number
  awaitingAssessment: number
  affectingActiveRuns: number
  vorVehicles: number
  awaitingRepair: number
  awaitingVerification: number
}

export interface HandoverExceptionRow {
  id: string
  title: string
  detail: string
  registration: string | null
  recommendedAction: string
  href: string
}

export interface SyncHealthCard {
  driversOnlineProxy: number
  driversStale: number
  checksPendingSync: number
  yardTasksPendingSync: number
  liveVehiclesStale: number
  connectionStatus: ConnectionStatus
  notes: string[]
}

export interface OpsActionItem {
  id: string
  severity: OpsActionSeverity
  title: string
  detail: string
  owner: string | null
  recommendedAction: string
  href: string
  source: 'dashboard' | 'driver' | 'vehicle' | 'yard' | 'checks' | 'defects'
}

export interface OpsTopLine {
  driversReadyLabel: string
  vehiclesReadyLabel: string
  runsReady: number
  runsBlocked: number
  activeTrips: number
  criticalExceptions: number
}

export type OpsSavedView =
  | 'all'
  | 'morning_release'
  | 'live_service'
  | 'yard_control'
  | 'compliance'
  | 'end_of_day'

export interface OpsDashboardModel {
  operationalDate: string
  generatedAt: string
  topLine: OpsTopLine
  drivers: DriverReadinessCard
  vehicles: VehicleReadinessCard
  pipeline: ReadinessPipelineRow[]
  liveTrips: LiveTripRow[]
  yard: YardSnapshotCard
  checks: ChecksSnapshotCard
  defectsVor: DefectsVorCard
  handoverExceptions: HandoverExceptionRow[]
  syncHealth: SyncHealthCard
  actionQueue: OpsActionItem[]
}
