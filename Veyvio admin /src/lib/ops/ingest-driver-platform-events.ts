import type { PlatformEvent } from '@veyvio/ops'
import { drainPlatformEventsForConsumers } from '@veyvio/ops'
import { emitVehicleEvent } from '@/lib/vehicles/events'

export type DriverPlatformIngestResult = {
  drained: number
  defectsQueued: number
  handbacksQueued: number
  events: PlatformEvent[]
}

/**
 * Admin ingest for Driver `@veyvio/ops` platform events (localStorage bridge).
 * Closes the visual-only loop for defect / handback / check / swap signals.
 */
export function ingestDriverPlatformEvents(): DriverPlatformIngestResult {
  const events = drainPlatformEventsForConsumers()
  let defectsQueued = 0
  let handbacksQueued = 0

  for (const event of events) {
    const raw = (event.payload ?? {}) as Record<string, unknown>
    const vehicleId = String(raw.vehicleId ?? event.aggregateId)
    const payload: Record<string, string | number | boolean | null> = {
      platformEventId: event.eventId,
      eventType: event.eventType,
      correlationId: event.correlationId,
    }

    if (event.eventType === 'defect.reported') {
      defectsQueued += 1
      emitVehicleEvent({
        type: 'vehicle.defect_reported',
        vehicleId,
        summary: 'Driver reported a defect during duty',
        payload,
        sourceApplication: 'driver',
        actorName: event.actorId,
      })
    }

    if (event.eventType === 'vehicle.returned') {
      handbacksQueued += 1
      emitVehicleEvent({
        type: 'vehicle.returned_to_service',
        vehicleId,
        summary: 'Driver handed vehicle back to yard',
        payload,
        sourceApplication: 'driver',
        actorName: event.actorId,
      })
    }

    if (event.eventType === 'vehicle_check.submitted') {
      emitVehicleEvent({
        type: 'vehicle.telematics_synced',
        vehicleId,
        summary: 'Driver submitted walkaround check',
        payload,
        sourceApplication: 'driver',
        actorName: event.actorId,
      })
    }

    if (event.eventType === 'vehicle_swap.requested' || event.eventType === 'vehicle_swap.completed') {
      emitVehicleEvent({
        type: 'vehicle.location_changed',
        vehicleId,
        summary:
          event.eventType === 'vehicle_swap.requested'
            ? 'Driver requested vehicle swap'
            : 'Vehicle swap completed',
        payload,
        sourceApplication: 'driver',
        actorName: event.actorId,
      })
    }
  }

  return { drained: events.length, defectsQueued, handbacksQueued, events }
}
