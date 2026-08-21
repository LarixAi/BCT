import type { BankAccount, BankTransaction } from '../domain/bank-account'
import type { OrganisationId } from '../domain/types'

/** Pending-cost shape used by BankPage to build the due-soon list. */
export type DemoPendingCost = {
  id: string
  description: string
  counterparty: string
  paymentDate: string
  amountMinor: number
  status: 'approved' | 'committed' | 'expected'
}

/** Demo CEC current account — masked identifiers; demo_live feed until Open Banking. */
export function createDemoBankAccounts(organisationId: OrganisationId): {
  bankAccounts: BankAccount[]
  bankTransactions: BankTransaction[]
  /** Amount held in restricted / ring-fenced reserve (excluded from free cost cash). */
  restrictedMinor: number
  /** Committed and expected payments with a future payment date for the due-soon view. */
  pendingCosts: DemoPendingCost[]
} {
  const accountId = 'bank_natwest_current'
  const syncedAt = '2026-07-28T11:55:00.000Z'

  const bankAccounts: BankAccount[] = [
    {
      id: accountId,
      organisationId,
      displayName: 'CEC Operating current account',
      institutionName: 'NatWest Business',
      sortCodeMasked: '**-**-44',
      accountNumberMasked: '****7821',
      currency: 'GBP',
      balanceMinor: 84_620_45,
      ledgerBalanceMinor: 84_620_45,
      asOf: syncedAt,
      feedMode: 'demo_live',
      connectionLabel: 'Demo live feed (Open Banking partner not connected)',
      lastSyncedAt: syncedAt,
      staleAfterSeconds: 900,
    },
  ]

  const bankTransactions: BankTransaction[] = [
    txn({
      id: 'btx_1',
      organisationId,
      accountId,
      bookedAt: '2026-07-28T09:12:00.000Z',
      description: 'ALLSTAR FUEL CARD',
      counterparty: 'Allstar Business Solutions',
      direction: 'debit',
      amountMinor: 5_820_00,
      balanceAfterMinor: 84_620_45,
      providerTxnId: 'nw|20260728|582000',
      matchedCostId: 'cost_fuel_1',
      status: 'booked',
    }),
    txn({
      id: 'btx_2',
      organisationId,
      accountId,
      bookedAt: '2026-07-28T08:40:00.000Z',
      description: 'WEMBLEY DEPOT ESTATES RENT',
      counterparty: 'Wembley Depot Estates',
      direction: 'debit',
      amountMinor: 5_100_00,
      balanceAfterMinor: 90_440_45,
      providerTxnId: 'nw|20260728|510000',
      matchedCostId: 'cost_ops_rent',
      status: 'booked',
    }),
    txn({
      id: 'btx_3',
      organisationId,
      accountId,
      bookedAt: '2026-07-27T16:22:00.000Z',
      description: 'CEC GRANT DRAWDOWN JUL',
      counterparty: 'Local Authority CEC',
      direction: 'credit',
      amountMinor: 42_000_00,
      balanceAfterMinor: 95_540_45,
      providerTxnId: 'nw|20260727|4200000',
      matchedCostId: null,
      status: 'booked',
    }),
    txn({
      id: 'btx_4',
      organisationId,
      accountId,
      bookedAt: '2026-07-25T11:05:00.000Z',
      description: 'WEMBLEY COMMERCIALS INV-88421',
      counterparty: 'Wembley Commercials',
      direction: 'debit',
      amountMinor: 735_00,
      balanceAfterMinor: 53_540_45,
      providerTxnId: 'nw|20260725|73500',
      matchedCostId: 'cost_maint_1',
      status: 'booked',
    }),
    txn({
      id: 'btx_5',
      organisationId,
      accountId,
      bookedAt: '2026-07-24T14:18:00.000Z',
      description: 'HART & PARTNERS FEES',
      counterparty: 'Hart & Partners',
      direction: 'debit',
      amountMinor: 1_980_00,
      balanceAfterMinor: 54_275_45,
      providerTxnId: 'nw|20260724|198000',
      matchedCostId: 'cost_ops_accountancy',
      status: 'booked',
    }),
    txn({
      id: 'btx_6',
      organisationId,
      accountId,
      bookedAt: '2026-07-29T07:05:00.000Z',
      description: 'PENDING LEX AUTOLEASE',
      counterparty: 'Lex Autolease',
      direction: 'debit',
      amountMinor: 6_720_00,
      balanceAfterMinor: null,
      providerTxnId: 'nw|pending|672000',
      matchedCostId: null,
      status: 'pending',
    }),
    txn({
      id: 'btx_7',
      organisationId,
      accountId,
      bookedAt: '2026-07-22T10:30:00.000Z',
      description: 'ZURICH FLEET INS Q3 SHARE',
      counterparty: 'Zurich Fleet',
      direction: 'debit',
      amountMinor: 7_200_00,
      balanceAfterMinor: 56_255_45,
      providerTxnId: 'nw|20260722|720000',
      matchedCostId: 'cost_commit_ins',
      status: 'booked',
    }),
    txn({
      id: 'btx_8',
      organisationId,
      accountId,
      bookedAt: '2026-07-21T09:00:00.000Z',
      description: 'UNMATCHED CARD PAYMENT',
      counterparty: 'Unknown merchant',
      direction: 'debit',
      amountMinor: 86_40,
      balanceAfterMinor: 63_455_45,
      providerTxnId: 'nw|20260721|8640',
      matchedCostId: null,
      status: 'booked',
    }),
  ]

  /** £8,500 SLA reserve ring-fenced by board resolution — not available for routine costs. */
  const restrictedMinor = 8_500_00

  const pendingCosts: DemoPendingCost[] = [
    {
      id: 'pc_payroll_aug',
      description: 'Driver payroll — August 2026',
      counterparty: 'Bacs payroll run',
      paymentDate: '2026-08-01',
      amountMinor: 28_760_00,
      status: 'approved',
    },
    {
      id: 'pc_lease_aug',
      description: 'Lex Autolease — August fleet',
      counterparty: 'Lex Autolease',
      paymentDate: '2026-08-03',
      amountMinor: 6_720_00,
      status: 'committed',
    },
    {
      id: 'pc_fuel_aug1',
      description: 'Allstar fuel card settlement w/c 4 Aug',
      counterparty: 'Allstar Business Solutions',
      paymentDate: '2026-08-07',
      amountMinor: 5_820_00,
      status: 'expected',
    },
    {
      id: 'pc_ins_q3b',
      description: 'Zurich fleet insurance — Aug instalment',
      counterparty: 'Zurich Fleet',
      paymentDate: '2026-08-10',
      amountMinor: 2_400_00,
      status: 'committed',
    },
    {
      id: 'pc_rent_aug',
      description: 'Wembley Depot Estates — August rent',
      counterparty: 'Wembley Depot Estates',
      paymentDate: '2026-08-01',
      amountMinor: 5_100_00,
      status: 'approved',
    },
    {
      id: 'pc_accountancy',
      description: 'Hart & Partners — August retainer',
      counterparty: 'Hart & Partners',
      paymentDate: '2026-08-15',
      amountMinor: 1_980_00,
      status: 'expected',
    },
  ]

  return { bankAccounts, bankTransactions, restrictedMinor, pendingCosts }
}

function txn(
  partial: BankTransaction,
): BankTransaction {
  return partial
}
