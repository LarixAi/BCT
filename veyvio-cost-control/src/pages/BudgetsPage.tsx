import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FinancialViewsNav } from '../components/FinancialViewsNav'
import { MoneyText, StatusPill } from '../components/Money'
import { WorkspaceReadyBanner } from '../components/WorkspaceReadyBanner'
import { useCostStore } from '../data/CostStore'
import { FORMULA_VERSION } from '../domain/budget-equations'
import {
  quartersForFinancialYear,
  resolveProgrammeGovernance,
  trafficLabel,
  trafficLightForVariance,
  type PeriodScope,
  type TrafficLight,
} from '../domain/budget-governance'
import { buildCecBudgetHierarchy, computeLineVariance } from '../domain/budget-hierarchy'
import { BUDGET_EQUATION_LABELS } from '../domain/financial-views'
import { formatDate } from '../lib/labels'

export function BudgetsPage() {
  const {
    budget,
    budgetChanges,
    costs,
    lastValidSnapshot,
    organisation,
    quarterlyReview,
    workspaceError,
  } = useCostStore()
  const snap = lastValidSnapshot
  const [scope, setScope] = useState<PeriodScope>('ytd')
  const liveEmpty =
    organisation.id !== 'org_demo_cec' && budget.lines.length === 0 && costs.length === 0

  const variancePct = useMemo(() => {
    if (!snap || snap.approvedMinor === 0) return 0
    return ((snap.projectedFinalMinor - snap.approvedMinor) / snap.approvedMinor) * 100
  }, [snap])

  const hierarchy = buildCecBudgetHierarchy({
    organisationId: organisation.id,
    organisationName: organisation.tradingName,
    budget,
    costs,
  })

  const originalLines = budget.lines.reduce((s, l) => s + l.originalApprovedMinor, 0)
  const programme = resolveProgrammeGovernance(
    originalLines,
    budget.contingencyMinor,
    budgetChanges,
  )

  const quarters = quartersForFinancialYear(budget.financialYear)
  const overspend = snap ? snap.projectedRemainingMinor < 0 : false
  const light: TrafficLight = snap
    ? trafficLightForVariance({
        varianceToApprovedMinor: snap.varianceToApprovedMinor,
        approvedMinor: snap.approvedMinor,
        dataComplete: !liveEmpty,
      })
    : 'grey'

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Budget</h1>
          <p className="muted">
            {budget.name} · {budget.code} · FY {budget.financialYear} · revised v{budget.version}.
            Original approved baseline is immutable.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn-secondary" to="/budgets/quarterly">
            Quarterly review
          </Link>
          <Link className="btn-secondary" to="/board-pack">
            Board pack
          </Link>
        </div>
      </header>

      <FinancialViewsNav />

      {liveEmpty ? (
        <WorkspaceReadyBanner
          organisationName={organisation.tradingName}
          workspaceError={workspaceError}
        />
      ) : null}

      <p className="callout info">
        Accountants start from the cost ledger and bank reconciliation. Budget, forecast, cash flow
        and management accounts are views of that trusted data — not separate write paths.
      </p>

      <nav className="budget-breadcrumb" aria-label="Budget hierarchy">
        <span>{hierarchy.label}</span>
        <span aria-hidden>›</span>
        <span>{hierarchy.children[0]?.label}</span>
        <span aria-hidden>›</span>
        <strong>{budget.code}</strong>
      </nav>

      <div className="ops-filters" style={{ marginBottom: '0.75rem' }}>
        <label className="ops-filter-field">
          <span>Period</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as PeriodScope)}>
            <option value="ytd">Year to date</option>
            {quarters.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <div className="ops-filter-field">
          <span>Quarter lock</span>
          <div>
            <StatusPill
              tone={
                quarterlyReview.status === 'locked'
                  ? 'healthy'
                  : quarterlyReview.status === 'finance_review'
                    ? 'attention'
                    : 'info'
              }
            >
              {quarterlyReview.quarter} · {quarterlyReview.status.replaceAll('_', ' ')}
            </StatusPill>
          </div>
        </div>
        <div className="ops-filter-field">
          <span>Traffic light</span>
          <div>
            <TrafficPill light={light} />
          </div>
        </div>
        <div className="ops-filter-field">
          <span>Scope note</span>
          <div className="muted small">
            {scope === 'ytd'
              ? 'YTD selector filters the quarterly review drill — programme KPIs stay full-year.'
              : `${scope} window ${quarters.find((q) => q.id === scope)?.start} → ${quarters.find((q) => q.id === scope)?.end}`}
          </div>
        </div>
      </div>

      <div className="kpi-grid dense">
        <Kpi
          label="Original approved budget"
          value={<MoneyText amountMinor={programme.originalApprovedMinor} />}
          hint="Immutable baseline"
        />
        <Kpi
          label="Approved budget changes"
          value={<MoneyText amountMinor={programme.changesMinor} />}
          hint={`${budgetChanges.length} tracked change(s)`}
        />
        <Kpi
          label="Current revised budget"
          value={<MoneyText amountMinor={programme.revisedApprovedMinor} />}
          hint="Original + approved changes"
        />
        {snap ? (
          <>
            <Kpi
              label={BUDGET_EQUATION_LABELS.availableNow.label}
              value={<MoneyText amountMinor={snap.availableMinor} />}
              hint={BUDGET_EQUATION_LABELS.availableNow.formula}
            />
            <Kpi
              label="Actual"
              value={<MoneyText amountMinor={snap.actualMinor} status="actual" />}
            />
            <Kpi
              label="Committed"
              value={<MoneyText amountMinor={snap.committedMinor} status="committed" />}
            />
            <Kpi
              label="Forecast"
              value={<MoneyText amountMinor={snap.forecastMinor} status="forecast" />}
            />
            <Kpi
              label={BUDGET_EQUATION_LABELS.projectedFinal.label}
              value={<MoneyText amountMinor={snap.projectedFinalMinor} />}
              hint={BUDGET_EQUATION_LABELS.projectedFinal.formula}
            />
            <Kpi
              label={BUDGET_EQUATION_LABELS.projectedRemaining.label}
              value={<MoneyText amountMinor={snap.projectedRemainingMinor} />}
              hint={BUDGET_EQUATION_LABELS.projectedRemaining.formula}
              tone={overspend ? 'critical' : 'healthy'}
            />
            <Kpi
              label="Variance amount"
              value={<MoneyText amountMinor={snap.projectedFinalMinor - snap.approvedMinor} />}
              tone={overspend ? 'critical' : 'healthy'}
              hint={`${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(1)}% vs revised approved`}
            />
            <Kpi
              label="Movement since last review"
              value={<MoneyText amountMinor={quarterlyReview.movementSinceLastReviewMinor} />}
              hint={quarterlyReview.lastReviewLabel}
            />
          </>
        ) : null}
      </div>

      <div className="split">
        <section className="panel">
          <h2>Approved budget changes</h2>
          {budgetChanges.length ? (
            <ul className="stack-list">
              {budgetChanges.map((c) => (
                <li key={c.id}>
                  <strong>
                    <MoneyText amountMinor={c.amountMinor} />
                  </strong>{' '}
                  · {c.reason}
                  <div className="muted small">
                    {c.approvedBy} · {formatDate(c.approvedAt)}
                    {c.boardRequired ? ' · Board approved' : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No approved changes — revised budget equals original baseline.</p>
          )}
        </section>
        <section className="panel">
          <h2>Equation definitions</h2>
          <ul className="stack-list">
            <li>
              <strong>Available now</strong> — {BUDGET_EQUATION_LABELS.availableNow.formula}
            </li>
            <li>
              <strong>Projected final cost</strong> — {BUDGET_EQUATION_LABELS.projectedFinal.formula}
            </li>
            <li>
              <strong>Projected remaining</strong> —{' '}
              {BUDGET_EQUATION_LABELS.projectedRemaining.formula}
            </li>
          </ul>
          <p className="muted small">Formula {FORMULA_VERSION}. Traffic: {trafficLabel(light)}.</p>
        </section>
      </div>

      <section className="panel">
        <h2>Budget lines — variance drill</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Owner</th>
                <th className="num">Original</th>
                <th className="num">Changes</th>
                <th className="num">Revised</th>
                <th className="num">Actual</th>
                <th className="num">Committed</th>
                <th className="num">Forecast</th>
                <th className="num">Projected final</th>
                <th className="num">Variance</th>
                <th className="num">Prior forecast</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {budget.lines.length === 0 ? (
                <tr>
                  <td colSpan={12} className="muted">
                    No budget lines yet — import or approve category lines to start variance drill.
                  </td>
                </tr>
              ) : null}
              {budget.lines.map((line) => {
                const variance = computeLineVariance(line, costs, budget.id, organisation.id)
                const pos = variance.position
                const changesMinor = line.approvedMinor - line.originalApprovedMinor
                const prior =
                  quarterlyReview.priorForecastByLineId[line.id] ?? pos.projectedFinalMinor
                const varAmt = pos.projectedFinalMinor - line.approvedMinor
                const lineLight = trafficLightForVariance({
                  varianceToApprovedMinor: -varAmt,
                  approvedMinor: line.approvedMinor,
                  dataComplete: true,
                })
                const lineReview = quarterlyReview.lineReviews.find((r) => r.lineId === line.id)
                return (
                  <tr key={line.id} className={variance.overProjected ? 'row-attention' : undefined}>
                    <td>
                      <Link to={`/budgets/lines/${line.id}`} className="person-name-link">
                        {line.label}
                      </Link>
                    </td>
                    <td>
                      <div>{line.ownerName}</div>
                      <div className="muted small">{line.ownerRole}</div>
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={line.originalApprovedMinor} />
                    </td>
                    <td className="num">
                      {changesMinor ? <MoneyText amountMinor={changesMinor} /> : '—'}
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={line.approvedMinor} />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={pos.actualMinor} status="actual" />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={pos.committedMinor} status="committed" />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={pos.forecastMinor} status="forecast" />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={pos.projectedFinalMinor} />
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={varAmt} />
                      <div className="muted small">
                        {(variance.variancePercentHundredths / 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={prior} />
                    </td>
                    <td>
                      <TrafficPill light={lineLight} />
                      {lineReview?.explanation ? (
                        <div className="muted small" style={{ marginTop: '0.25rem', maxWidth: '10rem' }}>
                          {lineReview.explanation}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td>
                  Contingency <StatusPill tone="info">Reserved</StatusPill>
                </td>
                <td className="muted">Finance Director</td>
                <td className="num">
                  <MoneyText amountMinor={budget.contingencyMinor} />
                </td>
                <td className="num">—</td>
                <td className="num">
                  <MoneyText amountMinor={budget.contingencyMinor} />
                </td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Open a line for contributing transactions, corrective action and target date. Period
          filter: <strong>{scope.toUpperCase()}</strong>.
        </p>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'healthy' | 'critical'
}) {
  return (
    <div className={`kpi ${tone ?? ''}`.trim()}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint ? <div className="kpi-hint">{hint}</div> : null}
    </div>
  )
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
