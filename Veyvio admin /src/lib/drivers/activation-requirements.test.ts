import { describe, expect, it } from 'vitest'
import {
  buildActivationResolution,
  isAggregateOnboardingFailure,
  recordRequirementRequest,
} from './activation-requirements'
import { buildDriverTrainingRequirements } from './training'
import type { DriverProfile } from './types'

function minimalDriver(overrides: Partial<DriverProfile> = {}): DriverProfile {
  const base = {
    id: 'drv-activation',
    reference: 'DRV-A',
    firstName: 'Larone',
    lastName: 'Laing',
    preferredName: null,
    dateOfBirth: null,
    email: 'larone@example.com',
    phone: null,
    depotId: 'depot-1',
    depotName: 'Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: null,
    employmentType: 'employee' as const,
    employmentStatus: 'onboarding' as const,
    operationalStatus: 'onboarding' as const,
    complianceStatus: 'missing_information' as const,
    operationalEligibility: 'not_eligible' as const,
    dutyStatus: 'off_duty' as const,
    availabilityStatus: 'unavailable' as const,
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
      userAccountId: null,
      accountStatus: 'setup_incomplete' as const,
      invitationStatus: 'sent' as const,
      invitationSentAt: '2026-07-18T12:04:00.000Z',
      invitationExpiresAt: '2026-07-25T12:04:00.000Z',
      invitationDestination: 'larone@example.com',
      invitationChannel: 'email' as const,
      registrationCompletedAt: null,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      authenticationMethod: 'password' as const,
      passkeyEnabled: false,
      lastLoginAt: null,
      lastFailedLoginAt: null,
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      lastAppActivityAt: null,
      activeSessionCount: 0,
      registeredDeviceCount: 0,
      pushNotificationsEnabled: false,
      appVersion: null,
      operatingSystem: null,
      lastAppSyncAt: null,
      locationPermissionGranted: false,
      cameraPermissionGranted: false,
      devices: [],
      sessions: [],
      invitationHistory: [],
      suspension: null,
      devInvitationToken: null,
    },
    restrictions: [],
    documents: [
      {
        id: 'doc-1',
        requirementType: 'driving_licence',
        label: 'Driving licence',
        referenceNumber: 'ABC',
        issuingOrganisation: 'DVLA',
        issueDate: '2020-01-01',
        expiryDate: '2028-01-01',
        verificationStatus: 'verified' as const,
        verifiedAt: '2026-01-02T00:00:00.000Z',
        verifiedBy: 'Admin',
        rejectionReason: null,
        fileName: 'licence.pdf',
        notes: null,
      },
    ],
    documentVersions: [],
    trainingRequirements: [],
    eligibilityOverrides: [],
    notes: [],
    auditEvents: [],
    eligibility: {
      operationalEligibility: 'not_eligible' as const,
      failures: [
        {
          code: 'onboarding_incomplete',
          message: 'Larone Laing: onboarding is not complete',
          severity: 'block' as const,
        },
      ],
      warnings: [],
      canAssign: false,
      canStartTrip: false,
      summary: 'Not eligible for assignment',
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

describe('buildActivationResolution', () => {
  it('splits documents, training and qualifications instead of a single documents count', () => {
    const model = buildActivationResolution(minimalDriver())

    expect(model.summary.documentsApproved).toBe(1)
    expect(model.summary.documentsMissing).toBeGreaterThan(0)
    expect(model.summary.trainingIncomplete).toBeGreaterThan(0)
    expect(model.summary.accountIncomplete).toBe(true)
    expect(model.canActivate).toBe(false)
    expect(model.activateBlockedReasons.some((r) => r.includes('account'))).toBe(true)
    expect(model.requirements.some((r) => r.definitionKey === 'app_account')).toBe(true)
    expect(model.requirements.some((r) => r.type === 'internal_training')).toBe(true)
  })

  it('records request metadata without treating onboarding_incomplete as a separate requirement', () => {
    const driver = minimalDriver()
    recordRequirementRequest({
      driverId: driver.id,
      definitionKeys: ['company_induction'],
      channels: ['email', 'in_app'],
      dueAt: '2026-07-26',
      actorName: 'Sheldon',
    })
    const model = buildActivationResolution(driver)
    const induction = model.requirements.find((r) => r.definitionKey === 'company_induction')
    expect(induction?.status).toBe('request_sent')
    expect(induction?.lastRequestedChannels).toEqual(['email', 'in_app'])
    expect(isAggregateOnboardingFailure('onboarding_incomplete')).toBe(true)
  })

  it('does not count renewal-due training as incomplete when modules are complete', () => {
    const mandatoryKeys = [
      'company_induction',
      'driver_app',
      'daily_vehicle_checks',
      'emergency_procedures',
      'data_protection_gdpr',
      'driver_declaration',
      'health_safety',
      'safeguarding',
    ] as const
    const trainingRequirements = mandatoryKeys.map((key) => ({
      id: `tr-${key}`,
      key,
      label: key,
      requiredFor: 'All drivers',
      category: 'mandatory' as const,
      status: 'due_soon' as const,
      completedAt: '2025-01-01',
      expiresAt: '2026-08-01',
      trainer: null,
      progressPercentage: 100,
      assessmentScore: null,
    }))
    const driver = minimalDriver({
      operationalStatus: 'restricted',
      trainingRequirements,
      account: {
        ...minimalDriver().account,
        accountStatus: 'active',
      },
    })
    const model = buildActivationResolution(driver)
    expect(model.summary.trainingIncomplete).toBe(0)
    expect(model.activateBlockedReasons.some((r) => r.includes('mandatory training'))).toBe(false)
  })

  it('treats completed driver-app modules as mandatory training, not separate qualifications', () => {
    const trainingRequirements = [
      {
        id: 'tr-manual_handling',
        key: 'manual_handling',
        label: 'Manual handling',
        requiredFor: 'All drivers',
        category: 'mandatory' as const,
        status: 'complete' as const,
        completedAt: '2026-07-01',
        expiresAt: '2029-07-01',
        trainer: null,
        progressPercentage: 100,
        assessmentScore: null,
      },
      {
        id: 'tr-safeguarding_adults',
        key: 'safeguarding_adults',
        label: 'Safeguarding adults',
        requiredFor: 'All drivers',
        category: 'mandatory' as const,
        status: 'complete' as const,
        completedAt: '2026-07-01',
        expiresAt: '2029-07-01',
        trainer: null,
        progressPercentage: 100,
        assessmentScore: null,
      },
    ]
    const driver = minimalDriver({
      operationalStatus: 'restricted',
      trainingRequirements,
      account: {
        ...minimalDriver().account,
        accountStatus: 'active',
      },
    })
    const model = buildActivationResolution(driver)
    const health = model.requirements.find((r) => r.definitionKey === 'health_safety')
    const safeguarding = model.requirements.find((r) => r.definitionKey === 'safeguarding')
    expect(health?.type).toBe('internal_training')
    expect(health?.status).toBe('completed')
    expect(safeguarding?.type).toBe('internal_training')
    expect(safeguarding?.status).toBe('completed')
  })
})
