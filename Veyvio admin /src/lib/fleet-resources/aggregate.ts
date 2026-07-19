import type { VehicleProfile } from '@/lib/vehicles/types'
import { buildAnomalyInsights, buildConsumptionBaselines } from './anomaly-engine'
import { isMissingReceipt } from './fuel-rules'
import { buildStockForecasts } from './stock-forecast'
import type {
  BudgetLine,
  DepotStockRow,
  EquipmentAsset,
  FleetResourcesHubData,
  FleetResourcesSettings,
  FleetResourcesSummary,
  FuelCardRecord,
  PurchaseRequestRow,
  ResourceAlert,
  ResourceCatalogueItem,
  ResourceIntegration,
  ResourceTransaction,
  StockTransferRow,
  TyreAsset,
  VehicleResourceCostRow,
  WholeLifeCostRow,
} from './types'

function startOfMonth(): number {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function tyreNeedsAttention(tyre: TyreAsset, minTread: number): boolean {
  if (tyre.status === 'quarantine' || tyre.status === 'awaiting_retorque') return true
  if (tyre.recommendation) return true
  if (tyre.treadDepthMm != null && tyre.treadDepthMm < minTread) return true
  if (tyre.retorqueDueAt && new Date(tyre.retorqueDueAt).getTime() < Date.now()) return true
  return false
}

export function equipmentNeedsAttention(item: EquipmentAsset): boolean {
  return (
    item.status === 'missing' ||
    item.status === 'unserviceable' ||
    item.status === 'expired' ||
    (item.requiredForDuty && item.status === 'available' && !!item.vehicleId)
  )
}

export function buildVehicleCosts(
  transactions: ResourceTransaction[],
  profiles: VehicleProfile[] = [],
): VehicleResourceCostRow[] {
  const byVehicle = new Map<string, VehicleResourceCostRow>()
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  for (const tx of transactions) {
    if (!tx.vehicleId || !tx.registrationNumber) continue
    if (tx.status === 'cancelled' || tx.status === 'rejected') continue
    const amount = tx.grossAmount ?? 0
    let row = byVehicle.get(tx.vehicleId)
    if (!row) {
      const p = profileById.get(tx.vehicleId)
      row = {
        vehicleId: tx.vehicleId,
        registrationNumber: tx.registrationNumber,
        fleetNumber: p?.fleetNumber ?? null,
        depot: p?.currentDepotName || p?.homeDepotName || tx.depotName || '—',
        fuelSpend: 0,
        fluidSpend: 0,
        otherSpend: 0,
        totalSpend: 0,
        mileage: p?.mileage ?? null,
        costPerMile: null,
      }
      byVehicle.set(tx.vehicleId, row)
    }
    if (tx.resourceCategory === 'fuel' || tx.resourceCategory === 'electricity') {
      row.fuelSpend += amount
    } else if (tx.resourceCategory === 'adblue' || tx.resourceCategory === 'fluid') {
      row.fluidSpend += amount
    } else {
      row.otherSpend += amount
    }
    row.totalSpend = row.fuelSpend + row.fluidSpend + row.otherSpend
  }

  return [...byVehicle.values()]
    .map((row) => ({
      ...row,
      costPerMile:
        row.mileage != null && row.mileage > 0
          ? Math.round((row.totalSpend / Math.max(row.mileage / 1000, 0.1)) * 100) / 100
          : null,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
}

export function buildFleetResourcesSummary(
  transactions: ResourceTransaction[],
  stock: DepotStockRow[],
  cards: FuelCardRecord[],
  purchaseRequests: PurchaseRequestRow[],
  settings: FleetResourcesSettings,
  profiles: VehicleProfile[] = [],
  tyres: TyreAsset[] = [],
  equipment: EquipmentAsset[] = [],
): FleetResourcesSummary {
  const monthStart = startOfMonth()
  const monthTx = transactions.filter((t) => new Date(t.createdAt).getTime() >= monthStart)
  const spendThisMonth = monthTx.reduce((sum, t) => sum + (t.grossAmount ?? 0), 0)

  const fuelVehicleIds = new Set(
    profiles.filter((p) => (p.fuelLevelPercent ?? 100) < settings.lowFuelPercent).map((p) => p.id),
  )
  for (const t of transactions) {
    if (
      t.resourceCategory === 'fuel' &&
      t.fuelLevelBefore != null &&
      t.fuelLevelBefore < 20 &&
      t.vehicleId
    ) {
      fuelVehicleIds.add(t.vehicleId)
    }
  }

  const missingReceipts = transactions.filter((t) =>
    isMissingReceipt(t, settings.requireReceiptAbove),
  ).length

  const suspectedCardMisuse = transactions.filter(
    (t) =>
      t.anomalyFlags.includes('quantity_above_policy') ||
      (t.status === 'queried' && t.fuelCardId),
  ).length

  const lowDepotStock = stock.filter(
    (s) => s.status === 'low' || s.status === 'reorder' || s.status === 'out',
  ).length
  const unapprovedPurchases = purchaseRequests.filter((p) => p.status === 'pending').length
  const tyresNeedingAttention = tyres.filter((t) =>
    tyreNeedsAttention(t, settings.minTreadDepthMm),
  ).length
  const missingEquipment = equipment.filter((e) => equipmentNeedsAttention(e)).length

  return {
    lowFuelVehicles: fuelVehicleIds.size,
    lowAdBlueVehicles: stock.filter((s) => s.category === 'adblue' && s.status !== 'normal').length,
    missingReceipts,
    suspectedCardMisuse,
    tyresNeedingAttention,
    lowDepotStock,
    unapprovedPurchases,
    missingEquipment,
    resourceBlocks: cards.filter((c) => c.status === 'suspended' || c.status === 'blocked').length,
    spendThisMonth: Math.round(spendThisMonth * 100) / 100,
    costPerMileThisMonth:
      profiles.length > 0 && spendThisMonth > 0
        ? Math.round((spendThisMonth / profiles.length) * 100) / 100
        : null,
  }
}

export function buildResourceAlerts(
  summary: FleetResourcesSummary,
  transactions: ResourceTransaction[],
  stock: DepotStockRow[],
  purchaseRequests: PurchaseRequestRow[],
  tyres: TyreAsset[] = [],
  equipment: EquipmentAsset[] = [],
  settings?: FleetResourcesSettings,
): ResourceAlert[] {
  const alerts: ResourceAlert[] = []
  const minTread = settings?.minTreadDepthMm ?? 2

  for (const tx of transactions.filter((t) => t.anomalyFlags.includes('missing_receipt'))) {
    alerts.push({
      id: `alert-receipt-${tx.id}`,
      severity: 'high',
      title: 'Missing fuel receipt',
      detail: `${tx.registrationNumber ?? 'Vehicle'} — £${(tx.grossAmount ?? 0).toFixed(2)} needs a receipt before approval.`,
      vehicleId: tx.vehicleId,
      registrationNumber: tx.registrationNumber,
      depotName: tx.depotName,
      href: '/fleet-resources?tab=fuel&filter=missing_receipt',
    })
  }

  for (const tx of transactions.filter((t) => t.anomalyFlags.includes('quantity_above_policy'))) {
    alerts.push({
      id: `alert-qty-${tx.id}`,
      severity: 'critical',
      title: 'Fuel quantity above policy',
      detail: `${tx.registrationNumber ?? 'Vehicle'} — ${tx.quantity}${tx.unit} flagged for capacity review.`,
      vehicleId: tx.vehicleId,
      registrationNumber: tx.registrationNumber,
      depotName: tx.depotName,
      href: '/fleet-resources?tab=fuel&filter=anomaly',
    })
  }

  for (const s of stock.filter((row) => row.status === 'out' || row.status === 'reorder')) {
    alerts.push({
      id: `alert-stock-${s.id}`,
      severity: s.status === 'out' ? 'critical' : 'high',
      title: s.status === 'out' ? 'Depot stock out' : 'Depot stock below minimum',
      detail: `${s.depotName} — ${s.resourceName} at ${s.available}${s.unit} (min ${s.minimum}${s.unit}).`,
      vehicleId: null,
      registrationNumber: null,
      depotName: s.depotName,
      href: '/fleet-resources?tab=stock',
    })
  }

  for (const pr of purchaseRequests.filter((p) => p.status === 'pending')) {
    alerts.push({
      id: `alert-pr-${pr.id}`,
      severity: pr.urgency === 'emergency' ? 'critical' : pr.urgency === 'urgent' ? 'high' : 'medium',
      title: 'Purchase request awaiting approval',
      detail: `${pr.resourceName} × ${pr.quantity}${pr.unit} — ${pr.reason}`,
      vehicleId: pr.vehicleId,
      registrationNumber: pr.registrationNumber,
      depotName: pr.depotName,
      href: '/fleet-resources?tab=purchasing',
    })
  }

  for (const tyre of tyres.filter((t) => tyreNeedsAttention(t, minTread))) {
    alerts.push({
      id: `alert-tyre-${tyre.id}`,
      severity:
        tyre.status === 'quarantine' || (tyre.treadDepthMm != null && tyre.treadDepthMm < minTread)
          ? 'critical'
          : 'high',
      title: tyre.recommendation?.startsWith('Replace')
        ? 'Tyre replacement required'
        : 'Tyre needs attention',
      detail: `${tyre.registrationNumber ?? tyre.depotName ?? 'Depot'} — ${tyre.internalId} ${tyre.positionLabel ?? tyre.status}${tyre.recommendation ? `: ${tyre.recommendation}` : ''}`,
      vehicleId: tyre.vehicleId,
      registrationNumber: tyre.registrationNumber,
      depotName: tyre.depotName,
      href: '/fleet-resources?tab=tyres',
    })
  }

  for (const item of equipment.filter((e) => equipmentNeedsAttention(e))) {
    alerts.push({
      id: `alert-eq-${item.id}`,
      severity: item.status === 'missing' || item.status === 'expired' ? 'critical' : 'high',
      title: 'Equipment not ready',
      detail: `${item.registrationNumber ?? item.depotName ?? 'Depot'} — ${item.name} (${item.qrCode}) is ${item.status.replace(/_/g, ' ')}.`,
      vehicleId: item.vehicleId,
      registrationNumber: item.registrationNumber,
      depotName: item.depotName,
      href: '/fleet-resources?tab=equipment',
    })
  }

  if (summary.resourceBlocks > 0) {
    alerts.push({
      id: 'alert-cards-blocked',
      severity: 'medium',
      title: 'Fuel cards suspended or blocked',
      detail: `${summary.resourceBlocks} card(s) cannot be used until reviewed.`,
      vehicleId: null,
      registrationNumber: null,
      depotName: null,
      href: '/fleet-resources?tab=cards',
    })
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity])
}

export function buildFleetResourcesHub(input: {
  catalogue: ResourceCatalogueItem[]
  transactions: ResourceTransaction[]
  stock: DepotStockRow[]
  cards: FuelCardRecord[]
  purchaseRequests: PurchaseRequestRow[]
  settings: FleetResourcesSettings
  profiles?: VehicleProfile[]
  tyres?: TyreAsset[]
  equipment?: EquipmentAsset[]
  stockTransfers?: StockTransferRow[]
  integrations?: ResourceIntegration[]
  budgets?: BudgetLine[]
  wholeLife?: WholeLifeCostRow[]
}): FleetResourcesHubData {
  const profiles = input.profiles ?? []
  const tyres = input.tyres ?? []
  const equipment = input.equipment ?? []
  const summary = buildFleetResourcesSummary(
    input.transactions,
    input.stock,
    input.cards,
    input.purchaseRequests,
    input.settings,
    profiles,
    tyres,
    equipment,
  )
  return {
    summary,
    alerts: buildResourceAlerts(
      summary,
      input.transactions,
      input.stock,
      input.purchaseRequests,
      tyres,
      equipment,
      input.settings,
    ),
    catalogue: input.catalogue,
    transactions: [...input.transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    stock: input.stock,
    cards: input.cards,
    purchaseRequests: input.purchaseRequests,
    vehicleCosts: buildVehicleCosts(input.transactions, profiles),
    tyres,
    equipment,
    stockTransfers: input.stockTransfers ?? [],
    forecasts: buildStockForecasts(input.stock, input.transactions),
    anomalies: buildAnomalyInsights(input.transactions, input.settings),
    baselines: buildConsumptionBaselines(input.transactions, input.settings),
    integrations: input.integrations ?? [],
    budgets: input.budgets ?? [],
    wholeLife: input.wholeLife ?? [],
    settings: input.settings,
  }
}

export function filterFuelTransactions(
  transactions: ResourceTransaction[],
  filter: string,
  search: string,
): ResourceTransaction[] {
  let rows = transactions.filter(
    (t) => t.resourceCategory === 'fuel' || t.resourceCategory === 'electricity',
  )
  if (filter === 'missing_receipt') {
    rows = rows.filter((t) => t.anomalyFlags.includes('missing_receipt') || !t.receiptFileName)
  } else if (filter === 'anomaly') {
    rows = rows.filter((t) => t.anomalyFlags.length > 0)
  } else if (filter === 'pending') {
    rows = rows.filter((t) => t.status === 'pending_approval' || t.status === 'queried')
  }
  const q = search.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (t) =>
        (t.registrationNumber ?? '').toLowerCase().includes(q) ||
        (t.driverName ?? '').toLowerCase().includes(q) ||
        (t.supplierName ?? '').toLowerCase().includes(q),
    )
  }
  return rows
}

export function filterFluidTransactions(
  transactions: ResourceTransaction[],
  search: string,
): ResourceTransaction[] {
  let rows = transactions.filter(
    (t) => t.resourceCategory === 'adblue' || t.resourceCategory === 'fluid',
  )
  const q = search.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (t) =>
        (t.registrationNumber ?? '').toLowerCase().includes(q) ||
        t.resourceName.toLowerCase().includes(q) ||
        (t.depotName ?? '').toLowerCase().includes(q),
    )
  }
  return rows
}
