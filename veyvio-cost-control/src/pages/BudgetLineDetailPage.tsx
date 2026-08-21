import { Link, useParams } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import { computeLineVariance, findBudgetLine } from '../domain/budget-hierarchy'
import { formatDate } from '../lib/labels'

/** Category / line variance drill — Blueprint §7 CEC budget. */
export function BudgetLineDetailPage() {
  const { lineId = '' } = useParams()
  const { budget, costs, organisation, quarterlyReview } = useCostStore()
  const line = findBudgetLine(budget, lineId)

  if (!line) {
    return (
      <div className="page">
        <p className="callout critical">Budget line not found.</p>
        <Link to="/budgets" className="btn-ghost">
          Back to CEC budget
        </Link>
      </div>
    )
  }

  const variance = computeLineVariance(line, costs, budget.id, organisation.id)
  const over = variance.overProjected
  const lineReview = quarterlyReview.lineReviews.find((r) => r.lineId === line.id)
  const prior =
    quarterlyReview.priorForecastByLineId[line.id] ?? variance.position.projectedFinalMinor
  const changesMinor = line.approvedMinor - line.originalApprovedMinor

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="person-profile-eyebrow">
            {organisation.tradingName} · {budget.code} · {budget.financialYear}
          </p>
          <h1>{line.label}</h1>
          <p className="muted">
            Owner {line.ownerName} ({line.ownerRole}). Original approved baseline remains immutable.
          </p>
        </div>
        <div className="page-header-actions">
          {over ? (
            <StatusPill tone="critical">Over projected</StatusPill>
          ) : (
            <StatusPill tone="healthy">Within budget</StatusPill>
          )}
          <Link to="/budgets/quarterly" className="btn-secondary">
            Quarterly review
          </Link>
          <Link to="/budgets" className="btn-ghost">
            CEC budget
          </Link>
        </div>
      </header>

      <nav className="budget-breadcrumb" aria-label="Budget hierarchy">
        <span>{organisation.tradingName}</span>
        <span aria-hidden>›</span>
        <span>FY {budget.financialYear}</span>
        <span aria-hidden>›</span>
        <Link to="/budgets">{budget.code}</Link>
        <span aria-hidden>›</span>
        <strong>{line.label}</strong>
      </nav>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Original approved</div>
          <div className="kpi-value">
            <MoneyText amountMinor={line.originalApprovedMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Approved changes</div>
          <div className="kpi-value">
            <MoneyText amountMinor={changesMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Current revised</div>
          <div className="kpi-value">
            <MoneyText amountMinor={line.approvedMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Actual</div>
          <div className="kpi-value">
            <MoneyText amountMinor={variance.position.actualMinor} status="actual" />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Committed</div>
          <div className="kpi-value">
            <MoneyText amountMinor={variance.position.committedMinor} status="committed" />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Forecast</div>
          <div className="kpi-value">
            <MoneyText amountMinor={variance.position.forecastMinor} status="forecast" />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Projected final</div>
          <div className="kpi-value">
            <MoneyText amountMinor={variance.position.projectedFinalMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Projected remaining</div>
          <div className={`kpi-value${over ? ' tone-critical' : ''}`.trim()}>
            <MoneyText amountMinor={variance.position.projectedRemainingMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Variance vs revised</div>
          <div className={`kpi-value${over ? ' tone-critical' : ''}`.trim()}>
            {(variance.variancePercentHundredths / 100).toFixed(1)}%
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Prior-quarter forecast</div>
          <div className="kpi-value">
            <MoneyText amountMinor={prior} />
          </div>
        </div>
      </div>

      {lineReview ? (
        <section className="panel">
          <h2>Variance explanation & corrective action</h2>
          <dl className="detail-grid">
            <dt>Explanation</dt>
            <dd>{lineReview.explanation ?? '—'}</dd>
            <dt>Nature</dt>
            <dd>{lineReview.varianceNature ?? 'Not classified'}</dd>
            <dt>Corrective action</dt>
            <dd>{lineReview.correctiveAction ?? '—'}</dd>
            <dt>Target date</dt>
            <dd>{lineReview.targetDate ? formatDate(lineReview.targetDate) : '—'}</dd>
            <dt>Recommended action</dt>
            <dd>{lineReview.recommendedAction ?? '—'}</dd>
            <dt>Financial effect</dt>
            <dd>
              <MoneyText amountMinor={lineReview.actionFinancialEffectMinor ?? 0} />
            </dd>
            <dt>Board approval</dt>
            <dd>{lineReview.boardApprovalRequired ? 'Required' : 'Not required'}</dd>
          </dl>
        </section>
      ) : (
        <p className="callout info">No quarterly variance narrative recorded for this line yet.</p>
      )}

      <section className="panel">
        <h2>Costs on this line ({variance.costs.length})</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Evidence</th>
                <th className="num">Gross</th>
              </tr>
            </thead>
            <tbody>
              {variance.costs.map((c) => (
                <tr key={c.id}>
                  <td>{formatDate(c.transactionDate)}</td>
                  <td>{c.supplierName}</td>
                  <td>
                    <code>{c.reference}</code>
                  </td>
                  <td>
                    <StatusPill
                      tone={
                        c.status === 'actual'
                          ? 'healthy'
                          : c.status === 'committed'
                            ? 'attention'
                            : 'info'
                      }
                    >
                      {c.status}
                    </StatusPill>
                  </td>
                  <td>{c.evidence.length ? c.evidence.map((e) => e.label).join(', ') : '—'}</td>
                  <td className="num">
                    <MoneyText amountMinor={c.gross.amountMinor} status={c.status} />
                  </td>
                </tr>
              ))}
              {!variance.costs.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No costs allocated to this line yet.
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
