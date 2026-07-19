import { WORK_PERMISSION_OPTIONS } from '@/lib/drivers/constants'
import { applyVerifiedDocumentToProfile, deriveComplianceStatus } from '@/lib/drivers/compliance'
import { defaultTrainingExpiry, getTrainingCatalogDef } from '@/lib/drivers/training'
import { evaluateDriverEligibility, syncProfileEligibility } from '@/lib/eligibility/engine'
import type {
  ActivateDriverInput,
  AddDriverRestrictionInput,
  CreateDriverAppAccountInput,
  CreateDriverInput,
  DriverAccount,
  DriverAuditEvent,
  DriverDirectorySummary,
  DriverDocument,
  DriverNote,
  DriverProfile,
  DriverWorkPermission,
  GrantEligibilityOverrideInput,
  OffboardDriverInput,
  RecordDriverTrainingInput,
  ReinstateDriverInput,
  RevokeDriverDeviceInput,
  SuspendDriverInput,
  UnlockDriverInput,
  UpdateDriverInput,
  UploadDriverDocumentInput,
} from '@/lib/drivers/types'

const now = () => new Date().toISOString()
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

function workPerms(...keys: string[]): DriverWorkPermission[] {
  return WORK_PERMISSION_OPTIONS.map((o) => ({ ...o, enabled: keys.includes(o.key) }))
}

function baseDocs(
  licenceExpiry: string,
  cpcExpiry: string,
  dbsExpiry: string,
  medicalExpiry?: string,
): DriverDocument[] {
  return [
    {
      id: 'doc-licence',
      requirementType: 'driving_licence',
      label: 'Driving licence',
      referenceNumber: null,
      issuingOrganisation: 'DVLA',
      issueDate: '2020-01-01',
      expiryDate: licenceExpiry,
      verificationStatus: 'verified',
      verifiedBy: 'Maria Santos',
      verifiedAt: '2025-06-01T10:00:00Z',
      rejectionReason: null,
      notes: null,
      fileName: 'driving_licence.pdf',
    },
    {
      id: 'doc-cpc',
      requirementType: 'cpc',
      label: 'Driver CPC',
      referenceNumber: null,
      issuingOrganisation: 'JAUPT',
      issueDate: '2022-03-01',
      expiryDate: cpcExpiry,
      verificationStatus: 'verified',
      verifiedBy: 'Maria Santos',
      verifiedAt: '2025-06-01T10:00:00Z',
      rejectionReason: null,
      notes: null,
      fileName: 'cpc.pdf',
    },
    {
      id: 'doc-dbs',
      requirementType: 'dbs',
      label: 'DBS / safeguarding',
      referenceNumber: null,
      issuingOrganisation: 'DBS',
      issueDate: '2024-01-15',
      expiryDate: dbsExpiry,
      verificationStatus: 'verified',
      verifiedBy: 'Maria Santos',
      verifiedAt: '2025-06-01T10:00:00Z',
      rejectionReason: null,
      notes: null,
      fileName: 'dbs.pdf',
    },
    ...(medicalExpiry
      ? [
          {
            id: 'doc-medical',
            requirementType: 'medical',
            label: 'Medical certificate',
            referenceNumber: null,
            issuingOrganisation: 'GP',
            issueDate: '2024-12-01',
            expiryDate: medicalExpiry,
            verificationStatus: 'verified' as const,
            verifiedBy: 'Maria Santos',
            verifiedAt: '2025-06-01T10:00:00Z',
            rejectionReason: null,
            notes: null,
            fileName: 'medical.pdf',
          },
        ]
      : []),
  ]
}

function withAccountDefaults(account: Partial<DriverAccount> & Pick<DriverAccount, 'accountStatus' | 'invitationStatus'>): DriverAccount {
  const devices = account.devices ?? []
  const sessions = account.sessions ?? []
  return {
    userAccountId: account.userAccountId ?? null,
    accountStatus: account.accountStatus,
    invitationStatus: account.invitationStatus,
    invitationSentAt: account.invitationSentAt ?? null,
    invitationExpiresAt: account.invitationExpiresAt ?? null,
    invitationDestination: account.invitationDestination ?? null,
    invitationChannel: account.invitationChannel ?? null,
    registrationCompletedAt: account.registrationCompletedAt ?? null,
    emailVerified: account.emailVerified ?? false,
    phoneVerified: account.phoneVerified ?? false,
    mfaEnabled: account.mfaEnabled ?? false,
    authenticationMethod: account.authenticationMethod ?? 'none',
    passkeyEnabled: account.passkeyEnabled ?? false,
    lastLoginAt: account.lastLoginAt ?? null,
    lastFailedLoginAt: account.lastFailedLoginAt ?? null,
    failedLoginCount: account.failedLoginCount ?? 0,
    accountLocked: account.accountLocked ?? false,
    lastPasswordResetAt: account.lastPasswordResetAt ?? null,
    lastAppActivityAt: account.lastAppActivityAt ?? account.lastAppSyncAt ?? account.lastLoginAt ?? null,
    activeSessionCount: account.activeSessionCount ?? sessions.length,
    registeredDeviceCount: account.registeredDeviceCount ?? devices.length,
    pushNotificationsEnabled: account.pushNotificationsEnabled ?? false,
    appVersion: account.appVersion ?? null,
    operatingSystem: account.operatingSystem ?? null,
    lastAppSyncAt: account.lastAppSyncAt ?? null,
    locationPermissionGranted: account.locationPermissionGranted ?? false,
    cameraPermissionGranted: account.cameraPermissionGranted ?? false,
    devices,
    sessions,
    invitationHistory: account.invitationHistory ?? [],
    suspension: account.suspension ?? null,
    devInvitationToken: account.devInvitationToken ?? null,
  }
}

function nearestExpiry(profile: Pick<DriverProfile, 'licenceExpiry' | 'cpcExpiry' | 'dbsExpiry' | 'medicalExpiry'>) {
  const entries = [
    { label: 'Licence', date: profile.licenceExpiry },
    { label: 'CPC', date: profile.cpcExpiry },
    { label: 'DBS', date: profile.dbsExpiry },
    { label: 'Medical', date: profile.medicalExpiry },
  ].filter((e) => e.date) as { label: string; date: string }[]

  if (entries.length === 0) return { date: null, label: null }
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return { date: entries[0]!.date, label: entries[0]!.label }
}

