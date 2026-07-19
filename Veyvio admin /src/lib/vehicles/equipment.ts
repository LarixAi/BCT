import type { VehicleEquipmentItem } from './types'

export const DEFAULT_EQUIPMENT: Omit<VehicleEquipmentItem, 'id'>[] = [
  {
    name: 'Fire extinguisher',
    category: 'fixed',
    assigned: true,
    inDate: true,
    serviceable: true,
    expiryDate: '2028-01-15',
    lastCheckedAt: '2026-07-18T09:00:00.000Z',
    assetNumber: 'FE-014',
    qrCode: 'EQ-FE-014',
    replacementValue: 45,
    conditionLabel: 'good',
  },
  {
    name: 'First aid kit',
    category: 'fixed',
    assigned: true,
    inDate: true,
    serviceable: true,
    expiryDate: '2027-06-01',
    lastCheckedAt: '2026-07-18T09:00:00.000Z',
    assetNumber: 'FA-014',
    qrCode: 'EQ-FA-014',
    replacementValue: 28,
    conditionLabel: 'good',
  },
  {
    name: 'Glass hammer',
    category: 'fixed',
    assigned: true,
    inDate: true,
    serviceable: true,
    expiryDate: null,
    lastCheckedAt: '2026-07-17T16:20:00.000Z',
    assetNumber: 'GH-014',
    qrCode: 'EQ-GH-014',
    replacementValue: 12,
    conditionLabel: 'good',
  },
  {
    name: 'Wheelchair restraints (set)',
    category: 'removable',
    assigned: true,
    inDate: true,
    serviceable: true,
    expiryDate: null,
    lastCheckedAt: '2026-07-16T11:00:00.000Z',
    assetNumber: 'WC-040',
    qrCode: 'EQ-WC-040',
    replacementValue: 180,
    conditionLabel: 'good',
  },
  {
    name: 'Passenger belts',
    category: 'removable',
    assigned: true,
    inDate: true,
    serviceable: true,
    expiryDate: null,
    lastCheckedAt: '2026-07-16T11:00:00.000Z',
    assetNumber: null,
    qrCode: null,
    replacementValue: null,
    conditionLabel: 'good',
  },
  {
    name: 'Spill kit',
    category: 'removable',
    assigned: false,
    inDate: true,
    serviceable: true,
    expiryDate: null,
    lastCheckedAt: null,
    assetNumber: 'SK-STOCK-02',
    qrCode: 'EQ-SK-02',
    replacementValue: 35,
    conditionLabel: 'missing',
  },
  {
    name: 'Fuel card',
    category: 'removable',
    assigned: true,
    inDate: true,
    serviceable: true,
    expiryDate: '2027-12-31',
    lastCheckedAt: '2026-07-10T08:00:00.000Z',
    assetNumber: 'FC-014',
    qrCode: null,
    replacementValue: null,
    conditionLabel: 'good',
  },
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

export function equipmentNeedsAttention(item: VehicleEquipmentItem): boolean {
  if (!item.assigned) return true
  if (!item.serviceable || !item.inDate) return true
  if (item.conditionLabel === 'missing' || item.conditionLabel === 'damaged' || item.conditionLabel === 'expired') {
    return true
  }
  if (item.expiryDate && new Date(item.expiryDate).getTime() < Date.now()) return true
  return false
}
