import { WORK_PERMISSION_OPTIONS } from '@/lib/drivers/constants'
import { applyVerifiedDocumentToProfile, deriveComplianceStatus } from '@/lib/drivers/compliance'
import { evaluateDriverEligibility, syncProfileEligibility } from '@/lib/eligibility/engine'
import type {
  AddDriverRestrictionInput,
  CreateDriverInput,
  DriverAuditEvent,
  DriverDirectorySummary,
  DriverDocument,
  DriverNote,
  DriverProfile,
  DriverWorkPermission,
  GrantEligibilityOverrideInput,
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
    'eligibility' | 'nearestExpiryDate' | 'nearestExpiryLabel' | 'trainingRequirements' | 'documentVersions' | 'eligibilityOverrides'
  > & {
    trainingRequirements?: DriverProfile['trainingRequirements']
    documentVersions?: DriverProfile['documentVersions']
    eligibilityOverrides?: DriverProfile['eligibilityOverrides']
  },
): DriverProfile {
  const nearest = nearestExpiry(partial)
  const withDefaults = {
    ...partial,
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
      registrationCompletedAt: '2019-03-12T14:30:00Z',
      emailVerified: true,
      phoneVerified: true,
      mfaEnabled: true,
      lastLoginAt: daysAgo(0),
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: '2025-11-01T08:00:00Z',
      activeSessionCount: 1,
      registeredDeviceCount: 1,
      pushNotificationsEnabled: true,
      appVersion: '3.4.2',
      operatingSystem: 'Android 14',
      lastAppSyncAt: daysAgo(0),
      locationPermissionGranted: true,
      cameraPermissionGranted: true,
    },
    restrictions: [],
    documents: baseDocs('2027-06-01', '2026-09-01', '2027-01-15', '2026-12-01'),
    notes: [],
    auditEvents: [
      { id: 'aud-1', action: 'Account activated', actor: 'Maria Santos', actorRole: 'Driver administrator', createdAt: '2019-03-12T14:30:00Z', previousValue: null, newValue: 'active', reason: null },
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
      accountStatus: 'invite_pending',
      invitationStatus: 'sent',
      invitationSentAt: daysAgo(2),
      invitationExpiresAt: daysFromNow(5),
      invitationDestination: 't.hughes@example.com',
      registrationCompletedAt: null,
      emailVerified: false,
      phoneVerified: false,
      mfaEnabled: false,
      lastLoginAt: null,
      failedLoginCount: 0,
      accountLocked: false,
      lastPasswordResetAt: null,
      activeSessionCount: 0,
      registeredDeviceCount: 0,
      pushNotificationsEnabled: false,
      appVersion: null,
      operatingSystem: null,
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
      invitePending: list.filter((d) => d.account.accountStatus === 'invite_pending').length,
      onDuty: list.filter((d) => ['assigned', 'on_trip', 'checking_in', 'finishing_duty'].includes(d.dutyStatus)).length,
      onTrip: list.filter((d) => d.dutyStatus === 'on_trip').length,
      suspendedOrRestricted: list.filter((d) => d.operationalEligibility === 'restricted' || d.employmentStatus === 'suspended' || d.account.accountStatus === 'suspended').length,
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
      email: input.email,
      phone: input.phone,
      depotId: input.depotId,
      depotName,
      secondaryDepotIds: [],
      secondaryDepotNames: [],
      employeeNumber: input.employeeNumber ?? null,
      employmentType: input.employmentType,
      employmentStatus: 'onboarding',
      complianceStatus: 'missing_information',
      operationalEligibility: 'awaiting_approval',
      dutyStatus: 'off_duty',
      availabilityStatus: 'unavailable',
      startDate: input.startDate ?? null,
      managerName: 'Maria Santos',
      homeAddress: null,
      emergencyContact: null,
      licenceNumber: null,
      licenceExpiry: null,
      cpcExpiry: null,
      dbsExpiry: null,
      medicalExpiry: null,
      workPermissions: workPerms(...input.workPermissionKeys),
      account: {
        userAccountId: null,
        accountStatus: input.sendInvitation ? 'invite_pending' : 'not_created',
        invitationStatus: input.sendInvitation ? 'sent' : 'not_sent',
        invitationSentAt: input.sendInvitation ? ts : null,
        invitationExpiresAt: input.sendInvitation ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        invitationDestination: input.email,
        registrationCompletedAt: null,
        emailVerified: false,
        phoneVerified: false,
        mfaEnabled: false,
        lastLoginAt: null,
        failedLoginCount: 0,
        accountLocked: false,
        lastPasswordResetAt: null,
        activeSessionCount: 0,
        registeredDeviceCount: 0,
        pushNotificationsEnabled: false,
        appVersion: null,
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
      action: 'Driver created',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: null,
      newValue: ref,
      reason: null,
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

    const updated = syncProfileEligibility({
      ...current,
      ...input,
      depotName: input.depotId ? depotName : current.depotName,
      workPermissions: input.workPermissionKeys ? workPerms(...input.workPermissionKeys) : current.workPermissions,
      updatedAt: now(),
    })

    appendAudit(updated, {
      action: 'Driver updated',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: now(),
      previousValue: current.reference,
      newValue: updated.reference,
      reason: null,
    })

    profiles[idx] = updated
    return updated
  },

  sendInvitation(id: string, actorName: string, channel: 'email' | 'sms' | 'both' = 'email'): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    if (!current.email && channel !== 'sms') throw new Error('Driver has no email address.')

    const ts = now()
    const updated = syncProfileEligibility({
      ...current,
      account: {
        ...current.account,
        accountStatus: 'invite_pending',
        invitationStatus: 'sent',
        invitationSentAt: ts,
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invitationDestination: channel === 'sms' ? current.phone : current.email,
      },
      updatedAt: ts,
    })

    appendAudit(updated, {
      action: 'Invitation sent',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: ts,
      previousValue: current.account.invitationStatus,
      newValue: `sent (${channel})`,
      reason: null,
    })

    profiles[idx] = updated
    return updated
  },

  cancelInvitation(id: string, actorName: string, reason: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const updated = syncProfileEligibility({
      ...current,
      account: {
        ...current.account,
        accountStatus: 'not_created',
        invitationStatus: 'cancelled',
        invitationExpiresAt: null,
      },
      updatedAt: now(),
    })
    appendAudit(updated, {
      action: 'Invitation cancelled',
      actor: actorName,
      actorRole: 'Driver administrator',
      createdAt: now(),
      previousValue: 'sent',
      newValue: 'cancelled',
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

  revokeSessions(id: string, actorName: string, reason: string): DriverProfile {
    const idx = profiles.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Driver not found')
    const current = profiles[idx]!
    const updated = syncProfileEligibility({
      ...current,
      account: { ...current.account, activeSessionCount: 0 },
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

    const updated = syncProfileEligibility({
      ...current,
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
