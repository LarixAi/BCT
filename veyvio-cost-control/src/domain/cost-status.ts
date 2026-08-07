import type { CostLifecycleStatus } from './types'

/**
 * A single economic cost occupies only one lifecycle status at a time.
 * Commitment → actual converts/links; never add again. Blueprint §5, §8.4.
 */
const ALLOWED: Record<CostLifecycleStatus, CostLifecycleStatus[]> = {
  forecast: ['committed', 'actual', 'estimated'],
  estimated: ['forecast', 'committed', 'actual'],
  committed: ['actual'],
  actual: [],
}

export function canTransition(from: CostLifecycleStatus, to: CostLifecycleStatus): boolean {
  if (from === to) return true
  return ALLOWED[from].includes(to)
}

export function assertTransition(from: CostLifecycleStatus, to: CostLifecycleStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal cost status transition: ${from} → ${to}`)
  }
}

/**
 * When converting commitment → actual, projected final must not increase by the
 * converted amount twice. Caller removes commitment (or links) and adds actual once.
 */
export function projectedFinalAfterCommitmentConversion(input: {
  actualMinor: number
  committedMinor: number
  forecastMinor: number
  convertingMinor: number
}): number {
  if (input.convertingMinor > input.committedMinor) {
    throw new Error('Cannot convert more than remaining commitment')
  }
  const nextActual = input.actualMinor + input.convertingMinor
  const nextCommitted = input.committedMinor - input.convertingMinor
  return nextActual + nextCommitted + input.forecastMinor
}
