import type { VehicleProfile } from '@/lib/vehicles/types'
import { derivePresenceState, deriveReadinessState } from './status'
import type { YardException, YardVehicleRow } from './types'

export function buildYardExceptions(vehicles: VehicleProfile[], rows: YardVehicleRow[], depotId: string): YardException[] {
  const exceptions: YardException[] = []
  const depotVehicles = vehicles.filter((v) => v.currentDepotId === depotId && v.lifecycleStatus === 'active')

  for (const v of depotVehicles) {
    const row = rows.find((r) => r.vehicleId === v.id)
    const readiness = row?.readinessState ?? deriveReadinessState(v)
    const presence = row?.presenceState ?? derivePresenceState(v)

    if (presence === 'location_unknown') {
      exceptions.push({
        id: `ex-loc-${v.id}`,
        severity: 'critical',
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        depotId,
        title: 'Vehicle location unknown',
        detail: `${v.registrationNumber} has no confirmed yard location`,
        detectedAt: v.updatedAt,
        operationalImpact: 'Cannot assign bay or release without location confirmation',
        ownerName: row?.assignedStaffName ?? null,
        recommendedAction: 'Scan vehicle QR or confirm bay manually',
        escalationStatus: 'open',
      })
    }

    if (readiness === 'vor' && v.nextDepartureTime) {
      exceptions.push({
        id: `ex-vor-run-${v.id}`,
        severity: 'critical',
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        depotId,
        title: 'VOR vehicle scheduled for departure',
        detail: `${v.registrationNumber} is VOR but due out at ${v.nextDepartureTime}`,
        detectedAt: v.updatedAt,
        operationalImpact: 'Run may need replacement vehicle',
        ownerName: null,
        recommendedAction: 'Reassign run or authorise return to service',
        escalationStatus: 'open',
      })
    }

    if (v.nextDepartureTime && readiness !== 'ready' && readiness !== 'ready_with_advisory' && readiness !== 'vor') {
      exceptions.push({
        id: `ex-not-ready-${v.id}`,
        severity: 'warning',
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        depotId,
        title: 'Vehicle due out but not ready',
        detail: `${v.registrationNumber} scheduled for ${v.nextDepartureTime}`,
        detectedAt: v.updatedAt,
        operationalImpact: 'Departure may be delayed',
        ownerName: row?.assignedStaffName ?? null,
        recommendedAction: 'Complete outstanding yard tasks before release',
        escalationStatus: 'open',
      })
    }

    if (v.checksOverdue) {
      exceptions.push({
        id: `ex-check-${v.id}`,
        severity: 'warning',
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        depotId,
        title: 'Yard inspection overdue',
        detail: `Return inspection not started for ${v.registrationNumber}`,
        detectedAt: v.updatedAt,
        operationalImpact: 'Vehicle cannot be released until inspection complete',
        ownerName: row?.assignedStaffName ?? null,
        recommendedAction: 'Start return inspection task',
        escalationStatus: 'open',
      })
    }

    if (v.criticalDefectCount > 0) {
      exceptions.push({
        id: `ex-defect-${v.id}`,
        severity: 'critical',
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        depotId,
        title: 'Open safety-critical defect',
        detail: `${v.criticalDefectCount} safety-critical defect(s) on ${v.registrationNumber}`,
        detectedAt: v.updatedAt,
        operationalImpact: 'Vehicle blocked from operational release',
        ownerName: null,
        recommendedAction: 'Escalate to maintenance and mark VOR if required',
        escalationStatus: 'open',
      })
    }

    if (v.batteryLevelPercent != null && v.batteryLevelPercent < 25 && v.readinessStatus === 'charging_required') {
      exceptions.push({
        id: `ex-charge-${v.id}`,
        severity: 'warning',
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        depotId,
        title: 'Charging failure or low charge',
        detail: `Battery at ${v.batteryLevelPercent}% — charging may have failed`,
        detectedAt: v.updatedAt,
        operationalImpact: 'EV may not meet departure charge requirement',
        ownerName: row?.assignedStaffName ?? null,
        recommendedAction: 'Verify charger connection and restart charge task',
        escalationStatus: 'open',
      })
    }
  }

  const bays = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.bay) continue
    const key = row.bay.toLowerCase()
    const list = bays.get(key) ?? []
    list.push(row.registrationNumber)
    bays.set(key, list)
  }
  for (const [bay, regs] of bays) {
    if (regs.length > 1) {
      exceptions.push({
        id: `ex-bay-${bay.replace(/\s/g, '-')}`,
        severity: 'critical',
        vehicleId: rows.find((r) => r.registrationNumber === regs[0])!.vehicleId,
        registrationNumber: regs.join(', '),
        depotId,
        title: 'Bay conflict',
        detail: `Multiple vehicles recorded in ${bay}: ${regs.join(', ')}`,
        detectedAt: new Date().toISOString(),
        operationalImpact: 'Location data unreliable for affected vehicles',
        ownerName: null,
        recommendedAction: 'Confirm physical location and correct bay assignments',
        escalationStatus: 'open',
      })
    }
  }

  return exceptions.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 }
    return sev[a.severity] - sev[b.severity] || b.detectedAt.localeCompare(a.detectedAt)
  })
}
