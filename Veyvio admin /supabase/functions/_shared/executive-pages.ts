/**
 * Live Executive page projections — company-scoped, deny-by-default via EXECUTIVE grant.
 * Returns real backend data; empty collections are honest empty states, never demo fixtures.
 */
import { admin, type RequestContext } from './supabase.ts'
import { decideExecutiveAuthorisation } from './executive-authorisation.ts'

function expandRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  )
}

function initials(firstName: string, lastName: string, email: string): string {
  const fromName = `${firstName} ${lastName}`.trim()
  if (fromName) {
    return fromName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  }
  return email.slice(0, 2).toUpperCase() || 'VE'
}

async function loadCompany(companyId: string) {
  const { data, error } = await admin.from('companies').select('*').eq('id', companyId).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? expandRow(data as Record<string, unknown>) : null
}

async function loadHierarchy(companyId: string) {
  const [{ data: memberships, error: membershipError }, { data: accessRows }, { data: invitations }] =
    await Promise.all([
      admin
        .from('company_memberships')
        .select('id, user_id, role_ids, status, accepted_at, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true }),
      admin
        .from('membership_application_access')
        .select('membership_id, app_type, access_level, status, granted_at')
        .eq('company_id', companyId),
      admin
        .from('invitations')
        .select('id, email, app_type, status, created_at, expires_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
  if (membershipError) throw new Error(membershipError.message)

  const userIds = [...new Set((memberships ?? []).map((m) => String(m.user_id)))]
  const roleIds = [
    ...new Set(
      (memberships ?? []).flatMap((m) => ((m.role_ids as string[] | null) ?? []).map(String)),
    ),
  ]

  const [{ data: users }, { data: roles }] = await Promise.all([
    userIds.length
      ? admin.from('users').select('id, email, first_name, last_name, mfa_enabled, last_login_at').in('id', userIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    roleIds.length
      ? admin.from('roles').select('id, name, description').in('id', roleIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ])

  const userById = new Map((users ?? []).map((u) => [String(u.id), u]))
  const roleById = new Map((roles ?? []).map((r) => [String(r.id), r]))
  const appsByMembership = new Map<string, Array<Record<string, unknown>>>()
  for (const row of accessRows ?? []) {
    const key = String(row.membership_id)
    appsByMembership.set(key, [...(appsByMembership.get(key) ?? []), row as Record<string, unknown>])
  }

  const members = (memberships ?? []).map((membership) => {
    const user = userById.get(String(membership.user_id)) ?? {}
    const roleNames = ((membership.role_ids as string[] | null) ?? [])
      .map((id) => roleById.get(String(id)))
      .filter(Boolean)
      .map((role) => String((role as { name: string }).name))
    const firstName = String(user.first_name ?? '')
    const lastName = String(user.last_name ?? '')
    const email = String(user.email ?? '')
    return {
      membershipId: membership.id,
      userId: membership.user_id,
      email,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim() || email || 'Member',
      initials: initials(firstName, lastName, email),
      status: membership.status,
      acceptedAt: membership.accepted_at,
      lastLoginAt: user.last_login_at ?? null,
      mfaEnabled: Boolean(user.mfa_enabled),
      roles: roleNames,
      applications: (appsByMembership.get(String(membership.id)) ?? []).map((app) => ({
        appType: app.app_type,
        accessLevel: app.access_level,
        status: app.status,
        grantedAt: app.granted_at,
      })),
    }
  })

  return {
    members,
    invitations: (invitations ?? []).map((invite) => expandRow(invite as Record<string, unknown>)),
  }
}

async function loadDepots(companyId: string) {
  const { data, error } = await admin
    .from('depots')
    .select('id, name, code, address, status, created_at')
    .eq('company_id', companyId)
    .order('name', { ascending: true })
  if (error) {
    // Depots table may not exist in every environment — fail soft.
    return []
  }
  return (data ?? []).map((row) => expandRow(row as Record<string, unknown>))
}

async function loadOpsSnapshot(companyId: string) {
  const safeCount = async (query: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
    try {
      const result = await query
      if (result.error) return 0
      return result.count ?? 0
    } catch {
      return 0
    }
  }

  const [vehicles, openDefects, openIncidents, activeDuties] = await Promise.all([
    safeCount(admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId)),
    safeCount(
      admin
        .from('defects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['open', 'under_investigation', 'awaiting_parts', 'reported']),
    ),
    safeCount(
      admin
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['open', 'investigating', 'escalated', 'reported']),
    ),
    safeCount(
      admin
        .from('duties')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['planned', 'signed_on']),
    ),
  ])

  return { vehicles, openDefects, openIncidents, activeDuties }
}

function setupChecklist(company: Record<string, unknown> | null) {
  const items = [
    {
      id: 'legal_name',
      label: 'Legal company name',
      complete: Boolean(company?.legalName),
    },
    {
      id: 'trading_name',
      label: 'Trading name',
      complete: Boolean(company?.tradingName),
    },
    {
      id: 'company_number',
      label: 'Companies House number',
      complete: Boolean(company?.companyNumber),
    },
    {
      id: 'operator_licence',
      label: 'Operator licence number',
      complete: Boolean(company?.operatorLicenceNumber),
    },
    {
      id: 'phone',
      label: 'Company phone',
      complete: Boolean(company?.phone),
    },
    {
      id: 'address',
      label: 'Operating address',
      complete: Boolean(
        company?.operatingAddress &&
          Object.keys(company.operatingAddress as object).length > 0,
      ),
    },
    {
      id: 'verified',
      label: 'Company verification',
      complete: Boolean(company?.verifiedAt) || company?.tenantStatus === 'ACTIVE',
    },
  ]
  const completeCount = items.filter((item) => item.complete).length
  return {
    items,
    completeCount,
    totalCount: items.length,
    percentComplete: Math.round((completeCount / items.length) * 100),
  }
}

export async function projectExecutiveOverview(context: RequestContext) {
  const companyId = context.companyId
  const [company, hierarchy, ops, decisions, meetings] = await Promise.all([
    loadCompany(companyId),
    loadHierarchy(companyId),
    loadOpsSnapshot(companyId),
    admin
      .from('executive_decisions')
      .select('id, title, status, decision_type, due_at')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('due_at', { ascending: true })
      .limit(8),
    admin
      .from('executive_board_meetings')
      .select('id, title, scheduled_at, status')
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: true })
      .limit(5),
  ])

  const pendingDecisions = (decisions.data ?? []).map((row) => expandRow(row as Record<string, unknown>))
  const upcomingMeetings = (meetings.data ?? []).map((row) => expandRow(row as Record<string, unknown>))
  const mfaGaps = hierarchy.members.filter((m) => m.status === 'active' && !m.mfaEnabled).length
  const attention = [
    ops.openIncidents > 0
      ? { code: 'incidents', label: `${ops.openIncidents} open incident${ops.openIncidents === 1 ? '' : 's'}`, severity: 'critical' as const }
      : null,
    ops.openDefects > 0
      ? { code: 'defects', label: `${ops.openDefects} open defect${ops.openDefects === 1 ? '' : 's'}`, severity: 'attention' as const }
      : null,
    pendingDecisions.length > 0
      ? { code: 'decisions', label: `${pendingDecisions.length} pending Executive decision${pendingDecisions.length === 1 ? '' : 's'}`, severity: 'attention' as const }
      : null,
    mfaGaps > 0
      ? { code: 'mfa', label: `${mfaGaps} account${mfaGaps === 1 ? '' : 's'} without MFA`, severity: 'attention' as const }
      : null,
  ].filter(Boolean)

  return {
    dataMode: 'live' as const,
    generatedAt: new Date().toISOString(),
    company: {
      id: companyId,
      tradingName: company?.tradingName ?? company?.legalName ?? 'Company',
      tenantStatus: company?.tenantStatus ?? null,
    },
    metrics: {
      members: hierarchy.members.filter((m) => m.status === 'active').length,
      openInvitations: hierarchy.invitations.filter((i) => i.status === 'pending').length,
      pendingDecisions: pendingDecisions.length,
      ...ops,
    },
    attention,
    pendingDecisions,
    upcomingMeetings,
  }
}

export async function projectExecutiveCompany(context: RequestContext) {
  const company = await loadCompany(context.companyId)
  return {
    dataMode: 'live' as const,
    company,
    setup: setupChecklist(company),
  }
}

export async function projectExecutiveOrganisation(context: RequestContext) {
  const hierarchy = await loadHierarchy(context.companyId)
  return {
    dataMode: 'live' as const,
    members: hierarchy.members,
    invitations: hierarchy.invitations,
  }
}

export async function projectExecutiveApplications(context: RequestContext) {
  const hierarchy = await loadHierarchy(context.companyId)
  /** Department apps Executive may invite into from this app (not Yard/Driver). */
  const executiveInviteApps = new Set(['COMMAND', 'FINANCE', 'HR'])
  const appCatalog = [
    {
      appType: 'EXECUTIVE',
      name: 'Executive',
      description: 'Governance, company setup and leadership oversight',
      inviteFromExecutive: false,
      managedIn: 'EXECUTIVE',
    },
    {
      appType: 'COMMAND',
      name: 'Command',
      description: 'Operations, scheduling, dispatch and fleet control',
      inviteFromExecutive: true,
      managedIn: 'EXECUTIVE',
    },
    {
      appType: 'FINANCE',
      name: 'Finance',
      description: 'Cost control, budgets, forecasts and audit evidence',
      inviteFromExecutive: true,
      managedIn: 'EXECUTIVE',
    },
    {
      appType: 'HR',
      name: 'HR',
      description: 'People administration and employment records',
      inviteFromExecutive: true,
      managedIn: 'EXECUTIVE',
    },
    {
      appType: 'YARD',
      name: 'Yard',
      description: 'Vehicle readiness, checks, defects and movements',
      inviteFromExecutive: false,
      managedIn: 'COMMAND',
    },
    {
      appType: 'DRIVER',
      name: 'Driver',
      description: 'Driver duties, checks, journeys and handback',
      inviteFromExecutive: false,
      managedIn: 'COMMAND',
    },
  ]

  const granted = new Map<string, number>()
  for (const member of hierarchy.members) {
    for (const app of member.applications) {
      if (app.status !== 'active') continue
      const key = String(app.appType)
      granted.set(key, (granted.get(key) ?? 0) + 1)
    }
  }

  return {
    dataMode: 'live' as const,
    invitePolicy: {
      sourceApp: 'EXECUTIVE',
      departmentApps: [...executiveInviteApps],
      note:
        'From Executive you can invite people to Command, Finance or HR. Driver and Yard accounts are created in Command.',
    },
    applications: appCatalog.map((app) => ({
      ...app,
      activeMembers: granted.get(app.appType) ?? 0,
      status: (granted.get(app.appType) ?? 0) > 0 ? 'active' : 'not_activated',
    })),
    members: hierarchy.members,
    invitations: hierarchy.invitations,
  }
}

export async function projectExecutiveSecurity(context: RequestContext) {
  const hierarchy = await loadHierarchy(context.companyId)
  const active = hierarchy.members.filter((m) => m.status === 'active')
  const withMfa = active.filter((m) => m.mfaEnabled)
  const { data: recentEvents } = await admin
    .from('security_events')
    .select('id, event_type, message, severity, occurred_at, actor_user_id')
    .eq('company_id', context.companyId)
    .order('occurred_at', { ascending: false })
    .limit(20)

  return {
    dataMode: 'live' as const,
    coverage: {
      activeMembers: active.length,
      mfaEnabled: withMfa.length,
      mfaPercent: active.length ? Math.round((withMfa.length / active.length) * 100) : 0,
      gaps: active
        .filter((m) => !m.mfaEnabled)
        .map((m) => ({
          membershipId: m.membershipId,
          displayName: m.displayName,
          email: m.email,
          roles: m.roles,
        })),
    },
    recentEvents: (recentEvents ?? []).map((row) => expandRow(row as Record<string, unknown>)),
  }
}

export async function projectExecutiveBranches(context: RequestContext) {
  const [depots, ops] = await Promise.all([
    loadDepots(context.companyId),
    loadOpsSnapshot(context.companyId),
  ])
  return {
    dataMode: 'live' as const,
    branches: depots.map((depot) => ({
      id: depot.id,
      code: depot.code ?? null,
      name: depot.name,
      status: depot.status ?? 'active',
      address: depot.address ?? null,
    })),
    companyOps: ops,
  }
}

export async function projectExecutiveGovernance(context: RequestContext) {
  const companyId = context.companyId
  const [meetings, conflicts, hierarchy] = await Promise.all([
    admin
      .from('executive_board_meetings')
      .select('*')
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: true })
      .limit(50),
    admin
      .from('executive_conflicts')
      .select('*')
      .eq('company_id', companyId)
      .order('declared_at', { ascending: false })
      .limit(50),
    loadHierarchy(companyId),
  ])

  const boardRolePriority = [
    'company_owner',
    'director',
    'board_member',
    'company_administrator',
    'executive_reader',
  ] as const
  const boardRoleLabels: Record<string, string> = {
    company_owner: 'Chief Executive',
    director: 'Director',
    board_member: 'Board member',
    company_administrator: 'Company administrator',
    executive_reader: 'Board reader',
  }

  const boardCandidates = hierarchy.members
    .filter((m) => m.status === 'active')
    .filter((m) =>
      m.roles.some((role) => (boardRolePriority as readonly string[]).includes(role)),
    )
    .filter((m) =>
      m.applications.some(
        (app) => String(app.appType) === 'EXECUTIVE' && String(app.status) === 'active',
      ),
    )
    .sort((a, b) => {
      const aOwner = a.roles.includes('company_owner')
      const bOwner = b.roles.includes('company_owner')
      if (aOwner !== bOwner) return aOwner ? -1 : 1
      return String(a.acceptedAt ?? '').localeCompare(String(b.acceptedAt ?? ''))
    })

  let primaryOwnerAssigned = false
  const directors = boardCandidates.map((member) => {
    const roles = member.roles.map((role) => String(role).toLowerCase())
    const isOwner = roles.includes('company_owner')
    const secondaryOwner = isOwner && primaryOwnerAssigned
    if (isOwner) primaryOwnerAssigned = true

    const boardRoles = boardRolePriority
      .filter((role) => roles.includes(role))
      .map((role) => boardRoleLabels[role])
      .join(' · ')

    const boardTitle = secondaryOwner
      ? 'Company owner'
      : boardRolePriority
        .map((role) => (roles.includes(role) ? boardRoleLabels[role] : null))
        .find(Boolean) ?? 'Board member'

    return {
      ...member,
      boardTitle,
      boardRoles,
    }
  })

  return {
    dataMode: 'live' as const,
    meetings: (meetings.data ?? []).map((row) => expandRow(row as Record<string, unknown>)),
    conflicts: (conflicts.data ?? []).map((row) => expandRow(row as Record<string, unknown>)),
    directors,
  }
}

