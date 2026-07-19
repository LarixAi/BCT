import type { NotificationAudience, ReorganiseReasonCode } from './types'

export const REORGANISE_REASON_LABEL: Record<ReorganiseReasonCode, string> = {
  traffic_or_road_closure: 'Traffic or road closure',
  passenger_requirement: 'Passenger requirement',
  late_running_recovery: 'Late-running recovery',
  vehicle_capacity: 'Vehicle capacity',
  driver_request: 'Driver request',
  school_request: 'School request',
  parent_carer_request: 'Parent or carer request',
  operational_optimisation: 'Operational optimisation',
  safeguarding_requirement: 'Safeguarding requirement',
  other: 'Other',
}

export const REORGANISE_REASONS: ReorganiseReasonCode[] = [
  'traffic_or_road_closure',
  'passenger_requirement',
  'late_running_recovery',
  'vehicle_capacity',
  'driver_request',
  'school_request',
  'parent_carer_request',
  'operational_optimisation',
  'safeguarding_requirement',
  'other',
]

export const AUDIENCE_LABEL: Record<NotificationAudience, string> = {
  driver: 'Current driver',
  parent_carer: 'Parent / carer',
  school: 'School / destination',
  escort: 'Escort / passenger assistant',
  new_driver: 'New driver',
  original_driver: 'Original driver',
  control: 'Operations control',
  contract_contact: 'Contract contact',
}

/** Default company tolerances (minutes) until contract config exists. */
export const NOTIFY_TOLERANCE = {
  passengerPickupMinutes: 5,
  schoolArrivalMinutes: 10,
}
