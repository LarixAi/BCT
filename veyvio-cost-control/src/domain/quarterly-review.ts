/**
 * Quarterly budget review — locked snapshots never mutate; corrections = new version.
 */

import { computeBudgetPosition } from './budget-equations'
import { costsForBudgetLine, sumLineByStatus } from './budget-hierarchy'
import {
  quartersForFinancialYear,
  trafficLightForVariance,
  ytdWindow,
  type PeriodScope,
  type QuarterId,
  type TrafficLight,
} from './budget-governance'
import { requireOrganisationId } from './tenancy'
import type { Budget, BudgetLine, CostRecord, OrganisationId, ReviewItem } from './types'

export type VarianceNature = 'temporary' | 'permanent'

export type QuarterlyLineReview = {
  lineId: string
  explanation: string | null
  correctiveAction: string | null
  targetDate: string | null
  varianceNature: VarianceNature | null
  responsibleManager: string | null
  boardApprovalRequired: boolean
  recommendedAction: string | null
  /** Expected financial effect of the corrective action (signed, minor units). */
  actionFinancialEffectMinor: number | null
}

export type QuarterlyReviewStatus =
  | 'open'
  | 'owner_confirmed'
  | 'finance_review'
  | 'finance_approved'
  | 'locked'

export type QuarterlyReview = {
  id: string
  organisationId: OrganisationId
  budgetId: string
  financialYear: string
  quarter: QuarterId
  status: QuarterlyReviewStatus
  periodStart: string
  periodEnd: string
  version: number
  /** Prior-quarter forecast final by line id — immutable once locked. */
  priorForecastByLineId: Record<string, number>
  lineReviews: QuarterlyLineReview[]
  ownerConfirmedAt: string | null
  financeApprovedAt: string | null
  financeApprovedBy: string | null
  lockedAt: string | null
  lockedBy: string | null
  movementSinceLastReviewMinor: number
  lastReviewLabel: string
}

