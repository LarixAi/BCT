import { DEPARTMENTS, STAFF_ROLES } from './constants'
import { expireTemporaryDepotAccess } from './depot-access'
import { buildSegregationFleetAlerts, pendingAccessReviews } from './governance'
import { TRAINING_CATALOG } from './training'
import type {
  FleetStaffShiftRow,
  FleetStaffTaskRow,
  FleetTrainingGapRow,
  StaffDirectoryRow,
  StaffDirectorySummary,
  StaffGovernanceSummary,
  StaffHandover,
  StaffHubData,
  StaffProfile,
  StaffTrainingComplianceSummary,
} from './types'

const LEFT_STATUSES = new Set(['left_company', 'contractor_inactive'])
const ACCESS_ISSUE_STATUSES = new Set(['locked', 'password_reset_required', 'mfa_setup_required', 'access_suspended'])
const INVITE_PENDING = new Set(['invitation_pending', 'not_sent', 'sent', 'delivered', 'opened', 'scheduled'])

export function profileToRow(profile: StaffProfile): StaffDirectoryRow {
  const primaryRole = profile.roleAssignments[0]
  const additionalDepots = profile.depotAssignments.filter((d) => d.assignmentType !== 'primary').length
  return {
    staffId: profile.id,
    reference: profile.reference,
    firstName: profile.firstName,
    lastName: profile.lastName,
    employeeNumber: profile.employeeNumber,
    jobTitle: profile.jobTitle,
    department: profile.department,
    primaryDepotName: profile.primaryDepotName,
    additionalDepotCount: additionalDepots,
    roleLabel: primaryRole?.roleLabel ?? '—',
    employmentStatus: profile.employmentStatus,
    accountStatus: profile.account.accountStatus,
    dutyStatus: profile.dutyStatus,
    trainingStatus: profile.trainingStatus,
    lastLoginAt: profile.account.lastLoginAt,
    hasDriverProfile: profile.linkedDriverId != null,
    invitationStatus: profile.account.invitationStatus,
  }
}

export function computeStaffSummary(profiles: StaffProfile[]): StaffDirectorySummary {
  const activeProfiles = profiles.filter((p) => !LEFT_STATUSES.has(p.employmentStatus))
  return {
    total: activeProfiles.length,
    active: activeProfiles.filter((p) => p.employmentStatus === 'active').length,
    onDuty: activeProfiles.filter((p) => p.dutyStatus === 'on_duty').length,
    invitationsPending: activeProfiles.filter((p) =>
      p.account.accountStatus === 'invitation_pending' || INVITE_PENDING.has(p.account.invitationStatus),
    ).length,
    accessIssues: activeProfiles.filter((p) => ACCESS_ISSUE_STATUSES.has(p.account.accountStatus)).length,
    trainingExpiring: activeProfiles.filter((p) => p.trainingStatus === 'expiring_soon' || p.trainingStatus === 'expired').length,
    unassigned: activeProfiles.filter((p) => !p.department || !p.primaryDepotId || !p.lineManagerId).length,
  }
}

