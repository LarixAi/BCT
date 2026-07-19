import type {
  CreateDriverInput,
  DriverProfile,
  OnboardingStepId,
  UpdateDriverInput,
  UploadDriverDocumentInput,
} from '@/lib/drivers/types'
import type { DocumentRequirement, DriverOnboardingForm } from './driver-onboarding.types'
import { EMPTY_ONBOARDING_FORM } from './driver-onboarding.constants'

export function mapOnboardingFormToCreateInput(form: DriverOnboardingForm): CreateDriverInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName || null,
    dateOfBirth: form.dateOfBirth || null,
    email: form.email.trim(),
    phone: form.phone.trim(),
    homeAddress: form.homeAddress || null,
    emergencyContact: form.emergencyContact || null,
    employmentType: form.employmentType,
    depotId: form.depotId,
    employeeNumber: form.employeeNumber || null,
    startDate: form.startDate || null,
    sendInvitation: false,
  }
}

export function mapOnboardingFormToDriverUpdate(
  form: DriverOnboardingForm,
  nextStep: OnboardingStepId,
): UpdateDriverInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    preferredName: form.preferredName || null,
    dateOfBirth: form.dateOfBirth || null,
    email: form.email.trim(),
    phone: form.phone.trim(),
    homeAddress: form.homeAddress || null,
    emergencyContact: form.emergencyContact || null,
    employmentType: form.employmentType,
    depotId: form.depotId,
    secondaryDepotIds: form.secondaryDepotIds,
    employeeNumber: form.employeeNumber || null,
    startDate: form.startDate || null,
    managerName: form.managerName || null,
    licenceNumber: form.licenceNumber || null,
    licenceCountry: form.licenceCountry || null,
    licenceExpiry: form.licenceExpiry || null,
    licenceCategories: form.licenceCategories || null,
    dqcNumber: form.dqcNumber || null,
    cpcExpiry: form.cpcExpiry || null,
    tachoCardNumber: form.tachoCardNumber || null,
    tachoCardExpiry: form.tachoCardExpiry || null,
    dbsExpiry: form.dbsExpiry || null,
    medicalExpiry: form.medicalExpiry || null,
    rightToWorkStatus: form.rightToWorkStatus || null,
    workPermissionKeys: form.workPermissionKeys,
    onboardingStep: nextStep,
    operationalStatus: nextStep === 'review' ? 'pending_compliance' : 'onboarding',
    employmentStatus: 'onboarding',
  }
}

export function buildDriverDocumentUpload(
  requirement: DocumentRequirement,
  form: DriverOnboardingForm,
): UploadDriverDocumentInput {
  const expiryDate =
    requirement.type === 'driving_licence'
      ? form.licenceExpiry || null
      : requirement.type === 'dqc'
        ? form.cpcExpiry || null
        : requirement.type === 'dbs'
          ? form.dbsExpiry || null
          : requirement.type === 'medical'
            ? form.medicalExpiry || null
            : null

  const referenceNumber =
    requirement.type === 'driving_licence'
      ? form.licenceNumber || null
      : requirement.type === 'dqc'
        ? form.dqcNumber || null
        : null

  return {
    requirementType: requirement.type,
    label: requirement.label,
    fileName: `${requirement.type}.pdf`,
    expiryDate,
    referenceNumber,
  }
}

export function mapDriverToOnboardingForm(driver: DriverProfile): DriverOnboardingForm {
  return {
    ...EMPTY_ONBOARDING_FORM,
    firstName: driver.firstName,
    lastName: driver.lastName,
    preferredName: driver.preferredName ?? '',
    dateOfBirth: driver.dateOfBirth ?? '',
    email: driver.email ?? '',
    phone: driver.phone ?? '',
    homeAddress: driver.homeAddress ?? '',
    emergencyContact: driver.emergencyContact ?? '',
    employeeNumber: driver.employeeNumber ?? '',
    employmentType: driver.employmentType,
    startDate: driver.startDate ?? '',
    depotId: driver.depotId ?? '',
    secondaryDepotIds: driver.secondaryDepotIds ?? [],
    managerName: driver.managerName ?? '',
    licenceNumber: driver.licenceNumber ?? '',
    licenceCountry: driver.licenceCountry ?? 'GB',
    licenceExpiry: driver.licenceExpiry ?? '',
    licenceCategories: driver.licenceCategories ?? '',
    dqcNumber: driver.dqcNumber ?? '',
    cpcExpiry: driver.cpcExpiry ?? '',
    tachoCardNumber: driver.tachoCardNumber ?? '',
    tachoCardExpiry: driver.tachoCardExpiry ?? '',
    dbsExpiry: driver.dbsExpiry ?? '',
    medicalExpiry: driver.medicalExpiry ?? '',
    rightToWorkStatus: driver.rightToWorkStatus ?? '',
    workPermissionKeys: driver.workPermissions.filter((p) => p.enabled).map((p) => p.key),
    restrictionTypes: driver.restrictions.filter((r) => r.status === 'active').map((r) => r.type),
  }
}
