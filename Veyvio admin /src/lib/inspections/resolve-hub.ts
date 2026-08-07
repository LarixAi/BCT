import type { VehicleProfile } from '@/lib/vehicles/types'
import { buildInspectionsHub } from './aggregate'
import { emptyInspectionsHub, safeInspectionsHub } from './empty-hub'
import { projectInspectionsFromProfiles } from './project-from-profiles'
import { createInspectionSeed } from './seed'
import type { InspectionsHubData } from './types'

export type InspectionsHubSource = 'live' | 'projected' | 'demo' | 'empty'

export interface ResolvedInspectionsHub {
  hub: InspectionsHubData
  source: InspectionsHubSource
}

/** Demo seed is local/dev or explicit mock only — never after a live failure in production. */
function allowDemoSeedFallback(): boolean {
  return import.meta.env.VITE_MOCK_API === 'true' || import.meta.env.DEV === true
}

/** Live-first; production fails closed to empty when live/projected data is unavailable. */
export async function resolveInspectionsHub(opts: {
  fetchLiveHub: () => Promise<InspectionsHubData>
  fetchProfiles: () => Promise<VehicleProfile[]>
}): Promise<ResolvedInspectionsHub> {
  try {
    const live = await opts.fetchLiveHub()
    return { hub: safeInspectionsHub(live), source: 'live' }
  } catch {
    // continue
  }

  try {
    const profiles = await opts.fetchProfiles()
    const list = Array.isArray(profiles) ? profiles : []
    if (list.length > 0) {
      return { hub: safeInspectionsHub(projectInspectionsFromProfiles(list)), source: 'projected' }
    }
  } catch {
    // continue
  }

  if (!allowDemoSeedFallback()) {
    return { hub: emptyInspectionsHub(), source: 'empty' }
  }

  try {
    return { hub: safeInspectionsHub(buildInspectionsHub(createInspectionSeed())), source: 'demo' }
  } catch {
    return { hub: emptyInspectionsHub(), source: 'empty' }
  }
}
