import { describe, expect, it } from 'vitest'
import {
  buildDriverDocumentUpload,
  mapOnboardingFormToCreateInput,
  mapOnboardingFormToDriverUpdate,
} from './driver-onboarding-mappers'
import { EMPTY_ONBOARDING_FORM } from './driver-onboarding.constants'
import { onboardingValidators } from './driver-onboarding.validation'

describe('driver onboarding mappers', () => {
  it('maps create input without invitation', () => {
    const form = {
      ...EMPTY_ONBOARDING_FORM,
      firstName: 'Sam',
      lastName: 'Driver',
      email: 'sam@example.com',
      phone: '07700900000',
      depotId: 'depot-1',
    }
    expect(mapOnboardingFormToCreateInput(form)).toMatchObject({
      firstName: 'Sam',
      lastName: 'Driver',
      sendInvitation: false,
      depotId: 'depot-1',
    })
  })

  it('maps update payload with next onboarding step', () => {
    const patch = mapOnboardingFormToDriverUpdate(
      { ...EMPTY_ONBOARDING_FORM, firstName: 'Sam', lastName: 'Driver' },
      'review',
    )
    expect(patch.onboardingStep).toBe('review')
    expect(patch.operationalStatus).toBe('pending_compliance')
  })

  it('builds document upload expiry from form fields', () => {
    const upload = buildDriverDocumentUpload(
      { type: 'driving_licence', label: 'Licence' },
      { ...EMPTY_ONBOARDING_FORM, licenceExpiry: '2027-01-01', licenceNumber: 'ABC' },
    )
    expect(upload.expiryDate).toBe('2027-01-01')
    expect(upload.referenceNumber).toBe('ABC')
  })
})

describe('driver onboarding validation', () => {
  it('requires name, email and phone on personal step', () => {
    expect(onboardingValidators.personal(EMPTY_ONBOARDING_FORM)).toMatch(/required/i)
    expect(
      onboardingValidators.personal({
        ...EMPTY_ONBOARDING_FORM,
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.com',
        phone: '1',
      }),
    ).toBeNull()
  })

  it('requires licence expiry on documents step', () => {
    expect(onboardingValidators.documents(EMPTY_ONBOARDING_FORM)).toMatch(/licence expiry/i)
  })
})
