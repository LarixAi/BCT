import { describe, expect, it } from 'vitest'
import type { BankTransaction } from './bank-account'
import {
  assertUniqueBankMovement,
  confirmBankCostMatchFromSage,
  costReconciliationState,
  proposeBankCostMatch,
} from './cost-reconciliation'

function bankDebit(id = 'bank-row-1', organisationId = 'org-1'): BankTransaction {
  return {
    id,
    organisationId,
    accountId: 'account-1',
    bookedAt: '2026-07-29T09:00:00.000Z',
    description: 'Fuel supplier',
    counterparty: 'Fuel Ltd',
    direction: 'debit',
    amountMinor: 12000,
    balanceAfterMinor: 500000,
    providerTxnId: 'open-bank-txn-1',
    matchedCostId: null,
    status: 'booked',
  }
}

describe('cost reconciliation', () => {
  it('blocks a duplicate bank movement without creating another cost', () => {
    expect(() =>
      assertUniqueBankMovement([bankDebit()], bankDebit('bank-row-2')),
    ).toThrow(/duplicate Open Banking transaction/i)
    expect(() =>
      assertUniqueBankMovement([bankDebit()], bankDebit('bank-row-2', 'org-2')),
    ).not.toThrow()
  })

  it('creates a proposed match, not a final accounting reconciliation', () => {
    const match = proposeBankCostMatch({
      id: 'match-1',
      organisationId: 'org-1',
      transaction: bankDebit(),
      veyvioCostId: 'cost-1',
      proposedBy: 'finance-user-1',
      nowIso: '2026-07-29T10:00:00.000Z',
    })
    expect(match.matchState).toBe('proposed')
    expect(
      costReconciliationState({
        approvedInVeyvio: true,
        match,
        sagePostingStatus: null,
      }),
    ).toBe('bank_match_proposed')
  })

  it('requires posted Sage values and a reconciliation identifier', () => {
    const match = proposeBankCostMatch({
      id: 'match-1',
      organisationId: 'org-1',
      transaction: bankDebit(),
      veyvioCostId: 'cost-1',
      proposedBy: 'finance-user-1',
      nowIso: '2026-07-29T10:00:00.000Z',
    })
    expect(() =>
      confirmBankCostMatchFromSage({
        match,
        organisationId: 'org-1',
        sageTransactionId: 'sage-txn-1',
        sageReconciliationId: 'sage-rec-1',
        postingStatus: 'accepted',
        nowIso: '2026-07-29T11:00:00.000Z',
      }),
    ).toThrow(/must be posted/i)
    expect(() =>
      confirmBankCostMatchFromSage({
        match,
        organisationId: 'org-1',
        sageTransactionId: 'sage-txn-1',
        sageReconciliationId: '',
        postingStatus: 'posted',
        nowIso: '2026-07-29T11:00:00.000Z',
      }),
    ).toThrow(/reconciliation ID/i)
  })

  it('becomes fully reconciled only after Sage confirmation', () => {
    const proposed = proposeBankCostMatch({
      id: 'match-1',
      organisationId: 'org-1',
      transaction: bankDebit(),
      veyvioCostId: 'cost-1',
      proposedBy: 'finance-user-1',
      nowIso: '2026-07-29T10:00:00.000Z',
    })
    const confirmed = confirmBankCostMatchFromSage({
      match: proposed,
      organisationId: 'org-1',
      sageTransactionId: 'sage-txn-1',
      sageReconciliationId: 'sage-rec-1',
      postingStatus: 'posted',
      nowIso: '2026-07-29T11:00:00.000Z',
    })
    expect(
      costReconciliationState({
        approvedInVeyvio: true,
        match: confirmed,
        sagePostingStatus: 'posted',
      }),
    ).toBe('fully_reconciled')
  })
})

