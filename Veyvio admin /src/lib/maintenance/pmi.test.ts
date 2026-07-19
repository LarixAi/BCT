import { describe, expect, it } from 'vitest'
import {
  COMPANY_DEFAULT_PMI_WEEKS,
  OLD_VEHICLE_MAX_PMI_WEEKS,
  computePmiDue,
  defaultPmiInterval,
  resolvePmiInterval,
} from './pmi'

describe('defaultPmiInterval', () => {
  it('uses company default for newer vehicles', () => {
    const policy = defaultPmiInterval({ modelYear: 2020, nextMaintenanceDate: null, nextMaintenanceMileage: 120000 })
    expect(policy.intervalWeeks).toBe(COMPANY_DEFAULT_PMI_WEEKS)
    expect(policy.mileageLimit).toBe(120000)
  })

  it('caps older vehicles at six weeks', () => {
    const policy = defaultPmiInterval({ modelYear: 2010, nextMaintenanceDate: null, nextMaintenanceMileage: null })
    expect(policy.intervalWeeks).toBe(OLD_VEHICLE_MAX_PMI_WEEKS)
    expect(policy.reason).toMatch(/six-week/i)
  })
})

describe('resolvePmiInterval', () => {
  it('prefers stored vehicle policy over default', () => {
    const stored = {
      intervalWeeks: 4,
      reason: 'TM override',
      approvedBy: 'Tom Harris',
      approvedAt: '2026-01-01T00:00:00.000Z',
      reviewDueAt: '2026-06-01',
      mileageLimit: 50000,
      lastCompletedAt: null,
    }
    const resolved = resolvePmiInterval({
      modelYear: 2020,
      nextMaintenanceDate: null,
      nextMaintenanceMileage: 90000,
      pmiInterval: stored,
    })
    expect(resolved.intervalWeeks).toBe(4)
    expect(resolved.reason).toBe('TM override')
  })

  it('falls back to default when no stored policy', () => {
    const resolved = resolvePmiInterval({
      modelYear: 2020,
      nextMaintenanceDate: null,
      nextMaintenanceMileage: null,
      pmiInterval: null,
    })
    expect(resolved.intervalWeeks).toBe(COMPANY_DEFAULT_PMI_WEEKS)
  })
})

describe('computePmiDue', () => {
  it('marks overdue when next date is in the past', () => {
    const result = computePmiDue({
      nextMaintenanceDate: '2020-01-01',
      nextMaintenanceMileage: null,
      mileage: 50000,
    })
    expect(result.status).toBe('overdue')
    expect(result.trigger).toBe('date')
  })

  it('marks overdue when mileage limit is exceeded', () => {
    const result = computePmiDue({
      nextMaintenanceDate: '2099-01-01',
      nextMaintenanceMileage: 100000,
      mileage: 100500,
    })
    expect(result.status).toBe('overdue')
    expect(result.trigger).toBe('mileage')
  })

  it('marks due soon within 14 days', () => {
    const inTenDays = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const result = computePmiDue({
      nextMaintenanceDate: inTenDays,
      nextMaintenanceMileage: null,
      mileage: 50000,
    })
    expect(result.status).toBe('due_soon')
    expect(result.trigger).toBe('date')
  })

  it('returns ok when no due date or mileage is set', () => {
    const result = computePmiDue({
      nextMaintenanceDate: null,
      nextMaintenanceMileage: null,
      mileage: 50000,
    })
    expect(result.status).toBe('ok')
    expect(result.trigger).toBe('none')
  })
})
