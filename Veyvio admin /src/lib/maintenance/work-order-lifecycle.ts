import type { WorkOrderStatus } from '@/lib/vehicles/types'

export const WORK_ORDER_PIPELINE: { id: WorkOrderStatus; label: string }[] = [
  { id: 'requested', label: 'Draft / requested' },
  { id: 'awaiting_review', label: 'Awaiting triage' },
  { id: 'approved', label: 'Approved' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'vehicle_awaiting_workshop', label: 'Awaiting workshop' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'awaiting_parts', label: 'Awaiting parts' },
  { id: 'awaiting_authorisation', label: 'Awaiting approval' },
  { id: 'quality_check', label: 'Ready for inspection' },
  { id: 'completed', label: 'Completed' },
]

const TRANSITIONS: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
  requested: ['awaiting_review', 'approved', 'cancelled'],
  awaiting_review: ['approved', 'cancelled'],
  approved: ['scheduled', 'cancelled'],
  scheduled: ['vehicle_awaiting_workshop', 'in_progress', 'cancelled'],
  vehicle_awaiting_workshop: ['in_progress', 'cancelled'],
  in_progress: ['awaiting_parts', 'awaiting_authorisation', 'quality_check', 'completed', 'cancelled'],
  awaiting_parts: ['in_progress', 'cancelled'],
  awaiting_authorisation: ['in_progress', 'quality_check', 'cancelled'],
  quality_check: ['completed', 'in_progress'],
  completed: [],
  cancelled: [],
}

export function allowedWorkOrderTransitions(status: WorkOrderStatus): WorkOrderStatus[] {
  return TRANSITIONS[status] ?? []
}

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return allowedWorkOrderTransitions(from).includes(to)
}
