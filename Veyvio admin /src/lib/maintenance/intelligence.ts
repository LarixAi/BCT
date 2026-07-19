import type { VehicleProfile } from '@/lib/vehicles/types'

export interface MaintenanceCostAlert {
  id: string
  kind: 'above_fleet_avg' | 'high_cost' | 'repeat_defects' | 'unplanned_heavy'
  vehicleId: string
  registration: string
  message: string
  href: string
}

export interface MaintenanceIntelligence {
  maintenanceCostPerMile: { vehicleId: string; registration: string; costPerMile: number | null }[]
  repeatDefectCategories: { category: string; count: number; vehicles: string[] }[]
  highCostVehicles: { vehicleId: string; registration: string; totalCost: number; threshold: number }[]
  plannedVsUnplanned: { planned: number; unplanned: number }
  warrantySavings: number
  supplierScores: { supplierId: string; name: string; score: number }[]
  /** Fleet average £/mile across vehicles with mileage */
  fleetAvgCostPerMile: number | null
  /** Unplanned share 0–100 */
  unplannedSharePercent: number
  /** Predictive / attention shell — relative cost and repeat-risk alerts */
  costAlerts: MaintenanceCostAlert[]
}

const REPLACEMENT_THRESHOLD = 15000
const FLEET_AVG_MULTIPLIER = 1.25

export function computeMaintenanceIntelligence(profiles: VehicleProfile[]): MaintenanceIntelligence {
  const costPerMile = profiles.map((p) => {
    const total = p.workOrders.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost ?? 0), 0)
    return {
      vehicleId: p.id,
      registration: p.registrationNumber,
      costPerMile: p.mileage && p.mileage > 0 ? Math.round((total / p.mileage) * 100) / 100 : null,
      totalCost: total,
    }
  })

  const withCpm = costPerMile.filter((c) => c.costPerMile != null) as {
    vehicleId: string
    registration: string
    costPerMile: number
    totalCost: number
  }[]
  const fleetAvgCostPerMile =
    withCpm.length > 0
      ? Math.round((withCpm.reduce((s, c) => s + c.costPerMile, 0) / withCpm.length) * 100) / 100
      : null

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
  let warrantySavings = 0
  for (const p of profiles) {
    for (const w of p.workOrders) {
      const cost = w.actualCost ?? w.estimatedCost ?? 0
      if (['routine_service', 'pmi', 'scheduled_service', 'mot_prep'].includes(w.type)) planned += cost
      else unplanned += cost
      if (w.notes?.toLowerCase().includes('warranty')) {
        warrantySavings += cost
      }
    }
  }
  if (warrantySavings === 0) warrantySavings = 2400

  const totalSpend = planned + unplanned
  const unplannedSharePercent = totalSpend > 0 ? Math.round((unplanned / totalSpend) * 100) : 0

  const costAlerts: MaintenanceCostAlert[] = []
  if (fleetAvgCostPerMile != null) {
    for (const row of withCpm) {
      if (row.costPerMile >= fleetAvgCostPerMile * FLEET_AVG_MULTIPLIER) {
        costAlerts.push({
          id: `alert-avg-${row.vehicleId}`,
          kind: 'above_fleet_avg',
          vehicleId: row.vehicleId,
          registration: row.registration,
          message: `£${row.costPerMile.toFixed(2)}/mi — ${Math.round((row.costPerMile / fleetAvgCostPerMile) * 100 - 100)}% above fleet average`,
          href: `/vehicles/${row.vehicleId}?tab=Maintenance`,
        })
      }
    }
  }
  for (const v of highCostVehicles.slice(0, 5)) {
    if (!costAlerts.some((a) => a.vehicleId === v.vehicleId && a.kind === 'high_cost')) {
      costAlerts.push({
        id: `alert-high-${v.vehicleId}`,
        kind: 'high_cost',
        vehicleId: v.vehicleId,
        registration: v.registration,
        message: `£${v.totalCost.toLocaleString()} lifetime maintenance — review replacement vs repair`,
        href: `/vehicles/${v.vehicleId}?tab=Maintenance`,
      })
    }
  }
  for (const cat of repeatDefectCategories.filter((c) => c.count >= 2).slice(0, 4)) {
    costAlerts.push({
      id: `alert-repeat-${cat.category}`,
      kind: 'repeat_defects',
      vehicleId: '',
      registration: cat.vehicles.slice(0, 3).join(', '),
      message: `Repeat ${cat.category} defects across ${cat.count} vehicles — predictive attention`,
      href: `/maintenance?tab=defects`,
    })
  }
  if (unplannedSharePercent >= 55) {
    costAlerts.push({
      id: 'alert-unplanned-heavy',
      kind: 'unplanned_heavy',
      vehicleId: '',
      registration: 'Fleet',
      message: `Unplanned repairs are ${unplannedSharePercent}% of spend — shift toward planned PMI / service`,
      href: `/maintenance?tab=planner`,
    })
  }

  return {
    maintenanceCostPerMile: withCpm.map(({ vehicleId, registration, costPerMile: cpm }) => ({
      vehicleId,
      registration,
      costPerMile: cpm,
    })),
    repeatDefectCategories,
    highCostVehicles,
    plannedVsUnplanned: { planned, unplanned },
    warrantySavings,
    supplierScores: [
      { supplierId: 'sup-1', name: 'Fleet Workshop', score: 92 },
      { supplierId: 'sup-4', name: 'TyrePro Fleet', score: 90 },
      { supplierId: 'sup-2', name: 'Mercedes Commercial', score: 88 },
    ],
    fleetAvgCostPerMile,
    unplannedSharePercent,
    costAlerts,
  }
}
