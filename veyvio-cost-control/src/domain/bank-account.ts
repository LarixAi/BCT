import type { OrganisationId } from './types'
import { requireOrganisationId } from './tenancy'

/**
 * Business bank account feed — Blueprint §11 Bank/Open Banking partner.
 * Purpose: balance visibility + payment reconciliation support.
 * Explicit non-goals: payment initiation, transferring money, becoming a bank.
 */

export type BankFeedMode = 'demo_live' | 'open_banking' | 'manual_csv' | 'disconnected'

export type BankAccount = {
  id: string
  organisationId: OrganisationId
  displayName: string
  institutionName: string
  /** Masked only — never full account number in Cost Control Phase 1. */
  sortCodeMasked: string
  accountNumberMasked: string
  currency: 'GBP'
  /** Current available balance in minor units (signed). */
  balanceMinor: number
  /** Cleared ledger balance if different from available. */
  ledgerBalanceMinor: number
  asOf: string
  feedMode: BankFeedMode
  connectionLabel: string
  lastSyncedAt: string | null
  /** Seconds of feed age when last computed — UI freshness. */
  staleAfterSeconds: number
}

export type BankTransactionDirection = 'credit' | 'debit'

export type BankTransaction = {
  id: string
  organisationId: OrganisationId
  accountId: string
  bookedAt: string
  description: string
  counterparty: string
  direction: BankTransactionDirection
  amountMinor: number
  balanceAfterMinor: number | null
  /** Idempotent bank reference for reconciliation. */
  providerTxnId: string
  /** Optional link when matched to a cost in the ledger. */
  matchedCostId: string | null
  status: 'booked' | 'pending'
}

/** A cost payment that is expected but not yet settled in the bank. */
export type DueSoonPayment = {
  costId: string
  description: string
  counterparty: string
  dueDate: string
  amountMinor: number
  status: 'approved' | 'committed' | 'expected'
}

/** A bank debit that has not been linked to any ledger cost. */
export type UnmatchedBankDebit = {
  txnId: string
  bookedAt: string
  description: string
  counterparty: string
  amountMinor: number
  status: 'booked' | 'pending'
  /** Candidate cost IDs for manual matching — empty = no suggestion. */
  candidateCostIds: string[]
}

export type BankFeedSnapshot = {
  account: BankAccount
  transactions: BankTransaction[]
  /** Settled, cleared cash — usable for CEC costs. */
  clearedBalanceMinor: number
  /** Available balance including pending items reported by bank. */
  availableMinor: number
  /** Funds ring-fenced or restricted — must not be counted as free cash. */
  restrictedMinor: number
  /** Free cash for CEC costs = cleared − restricted. */
  freeCostCashMinor: number
  /** Approved, committed and expected outflows ordered by due date. */
  dueSoonPayments: DueSoonPayment[]
  /** Total of approved outflows due in next 30 days. */
  approvedDue30Minor: number
  /** Total of committed outflows due in next 30 days. */
  committedDue30Minor: number
  /** Total of expected outflows due in next 30 days. */
  expectedDue30Minor: number
  pendingDebitsMinor: number
  unmatchedDebits: UnmatchedBankDebit[]
  unmatchedCount: number
  feedAgeSeconds: number
  isStale: boolean
  /** Data-currency labels for the page header. */
  dataCurrent: string
  lastSyncLabel: string
}

export function bankFeedAgeSeconds(account: BankAccount, nowIso = new Date().toISOString()): number {
  if (!account.lastSyncedAt) return Number.POSITIVE_INFINITY
  const synced = Date.parse(account.lastSyncedAt)
  const now = Date.parse(nowIso)
  if (!Number.isFinite(synced) || !Number.isFinite(now)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((now - synced) / 1000))
}

