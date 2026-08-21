/**
 * Wave 3B — pure application-scope decision from explicit facts only.
 * Roles, company membership, and platform JWT never invent COMMAND/YARD/DRIVER/etc.
 */
import { normalizeAppType, type VeyvioAppType } from './account-authority.ts'
import type { ApplicationScope } from './application-scope-paths.ts'

export type ExplicitApplicationScopeInput = {
  platformRole?: string | null
  isSupportSession?: boolean
  companyId?: string | null
  membershipId?: string | null
  /** Active membership_application_access.app_type values only. */
  explicitAppTypes?: readonly string[] | null
  /**
   * Client-supplied application/scopes claims — always ignored.
   * Present only so call sites can prove forged payloads cannot grant access.
   */
  clientClaimedApps?: readonly string[] | null
}

/**
 * Decide protected app scopes from server facts.
 * - PLATFORM role → PLATFORM only (never auto COMMAND/YARD)
 * - Active support grant session → COMMAND + YARD (explicit support path)
 * - Otherwise → only active membership_application_access rows for this membership
 */
export function decideExplicitApplicationScopes(
  input: ExplicitApplicationScopeInput,
): Set<ApplicationScope> {
  const scopes = new Set<ApplicationScope>()

  // Forged client claims are never consulted.
  void input.clientClaimedApps

  if (input.platformRole) {
    scopes.add('PLATFORM')
  }

  if (input.isSupportSession) {
    scopes.add('COMMAND')
    scopes.add('YARD')
    return scopes
  }

  const companyId = String(input.companyId ?? '').trim()
  const membershipId = String(input.membershipId ?? '').trim()
  if (!companyId || !membershipId) {
    return scopes
  }

  for (const raw of input.explicitAppTypes ?? []) {
    const appType = normalizeAppType(String(raw ?? ''))
    if (appType) scopes.add(appType as ApplicationScope)
  }

  return scopes
}

/** Backfill mapping helper — migration/SQL authority only; not a runtime auth fallback. */
export function appsInferredFromRolesForBackfill(roleKeys: readonly string[]): Set<VeyvioAppType> {
  const apps = new Set<VeyvioAppType>()
  for (const rawRole of roleKeys) {
    const role = String(rawRole ?? '').trim().toLowerCase()
    if (role === 'company_owner' || role === 'company_administrator') {
      apps.add('EXECUTIVE')
      apps.add('COMMAND')
    }
    if (
      [
        'transport_manager',
        'operations_manager',
        'dispatcher',
        'compliance_manager',
        'safeguarding_lead',
        'read_only_auditor',
      ].includes(role)
    ) {
      apps.add('COMMAND')
    }
    if (
      [
        'finance_director',
        'finance_admin',
        'finance_manager',
        'finance_officer',
        'cost_approver',
        'payroll_cost_reviewer',
        'auditor',
        'board_reader',
      ].includes(role)
    ) {
      apps.add('FINANCE')
    }
    if (['hr_director', 'hr_manager', 'hr_officer', 'people_administrator'].includes(role)) {
      apps.add('HR')
    }
    if (['driver', 'escort'].includes(role)) apps.add('DRIVER')
    if (['yard_manager', 'yard_operative', 'contractor'].includes(role)) apps.add('YARD')
  }
  return apps
}
