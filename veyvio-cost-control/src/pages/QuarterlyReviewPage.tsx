import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FinancialViewsNav } from '../components/FinancialViewsNav'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import type { TrafficLight } from '../domain/budget-governance'
import {
  buildQuarterlyCategoryRows,
  buildVarianceDrilldown,
  quarterlyStatusLabel,
  type QuarterlyCategoryRow,
} from '../domain/quarterly-review'
import { formatDate } from '../lib/labels'

function formatMoneyishLocal(minor: number): string {
  return (minor / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })
}

export function QuarterlyReviewPage() {
  const {
    organisation,
    budget,
    budgetChanges,
    costs,
    reviews,
    quarantine,
    quarterlyReview,
    sageIntegration,
  } = useCostStore()
  const [selected, setSelected] = useState<QuarterlyCategoryRow | null>(null)

  const revisedApprovedByLineId = useMemo(() => {
    const map: Record<string, number> = {}
    for (const line of budget.lines) {
      const delta = budgetChanges
        .filter((c) => c.lineId === line.id)
        .reduce((s, c) => s + c.amountMinor, 0)
      map[line.id] = line.originalApprovedMinor + delta
    }
    return map
  }, [budget.lines, budgetChanges])

  const rows = useMemo(
    () =>
      buildQuarterlyCategoryRows({
        organisationId: organisation.id,
        budget,
        costs,
        review: quarterlyReview,
        revisedApprovedByLineId,
      }),
    [organisation.id, budget, costs, quarterlyReview, revisedApprovedByLineId],
  )

  const drill = selected
    ? buildVarianceDrilldown({
        row: selected,
        costs,
        reviews,
        budgetId: budget.id,
        organisationId: organisation.id,
      })
    : null

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.annualBudgetMinor += row.annualBudgetMinor
        acc.quarterBudgetMinor += row.quarterBudgetMinor
        acc.quarterActualMinor += row.quarterActualMinor
        acc.forecastFinalMinor += row.forecastFinalMinor
        return acc
      },
      {
        annualBudgetMinor: 0,
        quarterBudgetMinor: 0,
        quarterActualMinor: 0,
        forecastFinalMinor: 0,
      },
    )
  }, [rows])

  const materialRows = useMemo(
    () =>
      [...rows]
        .filter(
          (row) =>
            row.light === 'red' ||
            row.light === 'amber' ||
            row.review?.boardApprovalRequired ||
            Math.abs(row.varianceMinor) >= 5_000_00,
        )
        .sort((a, b) => sortFinancialEffect(b) - sortFinancialEffect(a)),
    [rows],
  )

  const routineRows = useMemo(
    () => rows.filter((row) => !materialRows.some((material) => material.line.id === row.line.id)),
    [rows, materialRows],
  )

  const openReviews = reviews.filter((r) => r.state === 'open').length
  const unresolvedEvidence = quarantine.length
  const unresolvedIntegrationExceptions = sageIntegration.failedExports.length
  const varianceApprovalsComplete = materialRows.every(
    (row) =>
      !!row.review?.explanation &&
      !!row.review?.responsibleManager &&
      !!row.review?.recommendedAction,
  )
  const gates = [
    { label: 'Reconciliations complete', passed: openReviews === 0 },
    { label: 'Evidence complete', passed: unresolvedEvidence === 0 },
    {
      label: 'Accounting integration exceptions resolved',
      passed: unresolvedIntegrationExceptions === 0,
    },
    { label: 'Variance approvals complete', passed: varianceApprovalsComplete },
    {
      label: 'Finance approved before lock',
      passed:
        quarterlyReview.status === 'finance_approved' || quarterlyReview.status === 'locked',
    },
  ]
  const progressPercent = Math.round((gates.filter((gate) => gate.passed).length / gates.length) * 100)
  const boardDecisions = materialRows.filter((row) => row.review?.boardApprovalRequired)

  useEffect(() => {
    if (!selected && materialRows[0]) setSelected(materialRows[0])
  }, [selected, materialRows])

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      <header className="page-header">
        <div>
          <h1>Quarterly budget review</h1>
          <p className="muted">
            {quarterlyReview.quarter} {quarterlyReview.financialYear} · v{quarterlyReview.version} ·{' '}
            {formatDate(quarterlyReview.periodStart)} – {formatDate(quarterlyReview.periodEnd)}
          </p>
        </div>
        <StatusPill
          tone={
            quarterlyReview.status === 'locked'
              ? 'healthy'
              : quarterlyReview.status === 'finance_review'
                ? 'attention'
                : 'info'
          }
        >
          {quarterlyStatusLabel(quarterlyReview.status)}
        </StatusPill>
      </header>

      <FinancialViewsNav />

      <section className="panel">
        <h2>Quarter close position</h2>
        <div className="kpi-grid dense">
          <div className="kpi">
            <div className="kpi-label">Quarter actual vs phased budget</div>
            <div className="kpi-value">
              <MoneyText amountMinor={totals.quarterActualMinor} status="actual" />
            </div>
            <div className="muted small">
              Budget <MoneyText amountMinor={totals.quarterBudgetMinor} /> ·{' '}
              {varianceWord(totals.quarterActualMinor - totals.quarterBudgetMinor)}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Full-year forecast vs annual budget</div>
            <div className="kpi-value">
              <MoneyText amountMinor={totals.forecastFinalMinor} />
            </div>
            <div className="muted small">
              Budget <MoneyText amountMinor={totals.annualBudgetMinor} /> ·{' '}
              {varianceWord(totals.forecastFinalMinor - totals.annualBudgetMinor)}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Movement since previous review</div>
            <div className="kpi-value">
              <MoneyText amountMinor={quarterlyReview.movementSinceLastReviewMinor} />
            </div>
            <div className="muted small">{quarterlyReview.lastReviewLabel}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Close progress</div>
            <div className="kpi-value">{progressPercent}%</div>
            <div
              aria-hidden
              style={{
                marginTop: '0.5rem',
                height: '0.45rem',
                borderRadius: '999px',
                background: 'var(--mist)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent === 100 ? 'var(--healthy)' : 'var(--teal)',
                }}
              />
            </div>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          A locked quarterly snapshot never changes. Later corrections create a new version with an
          audit trail.
        </p>
      </section>

      <div className="split">
        <section className="panel">
          <h2>Material variances</h2>
          <p className="muted">
            Material movements are ordered by financial effect. Routine categories are shown lower
            down.
          </p>
          <div className="exception-list">
            {materialRows.map((row) => (
              <button
                key={row.line.id}
                type="button"
                className="exception-card"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background:
                    selected?.line.id === row.line.id ? 'color-mix(in srgb, var(--teal) 7%, white)' : undefined,
                }}
                onClick={() => setSelected(row)}
              >
                <TrafficPill light={row.light} />
                <div>
                  <h3>{row.line.label}</h3>
                  <p className="muted">
                    {varianceWord(row.varianceMinor)} · prior forecast{' '}
                    {movementWord(row.forecastFinalMinor - row.priorForecastMinor)}.
                  </p>
                  <p className="muted small">
                    Owner {row.review?.responsibleManager ?? 'Unassigned'} · action effect{' '}
                    <MoneyText amountMinor={row.review?.actionFinancialEffectMinor ?? row.varianceMinor} />{' '}
                    · {(row.variancePercentHundredths / 100).toFixed(1)}%
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Selected variance</h2>
          {drill ? (
            <>
              <div className="kpi-grid dense">
                <div className="kpi">
                  <div className="kpi-label">Effect on annual budget</div>
                  <div className="kpi-value">
                    <MoneyText amountMinor={drill.row.varianceMinor} />
                  </div>
                  <div className="muted small">{varianceWord(drill.row.varianceMinor)}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Decision owner</div>
                  <div className="kpi-value">{drill.responsibleManager}</div>
                  <div className="muted small">
                    {drill.boardApprovalRequired ? 'Board decision required' : 'Finance / owner decision'}
                  </div>
                </div>
              </div>
              <dl className="detail-grid" style={{ marginTop: '1rem' }}>
                <dt>Cause</dt>
                <dd>{drill.whatChanged}</dd>
                <dt>Proposed action</dt>
                <dd>{drill.recommendedAction}</dd>
                <dt>Corrective action / target</dt>
                <dd>
                  {drill.row.review?.correctiveAction ?? '—'}
                  {drill.row.review?.targetDate ? ` · Target ${formatDate(drill.row.review.targetDate)}` : ''}
                </dd>
                <dt>Financial effect of action</dt>
                <dd>
                  <MoneyText amountMinor={drill.actionFinancialEffectMinor} />
                </dd>
                <dt>Open issues</dt>
                <dd>
                  {drill.openReviews.length
                    ? `${drill.openReviews.length} unresolved review(s)`
                    : 'No unresolved review on this line'}
                </dd>
              </dl>
              {drill.openReviews.length ? (
                <p className="callout attention" style={{ marginTop: '1rem' }}>
                  Evidence or reconciliation is still open on this line — <Link to="/reviews">open reviews</Link>.
                </p>
              ) : null}
            </>
          ) : (
            <p className="muted">Select a material category to see cause, owner and corrective action.</p>
          )}
        </section>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Lock gates</h2>
          <ul className="stack-list">
            {gates.map((gate) => (
              <li key={gate.label}>
                <StatusPill tone={gate.passed ? 'healthy' : 'attention'}>
                  {gate.passed ? 'Complete' : 'Open'}
                </StatusPill>{' '}
                {gate.label}
              </li>
            ))}
          </ul>
          {gates.every((gate) => gate.passed) ? (
            <p className="callout healthy" style={{ marginTop: '1rem' }}>
              Quarter is ready for lock.
            </p>
          ) : (
            <p className="callout attention" style={{ marginTop: '1rem' }}>
              Quarter cannot be locked until reconciliations, evidence and variance approvals are complete.
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Board decisions required</h2>
          {boardDecisions.length ? (
            <ul className="stack-list">
              {boardDecisions.map((row) => (
                <li key={row.line.id}>
                  <strong>{row.line.label}</strong> — {row.review?.recommendedAction ?? 'Decision required'}.
                  <div className="muted small">
                    Owner {row.review?.responsibleManager ?? 'Unassigned'} · effect{' '}
                    <MoneyText amountMinor={row.review?.actionFinancialEffectMinor ?? row.varianceMinor} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No board decisions are currently required.</p>
          )}
        </section>
      </div>

      {openReviews > 0 || unresolvedEvidence > 0 || unresolvedIntegrationExceptions > 0 ? (
        <section className="panel">
          <h2>Unresolved close issues</h2>
          <ul className="stack-list">
            {openReviews > 0 ? (
              <li>
                <strong>{openReviews} open review(s)</strong> still need reconciliation or approval.
              </li>
            ) : null}
            {unresolvedEvidence > 0 ? (
              <li>
                <strong>{unresolvedEvidence} quarantined import row(s)</strong> still require evidence or correction.
              </li>
            ) : null}
            {unresolvedIntegrationExceptions > 0 ? (
              <li>
                <strong>
                  {unresolvedIntegrationExceptions} Sage integration exception(s)
                </strong>{' '}
                must be corrected and retried before the quarter can be locked.{' '}
                <Link to="/reviews">Open integration exceptions</Link>.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {routineRows.length ? (
        <section className="panel">
          <h2>Routine categories</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Quarter actual</th>
                  <th className="num">Quarter budget</th>
                  <th className="num">Forecast final</th>
                  <th className="num">Annual budget</th>
                  <th className="num">Variance</th>
                </tr>
              </thead>
              <tbody>
                {routineRows.map((row) => (
                  <tr key={row.line.id}>
                    <td>{row.line.label}</td>
                    <td className="num">
                      <MoneyText amountMinor={row.quarterActualMinor} status="actual" />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={row.quarterBudgetMinor} />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={row.forecastFinalMinor} />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={row.annualBudgetMinor} />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={row.varianceMinor} />
                      <div className="muted small">{varianceWord(row.varianceMinor)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {drill ? (
        <section className="panel">
          <h2>Supporting transactions</h2>
          <ul className="stack-list">
            {drill.contributingCosts.slice(0, 12).map((c) => (
              <li key={c.id}>
                {formatDate(c.transactionDate)} · {c.supplierName} · {c.description} ·{' '}
                <MoneyText amountMinor={c.gross.amountMinor} status={c.status} />
              </li>
            ))}
          </ul>
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            Variance {formatMoneyishLocal(drill.row.varianceMinor)} versus revised annual budget.
          </p>
        </section>
      ) : null}
    </div>
  )
}

function sortFinancialEffect(row: QuarterlyCategoryRow): number {
  return Math.abs(row.review?.actionFinancialEffectMinor ?? row.varianceMinor)
}

function varianceWord(minor: number): string {
  if (minor > 0) return `Adverse ${formatMoneyishLocal(minor)}`
  if (minor < 0) return `Favourable ${formatMoneyishLocal(Math.abs(minor))}`
  return 'Flat to plan'
}

function movementWord(minor: number): string {
  if (minor > 0) return `moved up ${formatMoneyishLocal(minor)}`
  if (minor < 0) return `moved down ${formatMoneyishLocal(Math.abs(minor))}`
  return 'unchanged'
}

function TrafficPill({ light }: { light: TrafficLight }) {
  const tone =
    light === 'green'
      ? 'healthy'
      : light === 'amber'
        ? 'attention'
        : light === 'red'
          ? 'critical'
          : 'neutral'
  const label =
    light === 'green' ? 'Green' : light === 'amber' ? 'Amber' : light === 'red' ? 'Red' : 'Grey'
  return <StatusPill tone={tone}>{label}</StatusPill>
}
