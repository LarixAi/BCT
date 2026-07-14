import type { VehicleProfile } from '@/lib/vehicles/types'
import type {
  YardActivityState,
  YardCustodyState,
  YardLocationConfidence,
  YardOperationalReadiness,
  YardPresenceState,
  YardVehicleRow,
} from './types'

function zoneFromProfile(v: VehicleProfile): string {
  if (v.yardStatus === 'workshop') return 'Workshop'
  if (v.operationalStatus === 'under_inspection') return 'Inspection'
  if (v.readinessStatus.includes('clean')) return 'Wash bay'
  if (v.readinessStatus === 'fuelling_required') return 'Fuel station'
  if (v.readinessStatus === 'charging_required') return 'EV charging'
  if (!v.parkingBay) return 'Unallocated'
  return v.parkingBay.toLowerCase().includes('bay') ? 'Parking bays' : v.parkingBay
}

export function derivePresenceState(v: VehicleProfile): YardPresenceState {
  if (v.yardStatus === 'unknown_location') return 'location_unknown'
  if (v.operationalStatus === 'returning_to_depot') return 'entering'
  if (v.yardStatus === 'checked_out' && ['in_service', 'allocated'].includes(v.operationalStatus)) return 'in_transit'
  if (v.yardStatus === 'checked_out' || v.yardStatus === 'off_site_parking' || v.yardStatus === 'external_contractor') return 'off_site'
  if (['in_yard', 'at_bay', 'checked_in', 'workshop'].includes(v.yardStatus)) return 'in_yard'
  return 'expected'
}

export function deriveActivityState(v: VehicleProfile): YardActivityState {
  if (v.operationalStatus === 'vor' || v.yardStatus === 'workshop' || v.operationalStatus === 'in_workshop') return 'in_workshop'
  if (v.operationalStatus === 'under_inspection') return 'under_inspection'
  if (v.checksOverdue || v.lastCheckType?.toLowerCase().includes('return')) return 'awaiting_inspection'
  if (v.readinessStatus.includes('clean')) return 'cleaning'
  if (v.readinessStatus === 'fuelling_required') return 'fuelling'
  if (v.readinessStatus === 'charging_required') return 'charging'
  if (v.readinessStatus === 'equipment_replenishment_required') return 'loading_equipment'
  if (v.operationalStatus === 'awaiting_parts' || v.operationalStatus === 'awaiting_recovery') return 'awaiting_maintenance'
  if (v.release.releaseDecision === 'released' || v.release.releaseDecision === 'released_with_warning') return 'ready_for_release'
  return 'parked'
}

export function deriveReadinessState(v: VehicleProfile): YardOperationalReadiness {
  if (v.operationalStatus === 'vor' || v.vorRecords.some((r) => !r.resolvedAt)) return 'vor'
  if (v.criticalDefectCount > 0 || v.release.releaseDecision === 'blocked') return 'blocked'
  if (v.openDefectCount > 0 || v.release.releaseDecision === 'restricted_use') return 'conditional'
  if (v.release.releaseDecision === 'released_with_warning') return 'ready_with_advisory'
  if (v.readinessStatus === 'ready' && v.openDefectCount === 0) return 'ready'
  if (v.readinessStatus !== 'ready' || v.checksOverdue) return 'conditional'
  return 'unknown'
}

export function deriveCustodyState(v: VehicleProfile): YardCustodyState {
  if (v.currentDriverId && v.yardStatus === 'checked_out') return 'driver_custody'
  if (v.operationalStatus === 'in_workshop' || v.yardStatus === 'workshop') return 'maintenance_custody'
  if (v.yardStatus === 'external_contractor') return 'contractor_custody'
  if (['in_yard', 'at_bay', 'checked_in', 'workshop'].includes(v.yardStatus)) return 'yard_custody'
  return 'unassigned'
}

export function deriveLocationConfidence(v: VehicleProfile): YardLocationConfidence {
  if (v.yardStatus === 'unknown_location' || !v.parkingBay) return 'unknown'
  const hours = (Date.now() - new Date(v.updatedAt).getTime()) / (60 * 60 * 1000)
  if (hours > 24) return 'stale'
  if (v.yardStatus === 'at_bay' || v.parkingBay) return 'confirmed'
  return 'estimated'
}

export function isOnSite(presence: YardPresenceState): boolean {
  return presence === 'in_yard' || presence === 'entering'
}

export function buildExceptionLabels(v: VehicleProfile, readiness: YardOperationalReadiness, presence: YardPresenceState): string[] {
  const labels: string[] = []
  if (presence === 'location_unknown') labels.push('Location unknown')
  if (readiness === 'vor') labels.push('VOR — not releasable')
  if (v.criticalDefectCount > 0) labels.push('Safety-critical defect open')
  if (v.checksOverdue) labels.push('Inspection overdue')
  if (v.nextDepartureTime && readiness !== 'ready' && readiness !== 'ready_with_advisory') {
    labels.push(`Due out ${v.nextDepartureTime} but not ready`)
  }
  if (v.fuelLevelPercent != null && v.fuelLevelPercent < 20) labels.push('Low fuel')
  if (v.batteryLevelPercent != null && v.batteryLevelPercent < 25) labels.push('Low charge')
  return labels
}

export function openTaskCount(v: VehicleProfile): number {
  let count = 0
  if (v.readinessStatus !== 'ready') count += 1
  if (v.checksOverdue) count += 1
  if (v.openDefectCount > 0) count += 1
  if (v.workOrders.some((w) => ['requested', 'approved', 'in_progress', 'awaiting_parts'].includes(w.status))) count += 1
  return count
}

export function vehicleToYardRow(v: VehicleProfile, assignedStaffName: string | null): YardVehicleRow {
  const presence = derivePresenceState(v)
  const readiness = deriveReadinessState(v)
  return {
    vehicleId: v.id,
    registrationNumber: v.registrationNumber,
    fleetNumber: v.fleetNumber,
    vehicleCategory: v.vehicleCategory,
    makeModel: `${v.make} ${v.model}`,
    depotId: v.currentDepotId,
    depotName: v.currentDepotName,
    zone: zoneFromProfile(v),
    bay: v.parkingBay,
    presenceState: presence,
    activityState: deriveActivityState(v),
    readinessState: readiness,
    custodyState: deriveCustodyState(v),
    openTaskCount: openTaskCount(v),
    assignedStaffName,
    nextDeparture: v.nextDepartureTime,
    lastMovementAt: v.updatedAt,
    lastMovementBy: v.auditEvents[v.auditEvents.length - 1]?.actor ?? null,
    lastUpdatedSource: v.auditEvents[v.auditEvents.length - 1]?.sourceApplication ?? 'command',
    lastUpdatedAt: v.updatedAt,
    exceptionLabels: buildExceptionLabels(v, readiness, presence),
    locationConfidence: deriveLocationConfidence(v),
  }
}

export function vehicleCountsAsOnSite(v: VehicleProfile): boolean {
  return isOnSite(derivePresenceState(v))
}
