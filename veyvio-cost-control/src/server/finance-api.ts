import type { CostControlStore } from '../data/seed'
import { requireOrganisationId } from '../domain/tenancy'
import type { OrganisationId } from '../domain/types'
import { assertFinancePermission } from './finance-permissions'

export type FinanceRole =
  | 'finance_director'
  | 'finance_admin'
  | 'finance_manager'
  | 'finance_officer'
  | 'cost_approver'
  | 'payroll_cost_reviewer'
  | 'auditor'
  | 'board_reader'

export type AuthenticatedPrincipal = {
  userSubject: string
}

export type FinanceMembership = {
  organisationId: OrganisationId
  userSubject: string
  role: FinanceRole
  active: boolean
}

export type FinanceAuthVerifier = {
  verifyBearerToken(token: string): Promise<AuthenticatedPrincipal | null>
}

/**
 * The concrete Postgres adapter must:
 * 1. begin a transaction;
 * 2. verify membership using a privileged membership lookup;
 * 3. SET LOCAL app.active_organisation_id and app.user_subject;
 * 4. run the callback through an RLS-constrained database client;
 * 5. commit or roll back.
 */
export type FinanceDatabase = {
  findMembership(
    userSubject: string,
    organisationId: OrganisationId,
  ): Promise<FinanceMembership | null>
  withOrganisationContext<T>(
    context: { userSubject: string; organisationId: OrganisationId },
    operation: () => Promise<T>,
  ): Promise<T>
  loadWorkspace(organisationId: OrganisationId): Promise<CostControlStore>
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() || null
}

function organisationHeader(request: Request): OrganisationId | null {
  const value = request.headers.get('X-Veyvio-Organisation-ID')?.trim()
  return value ? value : null
}

export function createFinanceApiHandler(input: {
  auth: FinanceAuthVerifier
  database: FinanceDatabase
}) {
  return async function handleFinanceRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname !== '/finance/workspace' || request.method !== 'GET') {
      return json(404, { error: 'not_found' })
    }

    const token = bearerToken(request)
    if (!token) return json(401, { error: 'authentication_required' })

    const principal = await input.auth.verifyBearerToken(token)
    if (!principal?.userSubject.trim()) {
      return json(401, { error: 'invalid_or_expired_token' })
    }

    const organisationId = organisationHeader(request)
    if (!organisationId) {
      return json(400, { error: 'active_organisation_required' })
    }
    requireOrganisationId(organisationId)

    const membership = await input.database.findMembership(
      principal.userSubject,
      organisationId,
    )
    if (
      !membership?.active ||
      membership.userSubject !== principal.userSubject ||
      membership.organisationId !== organisationId
    ) {
      return json(403, { error: 'organisation_access_denied' })
    }
    try {
      assertFinancePermission(membership.role, 'workspace:read')
    } catch {
      return json(403, { error: 'finance_permission_denied' })
    }

    try {
      const workspace = await input.database.withOrganisationContext(
        { userSubject: principal.userSubject, organisationId },
        () => input.database.loadWorkspace(organisationId),
      )
      if (workspace.organisation.id !== organisationId) {
        throw new Error('Finance database returned a cross-tenant workspace')
      }
      return json(200, workspace as unknown as Record<string, unknown>)
    } catch {
      return json(500, { error: 'finance_workspace_unavailable' })
    }
  }
}
