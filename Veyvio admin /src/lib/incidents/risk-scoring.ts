import type { IncidentRegisterRow, IncidentRiskScore, StoredIncident } from './types'

function bandFromScore(score: number): IncidentRiskScore['band'] {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

export function computeIncidentRiskScore(
  inc: {
    severity: StoredIncident['severity']
    category: StoredIncident['category']
    isSafeguarding: boolean
    warningFlags?: IncidentRegisterRow['warningFlags']
    vehicleStillOperational: boolean
    driverStillAssigned: boolean
    isAcknowledged: boolean
    recurringCount?: number
  },
): IncidentRiskScore {
  let score = 0
  const factors: string[] = []

  const severityWeight: Record<string, number> = {
    critical: 40,
    high: 28,
    medium: 16,
    low: 8,
    near_miss: 12,
  }
  score += severityWeight[inc.severity] ?? 10
  factors.push(`${inc.severity} severity`)

  if (inc.isSafeguarding) {
    score += 25
    factors.push('Safeguarding case')
  }
  if (!inc.isAcknowledged) {
    score += 10
    factors.push('Unacknowledged')
  }
  if (inc.vehicleStillOperational && inc.severity !== 'near_miss' && inc.severity !== 'low') {
    score += 12
    factors.push('Vehicle still operational')
  }
  if (inc.driverStillAssigned && (inc.severity === 'critical' || inc.severity === 'high')) {
    score += 8
    factors.push('Driver still assigned')
  }
  if (inc.category === 'data_security') {
    score += 15
    factors.push('Data protection exposure')
  }
  if (inc.category === 'passenger_missing' || inc.category === 'safeguarding') {
    score += 20
    factors.push('Vulnerable person risk')
  }
  if ((inc.recurringCount ?? 0) >= 2) {
    score += 10
    factors.push('Recurring pattern at depot')
  }

  const capped = Math.min(100, score)
  const preventableLikelihood = inc.category === 'near_miss' ? 0.85 : inc.severity === 'low' ? 0.4 : 0.65

  return {
    score: capped,
    band: bandFromScore(capped),
    factors,
    preventableLikelihood: Math.round(preventableLikelihood * 100) / 100,
  }
}

export function computeRiskForRow(row: IncidentRegisterRow, recurringCount = 0): IncidentRiskScore {
  return computeIncidentRiskScore({
    severity: row.severity,
    category: row.category,
    isSafeguarding: row.isSafeguarding,
    warningFlags: row.warningFlags,
    vehicleStillOperational: row.warningFlags.includes('vehicle_still_operational'),
    driverStillAssigned: row.warningFlags.includes('driver_still_assigned'),
    isAcknowledged: row.isAcknowledged,
    recurringCount,
  })
}