function buildProfile(
  partial: Omit<
    DriverProfile,
    | 'eligibility'
    | 'nearestExpiryDate'
    | 'nearestExpiryLabel'
    | 'trainingRequirements'
    | 'documentVersions'
    | 'eligibilityOverrides'
    | 'dateOfBirth'
    | 'operationalStatus'
    | 'licenceCountry'
    | 'licenceCategories'
    | 'dqcNumber'
    | 'rightToWorkStatus'
    | 'tachoCardNumber'
    | 'tachoCardExpiry'
    | 'onboardingStep'
    | 'account'
  > &
    Partial<
      Pick<
        DriverProfile,
        | 'dateOfBirth'
        | 'operationalStatus'
        | 'licenceCountry'
        | 'licenceCategories'
        | 'dqcNumber'
        | 'rightToWorkStatus'
        | 'tachoCardNumber'
        | 'tachoCardExpiry'
        | 'onboardingStep'
        | 'trainingRequirements'
        | 'documentVersions'
        | 'eligibilityOverrides'
      >
    > & {
      account: Partial<DriverAccount> & Pick<DriverAccount, 'accountStatus' | 'invitationStatus'>
    },
): DriverProfile {
  const nearest = nearestExpiry(partial)
  const withDefaults = {
    dateOfBirth: partial.dateOfBirth ?? null,
    operationalStatus: partial.operationalStatus ?? 'eligible',
    licenceCountry: partial.licenceCountry ?? 'GB',
    licenceCategories: partial.licenceCategories ?? null,
    dqcNumber: partial.dqcNumber ?? null,
    rightToWorkStatus: partial.rightToWorkStatus ?? null,
    tachoCardNumber: partial.tachoCardNumber ?? null,
    tachoCardExpiry: partial.tachoCardExpiry ?? null,
    onboardingStep: partial.onboardingStep ?? 'review',
    ...partial,
    account: withAccountDefaults(partial.account),
    documentVersions: partial.documentVersions ?? [],
    eligibilityOverrides: partial.eligibilityOverrides ?? [],
    trainingRequirements: partial.trainingRequirements ?? [],
    restrictions: partial.restrictions ?? [],
  }
  const base: DriverProfile = {
    ...withDefaults,
    nearestExpiryDate: nearest.date,
    nearestExpiryLabel: nearest.label,
    eligibility: evaluateDriverEligibility(withDefaults as DriverProfile),
  }
  return syncProfileEligibility(base)
}

let driverSeq = 6