export async function projectExecutiveDecisions(context: RequestContext) {
  const { data, error } = await admin
    .from('executive_decisions')
    .select('*')
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return {
    dataMode: 'live' as const,
    decisions: (data ?? []).map((row) => expandRow(row as Record<string, unknown>)),
  }
}

export async function projectExecutivePolicies(context: RequestContext) {
  const { data, error } = await admin
    .from('executive_policies')
    .select('*')
    .eq('company_id', context.companyId)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return {
    dataMode: 'live' as const,
    policies: (data ?? []).map((row) => {
      const expanded = expandRow(row as Record<string, unknown>)
      const status = String(expanded.status ?? 'draft')
      return {
        ...expanded,
        editable: status === 'draft' || status === 'in_review',
        bodyText:
          String(expanded.bodyText ?? '').trim() ||
          String(expanded.summary ?? '').trim() ||
          `${String(expanded.title)}\n\nNo policy body has been written yet. Use Edit to draft the controlled text.`,
      }
    }),
  }
}

export async function projectExecutiveRecords(context: RequestContext) {
  const [records, company] = await Promise.all([
    admin
      .from('executive_company_records')
      .select('*')
      .eq('company_id', context.companyId)
      .order('updated_at', { ascending: false })
      .limit(100),
    loadCompany(context.companyId),
  ])
  if (records.error) throw new Error(records.error.message)

  const derived = [
    company?.legalName
      ? {
          id: 'derived-legal-name',
          title: 'Legal name',
          recordType: 'legal',
          status: 'current',
          reference: company.legalName,
          value: company.legalName,
          source: 'company_profile',
          editable: false,
          editTarget: 'company',
          bodyText: String(company.legalName),
        }
      : null,
    company?.companyNumber
      ? {
          id: 'derived-company-number',
          title: 'Companies House number',
          recordType: 'legal',
          status: 'current',
          reference: company.companyNumber,
          value: company.companyNumber,
          source: 'company_profile',
          editable: false,
          editTarget: 'company',
          bodyText: String(company.companyNumber),
        }
      : null,
    company?.operatorLicenceNumber
      ? {
          id: 'derived-operator-licence',
          title: 'Operator licence',
          recordType: 'licence',
          status: 'current',
          reference: company.operatorLicenceNumber,
          value: company.operatorLicenceNumber,
          source: 'company_profile',
          editable: false,
          editTarget: 'company',
          bodyText: String(company.operatorLicenceNumber),
        }
      : null,
  ].filter(Boolean)

  return {
    dataMode: 'live' as const,
    records: [
      ...derived,
      ...(records.data ?? []).map((row) => {
        const expanded = expandRow(row as Record<string, unknown>)
        return {
          ...expanded,
          editable: true,
          bodyText:
            String(expanded.bodyText ?? expanded.notes ?? '').trim() ||
            `${String(expanded.title)}\n\nReference: ${String(expanded.reference ?? 'No reference')}\n\nNo document body has been added yet.`,
        }
      }),
    ],
  }
}