export function buildBankFeedSnapshot(input: {
  organisationId: OrganisationId
  account: BankAccount
  transactions: BankTransaction[]
  /** Costs with a paymentDate used to build due-soon list. */
  pendingCosts?: Array<{
    id: string
    description: string
    counterparty: string
    paymentDate: string
    amountMinor: number
    status: 'approved' | 'committed' | 'expected'
  }>
  /** Amount ring-fenced / restricted — defaults to 0. */
  restrictedMinor?: number
  nowIso?: string
}): BankFeedSnapshot {
  const orgId = requireOrganisationId(input.organisationId)
  if (input.account.organisationId !== orgId) {
    throw new Error('Bank account organisation mismatch')
  }
  const now = input.nowIso ?? new Date().toISOString()
  const today = now.slice(0, 10)
  const in30 = new Date(now)
  in30.setDate(in30.getDate() + 30)
  const cutoff30 = in30.toISOString().slice(0, 10)

  const txns = input.transactions
    .filter((t) => t.organisationId === orgId && t.accountId === input.account.id)
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))

  const pendingDebitsMinor = txns
    .filter((t) => t.status === 'pending' && t.direction === 'debit')
    .reduce((s, t) => s + t.amountMinor, 0)

  const unmatchedDebits: UnmatchedBankDebit[] = txns
    .filter((t) => !t.matchedCostId && t.direction === 'debit')
    .map((t) => ({
      txnId: t.id,
      bookedAt: t.bookedAt,
      description: t.description,
      counterparty: t.counterparty,
      amountMinor: t.amountMinor,
      status: t.status,
      candidateCostIds: [],
    }))

  const feedAgeSeconds = bankFeedAgeSeconds(input.account, now)

  const restrictedMinor = input.restrictedMinor ?? 0
  const clearedBalanceMinor = input.account.ledgerBalanceMinor
  const availableMinor = input.account.balanceMinor
  const freeCostCashMinor = clearedBalanceMinor - restrictedMinor

  // Due-soon: costs within 30 days from today, ordered by due date.
  const pendingCosts = input.pendingCosts ?? []
  const dueSoonPayments: DueSoonPayment[] = pendingCosts
    .filter((c) => c.paymentDate >= today && c.paymentDate <= cutoff30)
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
    .map((c) => ({
      costId: c.id,
      description: c.description,
      counterparty: c.counterparty,
      dueDate: c.paymentDate,
      amountMinor: c.amountMinor,
      status: c.status,
    }))

  const approvedDue30Minor = dueSoonPayments
    .filter((p) => p.status === 'approved')
    .reduce((s, p) => s + p.amountMinor, 0)
  const committedDue30Minor = dueSoonPayments
    .filter((p) => p.status === 'committed')
    .reduce((s, p) => s + p.amountMinor, 0)
  const expectedDue30Minor = dueSoonPayments
    .filter((p) => p.status === 'expected')
    .reduce((s, p) => s + p.amountMinor, 0)

  const dataCurrent = input.account.asOf
    ? new Date(input.account.asOf).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown'

  const lastSyncLabel = input.account.lastSyncedAt
    ? new Date(input.account.lastSyncedAt).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never'

  return {
    account: input.account,
    transactions: txns,
    clearedBalanceMinor,
    availableMinor,
    restrictedMinor,
    freeCostCashMinor,
    dueSoonPayments,
    approvedDue30Minor,
    committedDue30Minor,
    expectedDue30Minor,
    pendingDebitsMinor,
    unmatchedDebits,
    unmatchedCount: unmatchedDebits.length,
    feedAgeSeconds,
    isStale: feedAgeSeconds > input.account.staleAfterSeconds,
    dataCurrent,
    lastSyncLabel,
  }
}

/**
 * Demo "live" refresh — bumps sync time and optionally applies a small balance jitter.
 * Real Open Banking will replace this adapter; domain stays the same.
 */
export function refreshDemoBankFeed(input: {
  account: BankAccount
  transactions: BankTransaction[]
  nowIso?: string
}): { account: BankAccount; transactions: BankTransaction[] } {
  const now = input.nowIso ?? new Date().toISOString()
  // Deterministic micro-move so refresh feels live without inventing money randomly each ms.
  const daySeed = Number(now.slice(8, 10)) || 1
  const jitter = ((daySeed % 7) - 3) * 100 // −£3.00 … +£3.00 in pence steps of £1
  return {
    account: {
      ...input.account,
      balanceMinor: input.account.balanceMinor + jitter,
      ledgerBalanceMinor: input.account.ledgerBalanceMinor + jitter,
      asOf: now,
      lastSyncedAt: now,
      feedMode: 'demo_live',
      connectionLabel: 'Demo live feed (Open Banking partner not connected)',
    },
    transactions: input.transactions,
  }
}

export function formatFeedAge(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'Never synced'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
