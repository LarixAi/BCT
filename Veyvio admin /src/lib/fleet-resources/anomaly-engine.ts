import type {
  ConsumptionBaseline,
  FleetResourcesSettings,
  FuelAnomalyInsight,
  ResourceTransaction,
} from './types'
import { flagFuelAnomalies } from './fuel-rules'

/** Phase 3: enrich transaction flags with MPG / odometer / location heuristics. */
export function enrichFuelAnomalies(
  tx: ResourceTransaction,
  prior: ResourceTransaction | undefined,
  settings: FleetResourcesSettings,
): string[] {
  const flags = new Set(
    flagFuelAnomalies(tx, {
      maxLitres: settings.maxLitresPerTransaction,
      requireReceiptAbove: settings.requireReceiptAbove,
      requireOdometer: settings.requireOdometer,
    }),
  )
  for (const f of Array.isArray(tx.anomalyFlags) ? tx.anomalyFlags : []) flags.add(f)

  if (prior?.odometer != null && tx.odometer != null && tx.odometer < prior.odometer) {
    flags.add('odometer_regression')
  }

  if (
    prior?.odometer != null &&
    tx.odometer != null &&
    tx.quantity > 0 &&
    tx.resourceCategory === 'fuel' &&
    tx.odometer > prior.odometer
  ) {
    const miles = tx.odometer - prior.odometer
    const gallons = tx.quantity / 4.546
    if (miles > 20 && gallons > 0) {
      const mpg = miles / gallons
      if (mpg < settings.companyMpgBaseline * 0.55) flags.add('mpg_below_baseline')
      if (mpg > settings.companyMpgBaseline * 1.8) flags.add('mpg_suspiciously_high')
    }
  }

  if (tx.fuelLevelBefore != null && tx.fuelLevelAfter != null && tx.fuelLevelAfter < tx.fuelLevelBefore) {
    flags.add('fuel_level_decreased_after_topup')
  }

  return [...flags]
}

export function buildAnomalyInsights(
  transactions: ResourceTransaction[],
  settings: FleetResourcesSettings,
): FuelAnomalyInsight[] {
  const fuel = transactions
    .filter((t) => t.resourceCategory === 'fuel' || t.resourceCategory === 'electricity')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const lastByVehicle = new Map<string, ResourceTransaction>()
  const insights: FuelAnomalyInsight[] = []

  for (const tx of fuel) {
    const prior = tx.vehicleId ? lastByVehicle.get(tx.vehicleId) : undefined
    const flags = enrichFuelAnomalies(tx, prior, settings)
    if (tx.vehicleId) lastByVehicle.set(tx.vehicleId, tx)
    if (flags.length === 0) continue

    const severity: FuelAnomalyInsight['severity'] = flags.includes('odometer_regression')
      || flags.includes('quantity_above_policy')
      ? 'critical'
      : flags.includes('mpg_below_baseline') || flags.includes('missing_receipt')
        ? 'high'
        : 'medium'

    insights.push({
      id: `anom-${tx.id}`,
      severity,
      title: flags.includes('odometer_regression')
        ? 'Odometer moved backwards'
        : flags.includes('mpg_below_baseline')
          ? 'Consumption below baseline'
          : flags.includes('quantity_above_policy')
            ? 'Fill above policy capacity'
            : 'Fuel transaction needs review',
      detail: `${tx.registrationNumber ?? 'Vehicle'} — ${flags.join(', ').replace(/_/g, ' ')}`,
      transactionId: tx.id,
      vehicleId: tx.vehicleId,
      registrationNumber: tx.registrationNumber,
      flags,
    })
  }

  const order = { critical: 0, high: 1, medium: 2 }
  return insights.sort((a, b) => order[a.severity] - order[b.severity])
}

export function buildConsumptionBaselines(
  transactions: ResourceTransaction[],
  settings: FleetResourcesSettings,
): ConsumptionBaseline[] {
  const byVehicle = new Map<string, ResourceTransaction[]>()
  for (const tx of transactions) {
    if (tx.resourceCategory !== 'fuel' || !tx.vehicleId || tx.odometer == null) continue
    const list = byVehicle.get(tx.vehicleId) ?? []
    list.push(tx)
    byVehicle.set(tx.vehicleId, list)
  }

  const rows: ConsumptionBaseline[] = []
  for (const [vehicleId, list] of byVehicle) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    let miles = 0
    let litres = 0
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      if (prev.odometer != null && cur.odometer != null && cur.odometer > prev.odometer) {
        miles += cur.odometer - prev.odometer
        litres += cur.quantity
      }
    }
    const gallons = litres / 4.546
    const mpgActual = miles > 20 && gallons > 0 ? Math.round((miles / gallons) * 10) / 10 : null
    const variancePct =
      mpgActual != null
        ? Math.round(((mpgActual - settings.companyMpgBaseline) / settings.companyMpgBaseline) * 100)
        : null
    const status: ConsumptionBaseline['status'] =
      variancePct == null
        ? 'ok'
        : variancePct < -35
          ? 'investigate'
          : variancePct < -15
            ? 'watch'
            : 'ok'

    rows.push({
      vehicleId,
      registrationNumber: sorted[0]?.registrationNumber ?? vehicleId,
      mpgActual,
      mpgBaseline: settings.companyMpgBaseline,
      variancePct,
      status,
    })
  }
  return rows.sort((a, b) => (a.variancePct ?? 0) - (b.variancePct ?? 0))
}
