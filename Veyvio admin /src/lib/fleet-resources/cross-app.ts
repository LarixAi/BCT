import type { YardTask } from '@/lib/yard/types'
import type { ResourceCategory, ResourceTransactionType } from './types'

/** Map completed yard tasks to a Fleet Resources ledger write. */
export function yardTaskToResourceInput(
  task: YardTask,
  actorName: string,
): {
  resourceCategory: ResourceCategory
  resourceItemId: string
  resourceName: string
  transactionType: ResourceTransactionType
  quantity: number
  unit: string
  vehicleId: string | null
  actorName: string
  notes: string
  depotName: string | null
} | null {
  if (task.taskType === 'refuel') {
    return {
      resourceCategory: 'fuel',
      resourceItemId: 'res-diesel',
      resourceName: 'Diesel',
      transactionType: 'dispense',
      quantity: 40,
      unit: 'L',
      vehicleId: task.vehicleId,
      actorName,
      notes: `Yard task ${task.id}: ${task.title}`,
      depotName: null,
    }
  }
  if (task.taskType === 'check_fluids') {
    return {
      resourceCategory: 'adblue',
      resourceItemId: 'res-adblue',
      resourceName: 'AdBlue',
      transactionType: 'dispense',
      quantity: 10,
      unit: 'L',
      vehicleId: task.vehicleId,
      actorName,
      notes: `Yard fluids check ${task.id}`,
      depotName: null,
    }
  }
  if (task.taskType === 'replenish_equipment') {
    return {
      resourceCategory: 'safety_equipment',
      resourceItemId: 'res-first-aid',
      resourceName: 'First aid kit',
      transactionType: 'issue',
      quantity: 1,
      unit: 'each',
      vehicleId: task.vehicleId,
      actorName,
      notes: `Yard equipment replenish ${task.id}`,
      depotName: null,
    }
  }
  return null
}

export function workOrderPartToResourceInput(input: {
  vehicleId: string
  workOrderId: string
  partName: string
  quantity: number
  unitCost: number
  actorName: string
}): {
  resourceCategory: ResourceCategory
  resourceItemId: string
  resourceName: string
  transactionType: ResourceTransactionType
  quantity: number
  unit: string
  unitPrice: number
  vehicleId: string
  actorName: string
  notes: string
} {
  const lower = input.partName.toLowerCase()
  let resourceCategory: ResourceCategory = 'part'
  let resourceItemId = 'res-wiper'
  let unit = 'each'
  if (lower.includes('adblue')) {
    resourceCategory = 'adblue'
    resourceItemId = 'res-adblue'
    unit = 'L'
  } else if (lower.includes('oil') || lower.includes('fluid') || lower.includes('coolant')) {
    resourceCategory = 'fluid'
    resourceItemId = lower.includes('brake') ? 'res-brake-fluid' : 'res-oil-5w30'
    unit = 'L'
  } else if (lower.includes('tyre') || lower.includes('tire')) {
    resourceCategory = 'tyre'
    resourceItemId = 'res-tyre-215'
  }

  return {
    resourceCategory,
    resourceItemId,
    resourceName: input.partName,
    transactionType: 'issue',
    quantity: input.quantity,
    unit,
    unitPrice: input.unitCost,
    vehicleId: input.vehicleId,
    actorName: input.actorName,
    notes: `Issued to work order ${input.workOrderId}`,
  }
}
