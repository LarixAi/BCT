import type { WorkOrderEstimate } from '@/lib/vehicles/types'
import type { MaintenanceSupplier, PartsCatalogItem } from './types'

export const SEED_SUPPLIERS: MaintenanceSupplier[] = [
  {
    id: 'sup-1',
    name: 'Fleet Workshop',
    type: 'internal',
    approved: true,
    contactEmail: 'workshop@metrotransport.co.uk',
    services: ['Routine service', 'Brake repair', 'PMI', 'Bodywork'],
    labourRate: 65,
    slaHours: 48,
    performanceScore: 92,
    depotCoverage: ['Wembley Depot', 'Croydon Depot'],
  },
  {
    id: 'sup-2',
    name: 'Mercedes Commercial',
    type: 'franchise',
    approved: true,
    contactEmail: 'service@mercedes-vans.co.uk',
    services: ['Manufacturer service', 'Warranty repair', 'Recall'],
    labourRate: 95,
    slaHours: 72,
    performanceScore: 88,
    depotCoverage: ['Wembley Depot'],
  },
  {
    id: 'sup-3',
    name: 'BrakeTech Parts Ltd',
    type: 'parts',
    approved: true,
    contactEmail: 'orders@braketech.co.uk',
    services: ['Brake components', 'Fluids'],
    labourRate: null,
    slaHours: 24,
    performanceScore: 85,
    depotCoverage: ['Wembley Depot', 'Croydon Depot'],
  },
  {
    id: 'sup-4',
    name: 'TyrePro Fleet',
    type: 'external',
    approved: true,
    contactEmail: 'fleet@tyrepro.co.uk',
    services: ['Tyre replacement', 'Wheel alignment', 'Retorque'],
    labourRate: 55,
    slaHours: 24,
    performanceScore: 90,
    depotCoverage: ['Wembley Depot'],
  },
]

export const SEED_PARTS: PartsCatalogItem[] = [
  {
    id: 'part-1',
    name: 'Brake fluid DOT 4',
    partNumber: 'BF-DOT4-1L',
    supplierId: 'sup-3',
    unitCost: 12.5,
    vehicleTypes: ['minibus', 'coach'],
    reorderLevel: 10,
    stockOnHand: 6,
    location: 'Wembley stores',
    bin: 'A-12',
  },
  {
    id: 'part-2',
    name: 'Front brake pads set',
    partNumber: 'BP-FR-4421',
    supplierId: 'sup-3',
    unitCost: 89,
    vehicleTypes: ['minibus'],
    reorderLevel: 4,
    stockOnHand: 2,
    location: 'Wembley stores',
    bin: 'B-03',
  },
  {
    id: 'part-3',
    name: 'Oil filter',
    partNumber: 'OF-8842',
    supplierId: 'sup-2',
    unitCost: 18,
    vehicleTypes: ['minibus', 'accessible'],
    reorderLevel: 8,
    stockOnHand: 14,
    location: 'Wembley stores',
    bin: 'C-01',
  },
  {
    id: 'part-4',
    name: 'Tyre 215/65 R16',
    partNumber: 'TY-215-65',
    supplierId: 'sup-4',
    unitCost: 145,
    vehicleTypes: ['minibus'],
    reorderLevel: 6,
    stockOnHand: 4,
    location: 'Croydon stores',
    bin: 'T-07',
  },
]

export function isLowStock(part: PartsCatalogItem): boolean {
  return part.stockOnHand <= part.reorderLevel
}

export function buildEstimateFromCosts(input: {
  labourHours: number
  labourRate: number
  partsCost: number
  status?: WorkOrderEstimate['status']
  notes?: string | null
  submittedBy?: string | null
}): WorkOrderEstimate {
  const labourCost = Math.round(input.labourHours * input.labourRate * 100) / 100
  const partsCost = input.partsCost
  return {
    labourHours: input.labourHours,
    labourRate: input.labourRate,
    labourCost,
    partsCost,
    totalCost: Math.round((labourCost + partsCost) * 100) / 100,
    status: input.status ?? 'draft',
    submittedAt: input.status === 'submitted' || input.status === 'approved' ? new Date().toISOString() : null,
    submittedBy: input.submittedBy ?? null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    notes: input.notes ?? null,
  }
}
