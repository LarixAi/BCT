import { Link } from 'react-router-dom'
import { FinancialViewsNav } from '../components/FinancialViewsNav'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import type { TrafficLight } from '../domain/budget-governance'
import { buildManagementAccounts } from '../domain/management-accounts'
import { formatDate } from '../lib/labels'

export function ManagementAccountsPage() {
  const { organisation, budget, costs, incomeSummary } = useCostStore()
  const accounts = buildManagementAccounts({
    organisationId: organisation.id,
    budget,
    costs,
    income: incomeSummary,
  })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{accounts.title}</h1>
          <p className="muted">{accounts.subtitle}</p>
        </div>
        <StatusPill tone={accounts.incomeApproved ? 'healthy' : 'attention'}>
          {accounts.incomeApproved ? 'Accountant-approved income' : 'Income pending approval'}
        </StatusPill>
      </header>

      <FinancialViewsNav />

      <p className="callout info">
        Management income &amp; expenditure — not statutory accounts. Detailed invoicing and customer
        management stay in the accounting system. Veyvio imports one controlled income summary and
        keeps the cost ledger as the core responsibility.
      </p>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Operating surplus / (deficit) actual</div>
          <div className="kpi-value">
            <MoneyText amountMinor={accounts.operatingResultActualMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Budget</div>
          <div className="kpi-value">
            <MoneyText amountMinor={accounts.operatingResultBudgetMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Forecast</div>
          <div className="kpi-value">
            <MoneyText amountMinor={accounts.operatingResultForecastMinor} />
          </div>
        </div>
      </div>

      {incomeSummary ? (
        <p className="muted small">
          Income from {incomeSummary.sourceSystem} · imported {formatDate(incomeSummary.importedAt)}
          {incomeSummary.approvedByAccountant
            ? ` · approved by ${incomeSummary.approvedByAccountant}`
            : ' · awaiting accountant approval'}
        </p>
      ) : (
        <p className="callout attention">
          No income summary imported. Cost lines still calculate; surplus/deficit is incomplete.
        </p>
      )}

      <section className="panel">
        <h2>Income and expenditure</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Line</th>
                <th className="num">Actual</th>
                <th className="num">Budget</th>
                <th className="num">Variance</th>
                <th className="num">Forecast</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.lines.map((line) => (
                <tr
                  key={line.id}
                  className={
                    line.kind === 'gross' || line.kind === 'result' || line.kind === 'income'
                      ? line.id === 'total_income' || line.kind === 'gross' || line.kind === 'result'
                        ? 'row-attention'
                        : undefined
                      : undefined
                  }
                >
                  <td>
                    {line.kind === 'result' || line.id === 'total_income' || line.kind === 'gross' ? (
                      <strong>{line.label}</strong>
                    ) : (
                      line.label
                    )}
                  </td>
                  <td className="num">
                    <SignedMoney amountMinor={line.actualMinor} expense={line.isExpense} />
                  </td>
                  <td className="num">
                    <SignedMoney amountMinor={line.budgetMinor} expense={line.isExpense} />
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={line.varianceMinor} />
                  </td>
                  <td className="num">
                    <SignedMoney amountMinor={line.forecastMinor} expense={line.isExpense} />
                  </td>
                  <td>
                    <TrafficPill light={line.light} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Depreciation is an accountant-approved non-cash charge. For a non-profit CEC programme this
          report is an income-and-expenditure statement rather than a commercial P&amp;L. Open{' '}
          <Link to="/board-pack">board pack</Link> for the locked-quarter pack.
        </p>
      </section>
    </div>
  )
}

function SignedMoney({ amountMinor, expense }: { amountMinor: number; expense: boolean }) {
  if (!expense) return <MoneyText amountMinor={amountMinor} />
  return (
    <span className="money">
      ({(amountMinor / 100).toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })})
    </span>
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
