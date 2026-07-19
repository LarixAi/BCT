import { SectionCard } from '@/components/ui'
import type { DriverProfile } from '@/lib/drivers/types'
import { ActivationResolutionCentre } from '../../components/ActivationResolutionCentre'

export function ReviewActivationStep({
  driver,
  actorName,
  canManage,
  activating,
  onActivate,
}: {
  driver?: DriverProfile | null
  actorName: string
  canManage: boolean
  activating: boolean
  onActivate: () => void
}) {
  if (!driver || !driver.eligibility) {
    return (
      <SectionCard title="Eligibility and activation">
        <p className="text-sm text-muted">Save earlier steps to run eligibility.</p>
      </SectionCard>
    )
  }

  return (
    <ActivationResolutionCentre
      driver={driver}
      actorName={actorName}
      canManage={canManage}
      mode="onboarding"
      activating={activating}
      onActivate={onActivate}
    />
  )
}
