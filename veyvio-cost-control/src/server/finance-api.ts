import type { CostControlStore } from '../data/seed'
import type { AuditEvent, ReviewDecision } from '../domain/review-actions'
import { applyReviewDecision } from '../domain/review-actions'
import { requireOrganisationId } from '../domain/tenancy'
import type { CostRecord, OrganisationId, ReviewItem } from '../domain/types'
import { assertFinancePermission } from './finance-permissions'
import { importCostCsvForPersist } from './finance-csv-import'
import { parseSimpleReviewDecision } from './finance-review-decision'

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

export type ReviewDecisionCommandResult = {
  review: ReviewItem
  cost: CostRecord
  audit: AuditEvent
}

export type CostCsvImportCommandResult = {
  summary: {
    accepted: number
    quarantined: number
    duplicatesSkipped: number
    rowsRead: number
    importRunId: string
    fileName: string
  }
  workspace: CostControlStore
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
  loadReviewCostPair(
    organisationId: OrganisationId,
    reviewId: string,
  ): Promise<{ review: ReviewItem; cost: CostRecord } | null>
  persistReviewDecision(input: {
    organisationId: OrganisationId
    actorId: string
    review: ReviewItem
    cost: CostRecord
    audit: AuditEvent
  }): Promise<void>
  listCostSourceKeys(organisationId: OrganisationId): Promise<string[]>
  getApprovedBudgetId(organisationId: OrganisationId): Promise<string>
  persistCostCsvImport(input: {
    organisationId: OrganisationId
    actorId: string
    fileName: string
    importRunId: string
    startedAt: string
    finishedAt: string
    result: ReturnType<typeof importCostCsvForPersist>
  }): Promise<void>
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

async function authenticate(
  request: Request,
  input: { auth: FinanceAuthVerifier; database: FinanceDatabase },
  action: 'workspace:read' | 'cost:approve' | 'cost:import',
): Promise<
  | { principal: AuthenticatedPrincipal; organisationId: OrganisationId; membership: FinanceMembership }
  | Response
> {
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
    assertFinancePermission(membership.role, action)
  } catch {
    return json(403, { error: 'finance_permission_denied' })
  }
  return { principal, organisationId, membership }
}

