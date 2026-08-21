import { Link } from 'react-router-dom'
import { FinancialViewsNav } from '../components/FinancialViewsNav'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import { buildCashFlowSnapshot } from '../domain/cash-flow-view'
import type { TrafficLight } from '../domain/budget-governance'

export function CashFlowPage() {
  const { organisation, costs, bankAccounts, bankTransactions } = useCostStore()
  const snap = buildCashFlowSnapshot({
    organisationId: organisation.id,
    costs,
    accounts: bankAccounts,
    transactions: bankTransactions,
    fromDate: '2026-07-28',
    weeks: 8,
  })

  const light: TrafficLight =
    snap.lowestBalanceMinor < 0 ? 'red' : snap.warning ? 'amber' : 'green'

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Cash flow</h1>
          <p className="muted">
            Will enough money be in the bank when payments fall due? Built from payment dates and
            the bank feed — not a payments product.
          </p>
        </div>
        <TrafficPill light={light} />
      </header>

      <FinancialViewsNav />

      <p className="callout info">
        A company can show a surplus and still have poor cash flow — for example income invoiced but
        not yet received. Vehicle purchases hit cash immediately but reach the I&amp;E over time via
        depreciation.
      </p>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Opening available</div>
          <div className="kpi-value">
            <MoneyText amountMinor={snap.openingBalanceMinor} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Lowest projected balance</div>
          <div className={`kpi-value${snap.lowestBalanceMinor < 0 ? ' tone-critical' : ''}`.trim()}>
            <MoneyText amountMinor={snap.lowestBalanceMinor} />
          </div>
        </div>
      </div>

      {snap.warning ? <p className="callout attention">{snap.warning}</p> : null}

      <section className="panel">
        <h2>Eight-week horizon</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Week</th>
                <th className="num">Expected outflows</th>
                <th className="num">Expected inflows</th>
                <th className="num">Net</th>
                <th className="num">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {snap.buckets.map((b) => (
                <tr key={b.weekStart} className={b.runningBalanceMinor < 0 ? 'row-attention' : undefined}>
                  <td>{b.weekLabel}</td>
                  <td className="num">
                    <MoneyText amountMinor={b.outflowMinor} />
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={b.inflowMinor} />
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={b.netMinor} />
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={b.runningBalanceMinor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Outflows use cost payment dates from the ledger. Inflows use bank credits in the window as
          a demo proxy until a controlled income receipts feed is connected. Reconcile on{' '}
          <Link to="/bank">Bank</Link>.
        </p>
      </section>
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
