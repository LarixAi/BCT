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

/** Never throws — always returns a renderable hub for the Inspections page. */
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

  try {
    return { hub: safeInspectionsHub(buildInspectionsHub(createInspectionSeed())), source: 'demo' }
  } catch {
    return { hub: emptyInspectionsHub(), source: 'empty' }
  }
}
