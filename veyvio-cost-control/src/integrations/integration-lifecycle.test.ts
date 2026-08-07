import { describe, expect, it } from 'vitest'
import {
  acceptIntegrationAttempt,
  assertUniqueIdempotencyKey,
  createIntegrationExport,
  failIntegrationAttempt,
  startIntegrationAttempt,
} from './integration-lifecycle'

function supplierExport(id = 'export-1', organisationId = 'org-1') {
  return createIntegrationExport({
    id,
    organisationId,
    destination: 'sage',
    payloadKind: 'supplier_cost',
    entityId: 'cost-1',
    idempotencyKey: 'veyvio|cost|cost-1|v1',
    payloadVersion: 'v1',
    payload: { grossMinor: 12000 },
    createdBy: 'finance-user-1',
    nowIso: '2026-07-29T10:00:00.000Z',
  })
}

describe('integration export lifecycle', () => {
  it('creates an immutable, queued export', () => {
    const item = supplierExport()
    expect(item.status).toBe('queued')
    expect(item.retryCount).toBe(0)
    expect(Object.isFrozen(item.payload)).toBe(true)
  })

  it('blocks duplicate idempotency keys within one organisation and destination', () => {
    const existing = supplierExport()
    const duplicate = supplierExport('export-2')
    expect(() => assertUniqueIdempotencyKey([existing], duplicate)).toThrow(/duplicate/i)

    const otherTenant = supplierExport('export-3', 'org-2')
    expect(() => assertUniqueIdempotencyKey([existing], otherTenant)).not.toThrow()
  })

  it('records a successful attempt and external transaction id', () => {
    const started = startIntegrationAttempt({
      exportItem: supplierExport(),
      organisationId: 'org-1',
      attemptId: 'attempt-1',
      nowIso: '2026-07-29T10:01:00.000Z',
    })
    const accepted = acceptIntegrationAttempt({
      ...started,
      organisationId: 'org-1',
      externalTransactionId: 'sage-txn-1',
      nowIso: '2026-07-29T10:01:02.000Z',
    })
    expect(accepted.exportItem.status).toBe('accepted')
    expect(accepted.exportItem.retryCount).toBe(1)
    expect(accepted.exportItem.externalTransactionId).toBe('sage-txn-1')
    expect(accepted.attempt.outcome).toBe('accepted')
  })

  it('retains failure reason and permits an attributable retry', () => {
    const first = startIntegrationAttempt({
      exportItem: supplierExport(),
      organisationId: 'org-1',
      attemptId: 'attempt-1',
      nowIso: '2026-07-29T10:01:00.000Z',
    })
    const failed = failIntegrationAttempt({
      ...first,
      organisationId: 'org-1',
      failureReason: 'Supplier mapping rejected',
      nowIso: '2026-07-29T10:01:02.000Z',
    })
    expect(failed.exportItem.status).toBe('failed')
    expect(failed.exportItem.lastFailureReason).toBe('Supplier mapping rejected')

    const retry = startIntegrationAttempt({
      exportItem: failed.exportItem,
      organisationId: 'org-1',
      attemptId: 'attempt-2',
      nowIso: '2026-07-29T10:02:00.000Z',
    })
    expect(retry.attempt.attemptNumber).toBe(2)
  })

  it('blocks cross-tenant attempts and illegal accepted re-sends', () => {
    expect(() =>
      startIntegrationAttempt({
        exportItem: supplierExport(),
        organisationId: 'org-2',
        attemptId: 'attempt-1',
        nowIso: '2026-07-29T10:01:00.000Z',
      }),
    ).toThrow(/cross-tenant/i)

    const started = startIntegrationAttempt({
      exportItem: supplierExport(),
      organisationId: 'org-1',
      attemptId: 'attempt-1',
      nowIso: '2026-07-29T10:01:00.000Z',
    })
    const accepted = acceptIntegrationAttempt({
      ...started,
      organisationId: 'org-1',
      externalTransactionId: 'sage-txn-1',
      nowIso: '2026-07-29T10:01:02.000Z',
    })
    expect(() =>
      startIntegrationAttempt({
        exportItem: accepted.exportItem,
        organisationId: 'org-1',
        attemptId: 'attempt-2',
        nowIso: '2026-07-29T10:02:00.000Z',
      }),
    ).toThrow(/accepted state/i)
  })
})

