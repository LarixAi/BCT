export type ResourceCategory =
  | 'fuel'
  | 'adblue'
  | 'electricity'
  | 'tyre'
  | 'fluid'
  | 'part'
  | 'consumable'
  | 'equipment'
  | 'cleaning'
  | 'safety_equipment'
  | 'accessibility_equipment'
  | 'card'

export type ResourceTransactionType =
  | 'purchase'
  | 'issue'
  | 'return'
  | 'transfer'
  | 'top_up'
  | 'dispense'
  | 'adjust'
  | 'dispose'
  | 'fit'
  | 'remove'

export type ResourceTransactionStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'queried'
  | 'reconciled'
  | 'cancelled'

export type FuelCardStatus =
  | 'unassigned'
  | 'active'
  | 'suspended'
  | 'blocked'
  | 'lost'
  | 'expired'

export type FleetResourcesTab =
  | 'overview'
  | 'fuel'
  | 'fluids'
  | 'tyres'
  | 'equipment'
  | 'stock'
  | 'cards'
  | 'purchasing'
  | 'costs'
  | 'analytics'
  | 'integrations'
  | 'finance'
  | 'settings'

export type TyreAssetStatus =
  | 'in_stock'
  | 'fitted'
  | 'removed'
  | 'quarantine'
  | 'disposed'
  | 'awaiting_retorque'

export type EquipmentAssetStatus =
  | 'available'
  | 'assigned'
  | 'in_service'
  | 'missing'
  | 'unserviceable'
  | 'expired'

export type ResourceIntegrationCategory =
  | 'fuel_card'
  | 'telematics'
  | 'accounting'
  | 'supplier'
  | 'ev_charging'
  | 'depot_dispenser'

export type ResourceIntegrationStatus = 'connected' | 'configured' | 'available' | 'error'

export type BudgetHealth = 'on_track' | 'watch' | 'over'

export interface ResourceCatalogueItem {
  id: string
  category: ResourceCategory
  sku: string
  name: string
  unit: string
  safetyCritical: boolean
  reorderLevel: number
  compatibleVehicleClasses: string[]
}

export interface ResourceTransaction {
  id: string
  depotId: string | null
  depotName: string | null
  resourceCategory: ResourceCategory
  resourceItemId: string
  resourceName: string
  transactionType: ResourceTransactionType
  quantity: number
  unit: string
  unitPrice: number | null
  vatAmount: number | null
  grossAmount: number | null
  vehicleId: string | null
  registrationNumber: string | null
  driverId: string | null
  driverName: string | null
  staffName: string | null
  supplierName: string | null
  workOrderId: string | null
  defectId: string | null
  odometer: number | null
  fuelLevelBefore: number | null
  fuelLevelAfter: number | null
  fullTank: boolean | null
  receiptFileName: string | null
  fuelCardId: string | null
  status: ResourceTransactionStatus
  anomalyFlags: string[]
  notes: string | null
  createdAt: string
  createdBy: string
  approvedBy: string | null
}

export interface DepotStockRow {
  id: string
  depotId: string
  depotName: string
  resourceItemId: string
  resourceName: string
  category: ResourceCategory
  available: number
  reserved: number
  minimum: number
  unit: string
  status: 'normal' | 'low' | 'reorder' | 'out'
}

export interface FuelCardRecord {
  id: string
  provider: string
  maskedNumber: string
  status: FuelCardStatus
  assignmentModel: 'vehicle' | 'driver' | 'depot'
  assignedVehicleId: string | null
  assignedRegistration: string | null
  assignedDriverName: string | null
  dailyLimit: number | null
  lastTransactionAt: string | null
}

export interface PurchaseRequestRow {
  id: string
  resourceName: string
  quantity: number
  unit: string
  estimatedCost: number
  vehicleId: string | null
  registrationNumber: string | null
  depotName: string | null
  reason: string
  urgency: 'routine' | 'urgent' | 'emergency'
  status: 'pending' | 'approved' | 'rejected'
  requestedBy: string
  neededBy: string | null
  createdAt: string
}

export interface VehicleResourceCostRow {
  vehicleId: string
  registrationNumber: string
  fleetNumber: string | null
  depot: string
  fuelSpend: number
  fluidSpend: number
  otherSpend: number
  totalSpend: number
  mileage: number | null
  costPerMile: number | null
}

