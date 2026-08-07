import type { CostControlStore } from '../data/seed'
import { createSeedStore } from '../data/seed'
import type { AuditEvent, ReviewDecision } from '../domain/review-actions'
import type { PayrollSummaryImportResult } from '../domain/payroll-summary-import'
import { assertSameOrganisation, requireOrganisationId } from '../domain/tenancy'
import type { CostRecord, OrganisationId, ReviewItem } from '../domain/types'

export type FinanceSession = {
  accessToken: string
  userSubject: string
  activeOrganisationId: OrganisationId
}

export type ReviewDecisionApiResult = {
  review: ReviewItem
  cost: CostRecord | null
  audit: AuditEvent
}

export type CostCsvImportApiResult = {
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

export type PayrollSummaryImportApiResult = {
  summary: {
    matched: number
    unmatched: number
    variance: number
    quarantined: number
    exceptions: number
    importId: string
    fileName: string
  }
  result: PayrollSummaryImportResult
  workspace: CostControlStore
}

export type CostControlRepository = {
  readonly mode: 'demo' | 'api'
  loadWorkspace(session: FinanceSession): Promise<CostControlStore>
  resolveReviewDecision(
    session: FinanceSession,
    reviewId: string,
    decision: ReviewDecision,
    expectedCostVersion?: number,
  ): Promise<ReviewDecisionApiResult>
  importCostCsv(
    session: FinanceSession,
    input: { fileName: string; text: string },
  ): Promise<CostCsvImportApiResult>
  importPayrollSummary(
    session: FinanceSession,
    input: { fileName: string; text: string },
  ): Promise<PayrollSummaryImportApiResult>
}

export type FinanceRepositoryConfig = {
  mode: 'demo' | 'api'
  apiBaseUrl: string | null
}

function requireSession(session: FinanceSession): FinanceSession {
  requireOrganisationId(session.activeOrganisationId)
  if (!session.userSubject.trim()) throw new Error('Authenticated user subject is required')
  if (!session.accessToken.trim()) throw new Error('Finance API access token is required')
  return session
}

function unsupportedDemoMutation(): never {
  throw new Error('Demo repository does not persist review decisions; use CostStore local path')
}

export function createDemoCostControlRepository(): CostControlRepository {
  return {
    mode: 'demo',
    async loadWorkspace(session) {
      requireSession(session)
      const workspace = createSeedStore()
      assertSameOrganisation(
        session.activeOrganisationId,
        workspace.organisation.id,
        'finance workspace',
      )
      return workspace
    },
    async resolveReviewDecision() {
      unsupportedDemoMutation()
    },
    async importCostCsv() {
      unsupportedDemoMutation()
    },
    async importPayrollSummary() {
      unsupportedDemoMutation()
    },
  }
}

export function createApiCostControlRepository(input: {
  apiBaseUrl: string
  fetchImpl?: typeof fetch
}): CostControlRepository {
  const baseUrl = input.apiBaseUrl.trim().replace(/\/+$/, '')
  if (!baseUrl) throw new Error('Finance API base URL is required')
  const fetchImpl = input.fetchImpl ?? fetch

  return {
    mode: 'api',
    async loadWorkspace(session) {
      requireSession(session)
      const response = await fetchImpl(`${baseUrl}/finance/workspace`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'X-Veyvio-Organisation-ID': session.activeOrganisationId,
        },
      })
      if (!response.ok) {
        throw new Error(`Finance API workspace request failed (${response.status})`)
      }
      const workspace = (await response.json()) as CostControlStore
      if (!workspace?.organisation?.id) {
        throw new Error('Finance API returned an invalid workspace')
      }
      assertSameOrganisation(
        session.activeOrganisationId,
        workspace.organisation.id,
        'finance workspace',
      )
      return workspace
    },
    async resolveReviewDecision(session, reviewId, decision, expectedCostVersion) {
      requireSession(session)
      if (
        ('allocations' in decision && decision.allocations?.length) ||
        ('evidenceLabel' in decision && decision.evidenceLabel)
      ) {
        throw new Error(
          'Finance API does not yet persist reallocations or evidence attachments on review decisions',
        )
      }
      if (decision.type === 'reallocate') {
        throw new Error('Finance API does not yet persist reallocations on review decisions')
      }

      const response = await fetchImpl(
        `${baseUrl}/finance/reviews/${encodeURIComponent(reviewId)}/decision`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
            'X-Veyvio-Organisation-ID': session.activeOrganisationId,
          },
          body: JSON.stringify({
            decision,
            expectedCostVersion: expectedCostVersion ?? undefined,
          }),
        },
      )
      if (!response.ok) {
        let detail = `Finance API review decision failed (${response.status})`
        try {
          const payload = (await response.json()) as { error?: string }
          if (payload.error) detail = payload.error
        } catch {
          // keep status text
        }
        throw new Error(detail)
      }
      const result = (await response.json()) as ReviewDecisionApiResult
      if (!result?.review?.id) {
        throw new Error('Finance API returned an invalid review decision result')
      }
      assertSameOrganisation(
        session.activeOrganisationId,
        result.review.organisationId,
        'review decision',
      )
      if (result.cost) {
        assertSameOrganisation(
          session.activeOrganisationId,
          result.cost.organisationId,
          'review decision cost',
        )
      }
      return result
    },
    async importCostCsv(session, input) {
      requireSession(session)
      const response = await fetchImpl(`${baseUrl}/finance/imports/costs`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'X-Veyvio-Organisation-ID': session.activeOrganisationId,
        },
        body: JSON.stringify({
          fileName: input.fileName,
          text: input.text,
        }),
      })
      if (!response.ok) {
        let detail = `Finance API cost import failed (${response.status})`
        try {
          const payload = (await response.json()) as { error?: string }
          if (payload.error) detail = payload.error
        } catch {
          // keep status text
        }
        throw new Error(detail)
      }
      const result = (await response.json()) as CostCsvImportApiResult
      if (!result?.workspace?.organisation?.id || !result.summary) {
        throw new Error('Finance API returned an invalid cost import result')
      }
      assertSameOrganisation(
        session.activeOrganisationId,
        result.workspace.organisation.id,
        'cost import workspace',
      )
      return result
    },
    async importPayrollSummary(session, input) {
      requireSession(session)
      const response = await fetchImpl(`${baseUrl}/finance/imports/payroll-summary`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'X-Veyvio-Organisation-ID': session.activeOrganisationId,
        },
        body: JSON.stringify({
          fileName: input.fileName,
          text: input.text,
        }),
      })
      if (!response.ok) {
        let detail = `Finance API payroll summary import failed (${response.status})`
        try {
          const payload = (await response.json()) as { error?: string }
          if (payload.error) detail = payload.error
        } catch {
          // keep status text
        }
        throw new Error(detail)
      }
      const result = (await response.json()) as PayrollSummaryImportApiResult
      if (!result?.workspace?.organisation?.id || !result.summary || !result.result) {
        throw new Error('Finance API returned an invalid payroll summary import result')
      }
      assertSameOrganisation(
        session.activeOrganisationId,
        result.workspace.organisation.id,
        'payroll import workspace',
      )
      return result
    },
  }
}

export function readFinanceRepositoryConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<
    string,
    string | undefined
  >,
): FinanceRepositoryConfig {
  const raw = env.VITE_FINANCE_DATA_MODE?.trim().toLowerCase() ?? ''
  const isProd = env.PROD === 'true' || env.MODE === 'production'
  if (isProd && raw !== 'api') {
    throw new Error(
      'Cost Control production builds require VITE_FINANCE_DATA_MODE=api (demo data mode is not allowed).',
    )
  }
  const mode = raw === 'api' ? 'api' : 'demo'
  return {
    mode,
    apiBaseUrl: env.VITE_FINANCE_API_URL?.trim() || null,
  }
}

export function resolveCostControlRepository(
  config: FinanceRepositoryConfig = readFinanceRepositoryConfig(),
): CostControlRepository {
  if (config.mode === 'demo') {
    if (import.meta.env.PROD) {
      throw new Error('Cost Control production builds cannot use the demo finance repository.')
    }
    return createDemoCostControlRepository()
  }
  if (!config.apiBaseUrl) {
    throw new Error('VITE_FINANCE_API_URL is required when VITE_FINANCE_DATA_MODE=api')
  }
  return createApiCostControlRepository({ apiBaseUrl: config.apiBaseUrl })
}
