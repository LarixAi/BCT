/**
 * Cash-flow view — will money be in the bank when payments fall due?
 * Built from cost payment dates + bank available balance. Not a payments product.
 */

import type { BankAccount, BankTransaction } from './bank-account'
import type { CostRecord, OrganisationId } from './types'
import { requireOrganisationId } from './tenancy'

export type CashFlowBucket = {
  weekLabel: string
  weekStart: string
  outflowMinor: number
  inflowMinor: number
  netMinor: number
  runningBalanceMinor: number
}

export type CashFlowSnapshot = {
  openingBalanceMinor: number
  buckets: CashFlowBucket[]
  lowestBalanceMinor: number
  warning: string | null
}

function weekStartMonday(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildCashFlowSnapshot(input: {
  organisationId: OrganisationId
  costs: CostRecord[]
  accounts: BankAccount[]
  transactions: BankTransaction[]
  /** Horizon in weeks from today-ish seed date. */
  fromDate: string
  weeks?: number
}): CashFlowSnapshot {
  const org = requireOrganisationId(input.organisationId)
  const weeks = input.weeks ?? 8
  const opening = input.accounts
    .filter((a) => a.organisationId === org)
    .reduce((s, a) => s + a.balanceMinor, 0)

  const start = weekStartMonday(input.fromDate)
  const buckets: CashFlowBucket[] = []
  let running = opening

  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(start, i * 7)
    const weekEnd = addDays(weekStart, 6)
    const outflowMinor = input.costs
      .filter((c) => c.organisationId === org && c.validationState !== 'quarantined')
      .filter((c) => {
        const pay = c.paymentDate ?? c.transactionDate
        return pay >= weekStart && pay <= weekEnd
      })
      .reduce((s, c) => s + c.gross.amountMinor, 0)

    // Credit bank transactions in window as expected receipts proxy (demo).
    const inflowMinor = input.transactions
      .filter((t) => t.organisationId === org && t.direction === 'credit')
      .filter((t) => t.bookedAt.slice(0, 10) >= weekStart && t.bookedAt.slice(0, 10) <= weekEnd)
      .reduce((s, t) => s + t.amountMinor, 0)

    running = running - outflowMinor + inflowMinor
    buckets.push({
      weekLabel: `w/c ${weekStart}`,
      weekStart,
      outflowMinor,
      inflowMinor,
      netMinor: inflowMinor - outflowMinor,
      runningBalanceMinor: running,
    })
  }

  const lowestBalanceMinor = buckets.reduce(
    (min, b) => Math.min(min, b.runningBalanceMinor),
    opening,
  )

  let warning: string | null = null
  if (lowestBalanceMinor < 0) {
    warning = 'Projected bank balance goes negative within the forecast horizon.'
  } else if (buckets.some((b) => b.runningBalanceMinor < opening * 0.15)) {
    warning = 'Cash headroom falls below 15% of opening available balance in the horizon.'
  }

  return { openingBalanceMinor: opening, buckets, lowestBalanceMinor, warning }
}
