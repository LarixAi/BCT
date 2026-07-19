import { describe, expect, it } from 'vitest'
import {
  nextWizardStep,
  onboardingStageToWizardStep,
  prevWizardStep,
  VEHICLE_WIZARD_STEPS,
  wizardStepToOnboardingStage,
} from './wizard-steps'

describe('vehicle wizard steps', () => {
  it('has twelve steps', () => {
    expect(VEHICLE_WIZARD_STEPS).toHaveLength(12)
    expect(VEHICLE_WIZARD_STEPS[0]!.id).toBe('identity')
    expect(VEHICLE_WIZARD_STEPS[11]!.id).toBe('review')
  })

  it('gates next/prev correctly', () => {
    expect(prevWizardStep('identity')).toBeNull()
    expect(nextWizardStep('identity')).toBe('ownership')
    expect(nextWizardStep('review')).toBeNull()
    expect(prevWizardStep('review')).toBe('eligibility')
  })

  it('maps wizard steps onto release-engine onboarding stages', () => {
    expect(wizardStepToOnboardingStage('identity')).toBe('identity_verified')
    expect(wizardStepToOnboardingStage('configuration')).toBe('specification_complete')
    expect(wizardStepToOnboardingStage('compliance')).toBe('documents_complete')
    expect(wizardStepToOnboardingStage('ownership')).toBeNull()
    expect(wizardStepToOnboardingStage('review')).toBe('release_review')
  })

  it('maps onboarding stage back to a resume wizard step', () => {
    expect(onboardingStageToWizardStep('documents_complete')).toBe('compliance')
    expect(onboardingStageToWizardStep('approved')).toBe('review')
  })
})
