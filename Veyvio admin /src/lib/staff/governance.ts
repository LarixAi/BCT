import type {
  FleetSegregationAlertRow,
  StaffAccessReview,
  StaffGovernanceAlert,
  StaffProfile,
  StaffRoleAssignment,
} from './types'

const ACCESS_REVIEW_DAYS = 90
const CONTRACTOR_WARNING_DAYS = 14

const SEGREGATION_CONFLICTS: { roles: string[]; message: string }[] = [
  { roles: ['finance_manager', 'compliance_manager'], message: 'Finance and compliance roles should be held by different people' },
  { roles: ['finance_manager', 'company_admin'], message: 'Finance manager combined with company administrator increases fraud risk' },
  { roles: ['dispatcher', 'auditor'], message: 'Operational dispatch and audit roles should be segregated' },
]

const ELEVATED_ROLES = new Set(['company_owner', 'company_admin', 'compliance_manager', 'finance_manager', 'safeguarding_officer'])

export function roleKeys(profile: StaffProfile): string[] {
  return profile.roleAssignments.map((r) => r.roleKey)
}

export function checkSegregationOfDuties(profile: StaffProfile): StaffGovernanceAlert[] {
  const keys = new Set(roleKeys(profile))
  const alerts: StaffGovernanceAlert[] = []
  for (const conflict of SEGREGATION_CONFLICTS) {
    if (conflict.roles.every((r) => keys.has(r))) {
      alerts.push({
        id: `seg-${conflict.roles.join('-')}`,
        code: 'segregation_of_duties',
        severity: 'warning',
        message: conflict.message,
        relatedRoles: conflict.roles,
      })
    }
  }
  return alerts
}

export function checkAccessReviewDue(profile: StaffProfile): StaffGovernanceAlert[] {
  const elevated = profile.roleAssignments.some((r) => r.elevated || ELEVATED_ROLES.has(r.roleKey))
  if (!elevated || profile.employmentStatus !== 'active') return []

  const lastReview = profile.account.lastAccessReviewAt
  if (!lastReview) {
    return [{
      id: 'access-review-never',
      code: 'access_review_overdue',
      severity: 'warning',
      message: 'Elevated access has never been reviewed',
      relatedRoles: profile.roleAssignments.filter((r) => r.elevated).map((r) => r.roleKey),
    }]
  }

  const daysSince = Math.floor((Date.now() - new Date(lastReview).getTime()) / (24 * 60 * 60 * 1000))
  if (daysSince >= ACCESS_REVIEW_DAYS) {
    return [{
      id: 'access-review-overdue',
      code: 'access_review_overdue',
      severity: 'warning',
      message: `Elevated access not reviewed in ${daysSince} days`,
      relatedRoles: profile.roleAssignments.filter((r) => r.elevated).map((r) => r.roleKey),
    }]
  }
  return []
}

export function checkContractorExpiry(profile: StaffProfile): StaffGovernanceAlert[] {
  const expiresAt = profile.account.contractorAccessExpiresAt
  if (!expiresAt || profile.contractType !== 'contractor') return []
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days < 0) {
    return [{ id: 'contractor-expired', code: 'contractor_access_expired', severity: 'critical', message: 'Contractor access has expired', relatedRoles: roleKeys(profile) }]
  }
  if (days <= CONTRACTOR_WARNING_DAYS) {
    return [{ id: 'contractor-expiring', code: 'contractor_access_expiring', severity: 'warning', message: `Contractor access expires in ${days} days`, relatedRoles: roleKeys(profile) }]
  }
  return []
}

export function checkMfaPolicy(profile: StaffProfile): StaffGovernanceAlert[] {
  const requiresMfa = profile.roleAssignments.some((r) => r.elevated || ELEVATED_ROLES.has(r.roleKey))
  if (!requiresMfa || profile.account.mfaEnabled || profile.account.accountStatus !== 'active') return []
  return [{
    id: 'mfa-required',
    code: 'mfa_policy',
    severity: 'warning',
    message: 'MFA required for elevated access but not configured',
    relatedRoles: profile.roleAssignments.map((r) => r.roleKey),
  }]
}

export function buildStaffGovernanceAlerts(profile: StaffProfile): StaffGovernanceAlert[] {
  return [
    ...checkSegregationOfDuties(profile),
    ...checkAccessReviewDue(profile),
    ...checkContractorExpiry(profile),
    ...checkMfaPolicy(profile),
  ]
}

