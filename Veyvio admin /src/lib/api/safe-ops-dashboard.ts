import type { DashboardSummary, LiveDispatchResponse } from '@/lib/api/types'
import { safeChecksHub, safeDefectsHub, safeYardHub } from '@/lib/api/safe-hubs'
import type { ChecksHubData } from '@/lib/checks/types'
import type { DefectsHubData } from '@/lib/defects/types'
import { DEFAULT_DEFECT_SLA } from '@/lib/defects/sla'
import type { DriverDirectorySummary } from '@/lib/drivers/types'
import { buildOpsDashboard, type OpsDashboardInput } from '@/lib/ops/build-ops-dashboard'
import type { OpsDashboardModel } from '@/lib/ops/ops-dashboard'
import type { VehicleDirectorySummary } from '@/lib/vehicles/types'
import type { YardHubData } from '@/lib/yard/types'

const EMPTY_DASHBOARD: DashboardSummary = {
  todaysActiveDuties: 0,
  vehiclesInService: 0,
  vehiclesOffRoad: 0,
  driversOnDuty: 0,
  openDefects: 0,
  openIncidents: 0,
  expiringDocuments: 0,
  alerts: [],
  navBadges: { defects: 0, compliance: 0 },
  timeline: [],
}

const EMPTY_LIVE: LiveDispatchResponse = {
  date: new Date().toISOString().slice(0, 10),
  generatedAt: new Date().toISOString(),
  trackingEnabled: false,
  vehicles: [],
}

const EMPTY_DRIVER_SUMMARY: DriverDirectorySummary = {
  totalActive: 0,
  eligibleToday: 0,
  notEligible: 0,
  documentsExpiringSoon: 0,
  invitePending: 0,
  onDuty: 0,
  onTrip: 0,
  suspendedOrRestricted: 0,
  appNotRecentlySynced: 0,
}

const EMPTY_VEHICLE_SUMMARY: VehicleDirectorySummary = {
  total: 0,
  totalActive: 0,
  availableNow: 0,
  currentlyAllocated: 0,
  inService: 0,
  attention: 0,
  vor: 0,
  inMaintenance: 0,
  checksOverdue: 0,
  complianceExpiring: 0,
  motDue: 0,
  tachographDue: 0,
  wheelRetorqueDue: 0,
  unknownLocation: 0,
}

const EMPTY_DEFECTS: DefectsHubData = {
  operationalDate: new Date().toISOString().slice(0, 10),
  summary: {
    openDefects: 0,
    addedToday: 0,
    safetyCritical: 0,
    allVor: 0,
    awaitingTriage: 0,
    oldestTriageHours: null,
    overdueRepairs: 0,
    overdueAffectingActive: 0,
    vehiclesVor: 0,
    awaitingVerification: 0,
  },
  register: [],
  priorityAlerts: [],
  depots: [],
  recurring: [],
  recurringInsights: [],
  slaSettings: { ...DEFAULT_DEFECT_SLA },
  automationRules: [],
  analytics: {
    byDepot: [],
    byCategory: [],
    bySource: [],
    slaBreaches: 0,
    avgAgeHours: 0,
    reopenedCount: 0,
    closedThisWeek: 0,
  },
}

export function safeOpsDashboardInput(partial: Partial<OpsDashboardInput>): OpsDashboardInput {
  return {
    dashboard: partial.dashboard ?? EMPTY_DASHBOARD,
    live: partial.live ?? EMPTY_LIVE,
    duties: partial.duties ?? [],
    yard: safeYardHub(partial.yard as YardHubData | null | undefined),
    checks: safeChecksHub(partial.checks as ChecksHubData | null | undefined),
    defects: safeDefectsHub(partial.defects ?? EMPTY_DEFECTS),
    driversSummary: partial.driversSummary ?? EMPTY_DRIVER_SUMMARY,
    vehiclesSummary: partial.vehiclesSummary ?? EMPTY_VEHICLE_SUMMARY,
    driverExceptions: partial.driverExceptions ?? [],
    vehicleExceptions: partial.vehicleExceptions ?? [],
    now: partial.now,
  }
}

export function buildSafeOpsDashboard(partial: Partial<OpsDashboardInput>): OpsDashboardModel {
  return buildOpsDashboard(safeOpsDashboardInput(partial))
}