export interface FleetResourcesSummary {
  lowFuelVehicles: number
  lowAdBlueVehicles: number
  missingReceipts: number
  suspectedCardMisuse: number
  tyresNeedingAttention: number
  lowDepotStock: number
  unapprovedPurchases: number
  missingEquipment: number
  resourceBlocks: number
  spendThisMonth: number
  costPerMileThisMonth: number | null
}

export interface ResourceAlert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  detail: string
  vehicleId: string | null
  registrationNumber: string | null
  depotName: string | null
  href: string
}

export interface TyreAsset {
  id: string
  internalId: string
  brand: string
  size: string
  dotCode: string
  status: TyreAssetStatus
  treadDepthMm: number | null
  pressurePsi: number | null
  vehicleId: string | null
  registrationNumber: string | null
  position: string | null
  positionLabel: string | null
  depotId: string | null
  depotName: string | null
  fittedAt: string | null
  removedAt: string | null
  retorqueDueAt: string | null
  recommendation: string | null
  linkedDefectId: string | null
  linkedInspectionId: string | null
  unitCost: number | null
}

export interface EquipmentAsset {
  id: string
  qrCode: string
  name: string
  category: 'safety_equipment' | 'accessibility_equipment' | 'equipment' | 'cleaning'
  status: EquipmentAssetStatus
  vehicleId: string | null
  registrationNumber: string | null
  depotId: string | null
  depotName: string | null
  expiryDate: string | null
  lastCheckedAt: string | null
  requiredForDuty: boolean
}

export interface StockTransferRow {
  id: string
  resourceItemId: string
  resourceName: string
  quantity: number
  unit: string
  fromDepotId: string
  fromDepotName: string
  toDepotId: string
  toDepotName: string
  status: 'pending' | 'in_transit' | 'received' | 'cancelled'
  requestedBy: string
  createdAt: string
}

export interface StockForecastRow {
  resourceItemId: string
  resourceName: string
  depotName: string
  available: number
  unit: string
  projectedDemand7d: number
  daysUntilStockout: number | null
  recommendation: string
}

export interface FuelAnomalyInsight {
  id: string
  severity: 'critical' | 'high' | 'medium'
  title: string
  detail: string
  transactionId: string | null
  vehicleId: string | null
  registrationNumber: string | null
  flags: string[]
}

export interface ConsumptionBaseline {
  vehicleId: string
  registrationNumber: string
  mpgActual: number | null
  mpgBaseline: number
  variancePct: number | null
  status: 'ok' | 'watch' | 'investigate'
}

export interface ResourceIntegration {
  id: string
  provider: string
  category: ResourceIntegrationCategory
  status: ResourceIntegrationStatus
  lastSyncAt: string | null
  notes: string
}

export interface BudgetLine {
  id: string
  costCentre: string
  category: string
  period: string
  budgetAmount: number
  spentAmount: number
  forecastAmount: number
  status: BudgetHealth
}

export interface WholeLifeCostRow {
  vehicleId: string
  registrationNumber: string
  resourceSpendYtd: number
  estimatedRemainingLifeYears: number | null
  replacementSuggested: boolean
  reason: string | null
}

export interface FleetResourcesHubData {
  summary: FleetResourcesSummary
  alerts: ResourceAlert[]
  catalogue: ResourceCatalogueItem[]
  transactions: ResourceTransaction[]
  stock: DepotStockRow[]
  cards: FuelCardRecord[]
  purchaseRequests: PurchaseRequestRow[]
  vehicleCosts: VehicleResourceCostRow[]
  tyres: TyreAsset[]
  equipment: EquipmentAsset[]
  stockTransfers: StockTransferRow[]
  forecasts: StockForecastRow[]
  anomalies: FuelAnomalyInsight[]
  baselines: ConsumptionBaseline[]
  integrations: ResourceIntegration[]
  budgets: BudgetLine[]
  wholeLife: WholeLifeCostRow[]
  settings: FleetResourcesSettings
}

export interface FleetResourcesSettings {
  requireReceiptAbove: number
  requireOdometer: boolean
  blockPurchaseWhenVor: boolean
  maxLitresPerTransaction: number
  managerApprovalAbove: number
  companyMpgBaseline: number
  minTreadDepthMm: number
  lowFuelPercent: number
}