export function buildSegregationFleetAlerts(profiles: StaffProfile[]): FleetSegregationAlertRow[] {
  return profiles.flatMap((p) =>
    checkSegregationOfDuties(p).map((a) => ({
      staffId: p.id,
      staffName: `${p.firstName} ${p.lastName}`,
      roleLabel: p.roleAssignments.map((r) => r.roleLabel).join(', '),
      message: a.message,
      severity: a.severity,
    })),
  )
}

export function pendingAccessReviews(profiles: StaffProfile[]): StaffAccessReview[] {
  return profiles
    .filter((p) => p.employmentStatus === 'active')
    .flatMap((p) => {
      const dueAlerts = checkAccessReviewDue(p)
      if (dueAlerts.length === 0) return []
      const elevated = p.roleAssignments.filter((r) => r.elevated || ELEVATED_ROLES.has(r.roleKey))
      return [{
        id: `review-${p.id}`,
        staffId: p.id,
        staffName: `${p.firstName} ${p.lastName}`,
        roleLabel: elevated[0]?.roleLabel ?? p.jobTitle,
        lastReviewedAt: p.account.lastAccessReviewAt,
        dueAt: p.account.accessReviewDueAt,
        status: 'overdue' as const,
        elevatedRoles: elevated.map((r) => r.roleLabel),
      }]
    })
}

export function defaultLifecycleSteps(profile: StaffProfile): StaffProfile['lifecycleWorkflow'] {
  const isLeaver = ['notice_period', 'left_company', 'contractor_inactive'].includes(profile.employmentStatus)
  const steps = [
    { key: 'profile_created', label: 'Staff profile created', status: 'complete' as const, completedAt: profile.createdAt },
    { key: 'account_invited', label: 'User account invitation', status: profile.account.invitationStatus === 'accepted' ? 'complete' as const : profile.account.invitationStatus === 'not_sent' ? 'pending' as const : 'in_progress' as const, completedAt: profile.account.invitationAcceptedAt },
    { key: 'training_assigned', label: 'Mandatory training assigned', status: profile.trainingRequirements.some((r) => r.status === 'missing') ? 'in_progress' as const : 'complete' as const, completedAt: null },
    { key: 'depot_access', label: 'Depot access granted', status: profile.depotAssignments.length > 0 ? 'complete' as const : 'pending' as const, completedAt: profile.depotAssignments[0]?.startDate ?? null },
  ]
  if (isLeaver) {
    return [
      ...steps,
      { key: 'access_revoked', label: 'System access revoked', status: profile.account.accountStatus === 'deactivated' ? 'complete' as const : 'in_progress' as const, completedAt: profile.endDate },
      { key: 'record_archived', label: 'Record archived for audit', status: profile.employmentStatus === 'left_company' ? 'complete' as const : 'pending' as const, completedAt: profile.endDate },
    ]
  }
  return steps
}

export function enrichStaffGovernance<T extends StaffProfile>(profile: T): T {
  const governanceAlerts = buildStaffGovernanceAlerts(profile)
  const lifecycleWorkflow = profile.lifecycleWorkflow.length > 0 ? profile.lifecycleWorkflow : defaultLifecycleSteps(profile)
  const messages = governanceAlerts.map((a) => a.message)
  return {
    ...profile,
    governanceAlerts,
    lifecycleWorkflow,
    operationalAlerts: [...new Set([...profile.operationalAlerts, ...messages])],
    account: {
      ...profile.account,
      accessReviewDueAt: profile.account.accessReviewDueAt ?? computeAccessReviewDue(profile),
    },
  }
}

function computeAccessReviewDue(profile: StaffProfile): string | null {
  const elevated = profile.roleAssignments.some((r) => r.elevated || ELEVATED_ROLES.has(r.roleKey))
  if (!elevated) return null
  const base = profile.account.lastAccessReviewAt ? new Date(profile.account.lastAccessReviewAt) : new Date(profile.account.accountCreatedAt ?? profile.createdAt)
  return new Date(base.getTime() + ACCESS_REVIEW_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function hasConflictingRoles(assignments: StaffRoleAssignment[]): string | null {
  const keys = new Set(assignments.map((a) => a.roleKey))
  for (const conflict of SEGREGATION_CONFLICTS) {
    if (conflict.roles.every((r) => keys.has(r))) return conflict.message
  }
  return null
}
