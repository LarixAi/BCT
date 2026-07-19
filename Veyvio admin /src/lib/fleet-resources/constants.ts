import type {
  BudgetHealth,
  EquipmentAssetStatus,
  FleetResourcesTab,
  FuelCardStatus,
  ResourceCategory,
  ResourceIntegrationCategory,
  ResourceIntegrationStatus,
  ResourceTransactionStatus,
  ResourceTransactionType,
  TyreAssetStatus,
} from './types'

export const FLEET_RESOURCES_TABS: { id: FleetResourcesTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'fuel', label: 'Fuel & Energy' },
  { id: 'fluids', label: 'Fluids' },
  { id: 'tyres', label: 'Tyres' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'stock', label: 'Stock' },
  { id: 'cards', label: 'Cards' },
  { id: 'purchasing', label: 'Purchasing' },
  { id: 'costs', label: 'Costs' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'finance', label: 'Finance' },
  { id: 'settings', label: 'Settings' },
]

export const RESOURCE_CATEGORY_LABEL: Record<ResourceCategory, string> = {
  fuel: 'Fuel',
  adblue: 'AdBlue',
  electricity: 'Electricity',
  tyre: 'Tyre',
  fluid: 'Fluid',
  part: 'Part',
  consumable: 'Consumable',
  equipment: 'Equipment',
  cleaning: 'Cleaning',
  safety_equipment: 'Safety equipment',
  accessibility_equipment: 'Accessibility equipment',
  card: 'Card',
}

export const TRANSACTION_TYPE_LABEL: Record<ResourceTransactionType, string> = {
  purchase: 'Purchase',
  issue: 'Issue',
  return: 'Return',
  transfer: 'Transfer',
  top_up: 'Top-up',
  dispense: 'Dispense',
  adjust: 'Adjust',
  dispose: 'Dispose',
  fit: 'Fit',
  remove: 'Remove',
}

export const TRANSACTION_STATUS_LABEL: Record<ResourceTransactionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  queried: 'Queried',
  reconciled: 'Reconciled',
  cancelled: 'Cancelled',
}

export const FUEL_CARD_STATUS_LABEL: Record<FuelCardStatus, string> = {
  unassigned: 'Unassigned',
  active: 'Active',
  suspended: 'Suspended',
  blocked: 'Blocked',
  lost: 'Lost',
  expired: 'Expired',
}

export const TYRE_STATUS_LABEL: Record<TyreAssetStatus, string> = {
  in_stock: 'In stock',
  fitted: 'Fitted',
  removed: 'Removed',
  quarantine: 'Quarantine',
  disposed: 'Disposed',
  awaiting_retorque: 'Awaiting re-torque',
}

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentAssetStatus, string> = {
  available: 'Available',
  assigned: 'Assigned',
  in_service: 'In service',
  missing: 'Missing',
  unserviceable: 'Unserviceable',
  expired: 'Expired',
}

export const INTEGRATION_CATEGORY_LABEL: Record<ResourceIntegrationCategory, string> = {
  fuel_card: 'Fuel card',
  telematics: 'Telematics',
  accounting: 'Accounting',
  supplier: 'Supplier invoices',
  ev_charging: 'EV charging',
  depot_dispenser: 'Depot dispenser',
}

export const INTEGRATION_STATUS_LABEL: Record<ResourceIntegrationStatus, string> = {
  connected: 'Connected',
  configured: 'Configured',
  available: 'Available',
  error: 'Error',
}

export const BUDGET_HEALTH_LABEL: Record<BudgetHealth, string> = {
  on_track: 'On track',
  watch: 'Watch',
  over: 'Over budget',
}

export const DEFAULT_FLEET_RESOURCES_SETTINGS = {
  requireReceiptAbove: 50,
  requireOdometer: true,
  blockPurchaseWhenVor: true,
  maxLitresPerTransaction: 200,
  managerApprovalAbove: 250,
  companyMpgBaseline: 9.5,
  minTreadDepthMm: 2.0,
  lowFuelPercent: 25,
} as const
