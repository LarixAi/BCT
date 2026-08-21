import type { VehicleProfile } from '@/lib/vehicles/types'
import { emptyFleetResourcesHub, safeFleetResourcesHub } from './empty-hub'
import type { FleetResourcesHubData } from './types'

export type FleetResourcesHubSource = 'live' | 'unavailable'

export interface ResolvedFleetResourcesHub {
  hub: FleetResourcesHubData
  source: FleetResourcesHubSource
  errorMessage?: string
}

/**
 * Live Command hub only (F-03). Never invent kit/cards/tyres/purchasing from demo seed.
 * When live fails, return empty + unavailable so the UI can say the truth.
 */
export async function resolveFleetResourcesHub(opts: {
  fetchLiveHub: () => Promise<FleetResourcesHubData>
  /** Kept for call-site compatibility; not used for invent/fallback. */
  fetchProfiles?: () => Promise<VehicleProfile[]>
}): Promise<ResolvedFleetResourcesHub> {
  try {
    const live = await opts.fetchLiveHub()
    return { hub: safeFleetResourcesHub(live), source: 'live' }
  } catch (error) {
    return {
      hub: emptyFleetResourcesHub(),
      source: 'unavailable',
      errorMessage:
        error instanceof Error ? error.message : 'Fleet resources could not be loaded from Command',
    }
  }
}
