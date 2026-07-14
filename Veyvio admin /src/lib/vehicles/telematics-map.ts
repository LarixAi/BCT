import type { LiveDispatchVehicle } from '@/lib/api/types'
import type { VehicleProfile } from './types'

export function vehicleToMapMarker(vehicle: VehicleProfile): LiveDispatchVehicle | null {
  const t = vehicle.telematics
  if (!t?.connected || t.latitude == null || t.longitude == null) return null

  const staleMinutes =
    t.gpsFreshnessSeconds != null ? Math.round(t.gpsFreshnessSeconds / 60) : null

  return {
    dutyId: vehicle.currentRunId ?? vehicle.id,
    reference: vehicle.currentRunReference ?? vehicle.reference,
    status: vehicle.operationalStatus,
    routeName: vehicle.currentRunReference,
    driverId: vehicle.currentDriverId,
    driverName: vehicle.currentDriverName,
    vehicleRegistration: vehicle.registrationNumber,
    lastLatitude: t.latitude,
    lastLongitude: t.longitude,
    lastPositionAt: t.lastSyncAt,
    staleMinutes,
    isStale: (t.gpsFreshnessSeconds ?? 0) > 600,
    staleThresholdMinutes: 10,
    nextStop: null,
    routeTotalStops: 0,
    routeCompletedStops: 0,
    routeProgressPercent: null,
  }
}
