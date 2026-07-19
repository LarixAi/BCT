import { describe, expect, it } from 'vitest'
import type { DriverProfile } from './types'
import {
  buildDriverTrainingRequirements,
  catalogDefsForPermissions,
  defaultTrainingExpiry,
  summariseDriverTraining,
} from './training'

function profile(partial: Partial<DriverProfile> & { permissionKeys?: string[] }): Pick<
  DriverProfile,
  'workPermissions' | 'documents' | 'trainingRequirements'
> {
  const keys = partial.permissionKeys ?? ['community', 'minibus']
  return {
    workPermissions: keys.map((key) => ({ key, label: key, enabled: true })),
    documents: partial.documents ?? [],
    trainingRequirements: partial.trainingRequirements ?? [],
  }
}

describe('driver training catalogue', () => {
  it('always includes MiDAS Standard and core mandatory courses', () => {
    const defs = catalogDefsForPermissions(['community'])
    const keys = defs.map((d) => d.key)
    expect(keys).toContain('midas_standard')
    expect(keys).toContain('company_induction')
    expect(keys).toContain('first_aid_efaw')
    expect(keys).toContain('safeguarding_adults')
    expect(keys).toContain('manual_handling')
  })

  it('adds wheelchair / accessible modules when permissions enable', () => {
    const defs = catalogDefsForPermissions(['wheelchair', 'accessible'])
    const keys = defs.map((d) => d.key)
    expect(keys).toContain('midas_accessible')
    expect(keys).toContain('wheelchair_restraint')
    expect(keys).toContain('lift_ramp_operation')
  })

  it('adds SEND / school modules when permissions enable', () => {
    const defs = catalogDefsForPermissions(['send', 'school'])
    const keys = defs.map((d) => d.key)
    expect(keys).toContain('safeguarding_children')
    expect(keys).toContain('send_autism_awareness')
    expect(keys).toContain('behaviour_management')
  })

  it('marks requirements missing without evidence (no fake complete dates)', () => {
    const reqs = buildDriverTrainingRequirements(profile({}))
    expect(reqs.length).toBeGreaterThan(5)
    expect(reqs.every((r) => r.status === 'missing')).toBe(true)
    expect(reqs.every((r) => r.completedAt == null)).toBe(true)
    expect(reqs.find((r) => r.key === 'midas_standard')?.category).toBe('mandatory')
  })

  it('marks complete from verified documents', () => {
    const reqs = buildDriverTrainingRequirements(
      profile({
        documents: [
          {
            id: 'd1',
            requirementType: 'first_aid',
            label: 'First aid',
            referenceNumber: null,
            issuingOrganisation: null,
            issueDate: null,
            expiryDate: '2028-01-01',
            verificationStatus: 'verified',
            verifiedBy: 'Admin',
            verifiedAt: '2026-01-01T00:00:00.000Z',
            rejectionReason: null,
            notes: null,
            fileName: null,
          },
        ],
      }),
    )
    const firstAid = reqs.find((r) => r.key === 'first_aid_efaw')
    expect(firstAid?.status).toBe('complete')
    expect(firstAid?.expiresAt).toBe('2028-01-01')
  })

  it('summarises mandatory gaps for the training dashboard', () => {
    const reqs = buildDriverTrainingRequirements(profile({ permissionKeys: ['wheelchair'] }))
    const summary = summariseDriverTraining(reqs)
    expect(summary.fullyTrained).toBe(false)
    expect(summary.mandatoryMissing).toBe(summary.mandatoryTotal)
    expect(summary.roleTotal).toBeGreaterThan(0)
  })

  it('computes catalogue renewal expiry for MiDAS (48 months)', () => {
    expect(defaultTrainingExpiry('midas_standard', '2026-07-18')).toBe('2030-07-18')
    expect(defaultTrainingExpiry('company_induction', '2026-07-18')).toBeNull()
  })

  it('marks complete from a stored training record', () => {
    const reqs = buildDriverTrainingRequirements(
      profile({
        trainingRequirements: [
          {
            id: 'tr-midas_standard',
            key: 'midas_standard',
            label: 'MiDAS Standard',
            requiredFor: 'Minibus',
            status: 'complete',
            completedAt: '2026-01-10',
            expiresAt: '2030-01-10',
            trainer: 'CTA',
            category: 'mandatory',
          },
        ],
      }),
    )
    const midas = reqs.find((r) => r.key === 'midas_standard')
    expect(midas?.status).toBe('complete')
    expect(midas?.completedAt).toBe('2026-01-10')
    expect(midas?.trainer).toBe('CTA')
  })
})
