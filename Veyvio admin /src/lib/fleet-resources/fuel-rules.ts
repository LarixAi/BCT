import type { ResourceTransaction } from './types'

/** Capacity / anomaly stubs for Phase 1 — flags only, no hard blocks. */
export function flagFuelAnomalies(
  tx: Pick<
    ResourceTransaction,
    'quantity' | 'unit' | 'resourceCategory' | 'odometer' | 'receiptFileName' | 'grossAmount'
  >,
  options: {
    maxLitres: number
    requireReceiptAbove: number
    requireOdometer: boolean
  },
): string[] {
  const flags: string[] = []
  if (tx.resourceCategory === 'fuel' || tx.resourceCategory === 'adblue') {
    if (tx.quantity > options.maxLitres) {
      flags.push('quantity_above_policy')
    }
    if (options.requireOdometer && (tx.odometer == null || tx.odometer <= 0)) {
      flags.push('missing_odometer')
    }
  }
  if (
    tx.grossAmount != null &&
    tx.grossAmount >= options.requireReceiptAbove &&
    !tx.receiptFileName
  ) {
    flags.push('missing_receipt')
  }
  return flags
}

export function isMissingReceipt(
  tx: Pick<ResourceTransaction, 'receiptFileName' | 'grossAmount' | 'anomalyFlags'>,
  requireReceiptAbove: number,
): boolean {
  if (tx.anomalyFlags.includes('missing_receipt')) return true
  return (
    tx.grossAmount != null &&
    tx.grossAmount >= requireReceiptAbove &&
    !tx.receiptFileName
  )
}
