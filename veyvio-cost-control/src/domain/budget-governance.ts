/**
 * Budget governance — immutable original baseline, tracked revisions, quarterly lock.
 * Later corrections never rewrite a locked quarter; they open a new version.
 */

import type { BudgetId, CostCategory, OrganisationId } from './types'

export type QuarterId = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export type PeriodScope = 'ytd' | QuarterId

export type TrafficLight = 'green' | 'amber' | 'red' | 'grey'

export type BudgetChange = {
  id: string
  organisationId: OrganisationId
  budgetId: BudgetId
  /** null = programme / contingency level change */
  lineId: string | null
  category: CostCategory | null
  /** Signed delta applied to current revised approved (never mutates original). */
  amountMinor: number
  reason: string
  approvedBy: string
  approvedAt: string
  boardRequired: boolean
  boardApprovedAt?: string | null
}

export type BudgetLineGovernance = {
  originalApprovedMinor: number
  /** Sum of approved BudgetChange deltas for this line. */
  changesMinor: number
  /** original + changes — what “current revised budget” means. */
  revisedApprovedMinor: number
  ownerName: string
  ownerRole: string
}

export type QuarterWindow = {
  id: QuarterId
  label: string
  start: string
  end: string
}

/** UK April–March financial year windows. fy e.g. "2026/27" → Apr 2026–Mar 2027. */
export function quartersForFinancialYear(financialYear: string): QuarterWindow[] {
  const startYear = Number(financialYear.slice(0, 4))
  if (!Number.isFinite(startYear)) {
    throw new Error(`Invalid financial year: ${financialYear}`)
  }
  return [
    { id: 'Q1', label: `Q1 Apr–Jun ${startYear}`, start: `${startYear}-04-01`, end: `${startYear}-06-30` },
    { id: 'Q2', label: `Q2 Jul–Sep ${startYear}`, start: `${startYear}-07-01`, end: `${startYear}-09-30` },
    { id: 'Q3', label: `Q3 Oct–Dec ${startYear}`, start: `${startYear}-10-01`, end: `${startYear}-12-31` },
    {
      id: 'Q4',
      label: `Q4 Jan–Mar ${startYear + 1}`,
      start: `${startYear + 1}-01-01`,
      end: `${startYear + 1}-03-31`,
    },
  ]
}

export function ytdWindow(financialYear: string, throughQuarter: QuarterId): { start: string; end: string } {
  const quarters = quartersForFinancialYear(financialYear)
  const q = quarters.find((x) => x.id === throughQuarter) ?? quarters[0]!
  return { start: quarters[0]!.start, end: q.end }
}

export function resolveLineGovernance(
  originalApprovedMinor: number,
  changes: BudgetChange[],
  lineId: string,
  ownerName: string,
  ownerRole: string,
): BudgetLineGovernance {
  const changesMinor = changes
    .filter((c) => c.lineId === lineId)
    .reduce((sum, c) => sum + c.amountMinor, 0)
  return {
    originalApprovedMinor,
    changesMinor,
    revisedApprovedMinor: originalApprovedMinor + changesMinor,
    ownerName,
    ownerRole,
  }
}

export function resolveProgrammeGovernance(
  originalLinesMinor: number,
  originalContingencyMinor: number,
  changes: BudgetChange[],
): {
  originalApprovedMinor: number
  changesMinor: number
  revisedApprovedMinor: number
} {
  const changesMinor = changes.reduce((sum, c) => sum + c.amountMinor, 0)
  const originalApprovedMinor = originalLinesMinor + originalContingencyMinor
  return {
    originalApprovedMinor,
    changesMinor,
    revisedApprovedMinor: originalApprovedMinor + changesMinor,
  }
}

/**
 * Traffic lights for budget position.
 * Green: within tolerance · Amber: at risk without intervention · Red: over / board · Grey: incomplete
 */
export function trafficLightForVariance(input: {
  varianceToApprovedMinor: number
  approvedMinor: number
  /** Adverse tolerance as percent hundredths — default 3.0% */
  toleranceHundredths?: number
  dataComplete: boolean
}): TrafficLight {
  if (!input.dataComplete) return 'grey'
  if (input.approvedMinor <= 0) return input.varianceToApprovedMinor < 0 ? 'red' : 'green'
  const adverse = -input.varianceToApprovedMinor
  if (adverse <= 0) return 'green'
  const pctHundredths = Math.round((adverse / input.approvedMinor) * 10_000)
  const tolerance = input.toleranceHundredths ?? 300
  if (pctHundredths <= tolerance) return 'amber'
  return 'red'
}

export function trafficLabel(light: TrafficLight): string {
  if (light === 'green') return 'Within tolerance'
  if (light === 'amber') return 'At risk without intervention'
  if (light === 'red') return 'Over budget / board decision'
  return 'Incomplete or unverified'
}
