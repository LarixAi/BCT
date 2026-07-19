import { describe, expect, it } from 'vitest'
import {
  WORK_ORDER_KANBAN_LANES,
  groupWorkOrdersByKanbanLane,
  workOrderKanbanLaneId,
} from './work-order-lifecycle'
import type { WorkOrderStatus } from '@/lib/vehicles/types'

describe('work order kanban lanes', () => {
  it('maps statuses to coarse lanes', () => {
    expect(workOrderKanbanLaneId('scheduled')).toBe('intake')
    expect(workOrderKanbanLaneId('in_progress')).toBe('workshop')
    expect(workOrderKanbanLaneId('awaiting_parts')).toBe('parts')
    expect(workOrderKanbanLaneId('awaiting_authorisation')).toBe('approval')
    expect(workOrderKanbanLaneId('quality_check')).toBe('inspection')
    expect(workOrderKanbanLaneId('completed')).toBeNull()
    expect(workOrderKanbanLaneId('cancelled')).toBeNull()
  })

  it('groups open work orders into lanes', () => {
    const rows = [
      { id: 'a', status: 'scheduled' as WorkOrderStatus },
      { id: 'b', status: 'awaiting_authorisation' as WorkOrderStatus },
      { id: 'c', status: 'quality_check' as WorkOrderStatus },
      { id: 'd', status: 'completed' as WorkOrderStatus },
    ]
    const grouped = groupWorkOrdersByKanbanLane(rows)
    expect(grouped.intake.map((r) => r.id)).toEqual(['a'])
    expect(grouped.approval.map((r) => r.id)).toEqual(['b'])
    expect(grouped.inspection.map((r) => r.id)).toEqual(['c'])
    expect(grouped.workshop).toEqual([])
    expect(grouped.parts).toEqual([])
    expect(WORK_ORDER_KANBAN_LANES).toHaveLength(5)
  })
})
