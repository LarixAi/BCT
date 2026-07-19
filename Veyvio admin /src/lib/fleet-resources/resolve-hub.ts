import type { VehicleProfile } from '@/lib/vehicles/types'
import { buildFleetResourcesHub } from './aggregate'
import { emptyFleetResourcesHub, safeFleetResourcesHub } from './empty-hub'
import { enrichSparseLiveHub } from './enrich-sparse-hub'
import { createFleetResourcesSeed } from './seed'
import type { FleetResourcesHubData } from './types'

export type FleetResourcesHubSource = 'live' | 'demo' | 'empty'

export interface ResolvedFleetResourcesHub {
  hub: FleetResourcesHubData
  source: FleetResourcesHubSource
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

/** Never throws — always returns a renderable hub. */
export async function resolveFleetResourcesHub(opts: {
  fetchLiveHub: () => Promise<FleetResourcesHubData>
  fetchProfiles?: () => Promise<VehicleProfile[]>
}): Promise<ResolvedFleetResourcesHub> {
  try {
    const live = await opts.fetchLiveHub()
    let hub = safeFleetResourcesHub(live)
    const sparse =
      hub.equipment.length === 0 || hub.cards.length === 0 || hub.tyres.length === 0
    if (sparse) {
      const profiles = await loadProfiles(opts.fetchProfiles)
      hub = enrichSparseLiveHub(hub, profiles)
    }
    return { hub, source: 'live' }
  } catch {
    // continue
  }

  try {
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
