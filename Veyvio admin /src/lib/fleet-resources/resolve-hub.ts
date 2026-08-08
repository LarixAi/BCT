import type { VehicleProfile } from '@/lib/vehicles/types'
import { buildFleetResourcesHub } from './aggregate'
import { emptyFleetResourcesHub, safeFleetResourcesHub } from './empty-hub'
import type { FleetResourcesHubData } from './types'

export type FleetResourcesHubSource = 'live' | 'demo' | 'empty'

export interface ResolvedFleetResourcesHub {
  hub: FleetResourcesHubData
  source: FleetResourcesHubSource
}

/** Demo seed only when mock API is explicitly enabled — never DEV alone (F-03). */
function allowDemoSeedFallback(): boolean {
  return import.meta.env.VITE_MOCK_API === 'true'
}

async function loadProfiles(
  fetchProfiles?: () => Promise<VehicleProfile[]>,
): Promise<VehicleProfile[]> {
  if (!fetchProfiles) return []
  try {
    const profiles = await fetchProfiles()
    return Array.isArray(profiles) ? profiles : []
  } catch {
    return []
  }
}

/**
 * Live-first; production fails closed to empty when live is unavailable.
 * Never invent kit/cards/tyres on a sparse live hub (F-03).
 * Seed is dynamically imported only under explicit mock mode so live bundles
 * do not statically pull purchasing/budget invent data.
 */
export async function resolveFleetResourcesHub(opts: {
  fetchLiveHub: () => Promise<FleetResourcesHubData>
  fetchProfiles?: () => Promise<VehicleProfile[]>
}): Promise<ResolvedFleetResourcesHub> {
  try {
    const live = await opts.fetchLiveHub()
    return { hub: safeFleetResourcesHub(live), source: 'live' }
  } catch {
    // continue
  }

  if (!allowDemoSeedFallback()) {
    return { hub: emptyFleetResourcesHub(), source: 'empty' }
  }

  try {
    const { createFleetResourcesSeed } = await import('./seed')
    const seed = createFleetResourcesSeed()
    const profiles = await loadProfiles(opts.fetchProfiles)
    return {
      hub: safeFleetResourcesHub(
        buildFleetResourcesHub({
          ...seed,
          profiles,
        }),
      ),
      source: 'demo',
    }
  } catch {
    return { hub: emptyFleetResourcesHub(), source: 'empty' }
  }
}
