import type { OnboardingStepId } from '@/lib/drivers/types'
import type { DriverOnboardingForm } from './driver-onboarding.types'

export const STEP_INDEX: Record<OnboardingStepId, number> = {
  personal: 0,
  employment: 1,
  documents: 2,
  capabilities: 3,
  account: 4,
  review: 5,
}

export const EMPTY_ONBOARDING_FORM: DriverOnboardingForm = {
  firstName: '',
  lastName: '',
  preferredName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  homeAddress: '',
  emergencyContact: '',
  employeeNumber: '',
  employmentType: 'employee',
  startDate: '',
  depotId: '',
  secondaryDepotIds: [],
  managerName: '',
  licenceNumber: '',
  licenceCountry: 'GB',
  licenceExpiry: '',
  licenceCategories: '',
  dqcNumber: '',
  cpcExpiry: '',
  tachoCardNumber: '',
  tachoCardExpiry: '',
  dbsExpiry: '',
  medicalExpiry: '',
  rightToWorkStatus: '',
  workPermissionKeys: ['school', 'psv'],
  restrictionTypes: [],
  inviteChannel: 'email',
}
