/**
 * Veyvio Executive authorisation policy.
 *
 * This module is intentionally pure so the API, future Executive handlers and
 * tests share one deny-by-default decision. Authentication and the explicit
 * EXECUTIVE application grant are separate mandatory gates.
 */

export const EXECUTIVE_ACTIONS = [
  'executive.session.read',
  'executive.session.confirm',
  'executive.dashboard.read',
  'executive.company.read',
  'executive.branch.read',
  'executive.budget.read',
  'executive.budget.propose',
  'executive.budget.review',
  'executive.budget.approve',
  'executive.policy.read',
  'executive.policy.propose',
  'executive.policy.approve',
  'executive.board.read',
  'executive.audit.read',
  'executive.accounts.read',
  'executive.accounts.manage',
  'executive.directors.propose',
  'executive.export.propose',
  'executive.bank_authority.propose',
  'executive.support_access.propose',
  'executive.security_settings.propose',
  'executive.company_close.propose',
  'executive.safety_stop.read',
  'executive.safety_stop.override',
  'executive.board_reserved.approve',
] as const

export type ExecutiveAction = (typeof EXECUTIVE_ACTIONS)[number]

export const EXECUTIVE_CANONICAL_ROLES = [
  'chief_executive',
  'company_administrator',
  'director',
  'board_member',
  'board_reader',
  'auditor',
] as const

export type ExecutiveCanonicalRole = (typeof EXECUTIVE_CANONICAL_ROLES)[number]

const ROLE_ALIASES: Record<string, ExecutiveCanonicalRole> = {
  company_owner: 'chief_executive',
  chief_executive: 'chief_executive',
  company_administrator: 'company_administrator',
  company_admin: 'company_administrator',
  director: 'director',
  board_member: 'board_member',
  executive_reader: 'board_reader',
  board_reader: 'board_reader',
  executive_auditor: 'auditor',
  read_only_auditor: 'auditor',
  auditor: 'auditor',
}

const ALL_ROLES = new Set<ExecutiveCanonicalRole>(EXECUTIVE_CANONICAL_ROLES)
const LEADERS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'director',
  'board_member',
])
const BOARD_READERS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'director',
  'board_member',
  'board_reader',
  'auditor',
])
const AUDIT_READERS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'director',
  'board_member',
  'auditor',
])
const ACCOUNT_READERS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'company_administrator',
  'director',
  'board_member',
  'auditor',
])
const ACCOUNT_MANAGERS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'company_administrator',
])
const ADMIN_AND_DIRECTORS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'company_administrator',
  'director',
  'board_member',
])
const PROPOSERS = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'director',
])
const INDEPENDENT_APPROVERS = new Set<ExecutiveCanonicalRole>([
  'director',
  'board_member',
])

const ACTION_ROLES: Record<ExecutiveAction, ReadonlySet<ExecutiveCanonicalRole>> = {
  'executive.session.read': ALL_ROLES,
  'executive.session.confirm': ALL_ROLES,
  'executive.dashboard.read': ALL_ROLES,
  'executive.company.read': ALL_ROLES,
  'executive.branch.read': ALL_ROLES,
  'executive.budget.read': ALL_ROLES,
  'executive.budget.propose': PROPOSERS,
  'executive.budget.review': INDEPENDENT_APPROVERS,
  'executive.budget.approve': INDEPENDENT_APPROVERS,
  'executive.policy.read': ALL_ROLES,
  'executive.policy.propose': PROPOSERS,
  'executive.policy.approve': INDEPENDENT_APPROVERS,
  'executive.board.read': BOARD_READERS,
  'executive.audit.read': AUDIT_READERS,
  'executive.accounts.read': ACCOUNT_READERS,
  'executive.accounts.manage': ACCOUNT_MANAGERS,
  'executive.directors.propose': LEADERS,
  'executive.export.propose': AUDIT_READERS,
  'executive.bank_authority.propose': LEADERS,
  'executive.support_access.propose': ADMIN_AND_DIRECTORS,
  'executive.security_settings.propose': ACCOUNT_MANAGERS,
  'executive.company_close.propose': LEADERS,
  'executive.safety_stop.read': AUDIT_READERS,
  // An independent safety/compliance authority owns this decision.
  'executive.safety_stop.override': new Set<ExecutiveCanonicalRole>(),
  'executive.board_reserved.approve': INDEPENDENT_APPROVERS,
}

