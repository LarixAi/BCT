import { describe, expect, it } from 'vitest'
import { yardTaskToResourceInput, workOrderPartToResourceInput } from './cross-app'
import type { YardTask } from '@/lib/yard/types'

function task(partial: Partial<YardTask> & Pick<YardTask, 'taskType'>): YardTask {
  return {
    id: 'yt-x',
    depotId: 'depot-wembley',
    vehicleId: 'veh-1',
    registrationNumber: 'AB12 CDE',
    title: 'Test',
    priority: 'routine',
    status: 'in_progress',
    assignedStaffId: null,
    assignedStaffName: null,
    dueAt: null,
    instructions: null,
    evidenceRequired: false,
    blockingRelease: false,
    syncStatus: 'synced',
    createdAt: new Date().toISOString(),
    completedAt: null,
    createdBy: 'Test',
    ...partial,
  }
}

describe('yardTaskToResourceInput', () => {
  it('maps refuel to diesel dispense', () => {
    const input = yardTaskToResourceInput(task({ taskType: 'refuel' }), 'Alice Brown')
    expect(input?.resourceCategory).toBe('fuel')
    expect(input?.transactionType).toBe('dispense')
    expect(input?.vehicleId).toBe('veh-1')
  })

  it('ignores non-resource yard tasks', () => {
    expect(yardTaskToResourceInput(task({ taskType: 'return_inspection' }), 'Alice')).toBeNull()
  })
})

describe('workOrderPartToResourceInput', () => {
  it('classifies brake fluid as fluid issue', () => {
    const input = workOrderPartToResourceInput({
      vehicleId: 'veh-4',
      workOrderId: 'wo-4',
      partName: 'Brake fluid DOT 4',
      quantity: 2,
      unitCost: 12.5,
      actorName: 'Dave Wilson',
    })
    expect(input.resourceCategory).toBe('fluid')
    expect(input.transactionType).toBe('issue')
    expect(input.notes).toContain('wo-4')
  })
})
