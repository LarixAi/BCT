import { Link } from 'react-router-dom'
import { FinancialViewsNav } from '../components/FinancialViewsNav'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import { buildBoardPack } from '../domain/board-pack'
import type { TrafficLight } from '../domain/budget-governance'
import { computeBudgetPosition } from '../domain/budget-equations'
import { sumLineByStatus } from '../domain/budget-hierarchy'
import { buildCashFlowSnapshot } from '../domain/cash-flow-view'
import { buildManagementAccounts } from '../domain/management-accounts'
import { buildQuarterlyCategoryRows } from '../domain/quarterly-review'
import { computePayrollBudgetVariance, resolveDisplayedEmployerCost } from '../domain/payroll-cost'

export function BoardPackPage() {
  const {
    organisation,
    budget,
    budgetChanges,
    costs,
    reviews,
    quarantine,
    quarterlyReview,
    incomeSummary,
    bankAccounts,
    bankTransactions,
    payPeriods,
  } = useCostStore()

  const revisedApprovedByLineId: Record<string, number> = {}
  for (const line of budget.lines) {
    const delta = budgetChanges
      .filter((c) => c.lineId === line.id)
      .reduce((s, c) => s + c.amountMinor, 0)
    revisedApprovedByLineId[line.id] = line.originalApprovedMinor + delta
  }

  const categoryRows = buildQuarterlyCategoryRows({
    organisationId: organisation.id,
    budget,
    costs,
    review: quarterlyReview,
    revisedApprovedByLineId,
  })

  const management = buildManagementAccounts({
    organisationId: organisation.id,
    budget,
    costs,
    income: incomeSummary,
  })

  const cashFlow = buildCashFlowSnapshot({
    organisationId: organisation.id,
    costs,
    accounts: bankAccounts,
    transactions: bankTransactions,
    fromDate: '2026-07-28',
  })

  const approved =
    budget.lines.reduce((s, l) => s + l.approvedMinor, 0) + budget.contingencyMinor
  const sums = sumLineByStatus(
    costs.filter((c) => c.organisationId === organisation.id && c.validationState !== 'quarantined'),
  )
  const programmePosition = computeBudgetPosition({ approvedMinor: approved, ...sums })

  const period = payPeriods[0]
  const wageVariance = period
    ? computePayrollBudgetVariance(
        period.budgetedEmployerCostMinor,
        resolveDisplayedEmployerCost(period).totalEmployerCostMinor,
      ).varianceMinor
    : 0

  const pack = buildBoardPack({
    organisationName: organisation.tradingName,
    budgetCode: budget.code,
    review: quarterlyReview,
    categoryRows,
    managementLines: management.lines,
    cashFlow,
    programmePosition,
    wageVarianceMinor: wageVariance,
    openReviewCount: reviews.filter((r) => r.state === 'open').length,
    quarantineCount: quarantine.length,
  })

  const boardDecisions = categoryRows
    .filter((row) => row.review?.boardApprovalRequired)
    .sort(
      (a, b) =>
        Math.abs(b.review?.actionFinancialEffectMinor ?? b.varianceMinor) -
        Math.abs(a.review?.actionFinancialEffectMinor ?? a.varianceMinor),
    )
  const unresolvedIssues = reviews.filter((r) => r.state === 'open').length + quarantine.length

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{pack.title}</h1>
          <p className="muted">
            {pack.subtitle} · {pack.quarterLabel}
          </p>
        </div>
        <div className="page-header-actions">
          <TrafficPill light={pack.overallLight} />
          <StatusPill tone={pack.locked ? 'healthy' : 'attention'}>
            {pack.locked ? 'Locked snapshot' : 'Not yet locked'}
          </StatusPill>
        </div>
      </header>

      <FinancialViewsNav />

      {!pack.locked ? (
        <p className="callout attention">
          This pack is draft until the quarterly snapshot is locked. Lock creates an immutable
          version; later corrections open a new version.
        </p>
      ) : null}

      <section className="panel">
        <h2>Board decisions required</h2>
        {boardDecisions.length ? (
          <div className="exception-list">
            {boardDecisions.map((row) => (
              <article key={row.line.id} className="exception-card">
                <TrafficPill light={row.light} />
                <div>
                  <h3>{row.line.label}</h3>
                  <p className="muted">{row.review?.recommendedAction ?? 'Decision required.'}</p>
                  <p className="muted small">
                    Owner {row.review?.responsibleManager ?? 'Unassigned'} · financial effect{' '}
                    <MoneyText amountMinor={row.review?.actionFinancialEffectMinor ?? row.varianceMinor} />
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No board decisions are currently required from this quarter close.</p>
        )}
      </section>

      <div className="split">
        <section className="panel">
          <h2>Executive position</h2>
          <ul className="stack-list">
            <li>
              Revised approved <MoneyText amountMinor={programmePosition.approvedMinor} />
            </li>
            <li>
              Projected final <MoneyText amountMinor={programmePosition.projectedFinalMinor} />
            </li>
            <li>
              Projected remaining{' '}
              <MoneyText amountMinor={programmePosition.projectedRemainingMinor} />
            </li>
            <li>
              Operating surplus / (deficit){' '}
              <MoneyText amountMinor={management.operatingResultActualMinor} />
            </li>
          </ul>
          <Link className="btn-secondary" to="/budgets/quarterly" style={{ marginTop: '0.75rem' }}>
            Open quarterly review
          </Link>
        </section>
        <section className="panel">
          <h2>Lock and assurance</h2>
          <p className="muted">
            {unresolvedIssues > 0
              ? `${unresolvedIssues} unresolved reconciliation / evidence issue(s) remain, so this pack should be treated as draft.`
              : 'Reconciliation and evidence issues are clear for this pack.'}
          </p>
          <p className="muted small">
            Board packs contain decisions only, not operational line-by-line detail. Operational
            analysis remains in the quarterly review workspace.
          </p>
        </section>
      </div>
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
