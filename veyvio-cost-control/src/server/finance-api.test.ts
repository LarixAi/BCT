import { describe, expect, it, vi } from 'vitest'
import { createSeedStore } from '../data/seed'
import {
  createFinanceApiHandler,
  type FinanceAuthVerifier,
  type FinanceDatabase,
} from './finance-api'

function request(headers: Record<string, string> = {}) {
  return new Request('https://finance.example.test/finance/workspace', { headers })
}

function dependencies(input?: {
  validToken?: boolean
  membership?: boolean
  workspaceOrganisationId?: string
}) {
  const workspace = createSeedStore()
  workspace.organisation = {
    ...workspace.organisation,
    id: input?.workspaceOrganisationId ?? 'org-1',
  }
  const auth: FinanceAuthVerifier = {
    verifyBearerToken: vi.fn(async () =>
      input?.validToken === false ? null : { userSubject: 'user-1' },
    ),
  }
  const database: FinanceDatabase = {
    findMembership: vi.fn(async () =>
      input?.membership === false
        ? null
        : {
            organisationId: 'org-1',
            userSubject: 'user-1',
            role: 'finance_manager',
            active: true,
          },
    ),
    withOrganisationContext: vi.fn(async (_context, operation) => operation()),
    loadWorkspace: vi.fn(async () => workspace),
  }
  return { auth, database }
}

describe('authenticated Finance API', () => {
  it('requires a bearer token and active organisation', async () => {
    const deps = dependencies()
    const handle = createFinanceApiHandler(deps)
    expect((await handle(request())).status).toBe(401)
    expect(
      (
        await handle(
          request({
            Authorization: 'Bearer token',
          }),
        )
      ).status,
    ).toBe(400)
  })

  it('rejects invalid tokens and non-members', async () => {
    const invalid = createFinanceApiHandler(dependencies({ validToken: false }))
    expect(
      (
        await invalid(
          request({
            Authorization: 'Bearer bad',
            'X-Veyvio-Organisation-ID': 'org-1',
          }),
        )
      ).status,
    ).toBe(401)

    const denied = createFinanceApiHandler(dependencies({ membership: false }))
    expect(
      (
        await denied(
          request({
            Authorization: 'Bearer token',
            'X-Veyvio-Organisation-ID': 'org-1',
          }),
        )
      ).status,
    ).toBe(403)
  })

  it('loads the workspace inside attributable organisation context', async () => {
    const deps = dependencies()
    const handle = createFinanceApiHandler(deps)
    const response = await handle(
      request({
        Authorization: 'Bearer token',
        'X-Veyvio-Organisation-ID': 'org-1',
      }),
    )
    expect(response.status).toBe(200)
    expect(deps.database.withOrganisationContext).toHaveBeenCalledWith(
      { userSubject: 'user-1', organisationId: 'org-1' },
      expect.any(Function),
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('fails closed if the database returns another organisation', async () => {
    const handle = createFinanceApiHandler(
      dependencies({ workspaceOrganisationId: 'org-other' }),
    )
    const response = await handle(
      request({
        Authorization: 'Bearer token',
        'X-Veyvio-Organisation-ID': 'org-1',
      }),
    )
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'finance_workspace_unavailable',
    })
  })
})

