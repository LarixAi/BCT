import type { EmploymentType, InvitationChannel, OnboardingStepId } from '@/lib/drivers/types'

export type DriverOnboardingForm = {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  email: string
  phone: string
  homeAddress: string
  emergencyContact: string
  employeeNumber: string
  employmentType: EmploymentType
  startDate: string
  depotId: string
  secondaryDepotIds: string[]
  managerName: string
  licenceNumber: string
  licenceCountry: string
  licenceExpiry: string
  licenceCategories: string
  dqcNumber: string
  cpcExpiry: string
  tachoCardNumber: string
  tachoCardExpiry: string
  dbsExpiry: string
  medicalExpiry: string
  rightToWorkStatus: string
  workPermissionKeys: string[]
  restrictionTypes: string[]
  inviteChannel: InvitationChannel
}

export type DocumentRequirement = {
  type: string
  label: string
}

export type OnboardingDepotOption = {
  id: string
  name: string
}

export type { OnboardingStepId }
