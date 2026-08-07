import type { BankTransaction } from './bank-account'
import { assertSameOrganisation, requireOrganisationId } from './tenancy'
import type { OrganisationId } from './types'
import type { SagePostingStatus } from '../integrations/sage'

export type CostReconciliationState =
  | 'unmatched'
  | 'bank_match_proposed'
  | 'sage_posted'
  | 'fully_reconciled'
  | 'reversed'

export type BankCostMatch = {
  id: string
  organisationId: OrganisationId
  openBankingTransactionId: string
  veyvioCostId: string
  matchState: 'proposed' | 'rejected' | 'sage_confirmed'
  proposedBy: string
  proposedAt: string
  sageTransactionId: string | null
  sageReconciliationId: string | null
  sageConfirmedAt: string | null
}

export function assertUniqueBankMovement(
  existing: BankTransaction[],
  candidate: BankTransaction,
): void {
  const org = requireOrganisationId(candidate.organisationId)
  const duplicate = existing.find(
    (transaction) =>
      transaction.organisationId === org &&
      transaction.accountId === candidate.accountId &&
      transaction.providerTxnId === candidate.providerTxnId &&
      transaction.id !== candidate.id,
  )
  if (duplicate) {
    throw new Error(
      `Duplicate Open Banking transaction blocked: ${candidate.providerTxnId}`,
    )
  }
}

export function proposeBankCostMatch(input: {
  id: string
  organisationId: OrganisationId
  transaction: BankTransaction
  veyvioCostId: string
  proposedBy: string
  nowIso: string
}): BankCostMatch {
  const org = requireOrganisationId(input.organisationId)
  assertSameOrganisation(org, input.transaction.organisationId, 'bank transaction')
  if (input.transaction.direction !== 'debit') {
    throw new Error('Only bank debits may be proposed as cost matches')
  }
  if (!input.veyvioCostId.trim()) throw new Error('Veyvio cost ID is required')
  if (!input.proposedBy.trim()) throw new Error('Proposing actor is required')
  return {
    id: input.id,
    organisationId: org,
    openBankingTransactionId: input.transaction.providerTxnId,
    veyvioCostId: input.veyvioCostId,
    matchState: 'proposed',
    proposedBy: input.proposedBy,
    proposedAt: input.nowIso,
    sageTransactionId: null,
    sageReconciliationId: null,
    sageConfirmedAt: null,
  }
}

export function confirmBankCostMatchFromSage(input: {
  match: BankCostMatch
  organisationId: OrganisationId
  sageTransactionId: string
  sageReconciliationId: string
  postingStatus: SagePostingStatus
  nowIso: string
}): BankCostMatch {
  assertSameOrganisation(input.organisationId, input.match.organisationId, 'bank cost match')
  if (input.match.matchState !== 'proposed') {
    throw new Error(`Only a proposed bank match can be confirmed`)
  }
  if (
    input.postingStatus !== 'posted' &&
    input.postingStatus !== 'paid' &&
    input.postingStatus !== 'bank_reconciled'
  ) {
    throw new Error('Sage posting must be posted before reconciliation can be confirmed')
  }
  if (!input.sageTransactionId.trim()) throw new Error('Sage transaction ID is required')
  if (!input.sageReconciliationId.trim()) {
    throw new Error('Sage reconciliation ID is required')
  }
  return {
    ...input.match,
    matchState: 'sage_confirmed',
    sageTransactionId: input.sageTransactionId,
    sageReconciliationId: input.sageReconciliationId,
    sageConfirmedAt: input.nowIso,
  }
}

export function costReconciliationState(input: {
  approvedInVeyvio: boolean
  match: BankCostMatch | null
  sagePostingStatus: SagePostingStatus | null
}): CostReconciliationState {
  if (input.sagePostingStatus === 'reversed') return 'reversed'
  if (!input.match) {
    return input.sagePostingStatus === 'posted' || input.sagePostingStatus === 'paid'
      ? 'sage_posted'
      : 'unmatched'
  }
  if (
    input.approvedInVeyvio &&
    input.match.matchState === 'sage_confirmed' &&
    input.match.sageTransactionId &&
    input.match.sageReconciliationId &&
    (input.sagePostingStatus === 'posted' ||
      input.sagePostingStatus === 'paid' ||
      input.sagePostingStatus === 'bank_reconciled')
  ) {
    return 'fully_reconciled'
  }
  if (
    input.sagePostingStatus === 'posted' ||
    input.sagePostingStatus === 'paid' ||
    input.sagePostingStatus === 'bank_reconciled'
  ) {
    return 'sage_posted'
  }
  return 'bank_match_proposed'
}

