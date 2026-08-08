import type { VehicleProfile } from '@/lib/vehicles/types'
import { emptyInspectionsHub, safeInspectionsHub } from './empty-hub'
import { projectInspectionsFromProfiles } from './project-from-profiles'
import type { InspectionsHubData } from './types'

export type InspectionsHubSource = 'live' | 'projected' | 'unavailable'

export interface ResolvedInspectionsHub {
  hub: InspectionsHubData
  source: InspectionsHubSource
  errorMessage?: string
}

/**
 * Live Command hub first (F-03). Never fall back to demo inspection seed.
 * If live hub fails, project due items from live vehicle profiles only.
 */
export async function resolveInspectionsHub(opts: {
  fetchLiveHub: () => Promise<InspectionsHubData>
  fetchProfiles: () => Promise<VehicleProfile[]>
}): Promise<ResolvedInspectionsHub> {
  try {
    const live = await opts.fetchLiveHub()
    return { hub: safeInspectionsHub(live), source: 'live' }
  } catch {
    // continue to projected live profiles
  }

  try {
    const profiles = await opts.fetchProfiles()
    const list = Array.isArray(profiles) ? profiles : []
    if (list.length > 0) {
      return { hub: safeInspectionsHub(projectInspectionsFromProfiles(list)), source: 'projected' }
    }
  } catch (error) {
    return {
      hub: emptyInspectionsHub(),
      source: 'unavailable',
      errorMessage:
        error instanceof Error ? error.message : 'Inspections could not be loaded from Command',
    }
  }

  return {
    hub: emptyInspectionsHub(),
    source: 'unavailable',
    errorMessage: 'Inspections hub unavailable and no vehicle compliance dates to project',
  }
}
