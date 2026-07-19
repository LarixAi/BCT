import { useEffect, useState } from 'react'
import type { DriverProfile } from '@/lib/drivers/types'
import { EMPTY_ONBOARDING_FORM } from '../driver-onboarding.constants'
import { mapDriverToOnboardingForm } from '../driver-onboarding-mappers'
import type { DriverOnboardingForm } from '../driver-onboarding.types'

export function useDriverOnboardingForm(driver?: DriverProfile | null, defaultDepotId?: string) {
  const [form, setForm] = useState<DriverOnboardingForm>(EMPTY_ONBOARDING_FORM)

  useEffect(() => {
    if (!form.depotId && defaultDepotId) {
      setForm((f) => ({ ...f, depotId: defaultDepotId }))
    }
  }, [defaultDepotId, form.depotId])

  useEffect(() => {
    if (!driver) return
    setForm((f) => ({
      ...mapDriverToOnboardingForm(driver),
      depotId: driver.depotId || f.depotId,
      inviteChannel: f.inviteChannel,
    }))
  }, [driver])

  const patchForm = (patch: Partial<DriverOnboardingForm>) => {
    setForm((f) => ({ ...f, ...patch }))
  }

  return { form, setForm, patchForm }
}
