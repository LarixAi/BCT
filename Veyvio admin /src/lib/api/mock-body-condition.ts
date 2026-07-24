import type { BodyConditionHubData } from './types'

export function mockBodyConditionHub(): BodyConditionHubData {
  return {
    operationalDate: '2026-07-24',
    summary: {
      openDamageCases: 4,
      criticalDamage: 1,
      awaitingReview: 2,
      vehiclesVor: 1,
      repeatZoneAlerts: 1,
      inspectionsThisMonth: 18,
      pendingAcknowledgements: 1,
    },
    inspections: [
      {
        id: 'insp-bc-1',
        vehicleId: 'v3',
        inspectionType: 'end-shift-return',
        status: 'awaiting_review',
        startedAt: '2026-07-24T06:15:00Z',
        completedAt: '2026-07-24T06:28:00Z',
        referenceNumber: 'BI-2026-00012',
        recommendedVehicleStatus: 'repair_required',
      },
      {
        id: 'insp-bc-2',
        vehicleId: 'v1',
        inspectionType: 'routine-inspection',
        status: 'approved',
        startedAt: '2026-07-23T14:00:00Z',
        completedAt: '2026-07-23T14:22:00Z',
        referenceNumber: 'BI-2026-00011',
        approvedVehicleStatus: 'good',
      },
    ],
    damageCases: [
      {
        id: 'dmg-bc-1',
        vehicleId: 'v3',
        zoneId: 'nearside_rear_quarter',
        damageType: 'scuff',
        severity: 'operational',
        status: 'under_review',
        title: 'Scuff — nearside rear quarter',
        referenceNumber: 'BD-2026-00004-01',
        firstObservedAt: '2026-07-24T06:20:00Z',
      },
      {
        id: 'dmg-bc-2',
        vehicleId: 'v7',
        zoneId: 'front_bumper',
        damageType: 'crack',
        severity: 'safety_critical',
        status: 'under_review',
        title: 'Crack — front bumper',
        referenceNumber: 'BD-2026-00003-01',
        firstObservedAt: '2026-07-22T11:00:00Z',
        vorTriggered: true,
      },
    ],
    observations: [],
    repeatZones: ['nearside_rear_quarter'],
    trendAlerts: [
      {
        id: 'trend-nearside_rear_quarter',
        severity: 'attention',
        title: 'Repeated damage in nearside rear quarter',
        detail: '2 open cases in the same zone — review manoeuvring procedures.',
      },
    ],
  }
}
