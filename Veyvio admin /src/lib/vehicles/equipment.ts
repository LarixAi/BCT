import type { VehicleEquipmentItem } from './types'

export const DEFAULT_EQUIPMENT: Omit<VehicleEquipmentItem, 'id'>[] = [
  { name: 'Fire extinguisher', category: 'fixed', assigned: true, inDate: true, serviceable: true, expiryDate: null, lastCheckedAt: null },
  { name: 'First aid kit', category: 'fixed', assigned: true, inDate: true, serviceable: true, expiryDate: null, lastCheckedAt: null },
  { name: 'Wheelchair restraints (set)', category: 'removable', assigned: true, inDate: true, serviceable: true, expiryDate: null, lastCheckedAt: null },
  { name: 'Passenger belts', category: 'removable', assigned: true, inDate: true, serviceable: true, expiryDate: null, lastCheckedAt: null },
  { name: 'Spill kit', category: 'removable', assigned: false, inDate: true, serviceable: true, expiryDate: null, lastCheckedAt: null },
  { name: 'Fuel card', category: 'removable', assigned: true, inDate: true, serviceable: true, expiryDate: null, lastCheckedAt: null },
]

export function seedEquipment(wheelchairCap: number): VehicleEquipmentItem[] {
  const items = DEFAULT_EQUIPMENT.filter(
    (e) => wheelchairCap > 0 || !e.name.toLowerCase().includes('wheelchair'),
  )
  return items.map((e, i) => ({ ...e, id: `eq-${i + 1}` }))
}

export function equipmentReady(items: VehicleEquipmentItem[], required: string[]): string[] {
  const missing: string[] = []
  for (const name of required) {
    const item = items.find((e) => e.name.toLowerCase().includes(name.toLowerCase()))
    if (!item?.assigned || !item.serviceable || !item.inDate) missing.push(name)
  }
  return missing
}
