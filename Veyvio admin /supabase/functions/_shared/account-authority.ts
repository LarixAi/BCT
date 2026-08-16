/**
 * Veyvio company-account authority.
 *
 * One identity may belong to several applications, but account creation follows
 * the company reporting line:
 *   Executive (company admins) -> Executive, Command, Finance, HR
 *   Command (ops managers)     -> Driver, Yard
 *
 * From the Executive app UI, department invites are limited to Command, Finance
 * and HR. Driver and Yard accounts are created in Command only.
 *
 * Finance, HR, Driver and Yard accounts never create users outside their own
 * accountable workflow. All decisions are enforced again at the API boundary.
 */

export const VEYVIO_APP_TYPES = [
  'EXECUTIVE',
  'COMMAND',
  'FINANCE',
  'HR',
  'DRIVER',
  'YARD',
] as const

export type VeyvioAppType = (typeof VEYVIO_APP_TYPES)[number]

export const EXECUTIVE_ACCOUNT_ROLES = new Set([
  'company_administrator',
  'director',
  'executive_reader',
  'board_member',
])

export const COMMAND_ACCOUNT_ROLES = new Set([
  'transport_manager',
  'operations_manager',
  'dispatcher',
  'compliance_manager',
  'safeguarding_lead',
  'read_only_auditor',
])

export const FINANCE_ACCOUNT_ROLES = new Set([
  'finance_director',
  'finance_admin',
  'finance_manager',
  'finance_officer',
  'cost_approver',
  'payroll_cost_reviewer',
  'auditor',
  'board_reader',
])

export const HR_ACCOUNT_ROLES = new Set([
  'hr_director',
  'hr_manager',
  'hr_officer',
  'people_administrator',
])

export const DRIVER_ACCOUNT_ROLES = new Set(['driver', 'escort'])
export const YARD_ACCOUNT_ROLES = new Set(['yard_manager', 'yard_operative', 'contractor'])

const ALLOWED_ROLES_BY_APP: Record<VeyvioAppType, Set<string>> = {
  EXECUTIVE: EXECUTIVE_ACCOUNT_ROLES,
  COMMAND: COMMAND_ACCOUNT_ROLES,
  FINANCE: FINANCE_ACCOUNT_ROLES,
  HR: HR_ACCOUNT_ROLES,
  DRIVER: DRIVER_ACCOUNT_ROLES,
  YARD: YARD_ACCOUNT_ROLES,
}

const EXECUTIVE_INVITERS = new Set(['company_owner', 'company_administrator'])
const COMMAND_OPERATIONAL_INVITERS = new Set(['transport_manager', 'operations_manager'])

/** Apps that Executive company admins may invite into from the Executive app. */
export const EXECUTIVE_DEPARTMENT_INVITE_APPS = [
  'COMMAND',
  'FINANCE',
  'HR',
] as const

export type ExecutiveDepartmentInviteApp =
  (typeof EXECUTIVE_DEPARTMENT_INVITE_APPS)[number]

export function isExecutiveDepartmentInviteApp(
  appType: string,
): appType is ExecutiveDepartmentInviteApp {
  return (EXECUTIVE_DEPARTMENT_INVITE_APPS as readonly string[]).includes(
    normalizeAppType(appType) ?? '',
  )
}

export type InvitationAuthorityDecision = {
  allowed: boolean
  code:
    | 'allowed'
    | 'unknown_application'
    | 'role_not_valid_for_application'
    | 'executive_authority_required'
    | 'command_authority_required'
    | 'executive_invite_app_forbidden'
  message: string
}

export function normalizeRoleKey(role: string): string {
  return String(role ?? '').trim().toLowerCase()
}

export function normalizeAppType(appType: string): VeyvioAppType | null {
  const normalized = String(appType ?? '').trim().toUpperCase()
  return (VEYVIO_APP_TYPES as readonly string[]).includes(normalized)
    ? normalized as VeyvioAppType
    : null
}

