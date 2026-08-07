import { describe, expect, it, vi } from 'vitest'
import { createSageAdapter, type SageIntegrationConfig } from './adapter'
import { buildSageSupplierCostExport } from './types'

const session = {
  accessToken: 'finance-token',
  userSubject: 'finance-user-1',
  activeOrganisationId: 'org-1',
}

const config: SageIntegrationConfig = {
  mode: 'sandbox',
  productId: 'sage_accounting',
  tokenProxyBaseUrl: 'https://finance-api.example.test/',
  redirectUri: 'https://costs.example.test/settings?sage_callback=1',
  clientIdPublic: null,
}

describe('Sage server-proxy adapter', () => {
  it('fails closed while the Sage product is undecided', () => {
    expect(() =>
      createSageAdapter({ config: { ...config, productId: 'undecided' } }),
    ).toThrow(/accountant-approved Sage product/i)
  })

  it('fails closed without a server-side token proxy', () => {
    expect(() =>
      createSageAdapter({ config: { ...config, tokenProxyBaseUrl: null } }),
    ).toThrow(/token proxy URL/i)
  })

  it('sends organisation, bearer and idempotency controls through the proxy', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          exportId: 'export-1',
          idempotencyKey: 'veyvio|cost|cost-1|cost-control.sage-export.v1',
          status: 'queued',
          sageTransactionId: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const adapter = createSageAdapter({ config, fetchImpl })
    const payload = buildSageSupplierCostExport({
      veyvioCostId: 'cost-1',
      supplierName: 'Supplier',
      supplierInvoiceReference: 'INV-1',
      invoiceDate: '2026-07-20',
      accountingDate: '2026-07-20',
      netMinor: 10000,
      vatMinor: 2000,
      grossMinor: 12000,
      description: 'Approved cost',
    })

    await adapter.exportSupplierCost(session, payload)

    const [url, request] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe('https://finance-api.example.test/sage/exports/supplier-cost')
    expect(request?.headers).toMatchObject({
      Authorization: 'Bearer finance-token',
      'X-Veyvio-Organisation-ID': 'org-1',
      'X-Veyvio-Sage-Product': 'sage_accounting',
      'Idempotency-Key': payload.idempotencyKey,
    })
  })

  it('does not expose provider failure bodies to the browser error', async () => {
    const adapter = createSageAdapter({
      config,
      fetchImpl: async () =>
        new Response(JSON.stringify({ secret: 'provider-debug-payload' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    await expect(adapter.getMappings(session)).rejects.toThrow(
      'Sage proxy request failed (502)',
    )
  })
})

