import { describe, expect, it } from 'vitest'
import { evaluateDriverEligibility } from './engine'
import type { DriverProfile } from '@/lib/drivers/types'
import { buildDriverTrainingRequirements } from '@/lib/drivers/training'

function minimalDriver(overrides: Partial<DriverProfile> = {}): DriverProfile {
  const base = {
    id: 'drv-test',
    reference: 'DRV-T',
    firstName: 'Test',
    lastName: 'Driver',
    preferredName: null,
    dateOfBirth: null,
    email: 't@example.com',
    phone: null,
    depotId: 'depot-1',
    depotName: 'Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: null,
    employmentType: 'employee' as const,
    employmentStatus: 'employed' as const,
    operationalStatus: 'eligible' as const,
    complianceStatus: 'compliant' as const,
    operationalEligibility: 'eligible' as const,
    dutyStatus: 'off_duty' as const,
    availabilityStatus: 'available' as const,
    startDate: '2026-01-01',
    managerName: null,
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: 'ABC',
    licenceCountry: 'GB',
    licenceCategories: 'D1',
    licenceExpiry: '2028-01-01',
    dqcNumber: null,
    cpcExpiry: '2028-01-01',
    dbsExpiry: '2028-01-01',
    medicalExpiry: '2028-01-01',
    tachoCardNumber: null,
    tachoCardExpiry: null,
    rightToWorkStatus: null,
    workPermissions: [
      { key: 'community', label: 'Community', enabled: true },
      { key: 'minibus', label: 'Minibus', enabled: true },
    ],
    account: {
      userAccountId: 'u1',
      accountStatus: 'active' as const,
      invitationStatus: 'completed' as const,
      invitationSentAt: null,
      invitationExpiresAt: null,
      invitationDestination: null,
      invitationChannel: null,
      registrationCompletedAt: '2026-01-01T00:00:00.000Z',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      authenticationMethod: 'password' as const,
      passkeyEnabled: false,
      lastLoginAt: '2026-01-01T00:00:00.000Z',
      lastFailedLoginAt: null,
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      lastAppActivityAt: '2026-01-01T00:00:00.000Z',
      activeSessionCount: 1,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '1.0',
      operatingSystem: 'iOS',
      lastAppSyncAt: '2026-01-01T00:00:00.000Z',
      locationPermissionGranted: true,
      cameraPermissionGranted: true,
      devices: [],
      sessions: [],
      invitationHistory: [],
      suspension: null,
      devInvitationToken: null,
    },
    restrictions: [],
    documents: [],
    documentVersions: [],
    trainingRequirements: [],
    eligibilityOverrides: [],
    notes: [],
    auditEvents: [],
    eligibility: {
      operationalEligibility: 'eligible' as const,
      failures: [],
      warnings: [],
      canAssign: true,
      canStartTrip: true,
      summary: 'Eligible',
    },
    nextDutyReference: null,
    nextDutyTime: null,
    nearestExpiryDate: null,
    nearestExpiryLabel: null,
    onboardingStep: 'review' as const,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
  const trainingRequirements = buildDriverTrainingRequirements(base)
  return { ...base, trainingRequirements }
}

describe('mandatory training eligibility', () => {
  it('blocks assignment when Level 1 mandatory courses are missing', () => {
    const result = evaluateDriverEligibility(minimalDriver())
    expect(result.operationalEligibility).toBe('not_eligible')
    expect(result.failures.some((f) => f.code === 'training_company_induction')).toBe(true)
    expect(result.failures.some((f) => f.code.startsWith('training_'))).toBe(true)
    // MiDAS is Level 2 (vehicle) — restriction warning, not a hard block without job context
    expect(result.failures.some((f) => f.code === 'training_midas_standard')).toBe(false)
    expect(result.warnings.some((f) => f.code === 'training_midas_standard')).toBe(true)
  })

  it('blocks wheelchair courses in wheelchair job context', () => {
    const driver = minimalDriver({
      workPermissions: [
        { key: 'community', label: 'Community', enabled: true },
        { key: 'wheelchair', label: 'Wheelchair', enabled: true },
      ],
    })
    const result = evaluateDriverEligibility(driver, { wheelchairRequired: true })
    expect(result.failures.some((f) => f.code === 'wheelchair_training')).toBe(true)
  })
})
