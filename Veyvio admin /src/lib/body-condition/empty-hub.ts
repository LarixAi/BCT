import type { BodyConditionHubData } from '@/lib/body-condition/types'

/** Fail-closed body condition hub when Command is unavailable. */
export function emptyBodyConditionHub(operationalDate = new Date().toISOString().slice(0, 10)): BodyConditionHubData {
  return {
    operationalDate,
    summary: {
      openDamageCases: 0,
      criticalDamage: 0,
      awaitingReview: 0,
      vehiclesVor: 0,
      repeatZoneAlerts: 0,
      inspectionsThisMonth: 0,
      pendingAcknowledgements: 0,
    },
    inspections: [],
    damageCases: [],
    observations: [],
    repeatZones: [],
    trendAlerts: [],
  }
}
