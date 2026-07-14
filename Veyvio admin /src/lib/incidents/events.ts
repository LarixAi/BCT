import type { IncidentPlatformEvent, IncidentPlatformEventType } from './types'

const globalEvents: IncidentPlatformEvent[] = []
const listeners = new Set<(event: IncidentPlatformEvent) => void>()

export function emitIncidentEvent(
  event: Omit<IncidentPlatformEvent, 'id' | 'createdAt'> & { createdAt?: string },
): IncidentPlatformEvent {
  const full: IncidentPlatformEvent = {
    ...event,
    id: `inc-evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
  }
  globalEvents.unshift(full)
  if (globalEvents.length > 500) globalEvents.length = 500
  listeners.forEach((fn) => fn(full))
  return full
}

export function onIncidentEvent(listener: (event: IncidentPlatformEvent) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listIncidentEvents(incidentId?: string): IncidentPlatformEvent[] {
  if (!incidentId) return [...globalEvents]
  return globalEvents.filter((e) => e.incidentId === incidentId)
}

export function eventTypeLabel(type: IncidentPlatformEventType): string {
  return type.replace(/^incident\./, '').replace(/_/g, ' ')
}
