import type { OnboardingStageId, VehicleWizardStepId } from './types'

export const VEHICLE_WIZARD_STEPS: {
  id: VehicleWizardStepId
  label: string
  description: string
}[] = [
  { id: 'identity', label: 'Identity', description: 'Registration, VIN, make and model' },
  { id: 'ownership', label: 'Ownership', description: 'Company-owned, financed, hire or migration' },
  { id: 'configuration', label: 'Configuration', description: 'Capacity, fuel and accessibility' },
  { id: 'compliance', label: 'Compliance documents', description: 'MOT, insurance, tax and certificates' },
  { id: 'maintenance', label: 'Maintenance programme', description: 'Next service date and mileage' },
  { id: 'technology', label: 'Technology', description: 'Telematics and device identifiers' },
  { id: 'depot_yard', label: 'Depot and Yard', description: 'Home depot, bay and location' },
  { id: 'equipment', label: 'Equipment', description: 'Fixed and removable kit inventory' },
  { id: 'baseline_inspection', label: 'Baseline inspection', description: 'Body condition baseline' },
  { id: 'driver_checks', label: 'Driver checks', description: 'Walkaround template for drivers' },
  { id: 'eligibility', label: 'Eligibility rules', description: 'Capabilities and work permissions' },
  { id: 'review', label: 'Review and activation', description: 'Draft, approve or keep blocked' },
]

export const VEHICLE_WIZARD_STEP_INDEX: Record<VehicleWizardStepId, number> = Object.fromEntries(
  VEHICLE_WIZARD_STEPS.map((s, i) => [s.id, i]),
) as Record<VehicleWizardStepId, number>

/** Soft map wizard completion → release-engine onboarding stages. */
export function wizardStepToOnboardingStage(step: VehicleWizardStepId): OnboardingStageId | null {
  switch (step) {
    case 'identity':
      return 'identity_verified'
    case 'configuration':
      return 'specification_complete'
    case 'compliance':
      return 'documents_complete'
    case 'equipment':
      return 'equipment_inventory'
    case 'baseline_inspection':
      return 'baseline_inspection'
    case 'driver_checks':
      return 'initial_inspection'
    case 'review':
      return 'release_review'
    default:
      return null
  }
}

export function onboardingStageToWizardStep(stage: OnboardingStageId): VehicleWizardStepId {
  switch (stage) {
    case 'created':
    case 'identity_verified':
      return 'identity'
    case 'specification_complete':
      return 'configuration'
    case 'documents_complete':
      return 'compliance'
    case 'baseline_inspection':
      return 'baseline_inspection'
    case 'equipment_inventory':
      return 'equipment'
    case 'initial_inspection':
      return 'driver_checks'
    case 'release_review':
    case 'approved':
      return 'review'
    default:
      return 'identity'
  }
}

export function nextWizardStep(current: VehicleWizardStepId): VehicleWizardStepId | null {
  const idx = VEHICLE_WIZARD_STEP_INDEX[current]
  if (idx == null || idx >= VEHICLE_WIZARD_STEPS.length - 1) return null
  return VEHICLE_WIZARD_STEPS[idx + 1]!.id
}

export function prevWizardStep(current: VehicleWizardStepId): VehicleWizardStepId | null {
  const idx = VEHICLE_WIZARD_STEP_INDEX[current]
  if (idx == null || idx <= 0) return null
  return VEHICLE_WIZARD_STEPS[idx - 1]!.id
}