export function rolesAllowedForApp(appType: VeyvioAppType): readonly string[] {
  return [...ALLOWED_ROLES_BY_APP[appType]]
}

export function roleBelongsToApp(roleKey: string, appType: VeyvioAppType): boolean {
  return ALLOWED_ROLES_BY_APP[appType].has(normalizeRoleKey(roleKey))
}

export function decideInvitationAuthority(input: {
  actorRoleKeys: readonly string[]
  targetAppType: string
  targetRoleKeys: readonly string[]
  /** When set to EXECUTIVE, department invites are limited to Command/Finance/HR. */
  sourceApp?: string | null
}): InvitationAuthorityDecision {
  const appType = normalizeAppType(input.targetAppType)
  if (!appType) {
    return {
      allowed: false,
      code: 'unknown_application',
      message: 'The requested Veyvio application is not recognised.',
    }
  }

  const actorRoles = new Set(input.actorRoleKeys.map(normalizeRoleKey))
  const targetRoles = input.targetRoleKeys.map(normalizeRoleKey)
  if (!targetRoles.length || targetRoles.some((role) => !roleBelongsToApp(role, appType))) {
    return {
      allowed: false,
      code: 'role_not_valid_for_application',
      message: `The selected role does not belong to Veyvio ${appType}.`,
    }
  }

  const sourceApp = normalizeAppType(String(input.sourceApp ?? ''))
  if (sourceApp === 'EXECUTIVE' && appType !== 'EXECUTIVE') {
    if (!isExecutiveDepartmentInviteApp(appType)) {
      return {
        allowed: false,
        code: 'executive_invite_app_forbidden',
        message:
          'From Executive you can only invite people to Command, Finance or HR. Driver and Yard accounts are created in Command.',
      }
    }
  }

  if (['EXECUTIVE', 'COMMAND', 'FINANCE', 'HR'].includes(appType)) {
    if ([...actorRoles].some((role) => EXECUTIVE_INVITERS.has(role))) {
      return { allowed: true, code: 'allowed', message: 'Executive authority confirmed.' }
    }
    return {
      allowed: false,
      code: 'executive_authority_required',
      message: 'Only an Executive company administrator may create this account.',
    }
  }

  if ([...actorRoles].some((role) => COMMAND_OPERATIONAL_INVITERS.has(role))) {
    return { allowed: true, code: 'allowed', message: 'Command authority confirmed.' }
  }

  return {
    allowed: false,
    code: 'command_authority_required',
    message: 'Only an authorised Command transport or operations manager may create Driver or Yard accounts.',
  }
}

/**
 * Historical role → app mapping used only for one-time backfill migrations.
 * Runtime authorization must use membership_application_access via
 * decideExplicitApplicationScopes — never this helper.
 *
 * @deprecated Runtime auth fallback removed in Wave 3B.
 */
export function legacyApplicationsForRoles(roleKeys: readonly string[]): Set<VeyvioAppType> {
  return appsInferredFromRolesForBackfillCompat(roleKeys)
}

function appsInferredFromRolesForBackfillCompat(roleKeys: readonly string[]): Set<VeyvioAppType> {
  const apps = new Set<VeyvioAppType>()
  for (const rawRole of roleKeys) {
    const role = normalizeRoleKey(rawRole)
    if (role === 'company_owner' || role === 'company_administrator') {
      apps.add('EXECUTIVE')
      apps.add('COMMAND')
    }
    if (COMMAND_ACCOUNT_ROLES.has(role)) apps.add('COMMAND')
    if (FINANCE_ACCOUNT_ROLES.has(role)) apps.add('FINANCE')
    if (HR_ACCOUNT_ROLES.has(role)) apps.add('HR')
    if (DRIVER_ACCOUNT_ROLES.has(role)) apps.add('DRIVER')
    if (YARD_ACCOUNT_ROLES.has(role)) apps.add('YARD')
  }
  return apps
}

export function sourceAppFor(appType: VeyvioAppType): VeyvioAppType {
  return appType
}
