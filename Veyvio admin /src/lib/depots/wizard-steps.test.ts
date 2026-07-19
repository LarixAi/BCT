import { describe, expect, it } from 'vitest'
import { DEPOT_WIZARD_STEPS } from './constants'
import { nextDepotWizardStep, prevDepotWizardStep, validateDepotCapacity } from './wizard-steps'

describe('depot wizard steps', () => {
  it('has seven steps ending in review', () => {
    expect(DEPOT_WIZARD_STEPS).toHaveLength(7)
    expect(DEPOT_WIZARD_STEPS[0]!.id).toBe('basic')
    expect(DEPOT_WIZARD_STEPS[6]!.id).toBe('review')
  })

  it('gates next and prev', () => {
    expect(prevDepotWizardStep('basic')).toBeNull()
    expect(nextDepotWizardStep('basic')).toBe('operations')
    expect(nextDepotWizardStep('review')).toBeNull()
    expect(prevDepotWizardStep('review')).toBe('compliance')
  })

  it('validates capacity against assigned fleet', () => {
    expect(validateDepotCapacity(5, 10)).toBeNull()
    expect(validateDepotCapacity(12, 10)).toMatch(/exceeds/)
  })
})
