/**
 * Yard permission matrix for Command hub projection (Blueprint F-11 / TD-008).
 * Wave 3D: authorize from the full role/permission set — never roleKeys[0].
 * Keep aligned with `src/types/permissions.ts` in Veyvio Yard.
 */
import { roleGrantsCommandScope } from './application-scope-paths.ts'
import { apiError } from './http.ts'
import type { WorkspaceAuthority } from './support-workspace.ts'

type Row = Record<string, unknown>

const YARD_OPERATIVE = [
  'vehicle.view',
  'vehicle.move',
  'check.complete',
  'equipment.assign',
  'equipment.transfer',
  'handover.complete',
  'plan.view',
] as const

const YARD_MANAGER = [
  'vehicle.view',
  'vehicle.move',
  'vehicle.mark_vor',
  'vehicle.release_vor',
  'check.complete',
  'check.spot_audit',
  'check.override',
  'defect.resolve',
  'equipment.assign',
  'equipment.transfer',
  'task.assign',
  'handover.complete',
  'incident.create',
  'audit.view',
  'plan.view',
  'plan.acknowledge',
] as const

const MAINTENANCE_USER = [
  'vehicle.view',
  'vehicle.mark_vor',
  'vehicle.release_vor',
  'check.complete',
  'defect.resolve',
  'equipment.assign',
  'audit.view',
  'plan.view',
] as const

const OPERATIONS_MANAGER = [...YARD_MANAGER] as const

const COMPANY_ADMIN = [...YARD_MANAGER, 'equipment.write_off'] as const

const READ_ONLY = ['vehicle.view', 'audit.view', 'plan.view'] as const

const YARD_ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  yard_operative: YARD_OPERATIVE,
  yard_manager: YARD_MANAGER,
  contractor: YARD_OPERATIVE,
  maintenance_user: MAINTENANCE_USER,
  operations_manager: OPERATIONS_MANAGER,
  company_administrator: COMPANY_ADMIN,
  company_owner: COMPANY_ADMIN,
  transport_manager: OPERATIONS_MANAGER,
  dispatcher: OPERATIONS_MANAGER,
  compliance_manager: READ_ONLY,
  safeguarding_lead: READ_ONLY,
  read_only_auditor: READ_ONLY,
  /** Support workspace uses dedicated support authority, not membership roles. */
  support: YARD_MANAGER,
}

/** Single-role matrix lookup. Unknown / non-Yard roles grant nothing (deny-by-default). */
export function yardPermissionsForRole(roleKey: string): string[] {
  const key = String(roleKey ?? '').trim()
  if (!key) return []
  const direct = YARD_ROLE_PERMISSIONS[key]
  if (direct) return [...direct]
  if (roleGrantsCommandScope(key)) return [...YARD_MANAGER]
  return []
}

/**
 * Union of Yard matrix grants across all authoritative role keys.
 * Order of `roleKeys` must not change the result. Restrictive roles do not
 * remove grants from another authorized role (grant union / OR).
 */
export function yardPermissionsForRoles(
  roleKeys: readonly string[],
  explicitPermissions: readonly string[] = [],
): string[] {
  const granted = new Set<string>()
  for (const roleKey of roleKeys) {
    for (const permission of yardPermissionsForRole(roleKey)) {
      granted.add(permission)
    }
  }
  for (const permission of explicitPermissions) {
    const code = String(permission ?? '').trim()
    if (code) granted.add(code)
  }
  return [...granted].sort()
}

export function yardPermissionForMutationType(type: string, payload: Row = {}): string | null {
  void payload
  switch (String(type ?? '')) {
    case 'vehicle.move':
      return 'vehicle.move'
    case 'check.complete':
      return 'check.complete'
    case 'task.create':
      return 'task.assign'
    case 'task.update':
      return 'task.assign'
    case 'inspection.start':
    case 'inspection.media':
    case 'inspection.complete':
      return 'check.complete'
    case 'inspection.approve':
      return 'check.override'
    case 'damage.report':
      return 'incident.create'
    case 'damage.review':
    case 'repair.request':
      return 'defect.resolve'
    case 'vehicle.mark_vor':
      return 'vehicle.mark_vor'
    case 'vehicle.release_vor':
      return 'vehicle.release_vor'
    case 'defect.create':
      return 'incident.create'
    case 'defect.resolve':
    case 'repair.start':
    case 'repair.complete':
    case 'repair.verify':
      return 'defect.resolve'
    case 'equipment.assign':
    case 'equipment.restock':
      return 'equipment.assign'
    case 'equipment.transfer':
      return 'equipment.transfer'
    case 'plan.acknowledge':
    case 'departure.release':
    case 'departure.complete':
      return 'plan.acknowledge'
    case 'handover.complete':
      return 'handover.complete'
    default:
      return null
  }
}