export function createFinanceApiHandler(input: {
  auth: FinanceAuthVerifier
  database: FinanceDatabase
}) {
  return async function handleFinanceRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/finance/workspace' && request.method === 'GET') {
      const authz = await authenticate(request, input, 'workspace:read')
      if (authz instanceof Response) return authz

      try {
        const workspace = await input.database.withOrganisationContext(
          { userSubject: authz.principal.userSubject, organisationId: authz.organisationId },
          () => input.database.loadWorkspace(authz.organisationId),
        )
        if (workspace.organisation.id !== authz.organisationId) {
          throw new Error('Finance database returned a cross-tenant workspace')
        }
        return json(200, workspace as unknown as Record<string, unknown>)
      } catch {
        return json(500, { error: 'finance_workspace_unavailable' })
      }
    }

    if (path === '/finance/imports/costs' && request.method === 'POST') {
      const authz = await authenticate(request, input, 'cost:import')
      if (authz instanceof Response) return authz

      let body: Record<string, unknown>
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        return json(400, { error: 'invalid_json' })
      }

      const fileName = String(body.fileName ?? '').trim() || 'costs.csv'
      const text = typeof body.text === 'string' ? body.text : ''
      if (!text.trim()) return json(400, { error: 'csv_text_required' })
      if (text.length > 2_000_000) return json(413, { error: 'csv_too_large' })

      try {
        const result = await input.database.withOrganisationContext(
          { userSubject: authz.principal.userSubject, organisationId: authz.organisationId },
          async () => {
            const existingKeys = await input.database.listCostSourceKeys(authz.organisationId)
            const budgetId = await input.database.getApprovedBudgetId(authz.organisationId)
            const startedAt = new Date().toISOString()
            const parsed = importCostCsvForPersist({
              organisationId: authz.organisationId,
              text,
              budgetId,
              existingSourceKeys: new Set(existingKeys),
              nowIso: startedAt,
            })
            if (parsed.rowsRead > 5000) {
              throw Object.assign(new Error('csv_too_many_rows'), { status: 413 })
            }
            const finishedAt = new Date().toISOString()
            const importRunId = crypto.randomUUID()
            await input.database.persistCostCsvImport({
              organisationId: authz.organisationId,
              actorId: authz.principal.userSubject,
              fileName,
              importRunId,
              startedAt,
              finishedAt,
              result: parsed,
            })
            const workspace = await input.database.loadWorkspace(authz.organisationId)
            return {
              summary: {
                accepted: parsed.accepted.length,
                quarantined: parsed.quarantined.length,
                duplicatesSkipped: parsed.duplicatesSkipped,
                rowsRead: parsed.rowsRead,
                importRunId,
                fileName,
              },
              workspace,
            } satisfies CostCsvImportCommandResult
          },
        )
        return json(200, result as unknown as Record<string, unknown>)
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status: number }).status)
            : 500
        const code = error instanceof Error ? error.message : 'import_failed'
        return json(status >= 400 && status < 600 ? status : 500, { error: code })
      }
    }

    const reviewMatch = /^\/finance\/reviews\/([^/]+)\/decision$/.exec(path)
    if (reviewMatch && request.method === 'POST') {
      const authz = await authenticate(request, input, 'cost:approve')
      if (authz instanceof Response) return authz
      const reviewId = decodeURIComponent(reviewMatch[1]!)

      let body: Record<string, unknown>
      try {
        body = (await request.json()) as Record<string, unknown>
      } catch {
        return json(400, { error: 'invalid_json' })
      }

      let decision: ReviewDecision
      try {
        if (
          body.decision &&
          typeof body.decision === 'object' &&
          ('allocations' in (body.decision as object) ||
            'evidenceLabel' in (body.decision as object))
        ) {
          throw new Error('allocations_or_evidence_not_supported_yet')
        }
        decision = parseSimpleReviewDecision(body.decision)
      } catch (error) {
        const code = error instanceof Error ? error.message : 'invalid_decision'
        return json(400, { error: code })
      }

      try {
        const result = await input.database.withOrganisationContext(
          { userSubject: authz.principal.userSubject, organisationId: authz.organisationId },
          async () => {
            const pair = await input.database.loadReviewCostPair(authz.organisationId, reviewId)
            if (!pair) throw Object.assign(new Error('review_not_found'), { status: 404 })

            const expectedVersion =
              body.expectedCostVersion != null ? Number(body.expectedCostVersion) : null
            if (expectedVersion != null && pair.cost.version !== expectedVersion) {
              throw Object.assign(new Error('cost_version_conflict'), { status: 409 })
            }

            const applied = applyReviewDecision({
              organisationId: authz.organisationId,
              review: pair.review,
              cost: pair.cost,
              decision,
              actorId: authz.principal.userSubject,
            })

            await input.database.persistReviewDecision({
              organisationId: authz.organisationId,
              actorId: authz.principal.userSubject,
              review: applied.review,
              cost: applied.cost,
              audit: applied.audit,
            })

            return {
              review: applied.review,
              cost: applied.cost,
              audit: applied.audit,
            } satisfies ReviewDecisionCommandResult
          },
        )
        return json(200, result as unknown as Record<string, unknown>)
      } catch (error) {
        const status =
          error && typeof error === 'object' && 'status' in error
            ? Number((error as { status: number }).status)
            : 400
        const code = error instanceof Error ? error.message : 'decision_failed'
        if (code === 'review_not_found') return json(404, { error: code })
        if (code === 'cost_version_conflict') return json(409, { error: code })
        if (code === 'Only open reviews can be decided (except evidence requests)') {
          return json(409, { error: 'review_not_open' })
        }
        return json(status >= 400 && status < 600 ? status : 400, { error: code })
      }
    }

    return json(404, { error: 'not_found' })
  }
}
