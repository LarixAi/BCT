import type { VehiclePlatformEvent, VehiclePlatformEventType, VehicleTelematics } from './types'

const globalEvents: VehiclePlatformEvent[] = []
const listeners = new Set<(event: VehiclePlatformEvent) => void>()

export function emitVehicleEvent(
  event: Omit<VehiclePlatformEvent, 'id' | 'createdAt'> & { createdAt?: string },
): VehiclePlatformEvent {
  const full: VehiclePlatformEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
  }
  globalEvents.unshift(full)
  if (globalEvents.length > 500) globalEvents.length = 500
  listeners.forEach((fn) => fn(full))
  return full
}

export function onVehicleEvent(listener: (event: VehiclePlatformEvent) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listVehicleEvents(vehicleId?: string): VehiclePlatformEvent[] {
  if (!vehicleId) return [...globalEvents]
  return globalEvents.filter((e) => e.vehicleId === vehicleId)
}

export function eventTypeLabel(type: VehiclePlatformEventType): string {
  return type.replace(/^vehicle\./, '').replace(/_/g, ' ')
}

export function mockTelematicsFromDuty(
  vehicleId: string,
  duty: {
    lastLatitude?: number | null
    lastLongitude?: number | null
    lastPositionAt?: string | null
    vehicle?: { id: string } | null
  } | null,
  fuelPercent?: number | null,
  batteryPercent?: number | null,
  mileage?: number | null,
): VehicleTelematics | null {
  if (!duty || duty.vehicle?.id !== vehicleId) return null
  if (duty.lastLatitude == null || duty.lastLongitude == null) return null
  const syncAt = duty.lastPositionAt ?? new Date().toISOString()
  const ageSec = Math.round((Date.now() - new Date(syncAt).getTime()) / 1000)
  return {
    provider: 'Samsara',
    connected: true,
    lastSyncAt: syncAt,
    latitude: duty.lastLatitude,
    longitude: duty.lastLongitude,
    speedMph: 24,
    heading: 180,
    ignitionOn: true,
    odometerMiles: mileage ?? null,
    fuelPercent: fuelPercent ?? null,
    batteryPercent: batteryPercent ?? null,
    gpsFreshnessSeconds: ageSec,
  }
}
