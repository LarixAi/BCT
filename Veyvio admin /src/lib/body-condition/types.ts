export interface BodyConditionHubSummary {
  openDamageCases: number
  criticalDamage: number
  awaitingReview: number
  vehiclesVor: number
  repeatZoneAlerts: number
  inspectionsThisMonth: number
  pendingAcknowledgements: number
}

export interface BodyConditionInspectionRow {
  id: string
  vehicleId: string
  inspectionType: string
  status: string
  startedAt: string
  completedAt?: string
  referenceNumber?: string
  recommendedVehicleStatus?: string
  approvedVehicleStatus?: string
}

export interface BodyConditionDamageCaseRow {
  id: string
  vehicleId: string
  zoneId: string
  damageType: string
  severity: string
  status: string
  title: string
  referenceNumber?: string
  firstObservedAt: string
  repairWorkOrderId?: string
  vorTriggered?: boolean
}

export interface BodyConditionTrendAlert {
  id: string
  severity: string
  title: string
  detail: string
}

export interface BodyConditionHubData {
  operationalDate: string
  summary: BodyConditionHubSummary
  inspections: BodyConditionInspectionRow[]
  damageCases: BodyConditionDamageCaseRow[]
  observations: unknown[]
  repeatZones: string[]
  trendAlerts: BodyConditionTrendAlert[]
}