export function buildStaffHub(profiles: StaffProfile[], handovers: StaffHandover[] = []): StaffHubData {
  const refreshed = profiles.map(expireTemporaryDepotAccess)
  const rows = refreshed
    .filter((p) => !LEFT_STATUSES.has(p.employmentStatus))
    .map(profileToRow)
    .sort((a, b) => a.lastName.localeCompare(b.lastName))

  const invitations = rows.filter(
    (r) => r.accountStatus === 'invitation_pending' || ['sent', 'delivered', 'opened', 'scheduled'].includes(r.invitationStatus),
  )

  const former = refreshed
    .filter((p) => LEFT_STATUSES.has(p.employmentStatus))
    .map(profileToRow)

  const departments = DEPARTMENTS.map((d) => ({
    id: d.id,
    name: d.name,
    headName: refreshed.find((p) => p.departmentId === d.id && p.jobTitle.toLowerCase().includes('manager'))?.firstName
      ? `${refreshed.find((p) => p.departmentId === d.id && p.jobTitle.toLowerCase().includes('manager'))!.firstName} ${refreshed.find((p) => p.departmentId === d.id && p.jobTitle.toLowerCase().includes('manager'))!.lastName}`
      : null,
    staffCount: refreshed.filter((p) => p.departmentId === d.id && !LEFT_STATUSES.has(p.employmentStatus)).length,
    teams: [...d.teams],
  }))

  const roles = STAFF_ROLES.map((r) => ({
    key: r.key,
    label: r.label,
    description: r.description,
    elevated: r.elevated,
    applications: [...r.applications],
  }))

  const today = new Date().toISOString().slice(0, 10)
  const shiftsToday: FleetStaffShiftRow[] = refreshed.flatMap((p) =>
    p.shifts
      .filter((s) => s.date === today)
      .map((s) => ({
        shiftId: s.id,
        staffId: p.id,
        staffName: `${p.firstName} ${p.lastName}`,
        jobTitle: p.jobTitle,
        depotName: s.depotName,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        dutyStatus: p.dutyStatus,
      })),
  )

  const openTasks: FleetStaffTaskRow[] = refreshed.flatMap((p) =>
    p.tasks
      .filter((t) => t.status === 'open' || t.status === 'overdue' || t.status === 'escalated')
      .map((t) => ({
        taskId: t.id,
        staffId: p.id,
        staffName: `${p.firstName} ${p.lastName}`,
        title: t.title,
        category: t.category,
        dueDate: t.dueDate,
        status: t.status,
        priority: t.priority,
        relatedHref: t.relatedHref,
      })),
  )

  const controllersOnDuty = rows.filter(
    (r) =>
      r.dutyStatus === 'on_duty' &&
      refreshed.find((p) => p.id === r.staffId)?.roleAssignments.some((ra) =>
        ['dispatcher', 'operations_manager', 'depot_manager'].includes(ra.roleKey),
      ),
  )

  const trainingGaps: FleetTrainingGapRow[] = refreshed
    .filter((p) => !LEFT_STATUSES.has(p.employmentStatus))
    .flatMap((p) =>
      p.trainingRequirements
        .filter((r) => ['expired', 'missing', 'expiring_soon', 'awaiting_verification'].includes(r.status))
        .map((r) => ({
          staffId: p.id,
          staffName: `${p.firstName} ${p.lastName}`,
          roleLabel: p.roleAssignments[0]?.roleLabel ?? '—',
          requirementKey: r.key,
          requirementLabel: r.label,
          status: r.status,
          expiryDate: r.expiryDate,
          blocksAccess: r.blocksAccess,
        })),
    )
    .sort((a, b) => {
      const order = { expired: 0, missing: 1, awaiting_verification: 2, expiring_soon: 3 }
      return (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9)
    })

  const trainingCompliance: StaffTrainingComplianceSummary = {
    staffWithGaps: new Set(trainingGaps.map((g) => g.staffId)).size,
    expiringSoon: trainingGaps.filter((g) => g.status === 'expiring_soon').length,
    accessBlocked: refreshed.filter((p) => !LEFT_STATUSES.has(p.employmentStatus) && p.trainingAccessBlocks.length > 0).length,
    awaitingVerification: trainingGaps.filter((g) => g.status === 'awaiting_verification').length,
  }

  const activeProfiles = refreshed.filter((p) => !LEFT_STATUSES.has(p.employmentStatus))
  const accessReviewList = pendingAccessReviews(activeProfiles)
  const segregationAlerts = buildSegregationFleetAlerts(activeProfiles)
  const contractorsExpiring = activeProfiles
    .filter((p) => p.contractType === 'contractor' && p.account.contractorAccessExpiresAt)
    .map(profileToRow)
  const governanceSummary: StaffGovernanceSummary = {
    accessReviewsDue: accessReviewList.length,
    segregationWarnings: segregationAlerts.length,
    contractorsExpiring: contractorsExpiring.length,
    mfaNonCompliant: activeProfiles.filter((p) => p.governanceAlerts.some((a) => a.code === 'mfa_policy')).length,
    ssoEnabledCount: activeProfiles.filter((p) => p.account.ssoEnabled).length,
  }

  return {
    summary: computeStaffSummary(refreshed),
    rows,
    invitations,
    former,
    departments,
    roles,
    shiftsToday,
    openTasks,
    pendingHandovers: handovers.filter((h) => h.status === 'pending'),
    controllersOnDuty,
    trainingGaps,
    trainingCompliance,
    requirementCatalog: TRAINING_CATALOG.map((c) => ({
      key: c.key,
      label: c.label,
      category: c.category,
      requiredFor: c.requiredFor,
      renewalMonths: c.renewalMonths,
    })),
    pendingAccessReviews: accessReviewList,
    segregationAlerts,
    contractorsExpiring,
    governanceSummary,
    ssoPolicy: { enabled: true, provider: 'Microsoft Entra ID', enforcedForElevated: true },
  }
}

export function filterStaffRows(rows: StaffDirectoryRow[] | undefined, filter: string, search: string): StaffDirectoryRow[] {
  let list = rows ?? []

  if (filter === 'active') list = list.filter((r) => r.employmentStatus === 'active')
  else if (filter === 'on_duty') list = list.filter((r) => r.dutyStatus === 'on_duty')
  else if (filter === 'invitation_pending') list = list.filter((r) => r.accountStatus === 'invitation_pending')
  else if (filter === 'access_issues') list = list.filter((r) => ['locked', 'password_reset_required', 'mfa_setup_required', 'access_suspended'].includes(r.accountStatus))
  else if (filter === 'training_expiring') list = list.filter((r) => r.trainingStatus === 'expiring_soon' || r.trainingStatus === 'expired')
  else if (filter === 'unassigned') list = list.filter((r) => r.department === '—' || !r.primaryDepotName)
  else if (filter === 'has_driver') list = list.filter((r) => r.hasDriverProfile)
  else if (filter === 'suspended') list = list.filter((r) => r.accountStatus === 'access_suspended' || r.employmentStatus === 'suspended')

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (r) =>
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.employeeNumber?.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.primaryDepotName.toLowerCase().includes(q) ||
        r.roleLabel.toLowerCase().includes(q),
    )
  }

  return list
}