export async function projectExecutiveBudget(context: RequestContext) {
  const [
    { data: mandates, error },
    { data: annualBudgets, error: annualBudgetError },
    { data: annualBudgetRequests, error: annualBudgetRequestError },
    company,
    entitlements,
  ] = await Promise.all([
    admin
      .from('executive_budget_mandates')
      .select('*')
      .eq('company_id', context.companyId)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('executive_annual_budgets')
      .select('*')
      .eq('company_id', context.companyId)
      .order('financial_year', { ascending: false })
      .order('version', { ascending: false })
      .limit(100),
    admin
      .from('executive_sensitive_action_requests')
      .select('id, target_id, status, reason, evidence_references, proposer_user_id, proposer_roles, approved_at, rejected_at, executed_at, created_at, updated_at')
      .eq('company_id', context.companyId)
      .eq('action_type', 'annual_budget_approval')
      .order('created_at', { ascending: false })
      .limit(100),
    loadCompany(context.companyId),
    admin
      .from('company_subscriptions')
      .select('status, plan_code, trial_ends_at, current_period_end')
      .eq('company_id', context.companyId)
      .maybeSingle(),
  ])
  if (error) throw new Error(error.message)
  if (annualBudgetError) throw new Error(annualBudgetError.message)
  if (annualBudgetRequestError) throw new Error(annualBudgetRequestError.message)

  const requestsByBudget = new Map(
    (annualBudgetRequests ?? []).map((request) => [
      String(request.target_id),
      request as Record<string, unknown>,
    ]),
  )
  const budgets = (annualBudgets ?? []).map((row) => {
    const budget = expandRow(row as Record<string, unknown>)
    const approval = requestsByBudget.get(String(row.id)) ?? null
    const approvalDecision = approval
      ? decideExecutiveAuthorisation({
          actorUserId: context.user.id,
          roleKeys: context.roleKeys,
          action: 'executive.budget.approve',
          companyId: context.companyId,
          resourceCompanyId: context.companyId,
          proposerUserId: String(approval.proposer_user_id),
        })
      : null
    return {
      ...budget,
      approval: approval ? expandRow(approval) : null,
      canCurrentUserApprove:
        approval?.status === 'pending_approval' &&
        approvalDecision?.allowed === true,
    }
  })
  const proposeDecision = decideExecutiveAuthorisation({
    actorUserId: context.user.id,
    roleKeys: context.roleKeys,
    action: 'executive.budget.propose',
    companyId: context.companyId,
    resourceCompanyId: context.companyId,
  })

  return {
    dataMode: 'live' as const,
    note:
      'Finance prepares the detailed annual cost budget. Executive records the formal independent approval and preserves every version.',
    company: {
      tradingName: company?.tradingName ?? company?.legalName ?? null,
      tenantStatus: company?.tenantStatus ?? null,
    },
    subscription: entitlements.data
      ? expandRow(entitlements.data as Record<string, unknown>)
      : null,
    annualBudgets: budgets,
    approvedBudgets: budgets.filter((budget) => budget.status === 'approved'),
    pendingBudgetApprovals: budgets.filter(
      (budget) => budget.approval?.status === 'pending_approval',
    ),
    permissions: {
      canPropose: proposeDecision.allowed,
    },
    mandates: (mandates ?? []).map((row) => expandRow(row as Record<string, unknown>)),
  }
}

export type ExecutivePageKey =
  | 'overview'
  | 'company'
  | 'organisation'
  | 'applications'
  | 'security'
  | 'branches'
  | 'governance'
  | 'decisions'
  | 'policies'
  | 'records'
  | 'budget'

export async function projectExecutivePage(
  context: RequestContext,
  page: ExecutivePageKey,
) {
  switch (page) {
    case 'overview':
      return projectExecutiveOverview(context)
    case 'company':
      return projectExecutiveCompany(context)
    case 'organisation':
      return projectExecutiveOrganisation(context)
    case 'applications':
      return projectExecutiveApplications(context)
    case 'security':
      return projectExecutiveSecurity(context)
    case 'branches':
      return projectExecutiveBranches(context)
    case 'governance':
      return projectExecutiveGovernance(context)
    case 'decisions':
      return projectExecutiveDecisions(context)
    case 'policies':
      return projectExecutivePolicies(context)
    case 'records':
      return projectExecutiveRecords(context)
    case 'budget':
      return projectExecutiveBudget(context)
    default:
      throw new Error('Unknown Executive page')
  }
}
