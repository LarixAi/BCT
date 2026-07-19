import type { DriverProfile, OnboardingStepId } from '@/lib/drivers/types'
import type { DocumentRequirement, DriverOnboardingForm, OnboardingDepotOption } from './driver-onboarding.types'
import { AppAccountStep } from './steps/AppAccountStep'
import { CapabilitiesStep } from './steps/CapabilitiesStep'
import { DocumentsStep } from './steps/DocumentsStep'
import { EmploymentStep } from './steps/EmploymentStep'
import { PersonalDetailsStep } from './steps/PersonalDetailsStep'
import { ReviewActivationStep } from './steps/ReviewActivationStep'

export function DriverOnboardingStep({
  step,
  form,
  depots,
  driver,
  driverId,
  actorName,
  canManage,
  uploadPending,
  activating,
  onChange,
  onUpload,
  onActivate,
}: {
  step: OnboardingStepId
  form: DriverOnboardingForm
  depots: OnboardingDepotOption[]
  driver?: DriverProfile | null
  driverId?: string
  actorName: string
  canManage: boolean
  uploadPending: boolean
  activating: boolean
  onChange: (patch: Partial<DriverOnboardingForm>) => void
  onUpload: (req: DocumentRequirement) => void
  onActivate: () => void
}) {
  switch (step) {
    case 'personal':
      return <PersonalDetailsStep form={form} onChange={onChange} />
    case 'employment':
      return <EmploymentStep form={form} depots={depots} onChange={onChange} />
    case 'documents':
      return (
        <DocumentsStep
          form={form}
          driverId={driverId}
          driver={driver}
          uploadPending={uploadPending}
          onChange={onChange}
          onUpload={onUpload}
        />
      )
    case 'capabilities':
      return <CapabilitiesStep form={form} onChange={onChange} />
    case 'account':
      return (
        <AppAccountStep
          form={form}
          driver={driver}
          actorName={actorName}
          canManage={canManage}
          onChange={onChange}
        />
      )
    case 'review':
      return (
        <ReviewActivationStep
          driver={driver}
          actorName={actorName}
          canManage={canManage}
          activating={activating}
          onActivate={onActivate}
        />
      )
    default:
      return null
  }
}
