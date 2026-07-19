import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ONBOARDING_STEPS } from '@/lib/drivers/constants'
import type { OnboardingStepId } from '@/lib/drivers/types'
import { STEP_INDEX } from '../driver-onboarding.constants'

export function useDriverOnboardingNavigation(driverOnboardingStep?: OnboardingStepId | null) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const stepParam = (params.get('step') as OnboardingStepId | null) ?? 'personal'
  const [step, setStep] = useState<OnboardingStepId>(
    STEP_INDEX[stepParam] != null ? stepParam : 'personal',
  )

  useEffect(() => {
    if (driverOnboardingStep && STEP_INDEX[driverOnboardingStep] != null) {
      setStep(driverOnboardingStep)
    }
  }, [driverOnboardingStep])

  const stepIdx = STEP_INDEX[step]

  function goStep(next: OnboardingStepId, driverId?: string) {
    setStep(next)
    if (driverId) navigate(`/drivers/${driverId}/onboarding?step=${next}`, { replace: true })
  }

  function back(driverId?: string) {
    const prev = ONBOARDING_STEPS[stepIdx - 1]
    if (!prev) {
      navigate('/drivers')
      return
    }
    goStep(prev.id, driverId)
  }

  return { step, setStep, stepIdx, goStep, back, navigate }
}
