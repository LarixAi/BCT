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

/** Coarse kanban lanes (VOR board pattern) — click Manage to transition, no drag-drop. */
export type WorkOrderKanbanLaneId =
  | 'intake'
  | 'workshop'
  | 'parts'
  | 'approval'
  | 'inspection'

export const WORK_ORDER_KANBAN_LANES: {
  id: WorkOrderKanbanLaneId
  label: string
  statuses: WorkOrderStatus[]
}[] = [
  {
    id: 'intake',
    label: 'Intake & planning',
    statuses: ['requested', 'awaiting_review', 'approved', 'scheduled'],
  },
  {
    id: 'workshop',
    label: 'Workshop',
    statuses: ['vehicle_awaiting_workshop', 'in_progress'],
  },
  {
    id: 'parts',
    label: 'Awaiting parts',
    statuses: ['awaiting_parts'],
  },
  {
    id: 'approval',
    label: 'Awaiting approval',
    statuses: ['awaiting_authorisation'],
  },
  {
    id: 'inspection',
    label: 'Ready for inspection',
    statuses: ['quality_check'],
  },
]

export function workOrderKanbanLaneId(status: WorkOrderStatus): WorkOrderKanbanLaneId | null {
  for (const lane of WORK_ORDER_KANBAN_LANES) {
    if (lane.statuses.includes(status)) return lane.id
  }
  return null
}

export function groupWorkOrdersByKanbanLane<T extends { status: WorkOrderStatus }>(
  rows: T[],
): Record<WorkOrderKanbanLaneId, T[]> {
  const grouped = Object.fromEntries(WORK_ORDER_KANBAN_LANES.map((l) => [l.id, [] as T[]])) as Record<
    WorkOrderKanbanLaneId,
    T[]
  >
  for (const row of rows) {
    const laneId = workOrderKanbanLaneId(row.status)
    if (laneId) grouped[laneId].push(row)
  }
  return grouped
}

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
