import type { CostAllocation } from './types'

/**
 * Split allocations must total exactly the complete monetary amount before approval.
 * Blueprint §6.
 */
export function allocationTotalMinor(allocations: CostAllocation[]): number {
  return allocations.reduce((sum, a) => sum + a.amountMinor, 0)
}

export function assertBalancedAllocations(allocations: CostAllocation[], costAmountMinor: number): void {
  const total = allocationTotalMinor(allocations)
  if (total !== costAmountMinor) {
    throw new Error(
      `Allocation imbalance: splits total ${total} minor units but cost is ${costAmountMinor}. Must equal exactly.`,
    )
  }
  if (allocations.some((a) => !Number.isInteger(a.amountMinor))) {
    throw new Error('Allocation amounts must be integer minor units')
  }
}

export function isBalancedAllocations(allocations: CostAllocation[], costAmountMinor: number): boolean {
  try {
    assertBalancedAllocations(allocations, costAmountMinor)
    return true
  } catch {
    return false
  }
}
