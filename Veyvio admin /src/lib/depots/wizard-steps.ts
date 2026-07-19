import { DEPOT_WIZARD_STEP_INDEX, DEPOT_WIZARD_STEPS } from './constants'
import type { DepotWizardStepId } from './types'

export function nextDepotWizardStep(current: DepotWizardStepId): DepotWizardStepId | null {
  const idx = DEPOT_WIZARD_STEP_INDEX[current]
  if (idx == null || idx >= DEPOT_WIZARD_STEPS.length - 1) return null
  return DEPOT_WIZARD_STEPS[idx + 1]!.id
}

export function prevDepotWizardStep(current: DepotWizardStepId): DepotWizardStepId | null {
  const idx = DEPOT_WIZARD_STEP_INDEX[current]
  if (idx == null || idx <= 0) return null
  return DEPOT_WIZARD_STEPS[idx - 1]!.id
}

export function validateDepotCapacity(assignedVehicles: number, vehicleCapacity: number): string | null {
  if (assignedVehicles > vehicleCapacity) {
    return `Assigned fleet (${assignedVehicles}) exceeds vehicle capacity (${vehicleCapacity}).`
  }
  return null
}