const APPROVAL_ACTIONS = new Set<ExecutiveAction>([
  'executive.budget.approve',
  'executive.policy.approve',
  'executive.board_reserved.approve',
])

export type ExecutiveAuthorisationDecision = {
  allowed: boolean
  code:
    | 'allowed'
    | 'unknown_action'
    | 'executive_role_required'
    | 'permission_denied'
    | 'resource_scope_forbidden'
    | 'resource_context_required'
    | 'separation_of_duties_required'
    | 'independent_safety_authority_required'
  message: string
  canonicalRoles: ExecutiveCanonicalRole[]
}

function normalizeRole(value: string): string {
  return String(value ?? '').trim().toLowerCase()
}

export function canonicalExecutiveRoles(
  roleKeys: readonly string[],
): ExecutiveCanonicalRole[] {
  const roles = new Set<ExecutiveCanonicalRole>()
  for (const roleKey of roleKeys) {
    const canonical = ROLE_ALIASES[normalizeRole(roleKey)]
    if (canonical) roles.add(canonical)
  }
  return [...roles]
}

export function isExecutiveAction(value: string): value is ExecutiveAction {
  return (EXECUTIVE_ACTIONS as readonly string[]).includes(String(value ?? ''))
}

export function executiveCapabilitiesForRoles(
  roleKeys: readonly string[],
): ExecutiveAction[] {
  const roles = new Set(canonicalExecutiveRoles(roleKeys))
  return EXECUTIVE_ACTIONS.filter((action) =>
    [...roles].some((role) => ACTION_ROLES[action].has(role))
  )
}

export function decideExecutiveAuthorisation(input: {
  actorUserId: string
  roleKeys: readonly string[]
  action: string
  companyId: string
  resourceCompanyId: string
  resourceBranchId?: string | null
  resourceBranchBelongsToCompany?: boolean
  proposerUserId?: string | null
}): ExecutiveAuthorisationDecision {
  const canonicalRoles = canonicalExecutiveRoles(input.roleKeys)
  const deny = (
    code: Exclude<ExecutiveAuthorisationDecision['code'], 'allowed'>,
    message: string,
  ): ExecutiveAuthorisationDecision => ({
    allowed: false,
    code,
    message,
    canonicalRoles,
  })

  if (!isExecutiveAction(input.action)) {
    return deny('unknown_action', 'This Executive operation is not registered.')
  }
  if (!canonicalRoles.length) {
    return deny(
      'executive_role_required',
      'An approved Executive role is required for this operation.',
    )
  }
  if (
    !input.companyId ||
    !input.resourceCompanyId ||
    input.companyId !== input.resourceCompanyId
  ) {
    return deny(
      'resource_scope_forbidden',
      'The requested Executive resource is outside the active company.',
    )
  }
  if (
    input.resourceBranchId &&
    input.resourceBranchBelongsToCompany !== true
  ) {
    return deny(
      'resource_scope_forbidden',
      'The requested branch is outside the active company scope.',
    )
  }
  if (input.action === 'executive.safety_stop.override') {
    return deny(
      'independent_safety_authority_required',
      'Executive users cannot override an independent safety stop.',
    )
  }
  if (!canonicalRoles.some((role) => ACTION_ROLES[input.action].has(role))) {
    return deny(
      'permission_denied',
      'The Executive role does not permit this operation.',
    )
  }
  if (APPROVAL_ACTIONS.has(input.action)) {
    if (!input.proposerUserId) {
      return deny(
        'resource_context_required',
        'The proposal owner must be verified before approval.',
      )
    }
    if (input.proposerUserId === input.actorUserId) {
      return deny(
        'separation_of_duties_required',
        'A different authorised person must approve this proposal.',
      )
    }
  }

  return {
    allowed: true,
    code: 'allowed',
    message: 'Executive authorisation confirmed.',
    canonicalRoles,
  }
}
