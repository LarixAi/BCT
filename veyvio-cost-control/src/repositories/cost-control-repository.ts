import type { CostControlStore } from '../data/seed'
import { createSeedStore } from '../data/seed'
import { assertSameOrganisation, requireOrganisationId } from '../domain/tenancy'
import type { OrganisationId } from '../domain/types'

export type FinanceSession = {
  accessToken: string
  userSubject: string
  activeOrganisationId: OrganisationId
}

export type CostControlRepository = {
  readonly mode: 'demo' | 'api'
  loadWorkspace(session: FinanceSession): Promise<CostControlStore>
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
  }
}

export function readFinanceRepositoryConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<
    string,
    string | undefined
  >,
): FinanceRepositoryConfig {
  const mode = env.VITE_FINANCE_DATA_MODE?.trim().toLowerCase() === 'api' ? 'api' : 'demo'
  return {
    mode,
    apiBaseUrl: env.VITE_FINANCE_API_URL?.trim() || null,
  }
}

export function resolveCostControlRepository(
  config: FinanceRepositoryConfig = readFinanceRepositoryConfig(),
): CostControlRepository {
  if (config.mode === 'demo') return createDemoCostControlRepository()
  if (!config.apiBaseUrl) {
    throw new Error('VITE_FINANCE_API_URL is required when VITE_FINANCE_DATA_MODE=api')
  }
  return createApiCostControlRepository({ apiBaseUrl: config.apiBaseUrl })
}

