import { DEPARTMENTS, STAFF_ROLES, departmentName, roleLabel } from '@/lib/staff/constants'
import { buildStaffHub, computeStaffSummary, profileToRow } from '@/lib/staff/aggregate'
import { dutyActionForStatus, canTransitionDuty } from '@/lib/staff/duty'
import { expireTemporaryDepotAccess } from '@/lib/staff/depot-access'
import { canStartDutyWithTraining, enrichStaffTraining, refreshQualificationStatuses } from '@/lib/staff/training'
import { enrichStaffGovernance } from '@/lib/staff/governance'
import { isSensitiveDocument } from '@/lib/staff/documents'
import type {
  AddStaffQualificationInput,
  AssignStaffTaskInput,
  CompleteStaffAccessReviewInput,
  CreateStaffHandoverInput,
  CreateStaffInput,
  ExtendContractorAccessInput,
  MoveStaffMemberInput,
  SendStaffInvitationInput,
  StaffApplication,
  StaffApplicationAccess,
  StaffAuditEvent,
  StaffDocument,
  StaffDirectorySummary,
  StaffDutyActionInput,
  StaffDutyStatus,
  StaffHandover,
  StaffProfile,
  StaffQualification,
  StaffRoleAssignment,
  StaffTask,
  SuspendStaffAccessInput,
  UpdateStaffInput,
  UploadStaffDocumentInput,
} from '@/lib/staff/types'

const ACCOUNT_DEFAULTS = {
  lastAccessReviewAt: null,
  accessReviewDueAt: null,
  ssoEnabled: false,
  mfaPolicy: 'standard' as const,
  contractorAccessExpiresAt: null,
}

function withAccountDefaults(account: Partial<StaffProfile['account']> & Pick<StaffProfile['account'], 'accountStatus' | 'invitationStatus' | 'mfaEnabled' | 'authProvider' | 'activeSessionCount'>): StaffProfile['account'] {
  return {
    userAccountId: null,
    loginEmail: null,
    invitationSentAt: null,
    invitationAcceptedAt: null,
    invitationExpiresAt: null,
    accountCreatedAt: null,
    lastLoginAt: null,
    lastFailedLoginAt: null,
    temporaryAccessExpiresAt: null,
    ...ACCOUNT_DEFAULTS,
    ...account,
  }
}

const now = () => new Date().toISOString()
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

const DEPOTS: Record<string, string> = {
  'depot-wembley': 'Wembley Depot',
  'depot-croydon': 'Croydon Depot',
  'depot-park-royal': 'Park Royal Depot',
}

