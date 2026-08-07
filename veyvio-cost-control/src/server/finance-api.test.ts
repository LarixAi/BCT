import { describe, expect, it, vi } from 'vitest'
import { createSeedStore } from '../data/seed'
import {
  createFinanceApiHandler,
  type FinanceAuthVerifier,
  type FinanceDatabase,
} from './finance-api'

function workspaceRequest(headers: Record<string, string> = {}) {
  return new Request('https://finance.example.test/finance/workspace', { headers })
}

function decisionRequest(
  reviewId: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`https://finance.example.test/finance/reviews/${reviewId}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function dependencies(input?: {
  validToken?: boolean
  membership?: boolean
  workspaceOrganisationId?: string
  role?: 'finance_manager' | 'board_reader'
}) {
  const workspace = createSeedStore()
  workspace.organisation = {
    ...workspace.organisation,
    id: input?.workspaceOrganisationId ?? 'org-1',
  }
  const openReview = workspace.reviews.find((r) => r.state === 'open') ?? workspace.reviews[0]!
  const openCost = workspace.costs.find((c) => c.id === openReview.costId)!

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
            role: input?.role ?? 'finance_manager',
            active: true,
          },
    ),
    withOrganisationContext: vi.fn(async (_context, operation) => operation()),
    loadWorkspace: vi.fn(async () => workspace),
    loadReviewCostPair: vi.fn(async () => ({
      review: { ...openReview, organisationId: 'org-1' },
      cost: { ...openCost, organisationId: 'org-1' },
    })),
    persistReviewDecision: vi.fn(async () => undefined),
    listCostSourceKeys: vi.fn(async () => workspace.costs.map((c) => c.sourceKey)),
    getApprovedBudgetId: vi.fn(async () => workspace.budget.id),
    persistCostCsvImport: vi.fn(async () => undefined),
  }
  return { auth, database, openReview, openCost, workspace }
}

describe('authenticated Finance API', () => {
  it('requires a bearer token and active organisation', async () => {
    const deps = dependencies()
    const handle = createFinanceApiHandler(deps)
    expect((await handle(workspaceRequest())).status).toBe(401)
    expect(
      (
        await handle(
          workspaceRequest({
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
          workspaceRequest({
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
          workspaceRequest({
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
      workspaceRequest({
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
      workspaceRequest({
        Authorization: 'Bearer token',
        'X-Veyvio-Organisation-ID': 'org-1',
      }),
    )
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: 'finance_workspace_unavailable',
    })
  })

  it('persists an approve review decision', async () => {
    const deps = dependencies()
    const handle = createFinanceApiHandler(deps)
    const response = await handle(
      decisionRequest(
        deps.openReview.id,
        { decision: { type: 'approve' }, expectedCostVersion: deps.openCost.version },
        {
          Authorization: 'Bearer token',
          'X-Veyvio-Organisation-ID': 'org-1',
        },
      ),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.review.state).toBe('approved')
    expect(deps.database.persistReviewDecision).toHaveBeenCalledOnce()
  })

  it('denies review decisions for read-only finance roles', async () => {
    const deps = dependencies({ role: 'board_reader' })
    const handle = createFinanceApiHandler(deps)
    const response = await handle(
      decisionRequest(
        deps.openReview.id,
        { decision: { type: 'approve' } },
        {
          Authorization: 'Bearer token',
          'X-Veyvio-Organisation-ID': 'org-1',
        },
      ),
    )
    expect(response.status).toBe(403)
    expect(deps.database.persistReviewDecision).not.toHaveBeenCalled()
  })

  it('persists a cost CSV import and returns the refreshed workspace', async () => {
    const deps = dependencies()
    const handle = createFinanceApiHandler(deps)
    const csv = `date,supplier,description,reference,category,status,net,vat,gross,evidence,source_key
2026-08-07,Shell,Fuel,SH-100,fuel,actual,10.00,2.00,12.00,receipt.pdf,shell|SH-100
2026-08-07,Bad,,,fuel,actual,1.00,0.20,1.20,,bad|row
`
    const response = await handle(
      new Request('https://finance.example.test/finance/imports/costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
          'X-Veyvio-Organisation-ID': 'org-1',
        },
        body: JSON.stringify({ fileName: 'costs.csv', text: csv }),
      }),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.summary.accepted).toBe(1)
    expect(body.summary.quarantined).toBe(1)
    expect(deps.database.persistCostCsvImport).toHaveBeenCalledOnce()
    expect(body.workspace.organisation.id).toBe('org-1')
  })
})
