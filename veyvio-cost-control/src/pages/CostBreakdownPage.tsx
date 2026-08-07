import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import type { CostLifecycleStatus, CostRecord } from '../domain/types'
import {
  categoryLabel,
  costCentreLabel,
  formatPeriod,
} from '../lib/labels'

type Dimension = 'category' | 'supplier' | 'vehicle' | 'cost_centre'
type PeriodFilter = 'all' | string
type BreakdownRow = {
  id: string
  label: string
  actualMinor: number
  committedMinor: number
  forecastMinor: number
  totalMinor: number
  budgetMinor: number | null
  transactionCount: number
  evidenceMissing: number
  openReviews: number
}

const DIMENSIONS: Array<{ id: Dimension; label: string }> = [
  { id: 'category', label: 'Category' },
  { id: 'supplier', label: 'Supplier' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'cost_centre', label: 'Cost centre' },
]

export function CostBreakdownPage() {
  const { costs, budget, reviews } = useCostStore()
  const [dimension, setDimension] = useState<Dimension>('category')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [query, setQuery] = useState('')

  const periods = useMemo(
    () => ['all', ...new Set(costs.map((cost) => cost.accountingPeriod).sort().reverse())],
    [costs],
  )
  const scopedCosts = useMemo(
    () => costs.filter((cost) => period === 'all' || cost.accountingPeriod === period),
    [costs, period],
  )
  const rows = useMemo(
    () => buildBreakdownRows(scopedCosts, dimension, budget.lines, reviews),
    [budget.lines, dimension, reviews, scopedCosts],
  )
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => !needle || row.label.toLowerCase().includes(needle))
  }, [query, rows])

  const totals = useMemo(
    () =>
      scopedCosts.reduce(
        (sum, cost) => {
          const bucket =
            cost.status === 'actual'
              ? 'actualMinor'
              : cost.status === 'committed'
                ? 'committedMinor'
                : 'forecastMinor'
          sum[bucket] += cost.gross.amountMinor
          return sum
        },
        { actualMinor: 0, committedMinor: 0, forecastMinor: 0 },
      ),
    [scopedCosts],
  )
  const projectedMinor = totals.actualMinor + totals.committedMinor + totals.forecastMinor
  const approvedMinor = budget.lines.reduce((sum, line) => sum + line.approvedMinor, 0)
  const remainingMinor = approvedMinor - projectedMinor
  const highest = rows[0]
  const maxRowTotal = Math.max(...visibleRows.map((row) => row.totalMinor), 1)

  return (
    <div className="page cost-breakdown-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analyse</p>
          <h1>Cost breakdown</h1>
          <p className="muted">
            Understand where money has been spent, committed or forecast — without mixing in income
            or booking information.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              downloadBreakdownCsv({
                budgetCode: budget.code,
                dimension,
                period,
                rows: visibleRows,
              })
            }
          >
            Download breakdown
          </button>
          <Link className="btn-secondary" to="/costs">
            Open cost ledger
          </Link>
        </div>
      </header>

      <nav className="page-subnav" aria-label="Cost analysis dimension">
        {DIMENSIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`page-chip ${dimension === item.id ? 'active' : ''}`}
            onClick={() => setDimension(item.id)}
          >
            By {item.label.toLowerCase()}
          </button>
        ))}
      </nav>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Actual cost</div>
          <div className="kpi-value">
            <MoneyText amountMinor={totals.actualMinor} status="actual" />
          </div>
          <div className="kpi-hint">Money already incurred</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Committed cost</div>
          <div className="kpi-value">
            <MoneyText amountMinor={totals.committedMinor} status="committed" />
          </div>
          <div className="kpi-hint">Approved obligations not yet actual</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Forecast cost</div>
          <div className="kpi-value">
            <MoneyText amountMinor={totals.forecastMinor} status="forecast" />
          </div>
          <div className="kpi-hint">Forecast and estimated costs</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Projected remaining</div>
          <div className={`kpi-value ${remainingMinor < 0 ? 'text-critical' : ''}`}>
            <MoneyText amountMinor={remainingMinor} />
          </div>
          <div className="kpi-hint">Approved budget less projected cost</div>
        </div>
      </div>

      <section className="panel breakdown-controls">
        <label>
          <span>Accounting period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            {periods.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'Whole financial year' : formatPeriod(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Find {DIMENSIONS.find((item) => item.id === dimension)?.label.toLowerCase()}</span>
          <input
            className="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search by ${dimension.replace('_', ' ')}`}
          />
        </label>
        <div className="breakdown-scope">
          <span>{scopedCosts.length} cost records</span>
          <strong>
            <MoneyText amountMinor={projectedMinor} /> projected
          </strong>
        </div>
      </section>

      {dimension === 'category' ? (
        <p className="callout info">
          Category budget comparisons use the approved CEC budget lines. Other views distribute
          costs using ledger allocations and are shown for management analysis.
        </p>
      ) : null}

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Projected cost by {dimension.replace('_', ' ')}</h2>
            <p className="muted">
              Actual + committed + forecast. Select a row in the table below to open its underlying
              ledger records.
            </p>
          </div>
          {highest ? (
            <div className="breakdown-highlight">
              <span>Largest area</span>
              <strong>{highest.label}</strong>
              <MoneyText amountMinor={highest.totalMinor} />
            </div>
          ) : null}
        </div>
        <div className="breakdown-bars">
          {visibleRows.slice(0, 10).map((row) => (
            <article key={row.id}>
              <div className="breakdown-bar-label">
                <strong>{row.label}</strong>
                <MoneyText amountMinor={row.totalMinor} />
              </div>
              <div className="breakdown-bar-track" aria-hidden="true">
                <span
                  className="actual"
                  style={{ width: `${(row.actualMinor / maxRowTotal) * 100}%` }}
                />
                <span
                  className="committed"
                  style={{ width: `${(row.committedMinor / maxRowTotal) * 100}%` }}
                />
                <span
                  className="forecast"
                  style={{ width: `${(row.forecastMinor / maxRowTotal) * 100}%` }}
                />
              </div>
            </article>
          ))}
        </div>
        <div className="breakdown-legend" aria-label="Chart legend">
          <span><i className="actual" />Actual</span>
          <span><i className="committed" />Committed</span>
          <span><i className="forecast" />Forecast / estimated</span>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Detailed breakdown</h2>
            <p className="muted">Amounts are stored and calculated in integer pence.</p>
          </div>
          <span className="muted small">
            Showing {visibleRows.length}{' '}
            {visibleRows.length === 1
              ? dimensionLabel(dimension).toLowerCase()
              : dimensionPlural(dimension).toLowerCase()}
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table breakdown-table">
            <thead>
              <tr>
                <th>{DIMENSIONS.find((item) => item.id === dimension)?.label}</th>
                <th className="num">Actual</th>
                <th className="num">Committed</th>
                <th className="num">Forecast</th>
                <th className="num">Projected</th>
                {dimension === 'category' ? <th className="num">Budget remaining</th> : null}
                <th>Controls</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const budgetRemaining =
                  row.budgetMinor === null ? null : row.budgetMinor - row.totalMinor
                return (
                  <tr key={row.id}>
                    <td>
                      <Link to={costLink(dimension, row.id)}>
                        <strong>{row.label}</strong>
                      </Link>
                      <small>
                        {row.transactionCount} ledger record
                        {row.transactionCount === 1 ? '' : 's'}
                      </small>
                    </td>
                    <td className="num"><MoneyText amountMinor={row.actualMinor} /></td>
                    <td className="num"><MoneyText amountMinor={row.committedMinor} /></td>
                    <td className="num"><MoneyText amountMinor={row.forecastMinor} /></td>
                    <td className="num"><strong><MoneyText amountMinor={row.totalMinor} /></strong></td>
                    {dimension === 'category' ? (
                      <td className="num">
                        {budgetRemaining === null ? (
                          <span className="muted">No budget line</span>
                        ) : (
                          <MoneyText amountMinor={budgetRemaining} />
                        )}
                      </td>
                    ) : null}
                    <td>
                      {row.evidenceMissing || row.openReviews ? (
                        <StatusPill tone="attention">
                          {row.openReviews} open review
                          {row.openReviews === 1 ? '' : 's'} · {row.evidenceMissing} missing document
                          {row.evidenceMissing === 1 ? '' : 's'}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="healthy">No open controls</StatusPill>
                      )}
                    </td>
                  </tr>
                )
              })}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={dimension === 'category' ? 7 : 6} className="empty-cell">
                    No costs match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function buildBreakdownRows(
  costs: CostRecord[],
  dimension: Dimension,
  budgetLines: ReturnType<typeof useCostStore>['budget']['lines'],
  reviews: ReturnType<typeof useCostStore>['reviews'],
): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow>()
  const openReviewCostIds = new Set(
    reviews.filter((review) => review.state === 'open').map((review) => review.costId),
  )

  const add = (id: string, label: string, cost: CostRecord, amountMinor: number) => {
    const matchingBudgetLines =
      dimension === 'category' ? budgetLines.filter((line) => line.category === id) : []
    const row = rows.get(id) ?? {
      id,
      label,
      actualMinor: 0,
      committedMinor: 0,
      forecastMinor: 0,
      totalMinor: 0,
      budgetMinor:
        dimension === 'category'
          ? matchingBudgetLines.length
            ? matchingBudgetLines.reduce((sum, line) => sum + line.approvedMinor, 0)
            : null
          : null,
      transactionCount: 0,
      evidenceMissing: 0,
      openReviews: 0,
    }
    const lifecycle: CostLifecycleStatus =
      cost.status === 'estimated' ? 'forecast' : cost.status
    if (lifecycle === 'actual') row.actualMinor += amountMinor
    if (lifecycle === 'committed') row.committedMinor += amountMinor
    if (lifecycle === 'forecast') row.forecastMinor += amountMinor
    row.totalMinor += amountMinor
    row.transactionCount += 1
    if (cost.status === 'actual' && cost.evidence.length === 0) row.evidenceMissing += 1
    if (openReviewCostIds.has(cost.id)) row.openReviews += 1
    rows.set(id, row)
  }

  for (const cost of costs) {
    if (dimension === 'category') {
      add(cost.category, categoryLabel(cost.category), cost, cost.gross.amountMinor)
      continue
    }
    if (dimension === 'supplier') {
      add(cost.supplierName, cost.supplierName, cost, cost.gross.amountMinor)
      continue
    }
    if (dimension === 'vehicle' || dimension === 'cost_centre') {
      const allocations = cost.allocations.filter((allocation) =>
        dimension === 'vehicle' ? allocation.vehicleId : allocation.costCentreId,
      )
      if (allocations.length) {
        allocations.forEach((allocation) => {
          const id =
            dimension === 'vehicle'
              ? allocation.vehicleId ?? 'unallocated'
              : allocation.costCentreId ?? 'unallocated'
          add(
            id,
            dimension === 'vehicle' ? id : costCentreLabel(id),
            cost,
            allocation.amountMinor,
          )
        })
        const allocatedMinor = allocations.reduce(
          (sum, allocation) => sum + allocation.amountMinor,
          0,
        )
        if (allocatedMinor < cost.gross.amountMinor) {
          add(
            'unallocated',
            'Unallocated',
            cost,
            cost.gross.amountMinor - allocatedMinor,
          )
        }
      } else {
        add('unallocated', 'Unallocated', cost, cost.gross.amountMinor)
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.totalMinor - a.totalMinor)
}

function dimensionLabel(dimension: Dimension): string {
  return DIMENSIONS.find((item) => item.id === dimension)?.label ?? dimension
}

function dimensionPlural(dimension: Dimension): string {
  if (dimension === 'category') return 'Categories'
  if (dimension === 'supplier') return 'Suppliers'
  if (dimension === 'vehicle') return 'Vehicles'
  return 'Cost centres'
}

function costLink(dimension: Dimension, id: string): string {
  if (dimension === 'vehicle' && id !== 'unallocated') return `/vehicles/${encodeURIComponent(id)}`
  return '/costs'
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadBreakdownCsv(input: {
  budgetCode: string
  dimension: Dimension
  period: PeriodFilter
  rows: BreakdownRow[]
}) {
  const headers = [
    'budget_code',
    'period',
    'dimension',
    'dimension_id',
    'dimension_label',
    'actual_minor',
    'committed_minor',
    'forecast_minor',
    'projected_minor',
    'approved_budget_minor',
    'transaction_count',
    'missing_evidence_count',
    'open_review_count',
  ]
  const values = input.rows.map((row) => [
    input.budgetCode,
    input.period,
    input.dimension,
    row.id,
    row.label,
    row.actualMinor,
    row.committedMinor,
    row.forecastMinor,
    row.totalMinor,
    row.budgetMinor ?? '',
    row.transactionCount,
    row.evidenceMissing,
    row.openReviews,
  ])
  const csv = [headers, ...values]
    .map((row) => row.map((value) => csvCell(value)).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${input.budgetCode.toLowerCase()}-${input.dimension.replace('_', '-')}-cost-breakdown.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
