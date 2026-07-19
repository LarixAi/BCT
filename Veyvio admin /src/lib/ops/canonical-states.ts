/** Shared canonical states for Admin / Driver / Yard operational alignment. */

export type DriverDutyState =
  | 'PLANNED'
  | 'READY'
  | 'SIGNED_ON'
  | 'VEHICLE_PENDING'
  | 'CHECK_IN_PROGRESS'
  | 'ACTIVE'
  | 'ON_BREAK'
  | 'RETURNING'
  | 'HANDBACK_PENDING'
  | 'SIGNED_OFF'
  | 'BLOCKED'

export type VehicleReadinessState =
  | 'NOT_REQUIRED'
  | 'PLANNED'
  | 'PREPARATION_PENDING'
  | 'PREPARING'
  | 'YARD_READY'
  | 'DRIVER_CHECK_PENDING'
  | 'DRIVER_CHECK_FAILED'
  | 'OPERATIONALLY_READY'
  | 'IN_SERVICE'
  | 'RETURN_PENDING'
  | 'RETURN_INSPECTION'
  | 'AVAILABLE'
  | 'RESTRICTED'
  | 'VOR'

export type RunState =
  | 'PLANNED'
  | 'AWAITING_RESOURCES'
  | 'AWAITING_READINESS'
  | 'READY'
  | 'RELEASED'
  | 'IN_PROGRESS'
  | 'AT_RISK'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED'

export type OpsActionSeverity = 'critical' | 'urgent' | 'warning'

const DRIVER_DUTY_LABELS: Record<DriverDutyState, string> = {
  PLANNED: 'Planned',
  READY: 'Ready',
  SIGNED_ON: 'Signed on',
  VEHICLE_PENDING: 'Vehicle pending',
  CHECK_IN_PROGRESS: 'Check in progress',
  ACTIVE: 'Active',
  ON_BREAK: 'On break',
  RETURNING: 'Returning',
  HANDBACK_PENDING: 'Handback pending',
  SIGNED_OFF: 'Signed off',
  BLOCKED: 'Blocked',
}

const VEHICLE_READINESS_LABELS: Record<VehicleReadinessState, string> = {
  NOT_REQUIRED: 'Not required',
  PLANNED: 'Planned',
  PREPARATION_PENDING: 'Preparation pending',
  PREPARING: 'Preparing',
  YARD_READY: 'Yard ready',
  DRIVER_CHECK_PENDING: 'Driver check pending',
  DRIVER_CHECK_FAILED: 'Driver check failed',
  OPERATIONALLY_READY: 'Operationally released',
  IN_SERVICE: 'In service',
  RETURN_PENDING: 'Return pending',
  RETURN_INSPECTION: 'Return inspection',
  AVAILABLE: 'Available',
  RESTRICTED: 'Restricted',
  VOR: 'VOR',
}