function audit(action: string, actor: string, detail?: string): StaffAuditEvent {
  return { id: `staff-aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, action, actorName: actor, occurredAt: now(), detail: detail ?? null, application: 'command' }
}

function appAccess(apps: StaffApplication[], overrides?: Partial<Record<StaffApplication, StaffApplicationAccess['status']>>): StaffApplicationAccess[] {
  const all: StaffApplication[] = ['command', 'yard', 'maintenance', 'driver', 'reports', 'customer_support']
  return all.map((application) => {
    const enabled = apps.includes(application)
    const status = overrides?.[application] ?? (enabled ? 'enabled' : 'disabled')
    return { application, enabled, status }
  })
}

function roleAssignment(
  roleKey: string,
  scopeType: StaffRoleAssignment['scopeType'],
  scopeLabel: string,
  depotIds: string[] = [],
  elevated = false,
): StaffRoleAssignment {
  const def = STAFF_ROLES.find((r) => r.key === roleKey)
  return {
    roleKey,
    roleLabel: def?.label ?? roleLabel(roleKey),
    scopeType,
    scopeLabel,
    depotIds,
    elevated: elevated || (def?.elevated ?? false),
    effectiveFrom: '2024-01-01',
    expiresAt: null,
  }
}

function normalizeTask(task: Partial<StaffTask> & Pick<StaffTask, 'id' | 'title' | 'status' | 'priority'>): StaffTask {
  return {
    dueDate: null,
    category: 'general',
    assignedBy: null,
    relatedRecord: null,
    relatedHref: null,
    ...task,
  }
}

const BASELINE_QUALIFICATIONS: Omit<StaffQualification, 'id'>[] = [
  { trainingType: 'Company induction', provider: 'Internal', certificateNumber: null, completedDate: '2020-01-01', expiryDate: null, status: 'valid', verifiedBy: 'HR' },
  { trainingType: 'Data protection', provider: 'Internal', certificateNumber: null, completedDate: '2025-01-01', expiryDate: daysFromNow(400), status: 'valid', verifiedBy: 'HR' },
  { trainingType: 'Information security', provider: 'Internal', certificateNumber: null, completedDate: '2025-03-01', expiryDate: daysFromNow(200), status: 'valid', verifiedBy: 'HR' },
  { trainingType: 'Health and safety', provider: 'Internal', certificateNumber: null, completedDate: '2024-06-01', expiryDate: daysFromNow(500), status: 'valid', verifiedBy: 'HR' },
  { trainingType: 'Equality and diversity', provider: 'Internal', certificateNumber: null, completedDate: '2023-01-01', expiryDate: daysFromNow(600), status: 'valid', verifiedBy: 'HR' },
]

function mergeBaselineQualifications(quals: StaffQualification[]): StaffQualification[] {
  const merged = [...quals]
  for (const base of BASELINE_QUALIFICATIONS) {
    if (!merged.some((q) => q.trainingType.toLowerCase() === base.trainingType.toLowerCase())) {
      merged.push({
        ...base,
        id: `q-base-${base.trainingType.toLowerCase().replace(/\s+/g, '-')}`,
      })
    }
  }
  return refreshQualificationStatuses(merged)
}

function buildProfile(
  partial: Omit<
    StaffProfile,
    | 'trainingStatus'
    | 'trainingRequirements'
    | 'trainingAccessBlocks'
    | 'governanceAlerts'
    | 'lifecycleWorkflow'
    | 'openTaskCount'
    | 'overdueTaskCount'
    | 'workingPattern'
    | 'shifts'
    | 'dutySessions'
    | 'currentDutySessionId'
    | 'onCall'
    | 'overtimeAvailable'
    | 'documents'
    | 'documentVersions'
    | 'sessions'
    | 'devices'
    | 'account'
  > & {
    account: Partial<StaffProfile['account']> &
      Pick<StaffProfile['account'], 'accountStatus' | 'invitationStatus' | 'mfaEnabled' | 'authProvider' | 'activeSessionCount'>
  } & Partial<
    Pick<
      StaffProfile,
      | 'workingPattern'
      | 'shifts'
      | 'dutySessions'
      | 'currentDutySessionId'
      | 'onCall'
      | 'overtimeAvailable'
      | 'documents'
      | 'documentVersions'
      | 'sessions'
      | 'devices'
      | 'lifecycleWorkflow'
    >
  >,
): StaffProfile {
  const withDefaults = {
    ...partial,
    account: withAccountDefaults(partial.account),
    workingPattern: partial.workingPattern ?? null,
    shifts: partial.shifts ?? [],
    dutySessions: partial.dutySessions ?? [],
    currentDutySessionId: partial.currentDutySessionId ?? null,
    onCall: partial.onCall ?? false,
    overtimeAvailable: partial.overtimeAvailable ?? false,
    tasks: partial.tasks.map((t) => normalizeTask(t)),
    qualifications: mergeBaselineQualifications(partial.qualifications),
    documents: partial.documents ?? [],
    documentVersions: partial.documentVersions ?? [],
    sessions: partial.sessions ?? [],
    devices: partial.devices ?? [],
    lifecycleWorkflow: partial.lifecycleWorkflow ?? [],
  }
  const openTasks = withDefaults.tasks.filter((t) => t.status === 'open' || t.status === 'overdue' || t.status === 'escalated')
  return enrichStaffGovernance(
    enrichStaffTraining({
      ...withDefaults,
      trainingRequirements: [],
      trainingAccessBlocks: [],
      trainingStatus: 'not_required',
      governanceAlerts: [],
      openTaskCount: openTasks.length,
      overdueTaskCount: openTasks.filter((t) => t.status === 'overdue').length,
    }),
  )
}

function seedProfiles(): StaffProfile[] {
  return [
    buildProfile({
      id: 'staff-1',
      personId: 'person-sarah-james',
      reference: 'STF-0001',
      firstName: 'Sarah',
      lastName: 'James',
      preferredName: null,
      employeeNumber: 'EMP-2001',
      pronouns: 'she/her',
      jobTitle: 'Operations Manager',
      department: 'Operations',
      departmentId: 'dept-operations',
      team: 'Morning control',
      employmentStatus: 'active',
      dutyStatus: 'on_duty',
      contractType: 'full_time',
      startDate: '2019-06-01',
      endDate: null,
      lineManagerId: null,
      lineManagerName: 'Karen Mitchell',
      costCentre: 'OPS-01',
      workEmail: 's.james@metrotransport.co.uk',
      personalEmail: null,
      workPhone: '020 8123 4501',
      mobilePhone: '07700 900101',
      preferredContactMethod: 'email',
      emergencyContactName: 'James Family',
      emergencyContactPhone: '07700 900102',
      primaryDepotId: 'depot-wembley',
      primaryDepotName: 'Wembley Depot',
      depotAssignments: [
        { depotId: 'depot-wembley', depotName: 'Wembley Depot', assignmentType: 'primary', roleAtDepot: 'Operations Manager', startDate: '2019-06-01', endDate: null, status: 'active' },
      ],
      roleAssignments: [roleAssignment('operations_manager', 'company', 'Entire company', [], true)],
      applications: appAccess(['command', 'reports']),
      account: {
        userAccountId: 'user-sarah',
        loginEmail: 's.james@metrotransport.co.uk',
        accountStatus: 'active',
        invitationStatus: 'accepted',
        invitationSentAt: '2019-05-20T09:00:00Z',
        invitationAcceptedAt: '2019-05-22T10:00:00Z',
        invitationExpiresAt: null,
        accountCreatedAt: '2019-05-22T10:00:00Z',
        lastLoginAt: daysAgo(0),
        lastFailedLoginAt: null,
        mfaEnabled: true,
        authProvider: 'sso',
        activeSessionCount: 1,
        temporaryAccessExpiresAt: null,
        lastAccessReviewAt: daysAgo(100),
        accessReviewDueAt: daysAgo(10),
        ssoEnabled: true,
        mfaPolicy: 'elevated_required',
        contractorAccessExpiresAt: null,
      },
      documents: [
        { id: 'doc-s1', requirementType: 'employment_contract', label: 'Employment contract', referenceNumber: 'EMP-2019-001', issueDate: '2019-06-01', expiryDate: null, verificationStatus: 'verified', verifiedBy: 'HR', verifiedAt: '2019-06-01T10:00:00Z', rejectionReason: null, uploadedBy: 'HR', uploadedAt: '2019-06-01T10:00:00Z', fileName: 'sarah-james-contract.pdf', sensitive: false },
        { id: 'doc-s2', requirementType: 'right_to_work', label: 'Right-to-work evidence', referenceNumber: 'RTW-8821', issueDate: '2019-05-01', expiryDate: daysFromNow(400), verificationStatus: 'verified', verifiedBy: 'HR', verifiedAt: '2019-05-20T10:00:00Z', rejectionReason: null, uploadedBy: 'Sarah James', uploadedAt: '2019-05-18T10:00:00Z', fileName: 'rtw-passport.pdf', sensitive: true },
      ],
      sessions: [
        { id: 'staff-sess-1', deviceLabel: 'Chrome on Windows', application: 'command', ipAddress: '10.10.1.2', location: 'Wembley', startedAt: daysAgo(0), lastActiveAt: daysAgo(0), current: true },
      ],
      devices: [
        { id: 'staff-dev-1', label: 'Windows laptop', platform: 'Windows 11', registeredAt: '2019-05-22T10:00:00Z', lastSeenAt: daysAgo(0), trusted: true, mfaRegistered: true },
      ],
      qualifications: [
        { id: 'q-1', trainingType: 'Data protection', provider: 'Internal', certificateNumber: null, completedDate: '2025-01-10', expiryDate: daysFromNow(180), status: 'valid', verifiedBy: 'HR' },
        { id: 'q-2', trainingType: 'Emergency response', provider: 'Internal', certificateNumber: null, completedDate: '2024-11-01', expiryDate: daysFromNow(90), status: 'valid', verifiedBy: 'HR' },
        { id: 'q-1b', trainingType: 'Dispatch system training', provider: 'Internal', certificateNumber: 'DT-1001', completedDate: '2024-05-01', expiryDate: daysFromNow(400), status: 'valid', verifiedBy: 'HR' },
        { id: 'q-1c', trainingType: 'School transport procedures', provider: 'Internal', certificateNumber: null, completedDate: '2025-02-01', expiryDate: daysFromNow(300), status: 'valid', verifiedBy: 'HR' },
      ],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      workingPattern: { label: 'Morning control', days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '06:00', endTime: '14:00', breakMinutes: 30 },
      shifts: [{ id: 'shift-1', date: today(), depotId: 'depot-wembley', depotName: 'Wembley Depot', startTime: '06:00', endTime: '14:00', role: 'Duty controller', status: 'in_progress', notes: null }],
      dutySessions: [{ id: 'duty-sess-1', startedAt: daysAgo(0), endedAt: null, depotId: 'depot-wembley', depotName: 'Wembley Depot', role: 'Duty controller', status: 'active' }],
      currentDutySessionId: 'duty-sess-1',
      onCall: true,
      overtimeAvailable: true,
      responsibilities: ['Duty controller for Wembley Depot', 'Emergency operations contact'],
      operationalAlerts: [],
      auditEvents: [audit('Account created', 'System'), audit('Role assigned: Operations Manager', 'Karen Mitchell')],
      createdAt: '2019-05-20T09:00:00Z',
      updatedAt: daysAgo(0),
    }),
    buildProfile({
      id: 'staff-2',
      personId: 'person-michael-brown',
      reference: 'STF-0002',
      firstName: 'Michael',
      lastName: 'Brown',
      preferredName: 'Mike',
      employeeNumber: 'EMP-2002',
      pronouns: null,
      jobTitle: 'Yard Manager',
      department: 'Yard Operations',
      departmentId: 'dept-yard',
      team: 'Yard evening',
      employmentStatus: 'active',
      dutyStatus: 'on_duty',
      contractType: 'full_time',
      startDate: '2020-03-15',
      endDate: null,
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: 'YARD-02',
      workEmail: 'm.brown@metrotransport.co.uk',
      personalEmail: null,
      workPhone: null,
      mobilePhone: '07700 900201',
      preferredContactMethod: 'mobile',
      emergencyContactName: 'Brown Family',
      emergencyContactPhone: '07700 900202',
      primaryDepotId: 'depot-park-royal',
      primaryDepotName: 'Park Royal Depot',
      depotAssignments: [
        { depotId: 'depot-park-royal', depotName: 'Park Royal Depot', assignmentType: 'primary', roleAtDepot: 'Yard Manager', startDate: '2020-03-15', endDate: null, status: 'active' },
        { depotId: 'depot-wembley', depotName: 'Wembley Depot', assignmentType: 'cover', roleAtDepot: 'Yard Manager', startDate: '2026-03-01', endDate: '2026-07-31', status: 'temporary' },
      ],
      roleAssignments: [roleAssignment('yard_manager', 'depot', 'Park Royal Depot', ['depot-park-royal'])],
      applications: appAccess(['command', 'yard']),
      account: {
        userAccountId: 'user-michael',
        loginEmail: 'm.brown@metrotransport.co.uk',
        accountStatus: 'active',
        invitationStatus: 'accepted',
        invitationSentAt: '2020-03-01T09:00:00Z',
        invitationAcceptedAt: '2020-03-05T11:00:00Z',
        invitationExpiresAt: null,
        accountCreatedAt: '2020-03-05T11:00:00Z',
        lastLoginAt: daysAgo(0),
        lastFailedLoginAt: null,
        mfaEnabled: true,
        authProvider: 'email',
        activeSessionCount: 2,
        temporaryAccessExpiresAt: null,
        lastAccessReviewAt: daysAgo(30),
        accessReviewDueAt: daysFromNow(60),
        ssoEnabled: false,
        mfaPolicy: 'standard',
        contractorAccessExpiresAt: null,
      },
      sessions: [
        { id: 'staff-sess-2a', deviceLabel: 'Safari on iPhone', application: 'yard', ipAddress: '10.10.2.15', location: 'Park Royal', startedAt: daysAgo(0), lastActiveAt: daysAgo(0), current: true },
        { id: 'staff-sess-2b', deviceLabel: 'Chrome on iPad', application: 'command', ipAddress: '10.10.2.15', location: 'Park Royal', startedAt: daysAgo(1), lastActiveAt: daysAgo(0), current: false },
      ],
      devices: [
        { id: 'staff-dev-2a', label: 'iPhone 15', platform: 'iOS', registeredAt: '2024-01-10T09:00:00Z', lastSeenAt: daysAgo(0), trusted: true, mfaRegistered: true },
        { id: 'staff-dev-2b', label: 'Yard iPad', platform: 'iPadOS', registeredAt: '2022-06-01T09:00:00Z', lastSeenAt: daysAgo(0), trusted: true, mfaRegistered: false },
      ],
      qualifications: [
        { id: 'q-3', trainingType: 'Yard safety', provider: 'Internal', certificateNumber: 'YS-4421', completedDate: '2025-06-01', expiryDate: daysFromNow(365), status: 'valid', verifiedBy: 'Sarah James' },
        { id: 'q-4', trainingType: 'Vehicle movement authorisation', provider: 'Internal', certificateNumber: 'VMA-1102', completedDate: '2025-06-01', expiryDate: daysFromNow(200), status: 'valid', verifiedBy: 'Sarah James' },
      ],
      linkedDriverId: 'drv-6',
      linkedDriverName: 'Michael Brown',
      tasks: [normalizeTask({ id: 'task-1', title: 'Complete yard inspection', dueDate: daysFromNow(1).slice(0, 10), status: 'open', priority: 'medium', category: 'yard', assignedBy: 'Sarah James' })],
      workingPattern: { label: 'Yard evening', days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '14:00', endTime: '22:00', breakMinutes: 30 },
      shifts: [{ id: 'shift-2', date: today(), depotId: 'depot-park-royal', depotName: 'Park Royal Depot', startTime: '14:00', endTime: '22:00', role: 'Yard Manager', status: 'in_progress', notes: 'Evening shift' }],
      dutySessions: [{ id: 'duty-sess-2', startedAt: daysAgo(0), endedAt: null, depotId: 'depot-park-royal', depotName: 'Park Royal Depot', role: 'Yard Manager', status: 'active' }],
      currentDutySessionId: 'duty-sess-2',
      onCall: false,
      overtimeAvailable: true,
      responsibilities: ['Yard manager on evening shift'],
      operationalAlerts: [],
      auditEvents: [audit('Started duty', 'Michael Brown', 'Park Royal evening shift')],
      createdAt: '2020-03-01T09:00:00Z',
      updatedAt: daysAgo(0),
    }),
    buildProfile({
      id: 'staff-3',
      personId: 'person-priya-shah',
      reference: 'STF-0003',
      firstName: 'Priya',
      lastName: 'Shah',
      preferredName: null,
      employeeNumber: 'EMP-2003',
      pronouns: null,
      jobTitle: 'Dispatcher',
      department: 'Dispatch',
      departmentId: 'dept-dispatch',
      team: 'Duty controllers',
      employmentStatus: 'active',
      dutyStatus: 'scheduled',
      contractType: 'full_time',
      startDate: '2024-09-01',
      endDate: null,
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: 'DISP-01',
      workEmail: 'p.shah@metrotransport.co.uk',
      personalEmail: null,
      workPhone: null,
      mobilePhone: '07700 900301',
      preferredContactMethod: 'email',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-wembley',
      primaryDepotName: 'Wembley Depot',
      depotAssignments: [
        { depotId: 'depot-wembley', depotName: 'Wembley Depot', assignmentType: 'primary', roleAtDepot: 'Dispatcher', startDate: '2024-09-01', endDate: null, status: 'active' },
      ],
      roleAssignments: [roleAssignment('dispatcher', 'depot', 'Wembley Depot', ['depot-wembley'])],
      applications: appAccess(['command'], { command: 'invitation_pending' }),
      account: {
        userAccountId: null,
        loginEmail: 'p.shah@metrotransport.co.uk',
        accountStatus: 'invitation_pending',
        invitationStatus: 'sent',
        invitationSentAt: daysAgo(2),
        invitationAcceptedAt: null,
        invitationExpiresAt: daysFromNow(5),
        accountCreatedAt: null,
        lastLoginAt: null,
        lastFailedLoginAt: null,
        mfaEnabled: false,
        authProvider: 'email',
        activeSessionCount: 0,
        temporaryAccessExpiresAt: null,
      },
      qualifications: [
        { id: 'q-5', trainingType: 'Dispatch system training', provider: 'Internal', certificateNumber: null, completedDate: '2024-08-20', expiryDate: daysFromNow(300), status: 'awaiting_verification', verifiedBy: null, evidenceFileName: 'dispatch-cert.pdf' },
      ],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      workingPattern: { label: 'Evening control', days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '14:00', endTime: '22:00', breakMinutes: 30 },
      shifts: [{ id: 'shift-3', date: today(), depotId: 'depot-wembley', depotName: 'Wembley Depot', startTime: '14:00', endTime: '22:00', role: 'Dispatcher', status: 'scheduled', notes: null }],
      dutySessions: [],
      currentDutySessionId: null,
      onCall: false,
      overtimeAvailable: false,
      responsibilities: [],
      operationalAlerts: ['Account invitation has not been accepted'],
      auditEvents: [audit('Invitation sent', 'Sarah James', 'p.shah@metrotransport.co.uk')],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(2),
    }),
    buildProfile({
      id: 'staff-4',
      personId: 'person-david-king',
      reference: 'STF-0004',
      firstName: 'David',
      lastName: 'King',
      preferredName: null,
      employeeNumber: 'EMP-2004',
      pronouns: null,
      jobTitle: 'Maintenance Technician',
      department: 'Maintenance',
      departmentId: 'dept-maintenance',
      team: 'Workshop',
      employmentStatus: 'active',
      dutyStatus: 'on_duty',
      contractType: 'full_time',
      startDate: '2021-02-01',
      endDate: null,
      lineManagerId: 'staff-5',
      lineManagerName: 'Tom Harris',
      costCentre: 'MNT-01',
      workEmail: 'd.king@metrotransport.co.uk',
      personalEmail: null,
      workPhone: '020 8123 4520',
      mobilePhone: '07700 900401',
      preferredContactMethod: 'mobile',
      emergencyContactName: 'King Family',
      emergencyContactPhone: '07700 900402',
      primaryDepotId: 'depot-park-royal',
      primaryDepotName: 'Park Royal Depot',
      depotAssignments: [
        { depotId: 'depot-park-royal', depotName: 'Park Royal Depot', assignmentType: 'primary', roleAtDepot: 'Technician', startDate: '2021-02-01', endDate: null, status: 'active' },
      ],
      roleAssignments: [roleAssignment('technician', 'depot', 'Park Royal Depot', ['depot-park-royal'])],
      applications: appAccess(['maintenance', 'command']),
      account: {
        userAccountId: 'user-david',
        loginEmail: 'd.king@metrotransport.co.uk',
        accountStatus: 'active',
        invitationStatus: 'accepted',
        invitationSentAt: '2021-01-15T09:00:00Z',
        invitationAcceptedAt: '2021-01-20T10:00:00Z',
        invitationExpiresAt: null,
        accountCreatedAt: '2021-01-20T10:00:00Z',
        lastLoginAt: daysAgo(1),
        lastFailedLoginAt: null,
        mfaEnabled: false,
        authProvider: 'email',
        activeSessionCount: 1,
        temporaryAccessExpiresAt: null,
      },
      qualifications: [
        { id: 'q-6', trainingType: 'Workshop safety', provider: 'Internal', certificateNumber: 'WS-8821', completedDate: '2024-02-01', expiryDate: daysFromNow(14), status: 'expiring_soon', verifiedBy: 'Tom Harris' },
        { id: 'q-7', trainingType: 'Hybrid vehicle awareness', provider: 'Manufacturer', certificateNumber: 'HV-2210', completedDate: '2023-01-01', expiryDate: daysFromNow(-30), status: 'expired', verifiedBy: 'Tom Harris' },
      ],
      documents: [
        { id: 'doc-d1', requirementType: 'professional_qualification', label: 'Professional qualification', referenceNumber: 'NVQ-4', issueDate: '2020-01-01', expiryDate: null, verificationStatus: 'verified', verifiedBy: 'Tom Harris', verifiedAt: '2020-02-01T10:00:00Z', rejectionReason: null, uploadedBy: 'David King', uploadedAt: '2020-01-15T10:00:00Z', fileName: 'nvq-cert.pdf', sensitive: false },
        { id: 'doc-d2', requirementType: 'dbs', label: 'DBS documentation', referenceNumber: 'DBS-99221', issueDate: '2024-01-01', expiryDate: daysFromNow(300), verificationStatus: 'awaiting_review', verifiedBy: null, verifiedAt: null, rejectionReason: null, uploadedBy: 'David King', uploadedAt: daysAgo(3), fileName: 'dbs-certificate.pdf', sensitive: true },
      ],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [
        normalizeTask({
          id: 'task-2',
          title: 'Renew workshop safety certificate',
          dueDate: daysFromNow(14).slice(0, 10),
          status: 'overdue',
          priority: 'high',
          category: 'training',
          assignedBy: 'Tom Harris',
          relatedRecord: 'Workshop safety',
        }),
      ],
      workingPattern: { label: 'Workshop day', days: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '08:00', endTime: '16:30', breakMinutes: 45 },
      shifts: [{ id: 'shift-4', date: today(), depotId: 'depot-park-royal', depotName: 'Park Royal Depot', startTime: '08:00', endTime: '16:30', role: 'Technician', status: 'in_progress', notes: null }],
      dutySessions: [{ id: 'duty-sess-4', startedAt: daysAgo(0), endedAt: null, depotId: 'depot-park-royal', depotName: 'Park Royal Depot', role: 'Technician', status: 'active' }],
      currentDutySessionId: 'duty-sess-4',
      onCall: false,
      overtimeAvailable: false,
      responsibilities: ['Maintenance escalation contact'],
      operationalAlerts: ['Training expires in 14 days', 'MFA not configured'],
      auditEvents: [audit('Qualification uploaded', 'David King', 'Workshop safety')],
      createdAt: '2021-01-15T09:00:00Z',
      updatedAt: daysAgo(1),
    }),
    buildProfile({
      id: 'staff-5',
      personId: 'person-tom-harris',
      reference: 'STF-0005',
      firstName: 'Tom',
      lastName: 'Harris',
      preferredName: null,
      employeeNumber: 'EMP-2005',
      pronouns: null,
      jobTitle: 'Maintenance Manager',
      department: 'Maintenance',
      departmentId: 'dept-maintenance',
      team: 'Workshop',
      employmentStatus: 'active',
      dutyStatus: 'off_duty',
      contractType: 'full_time',
      startDate: '2018-04-01',
      endDate: null,
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: 'MNT-00',
      workEmail: 't.harris@metrotransport.co.uk',
      personalEmail: null,
      workPhone: '020 8123 4510',
      mobilePhone: '07700 900501',
      preferredContactMethod: 'email',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-wembley',
      primaryDepotName: 'Wembley Depot',
      depotAssignments: [
        { depotId: 'depot-wembley', depotName: 'Wembley Depot', assignmentType: 'primary', roleAtDepot: 'Maintenance Manager', startDate: '2018-04-01', endDate: null, status: 'active' },
        { depotId: 'depot-park-royal', depotName: 'Park Royal Depot', assignmentType: 'secondary', roleAtDepot: 'Maintenance Manager', startDate: '2018-04-01', endDate: null, status: 'active' },
      ],
      roleAssignments: [
        roleAssignment('maintenance_manager', 'company', 'Entire company'),
        roleAssignment('finance_manager', 'company', 'Entire company', [], true),
        roleAssignment('compliance_manager', 'company', 'Entire company', [], true),
      ],
      applications: appAccess(['command', 'maintenance', 'reports']),
      account: {
        userAccountId: 'user-tom',
        loginEmail: 't.harris@metrotransport.co.uk',
        accountStatus: 'active',
        invitationStatus: 'accepted',
        invitationSentAt: '2018-03-20T09:00:00Z',
        invitationAcceptedAt: '2018-03-25T10:00:00Z',
        invitationExpiresAt: null,
        accountCreatedAt: '2018-03-25T10:00:00Z',
        lastLoginAt: daysAgo(2),
        lastFailedLoginAt: null,
        mfaEnabled: true,
        authProvider: 'email',
        activeSessionCount: 1,
        temporaryAccessExpiresAt: null,
        lastAccessReviewAt: daysAgo(45),
        accessReviewDueAt: daysFromNow(45),
        ssoEnabled: false,
        mfaPolicy: 'elevated_required',
        contractorAccessExpiresAt: null,
      },
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      responsibilities: ['Maintenance approval contact'],
      operationalAlerts: [],
      auditEvents: [],
      createdAt: '2018-03-20T09:00:00Z',
      updatedAt: daysAgo(2),
    }),
    // Passenger assistants — booking dispatch compatibility
    buildProfile({
      id: 'pa-1',
      personId: 'person-emma-clarke',
      reference: 'STF-PA01',
      firstName: 'Emma',
      lastName: 'Clarke',
      preferredName: null,
      employeeNumber: 'EMP-2101',
      pronouns: null,
      jobTitle: 'Passenger Assistant',
      department: 'Operations',
      departmentId: 'dept-operations',
      team: 'School transport',
      employmentStatus: 'active',
      dutyStatus: 'on_duty',
      contractType: 'part_time',
      startDate: '2022-01-01',
      endDate: null,
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: null,
      workEmail: 'e.clarke@metrotransport.co.uk',
      personalEmail: null,
      workPhone: null,
      mobilePhone: '07700 900201',
      preferredContactMethod: 'mobile',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-wembley',
      primaryDepotName: 'Wembley Depot',
      depotAssignments: [{ depotId: 'depot-wembley', depotName: 'Wembley Depot', assignmentType: 'primary', roleAtDepot: 'Passenger Assistant', startDate: '2022-01-01', endDate: null, status: 'active' }],
      roleAssignments: [roleAssignment('passenger_assistant', 'depot', 'Wembley Depot', ['depot-wembley'])],
      applications: appAccess([]),
      account: { userAccountId: null, loginEmail: null, accountStatus: 'no_account', invitationStatus: 'not_sent', invitationSentAt: null, invitationAcceptedAt: null, invitationExpiresAt: null, accountCreatedAt: null, lastLoginAt: null, lastFailedLoginAt: null, mfaEnabled: false, authProvider: 'email', activeSessionCount: 0, temporaryAccessExpiresAt: null },
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      responsibilities: [],
      operationalAlerts: [],
      auditEvents: [],
      createdAt: '2022-01-01T09:00:00Z',
      updatedAt: daysAgo(0),
    }),
    buildProfile({
      id: 'pa-2',
      personId: 'person-david-nguyen',
      reference: 'STF-PA02',
      firstName: 'David',
      lastName: 'Nguyen',
      preferredName: null,
      employeeNumber: 'EMP-2102',
      pronouns: null,
      jobTitle: 'Passenger Assistant',
      department: 'Operations',
      departmentId: 'dept-operations',
      team: 'School transport',
      employmentStatus: 'active',
      dutyStatus: 'scheduled',
      contractType: 'part_time',
      startDate: '2023-03-01',
      endDate: null,
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: null,
      workEmail: 'd.nguyen@metrotransport.co.uk',
      personalEmail: null,
      workPhone: null,
      mobilePhone: null,
      preferredContactMethod: 'email',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-croydon',
      primaryDepotName: 'Croydon Depot',
      depotAssignments: [{ depotId: 'depot-croydon', depotName: 'Croydon Depot', assignmentType: 'primary', roleAtDepot: 'Passenger Assistant', startDate: '2023-03-01', endDate: null, status: 'active' }],
      roleAssignments: [roleAssignment('passenger_assistant', 'depot', 'Croydon Depot', ['depot-croydon'])],
      applications: appAccess([]),
      account: { userAccountId: null, loginEmail: null, accountStatus: 'no_account', invitationStatus: 'not_sent', invitationSentAt: null, invitationAcceptedAt: null, invitationExpiresAt: null, accountCreatedAt: null, lastLoginAt: null, lastFailedLoginAt: null, mfaEnabled: false, authProvider: 'email', activeSessionCount: 0, temporaryAccessExpiresAt: null },
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      responsibilities: [],
      operationalAlerts: [],
      auditEvents: [],
      createdAt: '2023-03-01T09:00:00Z',
      updatedAt: daysAgo(1),
    }),
    buildProfile({
      id: 'pa-3',
      personId: 'person-priya-sharma',
      reference: 'STF-PA03',
      firstName: 'Priya',
      lastName: 'Sharma',
      preferredName: null,
      employeeNumber: 'EMP-2103',
      pronouns: null,
      jobTitle: 'Passenger Assistant',
      department: 'Operations',
      departmentId: 'dept-operations',
      team: 'School transport',
      employmentStatus: 'active',
      dutyStatus: 'unavailable',
      contractType: 'part_time',
      startDate: '2023-06-01',
      endDate: null,
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: null,
      workEmail: 'priya.sharma@metrotransport.co.uk',
      personalEmail: null,
      workPhone: null,
      mobilePhone: null,
      preferredContactMethod: 'mobile',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-wembley',
      primaryDepotName: 'Wembley Depot',
      depotAssignments: [{ depotId: 'depot-wembley', depotName: 'Wembley Depot', assignmentType: 'primary', roleAtDepot: 'Passenger Assistant', startDate: '2023-06-01', endDate: null, status: 'active' }],
      roleAssignments: [roleAssignment('passenger_assistant', 'depot', 'Wembley Depot', ['depot-wembley'])],
      applications: appAccess([]),
      account: { userAccountId: null, loginEmail: null, accountStatus: 'no_account', invitationStatus: 'not_sent', invitationSentAt: null, invitationAcceptedAt: null, invitationExpiresAt: null, accountCreatedAt: null, lastLoginAt: null, lastFailedLoginAt: null, mfaEnabled: false, authProvider: 'email', activeSessionCount: 0, temporaryAccessExpiresAt: null },
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      responsibilities: [],
      operationalAlerts: [],
      auditEvents: [],
      createdAt: '2023-06-01T09:00:00Z',
      updatedAt: daysAgo(3),
    }),
    buildProfile({
      id: 'staff-6',
      personId: 'person-alex-novak',
      reference: 'STF-0006',
      firstName: 'Alex',
      lastName: 'Novak',
      preferredName: null,
      employeeNumber: null,
      pronouns: null,
      jobTitle: 'Contract Yard Operative',
      department: 'Yard Operations',
      departmentId: 'dept-yard',
      team: 'Contractors',
      employmentStatus: 'active',
      dutyStatus: 'scheduled',
      contractType: 'contractor',
      startDate: '2026-01-15',
      endDate: '2026-07-15',
      lineManagerId: 'staff-2',
      lineManagerName: 'Michael Brown',
      costCentre: 'YARD-C01',
      workEmail: 'a.novak@contractor.example',
      personalEmail: null,
      workPhone: null,
      mobilePhone: '07700 900601',
      preferredContactMethod: 'mobile',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-park-royal',
      primaryDepotName: 'Park Royal Depot',
      depotAssignments: [
        { depotId: 'depot-park-royal', depotName: 'Park Royal Depot', assignmentType: 'cover', roleAtDepot: 'Yard Operative', startDate: '2026-01-15', endDate: '2026-07-15', status: 'temporary' },
      ],
      roleAssignments: [roleAssignment('contractor', 'depot', 'Park Royal Depot', ['depot-park-royal'])],
      applications: appAccess(['yard']),
      account: {
        userAccountId: 'user-alex',
        loginEmail: 'a.novak@contractor.example',
        accountStatus: 'active',
        invitationStatus: 'accepted',
        invitationSentAt: '2026-01-10T09:00:00Z',
        invitationAcceptedAt: '2026-01-12T10:00:00Z',
        invitationExpiresAt: null,
        accountCreatedAt: '2026-01-12T10:00:00Z',
        lastLoginAt: daysAgo(1),
        lastFailedLoginAt: null,
        mfaEnabled: false,
        authProvider: 'email',
        activeSessionCount: 1,
        temporaryAccessExpiresAt: daysFromNow(7),
        lastAccessReviewAt: daysAgo(20),
        accessReviewDueAt: daysFromNow(70),
        ssoEnabled: false,
        mfaPolicy: 'standard',
        contractorAccessExpiresAt: daysFromNow(7),
      },
      documents: [
        { id: 'doc-a1', requirementType: 'employment_contract', label: 'Contractor agreement', referenceNumber: 'CTR-2026-01', issueDate: '2026-01-15', expiryDate: daysFromNow(7), verificationStatus: 'verified', verifiedBy: 'Sarah James', verifiedAt: '2026-01-10T10:00:00Z', rejectionReason: null, uploadedBy: 'HR', uploadedAt: '2026-01-10T10:00:00Z', fileName: 'contractor-agreement.pdf', sensitive: false },
      ],
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      workingPattern: { label: 'Contract cover', days: ['mon', 'wed', 'fri'], startTime: '08:00', endTime: '16:00', breakMinutes: 30 },
      shifts: [{ id: 'shift-6', date: today(), depotId: 'depot-park-royal', depotName: 'Park Royal Depot', startTime: '08:00', endTime: '16:00', role: 'Yard Operative', status: 'scheduled', notes: 'Contract cover' }],
      dutySessions: [],
      currentDutySessionId: null,
      onCall: false,
      overtimeAvailable: false,
      responsibilities: [],
      operationalAlerts: [],
      auditEvents: [audit('Staff record created', 'Sarah James'), audit('Contractor access granted', 'Sarah James', '7-month yard cover')],
      createdAt: '2026-01-10T09:00:00Z',
      updatedAt: daysAgo(1),
    }),
    // Former staff
    buildProfile({
      id: 'staff-former-1',
      personId: 'person-lisa-wong',
      reference: 'STF-0099',
      firstName: 'Lisa',
      lastName: 'Wong',
      preferredName: null,
      employeeNumber: 'EMP-1999',
      pronouns: null,
      jobTitle: 'Dispatcher',
      department: 'Dispatch',
      departmentId: 'dept-dispatch',
      team: null,
      employmentStatus: 'left_company',
      dutyStatus: 'off_duty',
      contractType: 'full_time',
      startDate: '2017-01-01',
      endDate: '2025-12-31',
      lineManagerId: 'staff-1',
      lineManagerName: 'Sarah James',
      costCentre: null,
      workEmail: 'l.wong@metrotransport.co.uk',
      personalEmail: null,
      workPhone: null,
      mobilePhone: null,
      preferredContactMethod: 'email',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: 'depot-wembley',
      primaryDepotName: 'Wembley Depot',
      depotAssignments: [],
      roleAssignments: [],
      applications: appAccess([], { command: 'disabled' }),
      account: {
        userAccountId: 'user-lisa',
        loginEmail: 'l.wong@metrotransport.co.uk',
        accountStatus: 'deactivated',
        invitationStatus: 'accepted',
        invitationSentAt: '2017-01-01T09:00:00Z',
        invitationAcceptedAt: '2017-01-05T10:00:00Z',
        invitationExpiresAt: null,
        accountCreatedAt: '2017-01-05T10:00:00Z',
        lastLoginAt: '2025-12-20T08:00:00Z',
        lastFailedLoginAt: null,
        mfaEnabled: true,
        authProvider: 'email',
        activeSessionCount: 0,
        temporaryAccessExpiresAt: null,
      },
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      responsibilities: [],
      operationalAlerts: [],
      auditEvents: [audit('Account deactivated', 'Sarah James', 'Left company')],
      createdAt: '2017-01-01T09:00:00Z',
      updatedAt: '2025-12-31T17:00:00Z',
    }),
  ]
}

let profiles = seedProfiles()

let handovers: StaffHandover[] = [
  {
    id: 'ho-1',
    fromStaffId: 'staff-1',
    fromStaffName: 'Sarah James',
    toStaffId: null,
    toStaffName: null,
    depotId: 'depot-wembley',
    depotName: 'Wembley Depot',
    responsibility: 'Duty controller — Wembley',
    openExceptionCount: 3,
    notes: 'VOR vehicle CD34 EFG and 2 delayed runs require follow-up',
    status: 'pending',
    createdAt: daysAgo(0),
    completedAt: null,
    completedBy: null,
  },
]

function syncProfile(idx: number, profile: StaffProfile) {
  profiles[idx] = expireTemporaryDepotAccess(profile)
}

function nextRef(): string {
  const n = profiles.filter((p) => !p.id.startsWith('staff-former')).length + 1
  return `STF-${String(n).padStart(4, '0')}`
}

export const mockStaffApi = {
  list(): StaffProfile[] {
    return profiles.map((p) => ({ ...p }))
  },

  get(id: string): StaffProfile | null {
    const p = profiles.find((x) => x.id === id)
    return p ? { ...p } : null
  },

  hub() {
    return buildStaffHub(profiles, handovers)
  },

  summary(): StaffDirectorySummary {
    return computeStaffSummary(profiles)
  },

  passengerAssistants() {
    return profiles
      .filter((p) => p.roleAssignments.some((r) => r.roleKey === 'passenger_assistant') && p.employmentStatus === 'active')
      .map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        status: p.dutyStatus === 'on_duty' ? 'on_duty' : p.dutyStatus === 'unavailable' ? 'unavailable' : 'available',
        email: p.workEmail,
        phone: p.mobilePhone,
        depotName: p.primaryDepotName,
        role: 'passenger_assistant',
      }))
  },

  create(input: CreateStaffInput, actorName: string): StaffProfile {
    const id = `staff-${Date.now()}`
    const dept = DEPARTMENTS.find((d) => d.id === input.departmentId)
    const depotName = DEPOTS[input.primaryDepotId] ?? input.primaryDepotId
    const scopeLabel =
      input.scopeType === 'company' ? 'Entire company' : input.scopeDepotIds?.map((d) => DEPOTS[d] ?? d).join(', ') ?? depotName

    const profile = buildProfile({
      id,
      personId: `person-${id}`,
      reference: nextRef(),
      firstName: input.firstName,
      lastName: input.lastName,
      preferredName: input.preferredName ?? null,
      employeeNumber: input.employeeNumber ?? null,
      pronouns: null,
      jobTitle: input.jobTitle,
      department: dept?.name ?? departmentName(input.departmentId),
      departmentId: input.departmentId,
      team: input.team ?? null,
      employmentStatus: 'active',
      dutyStatus: 'off_duty',
      contractType: input.contractType,
      startDate: input.startDate ?? now().slice(0, 10),
      endDate: null,
      lineManagerId: input.lineManagerId ?? null,
      lineManagerName: input.lineManagerId
        ? (() => {
            const mgr = profiles.find((p) => p.id === input.lineManagerId)
            return mgr ? `${mgr.firstName} ${mgr.lastName}` : null
          })()
        : null,
      costCentre: null,
      workEmail: input.workEmail,
      personalEmail: null,
      workPhone: null,
      mobilePhone: input.mobilePhone ?? null,
      preferredContactMethod: 'email',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryDepotId: input.primaryDepotId,
      primaryDepotName: depotName,
      depotAssignments: [
        { depotId: input.primaryDepotId, depotName, assignmentType: 'primary', roleAtDepot: input.jobTitle, startDate: input.startDate ?? now().slice(0, 10), endDate: null, status: 'active' },
        ...(input.additionalDepotIds ?? []).map((depotId) => ({
          depotId,
          depotName: DEPOTS[depotId] ?? depotId,
          assignmentType: 'secondary' as const,
          roleAtDepot: input.jobTitle,
          startDate: input.startDate ?? now().slice(0, 10),
          endDate: null,
          status: 'active' as const,
        })),
      ],
      roleAssignments: [roleAssignment(input.roleKey, input.scopeType, scopeLabel, input.scopeDepotIds ?? [input.primaryDepotId])],
      applications: appAccess(input.applications, input.sendInvitation ? Object.fromEntries(input.applications.map((a) => [a, 'invitation_pending' as const])) as Partial<Record<StaffApplication, StaffApplicationAccess['status']>> : undefined),
      account: {
        userAccountId: null,
        loginEmail: input.workEmail,
        accountStatus: input.sendInvitation ? 'invitation_pending' : input.applications.length > 0 ? 'no_account' : 'no_account',
        invitationStatus: input.sendInvitation ? 'sent' : 'not_sent',
        invitationSentAt: input.sendInvitation ? now() : null,
        invitationAcceptedAt: null,
        invitationExpiresAt: input.sendInvitation ? daysFromNow(7) : null,
        accountCreatedAt: null,
        lastLoginAt: null,
        lastFailedLoginAt: null,
        mfaEnabled: false,
        authProvider: 'email',
        activeSessionCount: 0,
        temporaryAccessExpiresAt: null,
      },
      qualifications: [],
      linkedDriverId: null,
      linkedDriverName: null,
      tasks: [],
      responsibilities: [],
      operationalAlerts: input.sendInvitation ? ['Account invitation sent'] : [],
      auditEvents: [audit('Staff record created', actorName), ...(input.sendInvitation ? [audit('Invitation sent', actorName, input.workEmail)] : [])],
      createdAt: now(),
      updatedAt: now(),
    })

    profiles = [...profiles, profile]
    return profile
  },

  update(id: string, input: UpdateStaffInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const dept = input.departmentId ? DEPARTMENTS.find((d) => d.id === input.departmentId) : null
    const updated = buildProfile({
      ...current,
      ...input,
      department: dept?.name ?? current.department,
      departmentId: input.departmentId ?? current.departmentId,
      primaryDepotName: input.primaryDepotId ? (DEPOTS[input.primaryDepotId] ?? input.primaryDepotId) : current.primaryDepotName,
      auditEvents: [...current.auditEvents, audit('Staff record updated', actorName)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  sendInvitation(id: string, input: SendStaffInvitationInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const email = input.email ?? current.workEmail
    const updated = buildProfile({
      ...current,
      workEmail: email,
      account: {
        ...current.account,
        loginEmail: email,
        accountStatus: 'invitation_pending',
        invitationStatus: 'sent',
        invitationSentAt: now(),
        invitationExpiresAt: daysFromNow(input.expiresInDays ?? 7),
      },
      applications: current.applications.map((a) => (a.enabled ? { ...a, status: 'invitation_pending' as const } : a)),
      auditEvents: [...current.auditEvents, audit('Invitation sent', actorName, email)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  suspendAccess(id: string, input: SuspendStaffAccessInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      employmentStatus: input.suspendAccount ? current.employmentStatus : 'suspended',
      account: {
        ...current.account,
        accountStatus: 'access_suspended',
        activeSessionCount: 0,
      },
      applications: current.applications.map((a) => ({ ...a, status: a.enabled ? 'suspended' as const : a.status })),
      auditEvents: [...current.auditEvents, audit('Access suspended', actorName, input.reason)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  reinstateAccess(id: string, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      employmentStatus: current.employmentStatus === 'suspended' ? 'active' : current.employmentStatus,
      account: { ...current.account, accountStatus: 'active' },
      applications: current.applications.map((a) => ({ ...a, status: a.enabled ? 'enabled' as const : a.status })),
      auditEvents: [...current.auditEvents, audit('Access reinstated', actorName)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  initiatePasswordReset(id: string, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      account: { ...current.account, accountStatus: 'password_reset_required' },
      auditEvents: [...current.auditEvents, audit('Password reset requested', actorName)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  revokeSessions(id: string, actorName: string, reason: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      account: { ...current.account, activeSessionCount: 0 },
      auditEvents: [...current.auditEvents, audit('Sessions revoked', actorName, reason)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  offboard(id: string, actorName: string, lastWorkingDate: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      employmentStatus: 'left_company',
      dutyStatus: 'off_duty',
      endDate: lastWorkingDate,
      account: { ...current.account, accountStatus: 'deactivated', activeSessionCount: 0 },
      applications: current.applications.map((a) => ({ ...a, enabled: false, status: 'disabled' as const })),
      auditEvents: [...current.auditEvents, audit('Staff offboarded', actorName, lastWorkingDate)],
      updatedAt: now(),
    })
    profiles[idx] = updated
    return updated
  },

  directoryRows() {
    return profiles.filter((p) => p.employmentStatus !== 'left_company' && p.employmentStatus !== 'contractor_inactive').map(profileToRow)
  },

  setDutyStatus(id: string, status: StaffDutyStatus, actorName: string, input: StaffDutyActionInput = {}): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    if (!canTransitionDuty(current.dutyStatus, status)) {
      throw new Error(`Cannot change duty from ${current.dutyStatus} to ${status}`)
    }

    let dutySessions = [...current.dutySessions]
    let currentDutySessionId = current.currentDutySessionId
    const depotId = input.depotId ?? current.primaryDepotId
    const depotName = DEPOTS[depotId] ?? current.primaryDepotName

    if (status === 'on_duty') {
      if (current.dutyStatus === 'on_break' && currentDutySessionId) {
        dutySessions = dutySessions.map((s) => (s.id === currentDutySessionId ? { ...s, status: 'active' as const } : s))
      } else {
        const sessionId = `duty-sess-${Date.now()}`
        dutySessions = [...dutySessions, { id: sessionId, startedAt: now(), endedAt: null, depotId, depotName, role: current.jobTitle, status: 'active' }]
        currentDutySessionId = sessionId
      }
    } else if (status === 'on_break' && currentDutySessionId) {
      dutySessions = dutySessions.map((s) => (s.id === currentDutySessionId ? { ...s, status: 'on_break' as const } : s))
    } else if (status === 'off_duty' && currentDutySessionId) {
      dutySessions = dutySessions.map((s) =>
        s.id === currentDutySessionId ? { ...s, endedAt: now(), status: 'ended' as const } : s,
      )
      currentDutySessionId = null
    }

    const shifts = current.shifts.map((s) =>
      s.date === today() && s.status === 'scheduled' && status === 'on_duty' ? { ...s, status: 'in_progress' as const } : s,
    )

    const dutyTrainingWarnings = status === 'on_duty' ? canStartDutyWithTraining(current) : []
    const operationalAlerts = dutyTrainingWarnings.length
      ? [...new Set([...current.operationalAlerts, ...dutyTrainingWarnings.map((w) => `Training warning: ${w}`)])]
      : current.operationalAlerts

    const updated = buildProfile({
      ...current,
      dutyStatus: status,
      dutySessions,
      currentDutySessionId,
      shifts,
      operationalAlerts,
      auditEvents: [
        ...current.auditEvents,
        audit(dutyActionForStatus(status), actorName, input.notes ?? depotName),
        ...(dutyTrainingWarnings.length ? [audit('Duty started with training warnings', actorName, dutyTrainingWarnings.join('; '))] : []),
      ],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  createHandover(fromStaffId: string, input: CreateStaffHandoverInput, actorName: string): StaffHandover {
    const from = profiles.find((p) => p.id === fromStaffId)
    if (!from) throw new Error('Staff member not found')
    const to = profiles.find((p) => p.id === input.toStaffId)
    const record: StaffHandover = {
      id: `ho-${Date.now()}`,
      fromStaffId,
      fromStaffName: `${from.firstName} ${from.lastName}`,
      toStaffId: input.toStaffId,
      toStaffName: to ? `${to.firstName} ${to.lastName}` : null,
      depotId: from.primaryDepotId,
      depotName: from.primaryDepotName,
      responsibility: input.responsibility,
      openExceptionCount: input.openExceptionCount,
      notes: input.notes ?? null,
      status: 'pending',
      createdAt: now(),
      completedAt: null,
      completedBy: null,
    }
    handovers = [record, ...handovers]
    const idx = profiles.findIndex((p) => p.id === fromStaffId)
    if (idx >= 0) {
      syncProfile(idx, buildProfile({
        ...profiles[idx]!,
        auditEvents: [...profiles[idx]!.auditEvents, audit('Handover initiated', actorName, input.responsibility)],
        updatedAt: now(),
      }))
    }
    return record
  },

  completeHandover(handoverId: string, toStaffId: string, actorName: string): StaffHandover {
    const ho = handovers.find((h) => h.id === handoverId)
    if (!ho) throw new Error('Handover not found')
    const to = profiles.find((p) => p.id === toStaffId)
    if (!to) throw new Error('Receiving staff member not found')
    const completed: StaffHandover = {
      ...ho,
      toStaffId,
      toStaffName: `${to.firstName} ${to.lastName}`,
      status: 'completed',
      completedAt: now(),
      completedBy: actorName,
    }
    handovers = handovers.map((h) => (h.id === handoverId ? completed : h))
    const toIdx = profiles.findIndex((p) => p.id === toStaffId)
    if (toIdx >= 0) {
      syncProfile(toIdx, buildProfile({
        ...profiles[toIdx]!,
        responsibilities: [...profiles[toIdx]!.responsibilities, ho.responsibility],
        auditEvents: [...profiles[toIdx]!.auditEvents, audit('Handover accepted', actorName, ho.responsibility)],
        updatedAt: now(),
      }))
    }
    return completed
  },

  assignTask(staffId: string, input: AssignStaffTaskInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const task = normalizeTask({
      id: `task-${Date.now()}`,
      title: input.title,
      category: input.category,
      dueDate: input.dueDate ?? null,
      status: 'open',
      priority: input.priority ?? 'medium',
      assignedBy: actorName,
      relatedRecord: input.relatedRecord ?? null,
      relatedHref: input.relatedHref ?? null,
    })
    const updated = buildProfile({
      ...current,
      tasks: [task, ...current.tasks],
      auditEvents: [...current.auditEvents, audit('Task assigned', actorName, input.title)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  completeTask(staffId: string, taskId: string, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, status: 'completed' as const } : t)),
      auditEvents: [...current.auditEvents, audit('Task completed', actorName, taskId)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  verifyStaffQualification(staffId: string, qualificationId: string, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const qual = current.qualifications.find((q) => q.id === qualificationId)
    if (!qual) throw new Error('Qualification not found')

    const qualifications = refreshQualificationStatuses(
      current.qualifications.map((q) =>
        q.id === qualificationId ? { ...q, verifiedBy: actorName, status: 'valid' as const } : q,
      ),
    )

    const updated = buildProfile({
      ...current,
      qualifications,
      auditEvents: [...current.auditEvents, audit('Qualification verified', actorName, qual.trainingType)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  addStaffQualification(staffId: string, input: AddStaffQualificationInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const qual: StaffQualification = {
      id: `q-${Date.now()}`,
      trainingType: input.trainingType,
      provider: input.provider ?? null,
      certificateNumber: input.certificateNumber ?? null,
      completedDate: input.completedDate ?? today(),
      expiryDate: input.expiryDate ?? null,
      status: 'awaiting_verification',
      verifiedBy: null,
      evidenceFileName: input.fileName ?? null,
    }
    const updated = buildProfile({
      ...current,
      qualifications: refreshQualificationStatuses([...current.qualifications, qual]),
      auditEvents: [...current.auditEvents, audit('Qualification uploaded', actorName, input.trainingType)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  uploadStaffDocument(staffId: string, input: UploadStaffDocumentInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const existing = current.documents.find((d) => d.requirementType === input.requirementType)
    let documentVersions = [...current.documentVersions]
    let documents = [...current.documents]

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
          replacedAt: now(),
          replacedBy: actorName,
          replacementReason: 'Superseded by new upload',
          fileName: existing.fileName,
        },
        ...documentVersions,
      ]
      documents = documents.map((d) =>
        d.id === existing.id
          ? {
              ...d,
              referenceNumber: input.referenceNumber ?? d.referenceNumber,
              issueDate: input.issueDate ?? d.issueDate,
              expiryDate: input.expiryDate ?? d.expiryDate,
              verificationStatus: 'awaiting_review' as const,
              verifiedBy: null,
              verifiedAt: null,
              rejectionReason: null,
              uploadedBy: actorName,
              uploadedAt: now(),
              fileName: input.fileName,
            }
          : d,
      )
    } else {
      const doc: StaffDocument = {
        id: `doc-${Date.now()}`,
        requirementType: input.requirementType,
        label: input.label,
        referenceNumber: input.referenceNumber ?? null,
        issueDate: input.issueDate ?? null,
        expiryDate: input.expiryDate ?? null,
        verificationStatus: 'awaiting_review',
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
        uploadedBy: actorName,
        uploadedAt: now(),
        fileName: input.fileName,
        sensitive: isSensitiveDocument(input.requirementType),
      }
      documents = [...documents, doc]
    }

    const updated = buildProfile({
      ...current,
      documents,
      documentVersions,
      auditEvents: [...current.auditEvents, audit('Document uploaded', actorName, input.label)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  verifyStaffDocument(staffId: string, documentId: string, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const doc = current.documents.find((d) => d.id === documentId)
    if (!doc) throw new Error('Document not found')
    const updated = buildProfile({
      ...current,
      documents: current.documents.map((d) =>
        d.id === documentId ? { ...d, verificationStatus: 'verified' as const, verifiedBy: actorName, verifiedAt: now(), rejectionReason: null } : d,
      ),
      auditEvents: [...current.auditEvents, audit('Document verified', actorName, doc.label)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  completeAccessReview(staffId: string, input: CompleteStaffAccessReviewInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const reviewedAt = now()
    const updated = buildProfile({
      ...current,
      account: {
        ...current.account,
        lastAccessReviewAt: reviewedAt,
        accessReviewDueAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      auditEvents: [...current.auditEvents, audit('Access review completed', actorName, input.notes ?? 'Roles confirmed')],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  extendContractorAccess(staffId: string, input: ExtendContractorAccessInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const updated = buildProfile({
      ...current,
      account: {
        ...current.account,
        contractorAccessExpiresAt: input.expiresAt,
        temporaryAccessExpiresAt: input.expiresAt,
      },
      auditEvents: [...current.auditEvents, audit('Contractor access extended', actorName, input.reason)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },

  moveStaffMember(staffId: string, input: MoveStaffMemberInput, actorName: string): StaffProfile {
    const idx = profiles.findIndex((p) => p.id === staffId)
    if (idx < 0) throw new Error('Staff member not found')
    const current = profiles[idx]!
    const dept = DEPARTMENTS.find((d) => d.id === input.departmentId)
    const depotId = input.primaryDepotId ?? current.primaryDepotId
    const depotName = DEPOTS[depotId] ?? current.primaryDepotName
    const manager = input.lineManagerId ? profiles.find((p) => p.id === input.lineManagerId) : null

    const updated = buildProfile({
      ...current,
      jobTitle: input.jobTitle,
      department: dept?.name ?? current.department,
      departmentId: input.departmentId,
      lineManagerId: input.lineManagerId ?? current.lineManagerId,
      lineManagerName: manager ? `${manager.firstName} ${manager.lastName}` : current.lineManagerName,
      primaryDepotId: depotId,
      primaryDepotName: depotName,
      roleAssignments: [roleAssignment(input.roleKey, current.roleAssignments[0]?.scopeType ?? 'depot', current.roleAssignments[0]?.scopeLabel ?? depotName, current.roleAssignments[0]?.depotIds ?? [depotId])],
      lifecycleWorkflow: [
        { key: 'mover_initiated', label: 'Mover workflow initiated', status: 'complete', completedAt: now() },
        { key: 'role_updated', label: 'Role and department updated', status: 'complete', completedAt: input.effectiveDate },
        { key: 'access_revalidated', label: 'Access revalidated for new scope', status: 'in_progress', completedAt: null },
        { key: 'manager_notified', label: 'Line manager notified', status: 'pending', completedAt: null },
      ],
      auditEvents: [...current.auditEvents, audit('Staff mover workflow', actorName, `${input.reason} · effective ${input.effectiveDate}`)],
      updatedAt: now(),
    })
    syncProfile(idx, updated)
    return profiles[idx]!
  },
}

export { DEPOTS as STAFF_DEPOTS }