export type QuarterlyCategoryRow = {
  line: BudgetLine
  annualBudgetMinor: number
  quarterBudgetMinor: number
  quarterActualMinor: number
  ytdActualMinor: number
  commitmentsMinor: number
  forecastFinalMinor: number
  /** forecastFinal − annualBudget (positive = adverse / overspend) */
  varianceMinor: number
  variancePercentHundredths: number
  priorForecastMinor: number
  light: TrafficLight
  review: QuarterlyLineReview | null
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function sumActualInRange(costs: CostRecord[], start: string, end: string): number {
  return costs
    .filter((c) => c.status === 'actual' && inRange(c.transactionDate, start, end))
    .reduce((s, c) => s + c.gross.amountMinor, 0)
}

export function quarterBudgetShare(annualMinor: number): number {
  return Math.round(annualMinor / 4)
}

export function buildQuarterlyCategoryRows(input: {
  organisationId: OrganisationId
  budget: Budget
  costs: CostRecord[]
  review: QuarterlyReview
  /** Current revised approved per line (after budget changes). */
  revisedApprovedByLineId: Record<string, number>
}): QuarterlyCategoryRow[] {
  const org = requireOrganisationId(input.organisationId)
  const ytd = ytdWindow(input.review.financialYear, input.review.quarter)

  return input.budget.lines.map((line) => {
    const annualBudgetMinor = input.revisedApprovedByLineId[line.id] ?? line.approvedMinor
    const lineCosts = costsForBudgetLine(input.costs, input.budget.id, line.category, org)
    const sums = sumLineByStatus(lineCosts)
    const position = computeBudgetPosition({
      approvedMinor: annualBudgetMinor,
      ...sums,
    })
    const quarterActualMinor = sumActualInRange(
      lineCosts,
      input.review.periodStart,
      input.review.periodEnd,
    )
    const ytdActualMinor = sumActualInRange(lineCosts, ytd.start, ytd.end)
    const priorForecastMinor = input.review.priorForecastByLineId[line.id] ?? position.projectedFinalMinor
    const varianceMinor = position.projectedFinalMinor - annualBudgetMinor
    const variancePercentHundredths =
      annualBudgetMinor === 0
        ? 0
        : Math.round((varianceMinor / annualBudgetMinor) * 10_000)
    const review = input.review.lineReviews.find((r) => r.lineId === line.id) ?? null
    const dataComplete = lineCosts.every(
      (c) => c.validationState === 'validated' || c.validationState === 'reconciled',
    )
    return {
      line,
      annualBudgetMinor,
      quarterBudgetMinor: quarterBudgetShare(annualBudgetMinor),
      quarterActualMinor,
      ytdActualMinor,
      commitmentsMinor: position.committedMinor,
      forecastFinalMinor: position.projectedFinalMinor,
      varianceMinor,
      variancePercentHundredths,
      priorForecastMinor,
      light: trafficLightForVariance({
        varianceToApprovedMinor: -varianceMinor,
        approvedMinor: annualBudgetMinor,
        dataComplete,
      }),
      review,
    }
  })
}

export function filterCostsForPeriodScope(input: {
  costs: CostRecord[]
  financialYear: string
  scope: PeriodScope
}): CostRecord[] {
  if (input.scope === 'ytd') {
    const quarters = quartersForFinancialYear(input.financialYear)
    const start = quarters[0]!.start
    const end = quarters[3]!.end
    return input.costs.filter((c) => inRange(c.transactionDate, start, end))
  }
  const q = quartersForFinancialYear(input.financialYear).find((x) => x.id === input.scope)
  if (!q) return input.costs
  return input.costs.filter((c) => inRange(c.transactionDate, q.start, q.end))
}

export type VarianceDrilldown = {
  row: QuarterlyCategoryRow
  contributingCosts: CostRecord[]
  openReviews: ReviewItem[]
  whatChanged: string
  whenChanged: string
  nature: VarianceNature | 'unknown'
  responsibleManager: string
  recommendedAction: string
  actionFinancialEffectMinor: number
  boardApprovalRequired: boolean
}

export function buildVarianceDrilldown(input: {
  row: QuarterlyCategoryRow
  costs: CostRecord[]
  reviews: ReviewItem[]
  budgetId: string
  organisationId: OrganisationId
}): VarianceDrilldown {
  const org = requireOrganisationId(input.organisationId)
  const contributingCosts = costsForBudgetLine(
    input.costs,
    input.budgetId,
    input.row.line.category,
    org,
  )
  const openReviews = input.reviews.filter(
    (r) =>
      r.state === 'open' &&
      contributingCosts.some((c) => c.id === r.costId),
  )
  const review = input.row.review
    const movement = input.row.forecastFinalMinor - input.row.priorForecastMinor
  const absMove = Math.abs(movement)
  const pounds = (absMove / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
  })
  const whatChanged =
    review?.explanation ??
    (movement === 0
      ? 'No material movement versus the previous forecast.'
      : `Forecast final moved ${movement > 0 ? 'up' : 'down'} by ${pounds} versus the prior quarter forecast.`)
  const whenChanged =
    contributingCosts[0]?.updatedAt?.slice(0, 10) ??
    contributingCosts[0]?.transactionDate ??
    '—'

  return {
    row: input.row,
    contributingCosts,
    openReviews,
    whatChanged,
    whenChanged,
    nature: review?.varianceNature ?? 'unknown',
    responsibleManager: review?.responsibleManager ?? 'Unassigned',
    recommendedAction:
      review?.recommendedAction ??
      review?.correctiveAction ??
      'Confirm forecast assumptions and evidence with the budget owner.',
    actionFinancialEffectMinor: review?.actionFinancialEffectMinor ?? 0,
    boardApprovalRequired: review?.boardApprovalRequired ?? input.row.light === 'red',
  }
}

export function quarterlyStatusLabel(status: QuarterlyReviewStatus): string {
  if (status === 'open') return 'Open'
  if (status === 'owner_confirmed') return 'Owner confirmed'
  if (status === 'finance_review') return 'Finance review'
  if (status === 'finance_approved') return 'Finance approved'
  return 'Locked'
}

/** Locked quarters are immutable — callers must create a new version for corrections. */
export function assertQuarterMutable(review: QuarterlyReview): void {
  if (review.status === 'locked') {
    throw new Error(
      `Quarter ${review.quarter} v${review.version} is locked. Create a new version for corrections.`,
    )
  }
}
