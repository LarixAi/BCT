import { DEFAULT_FLEET_RESOURCES_SETTINGS } from './constants'
import type { FleetResourcesHubData } from './types'

export function emptyFleetResourcesHub(): FleetResourcesHubData {
  return {
    summary: {
      lowFuelVehicles: 0,
      lowAdBlueVehicles: 0,
      missingReceipts: 0,
      suspectedCardMisuse: 0,
      tyresNeedingAttention: 0,
      lowDepotStock: 0,
      unapprovedPurchases: 0,
      missingEquipment: 0,
      resourceBlocks: 0,
      spendThisMonth: 0,
      costPerMileThisMonth: null,
    },
    alerts: [],
    catalogue: [],
    transactions: [],
    stock: [],
    cards: [],
    purchaseRequests: [],
    vehicleCosts: [],
    tyres: [],
    equipment: [],
    stockTransfers: [],
    forecasts: [],
    anomalies: [],
    baselines: [],
    integrations: [],
    budgets: [],
    wholeLife: [],
    settings: { ...DEFAULT_FLEET_RESOURCES_SETTINGS },
  }
}

export function safeFleetResourcesHub(
  hub: FleetResourcesHubData | null | undefined,
): FleetResourcesHubData {
  const empty = emptyFleetResourcesHub()
  if (!hub || typeof hub !== 'object') return empty
  return {
    summary: { ...empty.summary, ...(hub.summary ?? {}) },
    alerts: Array.isArray(hub.alerts) ? hub.alerts : [],
    catalogue: Array.isArray(hub.catalogue) ? hub.catalogue : [],
    transactions: Array.isArray(hub.transactions) ? hub.transactions : [],
    stock: Array.isArray(hub.stock) ? hub.stock : [],
    cards: Array.isArray(hub.cards) ? hub.cards : [],
    purchaseRequests: Array.isArray(hub.purchaseRequests) ? hub.purchaseRequests : [],
    vehicleCosts: Array.isArray(hub.vehicleCosts) ? hub.vehicleCosts : [],
    tyres: Array.isArray(hub.tyres) ? hub.tyres : [],
    equipment: Array.isArray(hub.equipment) ? hub.equipment : [],
    stockTransfers: Array.isArray(hub.stockTransfers) ? hub.stockTransfers : [],
    forecasts: Array.isArray(hub.forecasts) ? hub.forecasts : [],
    anomalies: Array.isArray(hub.anomalies) ? hub.anomalies : [],
    baselines: Array.isArray(hub.baselines) ? hub.baselines : [],
    integrations: Array.isArray(hub.integrations) ? hub.integrations : [],
    budgets: Array.isArray(hub.budgets) ? hub.budgets : [],
    wholeLife: Array.isArray(hub.wholeLife) ? hub.wholeLife : [],
    settings: { ...empty.settings, ...(hub.settings ?? {}) },
  }
}
