import type { VehicleCheckType } from './types'

export const CHECK_TYPE_LABELS: Record<VehicleCheckType, string> = {
  driver_pre_use: 'Driver pre-use walkaround',
  driver_changeover: 'Driver changeover',
  yard_return: 'Yard return inspection',
  yard_release: 'Yard release inspection',
  pmi: 'Preventative maintenance inspection',
  specialist_lift: 'Wheelchair lift inspection',
  specialist_restraint: 'Passenger restraint inspection',
}

export const CHECK_TEMPLATE_AREAS: Record<VehicleCheckType, string[]> = {
  driver_pre_use: ['Lights', 'Tyres', 'Wheel fixings', 'Mirrors', 'Glass', 'Doors', 'Emergency exits', 'Accessibility equipment'],
  driver_changeover: ['Mileage', 'Fuel/charge', 'Damage', 'Warning lights', 'Equipment handover', 'Keys/cards'],
  yard_return: ['New damage', 'Cleanliness', 'Fuel/charge', 'Mileage', 'Equipment', 'Open defects', 'Parking bay'],
  yard_release: ['Overnight parking', 'Maintenance clearance', 'Defect clearance', 'Cleanliness', 'Fuel/charge readiness'],
  pmi: ['Brakes', 'Steering', 'Suspension', 'Tyres', 'Lights', 'Body', 'Accessibility equipment'],
  specialist_lift: ['Lift operation', 'Hydraulics', 'Safety interlocks', 'Controls'],
  specialist_restraint: ['Anchor points', 'Straps', 'Buckles', 'Labels'],
}
