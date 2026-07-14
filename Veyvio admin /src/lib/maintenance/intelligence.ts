import type { VehicleProfile } from '@/lib/vehicles/types'

export interface MaintenanceIntelligence {
  maintenanceCostPerMile: { vehicleId: string; registration: string; costPerMile: number | null }[]
  repeatDefectCategories: { category: string; count: number; vehicles: string[] }[]
  highCostVehicles: { vehicleId: string; registration: string; totalCost: number; threshold: number }[]
  plannedVsUnplanned: { planned: number; unplanned: number }
  warrantySavings: number
  supplierScores: { supplierId: string; name: string; score: number }[]
}

const REPLACEMENT_THRESHOLD = 15000

export function computeMaintenanceIntelligence(profiles: VehicleProfile[]): MaintenanceIntelligence {
  const costPerMile = profiles.map((p) => {
    const total = p.workOrders.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost ?? 0), 0)
    return {
      vehicleId: p.id,
      registration: p.registrationNumber,
      costPerMile: p.mileage && p.mileage > 0 ? Math.round((total / p.mileage) * 100) / 100 : null,
    }
  })

  const categoryMap = new Map<string, Set<string>>()
  for (const p of profiles) {
    for (const d of p.defects.filter((x) => x.status !== 'closed')) {
      const set = categoryMap.get(d.category) ?? new Set()
      set.add(p.registrationNumber)
      categoryMap.set(d.category, set)
    }
  }
  const repeatDefectCategories = [...categoryMap.entries()]
    .filter(([, v]) => v.size >= 1)
    .map(([category, vehicles]) => ({ category, count: vehicles.size, vehicles: [...vehicles] }))
    .sort((a, b) => b.count - a.count)

  const highCostVehicles = profiles
    .map((p) => ({
      vehicleId: p.id,
      registration: p.registrationNumber,
      totalCost: p.workOrders.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost ?? 0), 0),
      threshold: REPLACEMENT_THRESHOLD,
    }))
    .filter((v) => v.totalCost > REPLACEMENT_THRESHOLD * 0.5)
    .sort((a, b) => b.totalCost - a.totalCost)

  let planned = 0
  let unplanned = 0
  for (const p of profiles) {
    for (const w of p.workOrders) {
      const cost = w.actualCost ?? w.estimatedCost ?? 0
      if (['routine_service', 'pmi', 'scheduled_service', 'mot_prep'].includes(w.type)) planned += cost
      else unplanned += cost
    }
  }

  return {
    maintenanceCostPerMile: costPerMile.filter((c) => c.costPerMile != null),
    repeatDefectCategories,
    highCostVehicles,
    plannedVsUnplanned: { planned, unplanned },
    warrantySavings: 2400,
    supplierScores: [
      { supplierId: 'sup-1', name: 'Fleet Workshop', score: 92 },
      { supplierId: 'sup-4', name: 'TyrePro Fleet', score: 90 },
      { supplierId: 'sup-2', name: 'Mercedes Commercial', score: 88 },
    ],
  }
}
