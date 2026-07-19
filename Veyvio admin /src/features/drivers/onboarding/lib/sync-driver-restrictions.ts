import { RESTRICTION_OPTIONS } from '@/lib/drivers/constants'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'

export type SyncDriverRestrictionsInput = {
  driverId: string
  driver: DriverProfile
  selectedRestrictionTypes: string[]
  actorName: string
}

/** Ensures each selected restriction type exists as an active restriction on the driver. */
export async function syncDriverRestrictions({
  driverId,
  driver,
  selectedRestrictionTypes,
  actorName,
}: SyncDriverRestrictionsInput): Promise<DriverProfile> {
  let profile = driver
  for (const type of selectedRestrictionTypes) {
    const exists = profile.restrictions.some((r) => r.type === type && r.status === 'active')
    if (!exists) {
      const opt = RESTRICTION_OPTIONS.find((o) => o.type === type)
      profile = await api.addDriverRestriction(
        driverId,
        { type, label: opt?.label ?? type, reason: 'Recorded during onboarding' },
        actorName,
      )
    }
  }
  return profile
}
