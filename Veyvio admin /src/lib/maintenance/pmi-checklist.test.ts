import { describe, expect, it } from 'vitest'
import {
  COMPANY_PMI_TEMPLATE,
  instantiatePmiChecklist,
  isPmiChecklistComplete,
  pmiChecklistCompletionBlockers,
  updateChecklistItem,
} from './pmi-checklist'

describe('instantiatePmiChecklist', () => {
  it('creates unchecked items for every template row', () => {
    const instance = instantiatePmiChecklist()
    expect(instance.templateId).toBe(COMPANY_PMI_TEMPLATE.id)
    expect(instance.items).toHaveLength(COMPANY_PMI_TEMPLATE.items.length)
    expect(instance.items.every((i) => i.result === 'unchecked')).toBe(true)
  })
})

describe('pmiChecklistCompletionBlockers', () => {
  it('blocks when checklist not started', () => {
    expect(pmiChecklistCompletionBlockers(null)[0]).toMatch(/not been started/i)
  })

  it('blocks required unchecked items and missing inspector', () => {
    const instance = instantiatePmiChecklist()
    const blockers = pmiChecklistCompletionBlockers(instance)
    expect(blockers.some((b) => b.includes('Inspector'))).toBe(true)
    expect(blockers.some((b) => b.includes('must be recorded'))).toBe(true)
  })

  it('requires brake evidence for brake performance items', () => {
    let instance = instantiatePmiChecklist()
    instance = { ...instance, inspectorName: 'Dave Wilson' }
    for (const tmpl of COMPANY_PMI_TEMPLATE.items) {
      instance = updateChecklistItem(instance, tmpl.id, {
        result: 'pass',
        evidence: tmpl.requiresBrakeEvidence
          ? { kind: 'brake_print', fileName: 'brake.pdf', note: 'Roller test' }
          : { kind: 'note', note: 'OK' },
      })
    }
    expect(isPmiChecklistComplete(instance)).toBe(true)
  })

  it('fails complete when brake item has no print', () => {
    let instance = instantiatePmiChecklist()
    instance = { ...instance, inspectorName: 'Dave Wilson' }
    for (const tmpl of COMPANY_PMI_TEMPLATE.items) {
      instance = updateChecklistItem(instance, tmpl.id, {
        result: 'pass',
        evidence: { kind: 'note', note: 'OK' },
      })
    }
    const blockers = pmiChecklistCompletionBlockers(instance)
    expect(blockers.some((b) => /brake performance evidence/i.test(b))).toBe(true)
    expect(isPmiChecklistComplete(instance)).toBe(false)
  })
})
