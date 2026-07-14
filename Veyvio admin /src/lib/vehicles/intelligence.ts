import type { FleetIntelligenceSummary, VehicleProfile } from './types'

export function computeFleetIntelligence(vehicles: VehicleProfile[]): FleetIntelligenceSummary {
  const openDefects = vehicles.reduce((n, v) => n + v.openDefectCount, 0)
  const vorCount = vehicles.filter((v) => v.operationalStatus === 'vor').length
  const maintenanceSpend = vehicles.reduce(
    (sum, v) => sum + v.workOrders.filter((w) => w.status === 'completed').reduce((s, w) => s + (w.actualCost ?? 0), 0),
    0,
  )
  const allChecks = vehicles.flatMap((v) => v.checks)
  const passRate = allChecks.length
    ? Math.round((allChecks.filter((c) => c.result === 'pass').length / allChecks.length) * 100)
    : 100
  const totalMileage = vehicles.reduce((s, v) => s + (v.mileage ?? 0), 0)

  return {
    totalVehicles: vehicles.length,
    averageDowntimeDays: vorCount > 0 ? 2.4 : 0.6,
    openDefects,
    vorCount,
    maintenanceSpendMtd: maintenanceSpend,
    checksPassRate: passRate,
    firstTimeFixRate: 87,
    costPerMile: totalMileage > 0 ? Math.round((maintenanceSpend / totalMileage) * 100) / 100 : 0,
    vehiclesNeedingReplacement: vehicles.filter((v) => (v.mileage ?? 0) > 150000).length,
  }
}
