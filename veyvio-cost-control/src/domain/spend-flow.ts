import type { CostRecord } from './types'

export type SpendFlowPoint = {
  weekStart: string
  label: string
  actualMinor: number
  committedMinor: number
}

/** Monday UTC of the ISO week containing `isoDate` (YYYY-MM-DD). */
export function weekStartMonday(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const day = dt.getUTCDay() // 0 Sun … 6 Sat
  const offset = day === 0 ? -6 : 1 - day
  dt.setUTCDate(dt.getUTCDate() + offset)
  return dt.toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatWeekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

/**
 * Weekly Actual↑ / Committed↓ series for Sequence-style divergent chart.
 * Forecast is excluded from bars (shown as separate KPIs) to keep the visual honest.
 */
export function buildSpendFlowSeries(costs: CostRecord[]): SpendFlowPoint[] {
  const eligible = costs.filter(
    (c) =>
      c.validationState !== 'quarantined' &&
      (c.status === 'actual' || c.status === 'committed'),
  )
  if (!eligible.length) return []

  const byWeek = new Map<string, { actualMinor: number; committedMinor: number }>()
  let min = eligible[0].transactionDate.slice(0, 10)
  let max = min

  for (const c of eligible) {
    const day = c.transactionDate.slice(0, 10)
    if (day < min) min = day
    if (day > max) max = day
    const week = weekStartMonday(day)
    const row = byWeek.get(week) ?? { actualMinor: 0, committedMinor: 0 }
    const amount = c.gross.amountMinor
    if (c.status === 'actual') row.actualMinor += amount
    else row.committedMinor += amount
    byWeek.set(week, row)
  }

  const start = weekStartMonday(min)
  const end = weekStartMonday(max)
  const points: SpendFlowPoint[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    const row = byWeek.get(cursor) ?? { actualMinor: 0, committedMinor: 0 }
    points.push({
      weekStart: cursor,
      label: formatWeekLabel(cursor),
      actualMinor: row.actualMinor,
      committedMinor: row.committedMinor,
    })
  }
  return points
}
