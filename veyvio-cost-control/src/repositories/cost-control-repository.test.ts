import { describe, expect, it, vi } from 'vitest'
import { createSeedStore } from '../data/seed'
import {
  createApiCostControlRepository,
  createDemoCostControlRepository,
  resolveCostControlRepository,
} from './cost-control-repository'

const session = {
  accessToken: 'test-token',
  userSubject: 'finance-user-1',
  activeOrganisationId: 'org_demo_cec',
}

describe('cost control repositories', () => {
  it('loads the explicitly selected demo workspace', async () => {
    const repository = createDemoCostControlRepository()
    const workspace = await repository.loadWorkspace(session)
    expect(repository.mode).toBe('demo')
    expect(workspace.organisation.id).toBe(session.activeOrganisationId)
  })

  it('fails closed when API mode has no base URL', () => {
    expect(() =>
      resolveCostControlRepository({ mode: 'api', apiBaseUrl: null }),
    ).toThrow(/VITE_FINANCE_API_URL/)
  })

  it('sends authenticated organisation context to the Finance API', async () => {
    const workspace = createSeedStore()
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(workspace), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test/',
      fetchImpl,
    })

    await repository.loadWorkspace(session)

    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, request] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://finance.example.test/finance/workspace')
    expect(request?.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'X-Veyvio-Organisation-ID': 'org_demo_cec',
    })
  })

  it('blocks a workspace returned for another organisation', async () => {
    const workspace = createSeedStore()
    workspace.organisation = { ...workspace.organisation, id: 'org-other' }
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl: async () =>
        new Response(JSON.stringify(workspace), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    await expect(repository.loadWorkspace(session)).rejects.toThrow(/cross-tenant/i)
  })
})