const RUN_STATE_LABELS: Record<RunState, string> = {
  PLANNED: 'Planned',
  AWAITING_RESOURCES: 'Awaiting resources',
  AWAITING_READINESS: 'Awaiting readiness',
  READY: 'Ready',
  RELEASED: 'Released',
  IN_PROGRESS: 'In progress',
  AT_RISK: 'At risk',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export function labelDriverDutyState(state: DriverDutyState): string {
  return DRIVER_DUTY_LABELS[state]
}

export function labelVehicleReadinessState(state: VehicleReadinessState): string {
  return VEHICLE_READINESS_LABELS[state]
}

export function labelRunState(state: RunState): string {
  return RUN_STATE_LABELS[state]
}

/** Map loose duty / eligibility strings from hubs into canonical driver duty state. */
export function mapDriverDutyState(raw: string | null | undefined, blocked = false): DriverDutyState {
  if (blocked) return 'BLOCKED'
  const s = (raw ?? '').toLowerCase().replace(/-/g, '_')
  if (['blocked', 'suspended', 'not_eligible', 'ineligible'].includes(s)) return 'BLOCKED'
  if (['signed_off', 'off_duty', 'completed', 'complete'].includes(s)) return 'SIGNED_OFF'
  if (['on_break', 'break'].includes(s)) return 'ON_BREAK'
  if (['returning', 'en_route_return'].includes(s)) return 'RETURNING'
  if (['handback', 'handback_pending'].includes(s)) return 'HANDBACK_PENDING'
  if (['on_trip', 'in_progress', 'active', 'driving'].includes(s)) return 'ACTIVE'
  if (['check_in_progress', 'checking'].includes(s)) return 'CHECK_IN_PROGRESS'
  if (['vehicle_pending', 'awaiting_vehicle'].includes(s)) return 'VEHICLE_PENDING'
  if (['signed_on', 'on_duty', 'clocked_in'].includes(s)) return 'SIGNED_ON'
  if (['ready', 'eligible'].includes(s)) return 'READY'
  if (['assigned', 'planned', 'scheduled'].includes(s)) return 'PLANNED'
  return 'PLANNED'
}

/** Map yard readiness + check release into canonical vehicle readiness. */
export function mapVehicleReadinessState(input: {
  yardReadiness?: string | null
  checkRelease?: string | null
  vehicleStatus?: string | null
  inService?: boolean
}): VehicleReadinessState {
  const yard = (input.yardReadiness ?? '').toLowerCase()
  const check = (input.checkRelease ?? '').toLowerCase()
  const status = (input.vehicleStatus ?? '').toLowerCase()

  if (yard === 'vor' || check === 'vor' || status === 'vor') return 'VOR'
  if (check === 'blocked' || status === 'restricted') return 'RESTRICTED'
  if (input.inService || status === 'in_service') return 'IN_SERVICE'
  if (check === 'fail' || check === 'failed' || check === 'driver_check_failed') return 'DRIVER_CHECK_FAILED'
  if (check === 'ready' || check === 'conditionally_ready') {
    if (yard === 'ready' || yard === 'ready_with_advisory') return 'OPERATIONALLY_READY'
    return 'YARD_READY'
  }
  if (check === 'check_in_progress' || check === 'awaiting_review' || check === 'not_checked') {
    if (yard === 'ready' || yard === 'ready_with_advisory') return 'DRIVER_CHECK_PENDING'
  }
  if (yard === 'ready' || yard === 'ready_with_advisory') return 'YARD_READY'
  if (yard === 'conditional' || ['cleaning', 'fuelling', 'charging', 'loading_equipment', 'under_inspection'].some((a) => status.includes(a))) {
    return 'PREPARING'
  }
  if (yard === 'blocked' || yard === 'unknown') return 'PREPARATION_PENDING'
  if (status === 'available') return 'AVAILABLE'
  return 'PLANNED'
}

/** Map duty / live dispatch status into canonical run state. */
export function mapRunState(input: {
  dutyStatus?: string | null
  liveStatus?: string | null
  blocked?: boolean
  atRisk?: boolean
}): RunState {
  if (input.blocked) return 'BLOCKED'
  if (input.atRisk) return 'AT_RISK'
  const s = (input.liveStatus ?? input.dutyStatus ?? '').toLowerCase().replace(/-/g, '_')
  if (['cancelled', 'canceled'].includes(s)) return 'CANCELLED'
  if (['completed', 'complete', 'done'].includes(s)) return 'COMPLETED'
  if (['in_progress', 'active', 'on_trip', 'en_route'].includes(s)) return 'IN_PROGRESS'
  if (['released', 'ready_for_service'].includes(s)) return 'RELEASED'
  if (['ready'].includes(s)) return 'READY'
  if (['awaiting_readiness', 'not_ready'].includes(s)) return 'AWAITING_READINESS'
  if (['unassigned', 'awaiting_resources', 'no_driver', 'no_vehicle'].includes(s)) return 'AWAITING_RESOURCES'
  if (['assigned', 'planned', 'scheduled', 'signed_on'].includes(s)) return 'PLANNED'
  return 'PLANNED'
}
