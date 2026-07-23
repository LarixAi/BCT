import { describe, expect, it } from 'vitest'
import { reconcileDriverEligibility } from './eligibility-reconcile'
import type { DriverProfile, TrainingRequirement } from './types'

function baseProfile(overrides: Partial<DriverProfile> = {}): DriverProfile {
  return {
    id: 'drv-1',
    reference: 'DRV-1',
    firstName: 'Larone',
    lastName: 'Laing',
    preferredName: null,
    dateOfBirth: null,
    email: 'l@example.com',
    phone: null,
    depotId: 'd1',
    depotName: 'Wembley',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: null,
    employmentType: 'contractor',
    employmentStatus: 'employed',
    operationalStatus: 'restricted',
    complianceStatus: 'compliant',
    operationalEligibility: 'eligible_with_warning',
    dutyStatus: 'off_duty',
    availabilityStatus: 'available',
    startDate: null,
    managerName: null,
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: 'ABC',
    licenceCountry: 'GB',
    licenceExpiry: '2027-04-26',
    licenceCategories: 'D1',
    cpcExpiry: null,
    dqcNumber: null,
    dbsExpiry: '2027-01-01',
    medicalExpiry: '2027-01-01',
    rightToWorkStatus: null,
    tachoCardNumber: null,
    tachoCardExpiry: null,
    workPermissions: [{ key: 'community', label: 'Community', enabled: true }],
    account: {
      userAccountId: 'u1',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: null,
      invitationExpiresAt: null,
      invitationDestination: null,
      invitationChannel: null,
      registrationCompletedAt: null,
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      authenticationMethod: 'password',
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
        label: 'Licence',
        referenceNumber: null,
        issuingOrganisation: null,
        issueDate: null,
        expiryDate: '2027-04-26',
        verificationStatus: 'verified',
        verifiedBy: 'Admin',
        verifiedAt: '2026-01-01T00:00:00.000Z',
        rejectionReason: null,
        notes: null,
        fileName: null,
        fileObjectId: null,
      },
    ],
    documentVersions: [],
    trainingRequirements: [],
    eligibilityOverrides: [],
    notes: [],
    auditEvents: [],
    eligibility: {
      operationalEligibility: 'eligible_with_warning',
      failures: [],
      warnings: [],
      canAssign: true,
      canStartTrip: true,
      summary: 'Eligible with warnings',
    },
    nextDutyReference: null,
    nextDutyTime: null,
    nearestExpiryDate: null,
    nearestExpiryLabel: null,
    onboardingStep: 'review',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as DriverProfile
}

function course(
  key: string,
  category: TrainingRequirement['category'],
  status: TrainingRequirement['status'],
): TrainingRequirement {
  return {
    id: `tr-${key}`,
    key,
    label: key.replace(/_/g, ' '),
    requiredFor: 'test',
    status,
    completedAt: status === 'complete' ? '2026-01-01' : null,
    expiresAt: null,
    trainer: null,
    category,
  }
}

describe('reconcileDriverEligibility release status', () => {
  it('blocks RELEASE STATUS while mandatory training is outstanding', () => {
    const result = reconcileDriverEligibility(
      baseProfile({
        trainingRequirements: [
          course('company_induction', 'mandatory', 'missing'),
          course('driver_app', 'mandatory', 'missing'),
          course('midas_standard', 'vehicle', 'missing'),
        ],
      }),
    )
    expect(result.operationalEligibility).toBe('not_eligible')
    expect(result.canAssign).toBe(false)
    expect(result.failures.some((f) => f.code === 'training_not_started')).toBe(true)
  })

  it('sets RELEASE STATUS to Eligible when all mandatory training is complete', () => {
    const result = reconcileDriverEligibility(
      baseProfile({
        trainingRequirements: [
          course('company_induction', 'mandatory', 'complete'),
          course('driver_app', 'mandatory', 'complete'),
          course('daily_vehicle_checks', 'mandatory', 'complete'),
          course('health_safety', 'mandatory', 'complete'),
          course('safeguarding', 'mandatory', 'complete'),
          course('emergency_procedures', 'mandatory', 'complete'),
          course('data_protection_gdpr', 'mandatory', 'complete'),
          course('driver_declaration', 'mandatory', 'complete'),
        ],
      }),
    )
    expect(result.operationalEligibility).toBe('eligible')
    expect(result.canAssign).toBe(true)
    expect(result.failures).toHaveLength(0)
  })

  it('keeps Eligible with warning when only vehicle training is outstanding', () => {
    const result = reconcileDriverEligibility(
      baseProfile({
        trainingRequirements: [
          course('company_induction', 'mandatory', 'complete'),
          course('driver_app', 'mandatory', 'complete'),
          course('daily_vehicle_checks', 'mandatory', 'complete'),
          course('health_safety', 'mandatory', 'complete'),
          course('safeguarding', 'mandatory', 'complete'),
          course('emergency_procedures', 'mandatory', 'complete'),
          course('data_protection_gdpr', 'mandatory', 'complete'),
          course('driver_declaration', 'mandatory', 'complete'),
          course('midas_standard', 'vehicle', 'missing'),
        ],
      }),
    )
    expect(result.operationalEligibility).toBe('eligible_with_warning')
    expect(result.canAssign).toBe(true)
    expect(result.warnings.some((w) => w.code === 'vehicle_training_incomplete')).toBe(true)
  })
})