function toScopeSet(scopes: ReadonlySet<string> | readonly string[]): Set<string> {
  return scopes instanceof Set ? new Set(scopes) : new Set(scopes)
}

function hasYardApplicationAccess(scopes: ReadonlySet<string>): boolean {
  return scopes.has('YARD') || scopes.has('COMMAND')
}

export type DecideYardActionAuthorizationInput = {
  workspaceAuthority: WorkspaceAuthority
  /** Server-derived role keys only. Never pass client-claimed role arrays here. */
  roleKeys: readonly string[]
  /** Membership / session explicit permission codes (already deny-filtered). */
  explicitPermissions?: readonly string[]
  /** Wave 3B application scopes — role grants never invent YARD/COMMAND access. */
  applicationScopes: ReadonlySet<string> | readonly string[]
  requiredPermission: string
  /**
   * Intentionally ignored. Present so callers/tests prove forged client roles
   * cannot influence the decision.
   */
  clientClaimedRoleKeys?: readonly string[] | null
}

export type YardAuthorizationDenialReason =
  | 'no_workspace'
  | 'missing_application_scope'
  | 'missing_permission'

export type DecideYardActionAuthorizationResult =
  | {
      allowed: true
      reason: 'allowed'
      effectivePermissions: string[]
      authoritativeRoleKeys: string[]
    }
  | {
      allowed: false
      reason: YardAuthorizationDenialReason
      effectivePermissions: string[]
      authoritativeRoleKeys: string[]
    }

/**
 * Production Yard authorization decision (Wave 3D).
 *
 * - Evaluates the full role set + explicit permissions (order-independent union).
 * - Requires explicit YARD or COMMAND application access (Wave 3B).
 * - Support workspace uses support policy only (`support` role), not membership roles.
 * - Client-claimed role arrays are ignored.
 */
export function decideYardActionAuthorization(
  input: DecideYardActionAuthorizationInput,
): DecideYardActionAuthorizationResult {
  void input.clientClaimedRoleKeys

  if (input.workspaceAuthority === 'none') {
    return {
      allowed: false,
      reason: 'no_workspace',
      effectivePermissions: [],
      authoritativeRoleKeys: [],
    }
  }

  const scopes = toScopeSet(input.applicationScopes)
  const authoritativeRoleKeys =
    input.workspaceAuthority === 'support'
      ? ['support']
      : [...input.roleKeys].map((key) => String(key ?? '').trim()).filter(Boolean)

  if (!hasYardApplicationAccess(scopes)) {
    return {
      allowed: false,
      reason: 'missing_application_scope',
      effectivePermissions: [],
      authoritativeRoleKeys,
    }
  }

  const effectivePermissions = yardPermissionsForRoles(
    authoritativeRoleKeys,
    input.explicitPermissions ?? [],
  )
  const required = String(input.requiredPermission ?? '').trim()
  if (!required || !effectivePermissions.includes(required)) {
    return {
      allowed: false,
      reason: 'missing_permission',
      effectivePermissions,
      authoritativeRoleKeys,
    }
  }

  return {
    allowed: true,
    reason: 'allowed',
    effectivePermissions,
    authoritativeRoleKeys,
  }
}

/** Hub / projection: effective Yard permissions for the authenticated workspace. */
export function resolveYardEffectivePermissions(input: {
  workspaceAuthority: WorkspaceAuthority
  roleKeys: readonly string[]
  explicitPermissions?: readonly string[]
}): string[] {
  const authoritativeRoleKeys =
    input.workspaceAuthority === 'support'
      ? ['support']
      : [...input.roleKeys].map((key) => String(key ?? '').trim()).filter(Boolean)
  return yardPermissionsForRoles(authoritativeRoleKeys, input.explicitPermissions ?? [])
}

export function yardPermissionDeniedResponse(
  decision: DecideYardActionAuthorizationResult,
  permission: string,
) {
  if (decision.allowed) return null

  if (decision.reason === 'missing_application_scope') {
    return apiError(
      403,
      'An active YARD or COMMAND application grant is required for this yard action.',
      'explicit_application_access_required',
    )
  }

  if (decision.reason === 'no_workspace') {
    return apiError(403, 'No active yard workspace', 'yard_workspace_required')
  }

  return apiError(
    403,
    `You do not have permission for this yard action (${permission.replace('.', ' ')})`,
    'yard_permission_denied',
  )
}
