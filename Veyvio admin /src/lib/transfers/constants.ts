import type { TransferReasonCategory, TransferScope, TransferWorkflowType } from './types'

export const TRANSFER_SCOPES: {
  id: TransferScope
  label: string
  description: string
  workflowTypes: TransferWorkflowType[]
}[] = [
  {
    id: 'entire_trip',
    label: 'Entire trip',
    description: 'Move the complete trip to another driver',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
  {
    id: 'selected_jobs',
    label: 'Selected jobs',
    description: 'Move one or more passenger jobs to another trip or queue',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
  {
    id: 'remaining_jobs',
    label: 'Remaining unstarted jobs',
    description: 'Completed jobs stay; unstarted and onboard passengers can move to another driver',
    workflowTypes: ['live_transfer', 'physical_handover'],
  },
  {
    id: 'driver_only',
    label: 'Driver only',
    description: 'Change driver; vehicle stays the same',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
  {
    id: 'vehicle_only',
    label: 'Vehicle only',
    description: 'Change vehicle; driver stays assigned',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
  {
    id: 'driver_and_vehicle',
    label: 'Driver and vehicle',
    description: 'Move the full operational assignment',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
  {
    id: 'swap_drivers',
    label: 'Swap drivers',
    description: 'Two drivers exchange their assigned trips',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
  {
    id: 'split_trip',
    label: 'Split trip',
    description: 'Divide one trip into two or more trips',
    workflowTypes: ['live_transfer', 'physical_handover'],
  },
  {
    id: 'return_to_queue',
    label: 'Return to unassigned queue',
    description: 'Remove work from a driver without a new assignee yet',
    workflowTypes: ['reassignment', 'live_transfer'],
  },
]

export const TRANSFER_WORKFLOW_LABELS: Record<TransferWorkflowType, string> = {
  reassignment: 'Reassignment',
  live_transfer: 'Live transfer',
  physical_handover: 'Physical handover',
}

export const TRANSFER_REASON_CODES: {
  category: TransferReasonCategory
  code: string
  label: string
  requiresNotes?: boolean
}[] = [
  { category: 'driver_availability', code: 'driver_sickness', label: 'Driver sickness' },
  { category: 'driver_availability', code: 'driver_absence', label: 'Driver absence' },
  { category: 'driver_availability', code: 'driver_no_show', label: 'Driver did not report for duty' },
  { category: 'driver_availability', code: 'driver_rejected', label: 'Driver rejected assignment' },
  { category: 'driver_availability', code: 'driver_hours', label: 'Driver hours or fatigue limit' },
  { category: 'vehicle_problems', code: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { category: 'vehicle_problems', code: 'vehicle_defect', label: 'Vehicle defect' },
  { category: 'vehicle_problems', code: 'vehicle_vor', label: 'Vehicle marked VOR' },
  { category: 'vehicle_problems', code: 'vehicle_capacity', label: 'Insufficient capacity' },
  { category: 'vehicle_problems', code: 'accessibility_required', label: 'Accessibility vehicle required' },
  { category: 'operational_recovery', code: 'trip_late', label: 'Trip running late' },
  { category: 'operational_recovery', code: 'traffic_disruption', label: 'Traffic disruption' },
  { category: 'operational_recovery', code: 'rescue_assignment', label: 'Rescue assignment' },
  { category: 'operational_recovery', code: 'workload_balance', label: 'Workload balancing' },
  { category: 'customer_passenger_change', code: 'booking_amended', label: 'Customer amended booking' },
  { category: 'customer_passenger_change', code: 'passenger_cancelled', label: 'Passenger cancelled' },
  { category: 'customer_passenger_change', code: 'requirement_changed', label: 'Accessibility requirement changed' },
  { category: 'administrative', code: 'incorrect_assignment', label: 'Incorrect original assignment' },
  { category: 'administrative', code: 'scheduling_correction', label: 'Scheduling correction' },
  { category: 'administrative', code: 'other', label: 'Other', requiresNotes: true },
]

export const TRANSFER_PERMISSIONS = {
  dispatcher: ['transfer.reassign', 'transfer.vehicle', 'transfer.queue'],
  senior: ['transfer.live', 'transfer.split', 'transfer.swap', 'transfer.override'],
  dutyManager: ['transfer.handover', 'transfer.safeguarding'],
} as const

export const PASSENGER_FACING_TRANSFER_MESSAGE =
  'Your assigned driver or vehicle has changed. Your updated journey details are shown below.'
