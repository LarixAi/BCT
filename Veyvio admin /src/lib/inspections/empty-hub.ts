import { INSPECTION_PROVIDERS } from './seed'
import type { InspectionsHubData } from './types'

export function emptyInspectionsHub(): InspectionsHubData {
  return {
    summary: {
      dueToday: 0,
      dueWithin7Days: 0,
      overdue: 0,
      inProgress: 0,
      awaitingRectification: 0,
      awaitingSignOff: 0,
      failedVor: 0,
      complianceRate90d: 100,
    },
    register: [],
    calendar: [],
    providers: INSPECTION_PROVIDERS,
  }
}

export function safeInspectionsHub(hub: InspectionsHubData | null | undefined): InspectionsHubData {
  const empty = emptyInspectionsHub()
  if (!hub || typeof hub !== 'object') return empty
  return {
    summary: { ...empty.summary, ...(hub.summary ?? {}) },
    register: Array.isArray(hub.register) ? hub.register : [],
    calendar: Array.isArray(hub.calendar) ? hub.calendar : [],
    providers: Array.isArray(hub.providers) && hub.providers.length > 0 ? hub.providers : empty.providers,
  }
}
