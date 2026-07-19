import type { DriverOnboardingForm } from './driver-onboarding.types'

export function validatePersonalStep(form: DriverOnboardingForm): string | null {
  if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.'
  if (!form.email.trim() || !form.phone.trim()) return 'Email and mobile number are required.'
  return null
}

export function validateEmploymentStep(_form: DriverOnboardingForm): string | null {
  return null
}

export function validateDocumentsStep(form: DriverOnboardingForm): string | null {
  if (!form.licenceExpiry.trim()) {
    return 'Enter the driving licence expiry date before continuing — it is required for eligibility.'
  }
  return null
}

export function validateCapabilitiesStep(_form: DriverOnboardingForm): string | null {
  return null
}

export function validateAccountStep(_form: DriverOnboardingForm): string | null {
  return null
}

export function validateReviewStep(_form: DriverOnboardingForm): string | null {
  return null
}

export const onboardingValidators = {
  personal: validatePersonalStep,
  employment: validateEmploymentStep,
  documents: validateDocumentsStep,
  capabilities: validateCapabilitiesStep,
  account: validateAccountStep,
  review: validateReviewStep,
}