const SEED_PROFILES: DriverProfile[] = [
  buildProfile({
    id: 'drv-1',
    reference: 'DRV-0001',
    firstName: 'Jane',
    lastName: 'Smith',
    preferredName: 'Jane',
    email: 'j.smith@metrotransport.co.uk',
    phone: '07700 900101',
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: 'EMP-1042',
    employmentType: 'employee',
    employmentStatus: 'employed',
    complianceStatus: 'compliant',
    operationalEligibility: 'eligible',
    dutyStatus: 'on_trip',
    availabilityStatus: 'available',
    startDate: '2019-03-12',
    managerName: 'Maria Santos',
    homeAddress: '12 Station Road, Wembley',
    emergencyContact: 'John Smith — 07700 900199',
    licenceNumber: 'SMITH901015J99AB',
    licenceExpiry: '2027-06-01',
    cpcExpiry: '2026-09-01',
    dbsExpiry: '2027-01-15',
    medicalExpiry: '2026-12-01',
    workPermissions: workPerms('psv', 'school', 'accessible', 'wheelchair', 'contract'),
    account: {
      userAccountId: 'usr-drv-1',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: '2019-03-10T09:00:00Z',
      invitationExpiresAt: null,
      invitationDestination: 'j.smith@metrotransport.co.uk',
      invitationChannel: 'email',
      registrationCompletedAt: '2019-03-12T14:30:00Z',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      authenticationMethod: 'passkey_and_biometric',
      passkeyEnabled: true,
      lastLoginAt: daysAgo(0),
      lastFailedLoginAt: null,
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: '2025-11-01T08:00:00Z',
      lastAppActivityAt: daysAgo(0),
      activeSessionCount: 1,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '3.4.2',
      operatingSystem: 'Android 14',
      lastAppSyncAt: daysAgo(0),
      locationPermissionGranted: true,
      cameraPermissionGranted: true,
      devices: [
        {
          id: 'dev-drv-1-1',
          label: 'Pixel 8',
          platform: 'Android',
          appVersion: '3.4.2',
          operatingSystem: 'Android 14',
          registeredAt: '2024-06-12T09:42:00Z',
          lastSeenAt: daysAgo(0),
          trusted: true,
          biometricUnlock: true,
          pushNotificationsEnabled: true,
          locationAccess: 'while_on_duty',
          securityStatus: 'trusted',
        },
      ],
      sessions: [
        {
          id: 'sess-drv-1-1',
          deviceId: 'dev-drv-1-1',
          deviceLabel: 'Pixel 8',
          startedAt: daysAgo(0),
          lastActiveAt: daysAgo(0),
          current: true,
          ipAddress: '86.12.45.10',
        },
      ],
      invitationHistory: [
        {
          id: 'invh-drv-1-1',
          stage: 'invitation_sent',
          channel: 'email',
          destination: 'j.smith@metrotransport.co.uk',
          createdAt: '2019-03-10T09:00:00Z',
          actor: 'Maria Santos',
          detail: null,
        },
        {
          id: 'invh-drv-1-2',
          stage: 'identity_verified',
          channel: 'email',
          destination: 'j.smith@metrotransport.co.uk',
          createdAt: '2019-03-11T10:12:00Z',
          actor: null,
          detail: null,
        },
        {
          id: 'invh-drv-1-3',
          stage: 'activated',
          channel: 'email',
          destination: 'j.smith@metrotransport.co.uk',
          createdAt: '2019-03-12T14:30:00Z',
          actor: 'Maria Santos',
          detail: null,
        },
      ],
      suspension: null,
    },
    restrictions: [],
    documents: baseDocs('2027-06-01', '2026-09-01', '2027-01-15', '2026-12-01'),
    notes: [],
    auditEvents: [
      { id: 'aud-1', action: 'Account activated', actor: 'Maria Santos', actorRole: 'Driver administrator', createdAt: '2019-03-12T14:30:00Z', previousValue: null, newValue: 'active', reason: null },
      { id: 'aud-1b', action: 'Device registered', actor: 'Jane Smith', actorRole: 'Driver', createdAt: '2024-06-12T09:42:00Z', previousValue: null, newValue: 'Pixel 8', reason: null },
    ],
    nextDutyReference: 'SCH-AM-104',
    nextDutyTime: '07:30',
    createdAt: '2019-03-10T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
  buildProfile({
    id: 'drv-2',
    reference: 'DRV-0002',
    firstName: 'Michael',
    lastName: 'Patel',
    preferredName: null,
    email: 'm.patel@metrotransport.co.uk',
    phone: '07700 900102',
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: 'EMP-1088',
    employmentType: 'employee',
    employmentStatus: 'employed',
    complianceStatus: 'compliant',
    operationalEligibility: 'eligible',
    dutyStatus: 'assigned',
    availabilityStatus: 'available',
    startDate: '2020-08-01',
    managerName: 'Maria Santos',
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: 'PATEL802203M99CD',
    licenceExpiry: '2026-12-01',
    cpcExpiry: '2027-03-01',
    dbsExpiry: '2026-08-20',
    medicalExpiry: null,
    workPermissions: workPerms('psv', 'phv', 'contract'),
    account: {
      userAccountId: 'usr-drv-2',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: '2020-07-28T09:00:00Z',
      invitationExpiresAt: null,
      invitationDestination: 'm.patel@metrotransport.co.uk',
      registrationCompletedAt: '2020-08-01T11:00:00Z',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      lastLoginAt: daysAgo(1),
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 1,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '3.4.1',
      operatingSystem: 'iOS 17',
      lastAppSyncAt: daysAgo(0),
      locationPermissionGranted: true,
      cameraPermissionGranted: true,
    },
    restrictions: [],
    documents: baseDocs('2026-12-01', '2027-03-01', '2026-08-20'),
    notes: [],
    auditEvents: [],
    nextDutyReference: null,
    nextDutyTime: null,
    createdAt: '2020-07-28T09:00:00Z',
    updatedAt: daysAgo(1),
  }),
  buildProfile({
    id: 'drv-3',
    reference: 'DRV-0003',
    firstName: 'Alice',
    lastName: 'Brown',
    preferredName: null,
    email: 'a.brown@metrotransport.co.uk',
    phone: '07700 900103',
    depotId: 'depot-croydon',
    depotName: 'Croydon Depot',
    secondaryDepotIds: ['depot-wembley'],
    secondaryDepotNames: ['Wembley Depot'],
    employeeNumber: 'EMP-1120',
    employmentType: 'employee',
    employmentStatus: 'employed',
    complianceStatus: 'documents_expiring_soon',
    operationalEligibility: 'eligible_with_warning',
    dutyStatus: 'available',
    availabilityStatus: 'available',
    startDate: '2021-01-15',
    managerName: 'David Chen',
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: 'BROWN703104A99EF',
    licenceExpiry: '2028-03-15',
    cpcExpiry: daysFromNow(18),
    dbsExpiry: '2028-06-01',
    medicalExpiry: null,
    workPermissions: workPerms('psv', 'accessible', 'wheelchair', 'school'),
    account: {
      userAccountId: 'usr-drv-3',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: '2021-01-10T09:00:00Z',
      invitationExpiresAt: null,
      invitationDestination: 'a.brown@metrotransport.co.uk',
      registrationCompletedAt: '2021-01-15T10:00:00Z',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      lastLoginAt: daysAgo(2),
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 1,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '3.3.9',
      operatingSystem: 'Android 13',
      lastAppSyncAt: daysAgo(2),
      locationPermissionGranted: true,
      cameraPermissionGranted: false,
    },
    restrictions: [],
    documents: baseDocs('2028-03-15', daysFromNow(18), '2028-06-01'),
    notes: [],
    auditEvents: [],
    nextDutyReference: 'DAY-CTR-058',
    nextDutyTime: '09:00',
    createdAt: '2021-01-10T09:00:00Z',
    updatedAt: daysAgo(2),
  }),
  buildProfile({
    id: 'drv-4',
    reference: 'DRV-0004',
    firstName: 'Robert',
    lastName: 'Wilson',
    preferredName: null,
    email: 'r.wilson@metrotransport.co.uk',
    phone: '07700 900104',
    depotId: 'depot-croydon',
    depotName: 'Croydon Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: 'EMP-0991',
    employmentType: 'employee',
    employmentStatus: 'employed',
    complianceStatus: 'non_compliant',
    operationalEligibility: 'not_eligible',
    dutyStatus: 'off_duty',
    availabilityStatus: 'available',
    startDate: '2018-06-01',
    managerName: 'David Chen',
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: 'WILSN604205R99GH',
    licenceExpiry: '2025-11-20',
    cpcExpiry: '2026-02-01',
    dbsExpiry: '2026-11-01',
    medicalExpiry: '2025-12-15',
    workPermissions: workPerms('psv', 'school'),
    account: {
      userAccountId: 'usr-drv-4',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: '2018-05-20T09:00:00Z',
      invitationExpiresAt: null,
      invitationDestination: 'r.wilson@metrotransport.co.uk',
      registrationCompletedAt: '2018-06-01T10:00:00Z',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: false,
      lastLoginAt: daysAgo(5),
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 0,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '3.2.1',
      operatingSystem: 'Android 12',
      lastAppSyncAt: daysAgo(5),
      locationPermissionGranted: true,
      cameraPermissionGranted: true,
    },
    restrictions: [],
    documents: baseDocs('2025-11-20', '2026-02-01', '2026-11-01', '2025-12-15'),
    notes: [
      {
        id: 'note-1',
        category: 'compliance',
        body: 'Licence renewal evidence requested — driver notified to upload before next assignment.',
        author: 'Maria Santos',
        createdAt: daysAgo(3),
        visibleToDriver: true,
      },
    ],
    auditEvents: [
      { id: 'aud-4', action: 'Assignment blocked', actor: 'System', actorRole: 'Eligibility engine', createdAt: daysAgo(1), previousValue: 'eligible', newValue: 'not_eligible', reason: 'Licence expired' },
    ],
    nextDutyReference: null,
    nextDutyTime: null,
    createdAt: '2018-05-20T09:00:00Z',
    updatedAt: daysAgo(1),
  }),
  buildProfile({
    id: 'drv-5',
    reference: 'DRV-0005',
    firstName: 'Sarah',
    lastName: 'Johnson',
    preferredName: null,
    email: 's.johnson@metrotransport.co.uk',
    phone: '07700 900105',
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: 'EMP-1155',
    employmentType: 'employee',
    employmentStatus: 'on_leave',
    complianceStatus: 'compliant',
    operationalEligibility: 'not_eligible',
    dutyStatus: 'off_duty',
    availabilityStatus: 'sick',
    startDate: '2022-04-01',
    managerName: 'Maria Santos',
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: null,
    licenceExpiry: '2027-08-01',
    cpcExpiry: '2027-05-01',
    dbsExpiry: '2027-03-01',
    medicalExpiry: null,
    workPermissions: workPerms('phv', 'contract'),
    account: {
      userAccountId: 'usr-drv-5',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: '2022-03-28T09:00:00Z',
      invitationExpiresAt: null,
      invitationDestination: 's.johnson@metrotransport.co.uk',
      registrationCompletedAt: '2022-04-01T10:00:00Z',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: false,
      lastLoginAt: daysAgo(7),
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 0,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: false,
      appVersion: '3.4.0',
      operatingSystem: 'Android 14',
      lastAppSyncAt: daysAgo(7),
      locationPermissionGranted: false,
      cameraPermissionGranted: false,
    },
    restrictions: [],
    documents: baseDocs('2027-08-01', '2027-05-01', '2027-03-01'),
    notes: [],
    auditEvents: [],
    nextDutyReference: null,
    nextDutyTime: null,
    createdAt: '2022-03-28T09:00:00Z',
    updatedAt: daysAgo(7),
  }),
  buildProfile({
    id: 'drv-6',
    reference: 'DRV-0006',
    firstName: 'Tom',
    lastName: 'Hughes',
    preferredName: null,
    email: 't.hughes@example.com',
    phone: '07700 900106',
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: null,
    employmentType: 'employee',
    employmentStatus: 'onboarding',
    complianceStatus: 'missing_information',
    operationalEligibility: 'awaiting_approval',
    dutyStatus: 'off_duty',
    availabilityStatus: 'unavailable',
    startDate: daysFromNow(14),
    managerName: 'Maria Santos',
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: null,
    licenceExpiry: null,
    cpcExpiry: null,
    dbsExpiry: null,
    medicalExpiry: null,
    workPermissions: workPerms('school', 'accessible'),
    account: {
      userAccountId: null,
      accountStatus: 'invitation_pending',
      invitationStatus: 'sent',
      invitationSentAt: daysAgo(2),
      invitationExpiresAt: daysFromNow(5),
      invitationDestination: 't.hughes@example.com',
      invitationChannel: 'email',
      registrationCompletedAt: null,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      authenticationMethod: 'none',
      lastLoginAt: null,
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 0,
      registeredDeviceCount: 0,
      pushNotificationsEnabled: false,
      appVersion: null,
      operatingSystem: null,
      invitationHistory: [
        {
          id: 'invh-drv-6-1',
          stage: 'invitation_sent',
          channel: 'email',
          destination: 't.hughes@example.com',
          createdAt: daysAgo(2),
          actor: 'Maria Santos',
          detail: 'Expires in 5 days',
        },
      ],
      lastAppSyncAt: null,
      locationPermissionGranted: false,
      cameraPermissionGranted: false,
    },
    restrictions: [],
    documents: [],
    notes: [],
    auditEvents: [
      { id: 'aud-6a', action: 'Driver created', actor: 'Larone Laing', actorRole: 'Company owner', createdAt: daysAgo(3), previousValue: null, newValue: 'DRV-0006', reason: null },
      { id: 'aud-6b', action: 'Invitation sent', actor: 'Larone Laing', actorRole: 'Company owner', createdAt: daysAgo(2), previousValue: null, newValue: 't.hughes@example.com', reason: null },
    ],
    nextDutyReference: null,
    nextDutyTime: null,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  }),
  buildProfile({
    id: 'drv-7',
    reference: 'DRV-0007',
    firstName: 'Emma',
    lastName: 'Davis',
    preferredName: 'Em',
    email: 'e.davis@metrotransport.co.uk',
    phone: '07700 900107',
    depotId: 'depot-croydon',
    depotName: 'Croydon Depot',
    secondaryDepotIds: [],
    secondaryDepotNames: [],
    employeeNumber: 'EMP-1201',
    employmentType: 'contractor',
    employmentStatus: 'employed',
    complianceStatus: 'compliant_with_warnings',
    operationalEligibility: 'restricted',
    dutyStatus: 'available',
    availabilityStatus: 'available',
    startDate: '2023-09-01',
    managerName: 'David Chen',
    homeAddress: null,
    emergencyContact: null,
    licenceNumber: 'DAVIS903201E99XY',
    licenceExpiry: '2027-04-01',
    cpcExpiry: '2027-06-01',
    dbsExpiry: '2027-02-01',
    medicalExpiry: null,
    workPermissions: workPerms('psv', 'accessible', 'wheelchair', 'contract'),
    account: {
      userAccountId: 'usr-drv-7',
      accountStatus: 'active',
      invitationStatus: 'completed',
      invitationSentAt: '2023-08-25T09:00:00Z',
      invitationExpiresAt: null,
      invitationDestination: 'e.davis@metrotransport.co.uk',
      registrationCompletedAt: '2023-09-01T10:00:00Z',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      lastLoginAt: daysAgo(0),
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 1,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '3.4.2',
      operatingSystem: 'iOS 18',
      lastAppSyncAt: daysAgo(0),
      locationPermissionGranted: true,
      cameraPermissionGranted: true,
    },
    restrictions: [
      {
        id: 'rest-1',
        type: 'no_school',
        label: 'No school contracts',
        startDate: daysFromNow(-30),
        reviewDate: daysFromNow(60),
        endDate: null,
        reason: 'Pending safeguarding refresher — school work paused until training complete.',
        createdBy: 'Maria Santos',
        approvedBy: 'David Chen',
        status: 'active',
        applicableWork: 'School transport',
      },
    ],
    documents: baseDocs('2027-04-01', '2027-06-01', '2027-02-01'),
    notes: [],
    auditEvents: [
      { id: 'aud-7', action: 'Restriction added', actor: 'Maria Santos', actorRole: 'Compliance manager', createdAt: daysFromNow(-30), previousValue: null, newValue: 'No school contracts', reason: 'Safeguarding refresher pending' },
    ],
    nextDutyReference: 'DAY-CTR-058',
    nextDutyTime: '14:00',
    createdAt: '2023-08-25T09:00:00Z',
    updatedAt: daysAgo(0),
  }),
]

let profiles: DriverProfile[] = SEED_PROFILES.map((p) => syncProfileEligibility(p))

function appendAudit(profile: DriverProfile, event: Omit<DriverAuditEvent, 'id'>): DriverAuditEvent {
  const entry: DriverAuditEvent = { ...event, id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }
  profile.auditEvents = [entry, ...profile.auditEvents]
  return entry
}

export const mockDriversApi = {
  list(): DriverProfile[] {
    return profiles.map((p) => syncProfileEligibility({ ...p }))
  },

  get(id: string): DriverProfile {
    const p = profiles.find((d) => d.id === id)
    if (!p) throw new Error('Driver not found')
    return syncProfileEligibility({ ...p })
  },

  summary(): DriverDirectorySummary {
    const list = mockDriversApi.list()
    const staleMs = 24 * 60 * 60 * 1000
    return {
      totalActive: list.filter((d) => !['employment_ended', 'applicant'].includes(d.employmentStatus)).length,
      eligibleToday: list.filter((d) => d.eligibility.canAssign).length,
      notEligible: list.filter((d) => d.operationalEligibility === 'not_eligible').length,
      documentsExpiringSoon: list.filter((d) => d.complianceStatus === 'documents_expiring_soon' || d.eligibility.warnings.some((w) => w.code.includes('expiring'))).length,
      invitePending: list.filter((d) => d.account.accountStatus === 'invitation_pending').length,
      onDuty: list.filter((d) => ['assigned', 'on_trip', 'checking_in', 'finishing_duty'].includes(d.dutyStatus)).length,
      onTrip: list.filter((d) => d.dutyStatus === 'on_trip').length,
      suspendedOrRestricted: list.filter(
        (d) =>
          d.operationalEligibility === 'restricted' ||
          d.employmentStatus === 'suspended' ||
          d.account.accountStatus === 'temporarily_suspended' ||
          d.account.accountStatus === 'compliance_restricted',
      ).length,
      appNotRecentlySynced: list.filter((d) => {
        if (!d.account.lastAppSyncAt) return d.account.accountStatus === 'active'
        return Date.now() - new Date(d.account.lastAppSyncAt).getTime() > staleMs
      }).length,
    }
  },

  create(input: CreateDriverInput, actorName: string): DriverProfile {
    const duplicate = profiles.find(
      (d) => d.email?.toLowerCase() === input.email.toLowerCase() || d.phone === input.phone,
    )
    if (duplicate) throw new Error('A driver with this email or phone already exists.')

    driverSeq += 1
    const id = `drv-${driverSeq}`
    const ref = `DRV-${String(driverSeq).padStart(4, '0')}`
    const depotName = input.depotId === 'depot-croydon' ? 'Croydon Depot' : 'Wembley Depot'
    const ts = now()

    const profile = buildProfile({
      id,
      reference: ref,
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: input.preferredName ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      email: input.email,
      phone: input.phone,
      depotId: input.depotId,
      depotName,
      secondaryDepotIds: [],
      secondaryDepotNames: [],
      employeeNumber: input.employeeNumber ?? null,
      employmentType: input.employmentType,
      employmentStatus: 'applicant',
      operationalStatus: 'draft',
      onboardingStep: 'personal',
      complianceStatus: 'missing_information',
      operationalEligibility: 'awaiting_approval',
      dutyStatus: 'off_duty',
      availabilityStatus: 'unavailable',
      startDate: input.startDate ?? null,
      managerName: null,
      homeAddress: input.homeAddress ?? null,
      emergencyContact: input.emergencyContact ?? null,
      licenceNumber: null,
      licenceExpiry: null,
      cpcExpiry: null,
      dbsExpiry: null,
      medicalExpiry: null,
      workPermissions: workPerms(...(input.workPermissionKeys?.length ? input.workPermissionKeys : [])),
      account: {
        userAccountId: null,
        accountStatus: input.sendInvitation ? 'invitation_pending' : 'draft',
        invitationStatus: input.sendInvitation ? 'sent' : 'not_sent',
        invitationSentAt: input.sendInvitation ? ts : null,
        invitationExpiresAt: input.sendInvitation ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null,
        invitationDestination: input.email,
        invitationChannel: input.sendInvitation ? (input.invitationChannel ?? 'email') : null,
        registrationCompletedAt: null,
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false,
        authenticationMethod: 'none',
        lastLoginAt: null,
        failedLoginCount: 0,
        accountLocked: false,
        lastPasswordResetAt: null,
        activeSessionCount: 0,
        registeredDeviceCount: 0,
        pushNotificationsEnabled: false,
        appVersion: null,
        invitationHistory: input.sendInvitation
          ? [
              {
                id: `invh-${id}-1`,
                stage: 'invitation_sent' as const,
                channel: input.invitationChannel ?? 'email',
                destination: input.email,
                createdAt: ts,
                actor: actorName,
                detail: 'Default expiry 72 hours',
              },
            ]
          : [],
        operatingSystem: null,
        lastAppSyncAt: null,
        locationPermissionGranted: false,
        cameraPermissionGranted: false,
      },
      restrictions: [],
      documents: [],
      notes: [],
      auditEvents: [],
      nextDutyReference: null,
      nextDutyTime: null,
      createdAt: ts,
      updatedAt: ts,
    })

    appendAudit(profile, {
      action: 'Driver draft created',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: null,
      newValue: ref,
      reason: 'No app login created at this stage',
    })

    if (input.sendInvitation) {
      appendAudit(profile, {
        action: 'Invitation sent',
        actor: actorName,
        actorRole: 'Driver administrator',
        createdAt: ts,
        previousValue: null,
        newValue: input.email,
        reason: null,
      })
    }

    profiles = [syncProfileEligibility(profile), ...profiles]
    return profile
  },

  update(id: string, input: UpdateDriverInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const depotName =
      input.depotId === 'depot-croydon'
        ? 'Croydon Depot'
        : input.depotId === 'depot-wembley'
          ? 'Wembley Depot'
          : current.depotName

    const secondaryDepotIds = input.secondaryDepotIds ?? current.secondaryDepotIds
    const secondaryDepotNames = secondaryDepotIds.map((d) =>
      d === 'depot-croydon' ? 'Croydon Depot' : d === 'depot-wembley' ? 'Wembley Depot' : d,
    )

    let operationalStatus = input.operationalStatus ?? current.operationalStatus
    let employmentStatus = input.employmentStatus ?? current.employmentStatus
    if (current.operationalStatus === 'draft' && input.onboardingStep && input.onboardingStep !== 'personal') {
      operationalStatus = 'onboarding'
      employmentStatus = 'onboarding'
    }

    const emailChanged =
      input.email !== undefined &&
      (input.email ?? '').trim().toLowerCase() !== (current.email ?? '').trim().toLowerCase()
    const phoneChanged = input.phone !== undefined && (input.phone ?? '') !== (current.phone ?? '')

    if ((emailChanged || phoneChanged) && !input.contactChangeReason?.trim()) {
      throw new Error('A reason is required when changing the driver’s login email or mobile number.')
    }
    if (emailChanged && input.email) {
      const duplicate = profiles.find(
        (d) => d.id !== id && d.email?.toLowerCase() === input.email!.trim().toLowerCase(),
      )
      if (duplicate) throw new Error('Another driver already uses this email address.')
    }

    const nextEmail = input.email !== undefined ? input.email.trim().toLowerCase() || null : current.email
    const { contactChangeReason: _reason, workPermissionKeys: _keys, ...profilePatch } = input
    const updated = syncProfileEligibility({
      ...current,
      ...profilePatch,
      email: nextEmail,
      depotName: input.depotId ? depotName : current.depotName,
      secondaryDepotIds,
      secondaryDepotNames,
      operationalStatus,
      employmentStatus,
      workPermissions: input.workPermissionKeys ? workPerms(...input.workPermissionKeys) : current.workPermissions,
      account: {
        ...current.account,
        invitationDestination: emailChanged ? nextEmail : current.account.invitationDestination,
        emailVerified: emailChanged ? false : current.account.emailVerified,
      },
      updatedAt: now(),
    })

    appendAudit(updated, {
      action: emailChanged || phoneChanged ? 'Driver login contact updated' : 'Driver updated',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: now(),
      previousValue: emailChanged
        ? current.email
        : phoneChanged
          ? current.phone
          : current.reference,
      newValue: emailChanged ? nextEmail : phoneChanged ? updated.phone : updated.reference,
      reason:
        input.contactChangeReason?.trim() ||
        (input.onboardingStep ? `Onboarding step: ${input.onboardingStep}` : null),
    })

    profiles[idx] = updated
    return updated
  },

  createAppAccount(id: string, input: CreateDriverAppAccountInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    if (!current.email && input.channel !== 'sms') throw new Error('Driver has no email address.')
    if (!current.phone && input.channel !== 'email') throw new Error('Driver has no mobile number.')

    const ts = now()
    const token = `drv-invite-${id}-${Date.now().toString(36)}`
    const destination = input.channel === 'sms' ? current.phone : current.email
    const historyEntry = {
      id: `invh-${id}-${Date.now().toString(36)}`,
      stage: 'invitation_sent' as const,
      channel: input.channel,
      destination,
      createdAt: ts,
      actor: actorName,
      detail: 'Single-use link · expires in 72 hours',
    }
    const updated = syncProfileEligibility({
      ...current,
      operationalStatus: current.operationalStatus === 'draft' ? 'onboarding' : current.operationalStatus,
      onboardingStep: 'account',
      availabilityStatus: 'available',
      account: {
        ...current.account,
        userAccountId: current.account.userAccountId ?? `user-pending-${id}`,
        accountStatus: 'invitation_pending',
        invitationStatus: 'sent',
        invitationSentAt: ts,
        invitationExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        invitationDestination: destination,
        invitationChannel: input.channel,
        suspension: null,
        invitationHistory: [historyEntry, ...(current.account.invitationHistory ?? [])],
        devInvitationToken: token,
      },
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Driver app invitation sent',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: current.account.accountStatus,
      newValue: `invitation_pending (${input.channel})`,
      reason: 'Driver creates their own password — never set by admin',
    })

    profiles[idx] = updated
    return updated
  },

  activate(id: string, input: ActivateDriverInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const eligibility = evaluateDriverEligibility(current)
    const blocks = eligibility.failures.filter((f) => f.severity === 'block')
    if (blocks.length) {
      throw new Error(`Cannot activate: ${blocks.map((b) => b.message).join('; ')}`)
    }
    const warnings = eligibility.warnings
    const overrideCodes = new Set(input.overrideWarningCodes ?? [])
    const unoverridden = warnings.filter((w) => !overrideCodes.has(w.code))
    if (unoverridden.length && !(input.overrideWarningCodes?.length && input.overrideReason)) {
      // warnings alone do not block if none require override; allow activate with warnings
    }

    const ts = now()
    const updated = syncProfileEligibility({
      ...current,
      operationalStatus: current.restrictions.some((r) => r.status === 'active') ? 'restricted' : 'eligible',
      employmentStatus: 'employed',
      operationalEligibility: eligibility.operationalEligibility,
      onboardingStep: 'review',
      availabilityStatus: 'available',
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Driver activated',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: current.operationalStatus,
      newValue: updated.operationalStatus,
      reason: input.overrideReason ?? null,
    })

    profiles[idx] = updated
    return updated
  },

  suspend(id: string, input: SuspendDriverInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    if (!input.reason?.trim()) throw new Error('A detailed reason is required to suspend access.')
    if (!input.reasonCategory) throw new Error('A reason category is required to suspend access.')
    if (input.duration === 'until_datetime' && !input.restoreAt) {
      throw new Error('Restore date and time is required when suspension is time-limited.')
    }
    const current = profiles[idx]!
    const ts = input.effectiveAt ?? now()
    const updated = syncProfileEligibility({
      ...current,
      operationalStatus: 'suspended',
      employmentStatus: 'suspended',
      operationalEligibility: 'not_eligible',
      availabilityStatus: 'unavailable',
      account: {
        ...current.account,
        accountStatus: 'temporarily_suspended',
        activeSessionCount: 0,
        sessions: [],
        suspension: {
          reasonCategory: input.reasonCategory,
          reason: input.reason.trim(),
          driverMessage: input.driverMessage?.trim() || null,
          suspendedAt: ts,
          suspendedBy: actorName,
          duration: input.duration,
          restoreAt: input.duration === 'until_datetime' ? input.restoreAt ?? null : null,
          reviewDate: input.reviewDate ?? null,
        },
      },
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Driver access suspended',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: current.account.accountStatus,
      newValue: 'temporarily_suspended',
      reason: `[${input.reasonCategory}] ${input.reason.trim()}${
        input.duration === 'until_datetime' && input.restoreAt ? ` · restore ${input.restoreAt}` : ' · until manually restored'
      }${input.reassignActiveTrips ? ' · reassign active trips' : ''}${input.notifyDriver ? ' · driver notified' : ''}`,
    })

    profiles[idx] = updated
    return updated
  },

  reinstate(id: string, input: ReinstateDriverInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    if (!input.reason?.trim()) throw new Error('A reason is required to reinstate access.')
    const current = profiles[idx]!
    if (current.account.accountStatus !== 'temporarily_suspended' && current.account.accountStatus !== 'compliance_restricted') {
      throw new Error('Only suspended or compliance-restricted accounts can be reinstated.')
    }
    const ts = now()
    const updated = syncProfileEligibility({
      ...current,
      operationalStatus: current.restrictions.some((r) => r.status === 'active') ? 'restricted' : 'eligible',
      employmentStatus: 'employed',
      availabilityStatus: 'available',
      account: {
        ...current.account,
        accountStatus: 'active',
        suspension: null,
      },
      updatedAt: ts,
    })
    appendAudit(updated, {
      action: 'Driver access reinstated',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: current.account.accountStatus,
      newValue: 'active',
      reason: input.reason.trim(),
    })
    profiles[idx] = updated
    return updated
  },

  unlock(id: string, input: UnlockDriverInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    if (!input.reason?.trim()) throw new Error('A reason is required to unlock the account.')
    const current = profiles[idx]!
    if (current.account.accountStatus !== 'locked' && !current.account.accountLocked) {
      throw new Error('Account is not locked.')
    }
    const ts = now()
    const updated = syncProfileEligibility({
      ...current,
      account: {
        ...current.account,
        accountStatus: current.account.registrationCompletedAt ? 'active' : 'setup_incomplete',
        accountLocked: false,
        failedLoginCount: 0,
      },
      updatedAt: ts,
    })
    appendAudit(updated, {
      action: 'Driver account unlocked',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: 'locked',
      newValue: updated.account.accountStatus,
      reason: input.reason.trim(),
    })
    profiles[idx] = updated
    return updated
  },

  offboard(id: string, input: OffboardDriverInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    if (!input.reason?.trim()) throw new Error('A reason is required to offboard the driver.')
    if (!input.employmentEndDate) throw new Error('Employment end date is required.')
    const current = profiles[idx]!
    const ts = now()
    const updated = syncProfileEligibility({
      ...current,
      operationalStatus: 'left_company',
      employmentStatus: 'employment_ended',
      operationalEligibility: 'not_eligible',
      availabilityStatus: 'unavailable',
      account: {
        ...current.account,
        accountStatus: 'offboarded',
        activeSessionCount: 0,
        sessions: [],
        devices: current.account.devices.map((d) => ({ ...d, trusted: false, securityStatus: 'revoked' as const })),
        suspension: null,
        devInvitationToken: null,
      },
      updatedAt: ts,
    })
    appendAudit(updated, {
      action: 'Driver offboarded',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: current.account.accountStatus,
      newValue: 'offboarded',
      reason: `${input.reason.trim()} · end date ${input.employmentEndDate}${
        input.reassignActiveTrips ? ' · reassign active trips' : ''
      }${input.notifyDriver ? ' · driver notified' : ''}`,
    })
    profiles[idx] = updated
    return updated
  },

  revokeDevice(id: string, deviceId: string, input: RevokeDriverDeviceInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    if (!input.reason?.trim()) throw new Error('A reason is required to revoke a device.')
    const current = profiles[idx]!
    const device = current.account.devices.find((d) => d.id === deviceId)
    if (!device) throw new Error('Device not found')
    const ts = now()
    const devices = current.account.devices.map((d) =>
      d.id === deviceId ? { ...d, trusted: false, securityStatus: 'revoked' as const } : d,
    )
    const sessions = current.account.sessions.filter((s) => s.deviceId !== deviceId)
    const updated = syncProfileEligibility({
      ...current,
      account: {
        ...current.account,
        devices,
        sessions,
        activeSessionCount: sessions.length,
        registeredDeviceCount: devices.filter((d) => d.securityStatus !== 'revoked').length,
      },
      updatedAt: ts,
    })
    appendAudit(updated, {
      action: 'Driver device revoked',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: device.label,
      newValue: 'revoked',
      reason: input.reason.trim(),
    })
    profiles[idx] = updated
    return updated
  },

  sendInvitation(id: string, actorName: string, channel: 'email' | 'sms' | 'both' = 'email'): DriverProfile {
    return this.createAppAccount(id, { channel }, actorName)
  },

  cancelInvitation(id: string, actorName: string, reason: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const ts = now()
    const historyEntry = {
      id: `invh-${id}-cancel-${Date.now().toString(36)}`,
      stage: 'invitation_cancelled' as const,
      channel: current.account.invitationChannel,
      destination: current.account.invitationDestination,
      createdAt: ts,
      actor: actorName,
      detail: reason,
    }
    const updated = syncProfileEligibility({
      ...current,
      account: {
        ...current.account,
        accountStatus: 'draft',
        invitationStatus: 'cancelled',
        invitationExpiresAt: null,
        userAccountId: null,
        devInvitationToken: null,
        invitationHistory: [historyEntry, ...(current.account.invitationHistory ?? [])],
      },
      updatedAt: ts,
    })
    appendAudit(updated, {
      action: 'Invitation cancelled',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: 'invitation_pending',
      newValue: 'draft',
      reason,
    })
    profiles[idx] = updated
    return updated
  },

  revokeSessions(id: string, actorName: string, reason: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const updated = syncProfileEligibility({
      ...current,
      account: { ...current.account, activeSessionCount: 0, sessions: [] },
      updatedAt: now(),
    })
    appendAudit(updated, {
      action: 'Sessions revoked',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: now(),
      previousValue: String(current.account.activeSessionCount),
      newValue: '0',
      reason,
    })
    profiles[idx] = updated
    return updated
  },

  initiatePasswordReset(id: string, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const updated = syncProfileEligibility({
      ...current,
      account: { ...current.account, accountStatus: 'password_reset_required' },
      updatedAt: now(),
    })
    appendAudit(updated, {
      action: 'Password reset initiated',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: now(),
      previousValue: null,
      newValue: 'reset link sent',
      reason: null,
    })
    profiles[idx] = updated
    return updated
  },

  addNote(id: string, note: Omit<DriverNote, 'id' | 'createdAt'>, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const entry: DriverNote = { ...note, id: `note-${Date.now()}`, author: actorName, createdAt: now() }
    const updated = syncProfileEligibility({ ...current, notes: [entry, ...current.notes], updatedAt: now() })
    profiles[idx] = updated
    return updated
  },

  uploadDocument(id: string, input: UploadDriverDocumentInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const ts = now()
    const existing = current.documents.find((d) => d.requirementType === input.requirementType)
    let documentVersions = [...current.documentVersions]

    if (existing) {
      documentVersions = [
        {
          id: `docv-${Date.now()}`,
          documentId: existing.id,
          requirementType: existing.requirementType,
          label: existing.label,
          referenceNumber: existing.referenceNumber,
          expiryDate: existing.expiryDate,
          verificationStatus: existing.verificationStatus,
          verifiedBy: existing.verifiedBy,
          verifiedAt: existing.verifiedAt,
          replacedAt: ts,
          replacedBy: actorName,
          replacementReason: 'Superseded by new upload',
          fileName: existing.fileName,
        },
        ...documentVersions,
      ]
    }

    const newDoc: DriverDocument = {
      id: `doc-${Date.now()}`,
      requirementType: input.requirementType,
      label: input.label,
      referenceNumber: input.referenceNumber ?? null,
      issuingOrganisation: input.issuingOrganisation ?? null,
      issueDate: input.issueDate ?? null,
      expiryDate: input.expiryDate ?? null,
      verificationStatus: 'awaiting_review',
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null,
      notes: input.notes ?? null,
      fileName: input.fileName,
    }

    const documents = existing
      ? current.documents.map((d) => (d.requirementType === input.requirementType ? newDoc : d))
      : [...current.documents, newDoc]

    const expiryPatch: Partial<DriverProfile> = {}
    if (input.expiryDate) {
      if (input.requirementType === 'driving_licence' || input.requirementType === 'licence') {
        expiryPatch.licenceExpiry = input.expiryDate
      } else if (input.requirementType === 'dqc' || input.requirementType === 'cpc') {
        expiryPatch.cpcExpiry = input.expiryDate
      } else if (input.requirementType === 'dbs') {
        expiryPatch.dbsExpiry = input.expiryDate
      } else if (input.requirementType === 'medical') {
        expiryPatch.medicalExpiry = input.expiryDate
      }
    }

    const updated = syncProfileEligibility({
      ...current,
      ...expiryPatch,
      documents,
      documentVersions,
      complianceStatus: deriveComplianceStatus(documents),
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Document uploaded',
      actor: actorName,
      actorRole: 'Compliance manager',
      createdAt: ts,
      previousValue: existing?.verificationStatus ?? null,
      newValue: input.requirementType,
      reason: input.fileName,
    })

    profiles[idx] = updated
    return updated
  },

  verifyDocument(id: string, documentId: string, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const doc = current.documents.find((d) => d.id === documentId)
    if (!doc) throw new Error('Document not found')

    const ts = now()
    const verifiedDoc: DriverDocument = {
      ...doc,
      verificationStatus: 'verified',
      verifiedBy: actorName,
      verifiedAt: ts,
      rejectionReason: null,
    }
    const documents = current.documents.map((d) => (d.id === documentId ? verifiedDoc : d))
    const profilePatch = applyVerifiedDocumentToProfile(current, verifiedDoc)

    const updated = syncProfileEligibility({
      ...current,
      ...profilePatch,
      documents,
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Document verified',
      actor: actorName,
      actorRole: 'Compliance manager',
      createdAt: ts,
      previousValue: doc.verificationStatus,
      newValue: 'verified',
      reason: null,
    })

    profiles[idx] = updated
    return updated
  },

  rejectDocument(id: string, documentId: string, reason: string, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const doc = current.documents.find((d) => d.id === documentId)
    if (!doc) throw new Error('Document not found')

    const ts = now()
    const documents = current.documents.map((d) =>
      d.id === documentId
        ? { ...d, verificationStatus: 'rejected' as const, rejectionReason: reason, verifiedBy: actorName, verifiedAt: ts }
        : d,
    )

    const updated = syncProfileEligibility({
      ...current,
      documents,
      complianceStatus: deriveComplianceStatus(documents),
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Document rejected',
      actor: actorName,
      actorRole: 'Compliance manager',
      createdAt: ts,
      previousValue: doc.verificationStatus,
      newValue: 'rejected',
      reason,
    })

    profiles[idx] = updated
    return updated
  },

  recordTraining(id: string, input: RecordDriverTrainingInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const def = getTrainingCatalogDef(input.trainingKey)
    if (!def) throw new Error('Unknown training course')

    const ts = now()
    let documents = [...current.documents]
    let trainingRequirements = [...current.trainingRequirements]

    if (input.clear) {
      trainingRequirements = trainingRequirements.filter((t) => t.key !== input.trainingKey)
      // Keep documents; clearing training record only removes the course completion claim
      const updated = syncProfileEligibility({
        ...current,
        trainingRequirements,
        updatedAt: ts,
      })
      appendAudit(updated, {
        action: 'Training cleared',
        actor: actorName,
        actorRole: 'Transport manager',
        createdAt: ts,
        previousValue: def.label,
        newValue: 'missing',
        reason: input.notes ?? null,
      })
      profiles[idx] = updated
      return updated
    }

    if (!input.completedAt) throw new Error('Completion date is required')
    const completedAt = input.completedAt
    const expiresAt =
      input.expiresAt === undefined
        ? defaultTrainingExpiry(input.trainingKey, completedAt)
        : input.expiresAt
    const trainer = input.trainer?.trim() || input.provider?.trim() || null

    const record = {
      id: `tr-${input.trainingKey}`,
      key: input.trainingKey,
      label: def.label,
      requiredFor: def.requiredFor,
      category: def.category,
      status: 'complete' as const,
      completedAt,
      expiresAt,
      trainer,
    }

    const existingIdx = trainingRequirements.findIndex((t) => t.key === input.trainingKey)
    if (existingIdx >= 0) trainingRequirements[existingIdx] = record
    else trainingRequirements.push(record)

    if (input.attachCertificate && def.documentTypes?.[0]) {
      const requirementType = def.documentTypes[0]
      const existing = documents.find((d) => d.requirementType === requirementType)
      const newDoc: DriverDocument = {
        id: `doc-train-${Date.now()}`,
        requirementType,
        label: `${def.label} certificate`,
        referenceNumber: input.certificateNumber ?? null,
        issuingOrganisation: input.provider ?? trainer,
        issueDate: completedAt,
        expiryDate: expiresAt,
        verificationStatus: 'verified',
        verifiedBy: actorName,
        verifiedAt: ts,
        rejectionReason: null,
        notes: input.notes ?? null,
        fileName: `${requirementType}-certificate.pdf`,
      }
      documents = existing
        ? documents.map((d) => (d.id === existing.id ? newDoc : d))
        : [...documents, newDoc]
    }

    const updated = syncProfileEligibility({
      ...current,
      documents,
      trainingRequirements,
      complianceStatus: deriveComplianceStatus(documents),
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Training recorded',
      actor: actorName,
      actorRole: 'Transport manager',
      createdAt: ts,
      previousValue: null,
      newValue: `${def.label} · ${completedAt}`,
      reason: input.notes ?? null,
    })

    profiles[idx] = updated
    return updated
  },

  addRestriction(id: string, input: AddDriverRestrictionInput, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const ts = now()
    const restriction = {
      id: `rest-${Date.now()}`,
      type: input.type,
      label: input.label,
      startDate: ts.slice(0, 10),
      reviewDate: input.reviewDate ?? null,
      endDate: input.endDate ?? null,
      reason: input.reason,
      createdBy: actorName,
      approvedBy: actorName,
      status: 'active' as const,
      applicableWork: input.applicableWork ?? null,
    }

    const updated = syncProfileEligibility({
      ...current,
      restrictions: [restriction, ...current.restrictions],
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Restriction added',
      actor: actorName,
      actorRole: 'Compliance manager',
      createdAt: ts,
      previousValue: null,
      newValue: input.label,
      reason: input.reason,
    })

    profiles[idx] = updated
    return updated
  },

  liftRestriction(id: string, restrictionId: string, reason: string, actorName: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const ts = now()
    const restrictions = current.restrictions.map((r) =>
      r.id === restrictionId ? { ...r, status: 'lifted' as const, endDate: ts.slice(0, 10) } : r,
    )

    const updated = syncProfileEligibility({ ...current, restrictions, updatedAt: ts })

    appendAudit(updated, {
      action: 'Restriction lifted',
      actor: actorName,
      actorRole: 'Compliance manager',
      createdAt: ts,
      previousValue: restrictionId,
      newValue: 'lifted',
      reason,
    })

    profiles[idx] = updated
    return updated
  },

  grantEligibilityOverride(
    id: string,
    input: GrantEligibilityOverrideInput,
    actorName: string,
  ): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const ts = now()
    const override = {
      id: `ovr-${Date.now()}`,
      checkCode: input.checkCode,
      label: input.label,
      reason: input.reason,
      evidence: input.evidence ?? null,
      requestedBy: actorName,
      approvedBy: actorName,
      startsAt: ts,
      expiresAt: input.expiresAt,
      jobReference: input.jobReference ?? null,
      status: 'active' as const,
    }

    const updated = syncProfileEligibility({
      ...current,
      eligibilityOverrides: [override, ...current.eligibilityOverrides],
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Eligibility override granted',
      actor: actorName,
      actorRole: 'Compliance manager',
      createdAt: ts,
      previousValue: input.checkCode,
      newValue: input.expiresAt,
      reason: input.reason,
    })

    profiles[idx] = updated
    return updated
  },

  listEligibilityExceptions() {
    return mockDriversApi
      .list()
      .filter((d) => !d.eligibility.canAssign)
      .map((driver) => {
        const primaryBlock = driver.eligibility.failures[0]?.message ?? driver.eligibility.summary
        return {
          id: `EX-DRV-${driver.reference}`,
          severity: driver.operationalEligibility === 'not_eligible' ? ('high' as const) : ('medium' as const),
          title: `Driver not eligible — ${driver.firstName} ${driver.lastName}`,
          category: 'compliance' as const,
          typeCode: 'driver_eligibility_failed' as const,
          source: 'Drivers',
          driverName: `${driver.firstName} ${driver.lastName}`,
          description: primaryBlock,
          relatedRecord: driver.reference,
          relatedHref: `/drivers/${driver.id}`,
          depot: driver.depotName ?? '—',
          raisedAt: driver.updatedAt,
          ageMinutes: Math.max(1, Math.round((Date.now() - new Date(driver.updatedAt).getTime()) / 60000)),
          slaMinutesRemaining: driver.operationalEligibility === 'not_eligible' ? 30 : null,
          owner: null,
          status: 'new' as const,
          lastUpdate: driver.updatedAt,
          recommendedAction: primaryBlock,
        }
      })
  },
}
