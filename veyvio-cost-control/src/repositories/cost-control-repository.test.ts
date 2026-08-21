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

  it('rejects demo data mode for production env configs', async () => {
    const { readFinanceRepositoryConfig } = await import('./cost-control-repository')
    expect(() =>
      readFinanceRepositoryConfig({
        PROD: true,
        MODE: 'production',
        VITE_FINANCE_DATA_MODE: 'demo',
      }),
    ).toThrow(/VITE_FINANCE_DATA_MODE=api/)
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

  it('posts authenticated review decisions to the Finance API', async () => {
    const workspace = createSeedStore()
    const review = workspace.reviews.find((r) => r.state === 'open') ?? workspace.reviews[0]!
    const cost = workspace.costs.find((c) => c.id === review.costId)!
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          review: { ...review, state: 'approved', organisationId: session.activeOrganisationId },
          cost: { ...cost, reviewState: 'approved', organisationId: session.activeOrganisationId },
          audit: {
            id: 'audit-1',
            organisationId: session.activeOrganisationId,
            actorId: session.userSubject,
            action: 'review.approve',
            entityType: 'review_item',
            entityId: review.id,
            reason: 'Approved',
            beforeState: {},
            afterState: {},
            createdAt: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl,
    })

    await repository.resolveReviewDecision(session, review.id, { type: 'approve' }, cost.version)

    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, request] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe(
      `https://finance.example.test/finance/reviews/${encodeURIComponent(review.id)}/decision`,
    )
    expect(request?.method).toBe('POST')
    expect(request?.headers).toMatchObject({
      Authorization: 'Bearer test-token',
      'X-Veyvio-Organisation-ID': 'org_demo_cec',
    })
  })

  it('posts authenticated cost CSV imports to the Finance API', async () => {
    const workspace = createSeedStore()
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          summary: {
            accepted: 1,
            quarantined: 0,
            duplicatesSkipped: 0,
            rowsRead: 1,
            importRunId: 'run-1',
            fileName: 'costs.csv',
          },
          workspace,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl,
    })

    const result = await repository.importCostCsv(session, {
      fileName: 'costs.csv',
      text: 'date,supplier,description,category,net\n2026-08-07,A,B,fuel,1.00',
    })

    expect(result.summary.accepted).toBe(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, request] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://finance.example.test/finance/imports/costs')
    expect(request?.method).toBe('POST')
  })

  it('posts authenticated payroll summary imports to the Finance API', async () => {
    const workspace = createSeedStore()
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          summary: {
            matched: 1,
            unmatched: 0,
            variance: 0,
            quarantined: 0,
            exceptions: 0,
            importId: 'imp-1',
            fileName: 'payroll.csv',
          },
          result: {
            stage: 'pre_payroll',
            rowsRead: 1,
            matched: [],
            quarantined: [],
            exceptions: [],
            reviews: [],
            rolledUp: null,
            totals: {
              importedEmployerCostMinor: 0,
              expectedEmployerCostMinor: 0,
              varianceMinor: 0,
              matchedCount: 1,
              unmatchedCount: 0,
              varianceCount: 0,
            },
          },
          workspace,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl,
    })

    const result = await repository.importPayrollSummary(session, {
      fileName: 'payroll.csv',
      text: 'external_payroll_id,basic_pay\nPRV-1,10.00',
    })

    expect(result.summary.matched).toBe(1)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://finance.example.test/finance/imports/payroll-summary',
    )
  })

  it('posts authenticated employee cost-reference upserts', async () => {
    const workspace = createSeedStore()
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ upserted: 1, workspace }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl,
    })

    const result = await repository.upsertEmployeeCostReferences(session, [
      { externalPayrollId: 'PRV-1', displayName: 'Alex', expectedEmployerCostMinor: 1000 },
    ])

    expect(result.upserted).toBe(1)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://finance.example.test/finance/employee-cost-references/upsert',
    )
  })

  it('posts authenticated wage batch ensure / advance / adjust / clear-dispute', async () => {
    const workspace = createSeedStore()
    const batch = workspace.wageBatches?.[0] ?? {
      id: 'wb_1',
      organisationId: workspace.organisation.id,
      status: 'draft',
    }
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/finance/wage-batches/ensure')) {
        return new Response(JSON.stringify({ batch, workspace }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/advance')) {
        return new Response(
          JSON.stringify({ batch: { ...batch, status: 'validated' }, workspace }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url.includes('/adjustments')) {
        return new Response(JSON.stringify({ batch, workspace }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/clear-dispute')) {
        return new Response(JSON.stringify({ workspace }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 })
    })
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl,
    })

    await repository.ensureWageBatch(session)
    await repository.advanceWageBatch(session, 'wb_1')
    await repository.addWageAdjustment(session, {
      batchId: 'wb_1',
      employeeCostReferenceId: 'ecr_1',
      reason: 'Correction',
      grossDeltaMinor: -100,
    })
    await repository.clearDriverDayDispute(session, 'dd_1')

    const urls = fetchImpl.mock.calls.map((call) => String(call[0]))
    expect(urls).toEqual([
      'https://finance.example.test/finance/wage-batches/ensure',
      'https://finance.example.test/finance/wage-batches/wb_1/advance',
      'https://finance.example.test/finance/wage-batches/wb_1/adjustments',
      'https://finance.example.test/finance/driver-days/dd_1/clear-dispute',
    ])
  })

  it('posts authenticated driver-hours import', async () => {
    const workspace = createSeedStore()
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          summary: {
            accepted: 2,
            ratesAccepted: 1,
            quarantined: 0,
            rowsRead: 2,
            unmatchedExternalIds: [],
            fileName: 'hours.csv',
            batchStatus: 'validated',
          },
          workspace,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const repository = createApiCostControlRepository({
      apiBaseUrl: 'https://finance.example.test',
      fetchImpl,
    })

    const result = await repository.importDriverHours(session, {
      fileName: 'hours.csv',
      text: 'external_payroll_id,work_date,basic_hours\nPRV-1,2026-07-01,8.00\n',
    })

    expect(result.summary.accepted).toBe(2)
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      'https://finance.example.test/finance/imports/driver-hours',
    )
  })
})

