import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { MoneyText, StatusPill } from '../components/Money'
import { WageHubNav } from '../components/WageHubNav'
import { useCostStore } from '../data/CostStore'
import {
  computePayrollBudgetVariance,
  openPayrollExceptionCount,
  resolveDisplayedEmployerCost,
  type PayPeriod,
} from '../domain/payroll-cost'
import { formatDate } from '../lib/labels'

export function PayrollCostOverviewPage() {
  const { payPeriods } = useCostStore()
  const period = payPeriods[0]

  if (!period) {
    return (
      <div className="page">
        <WageHubNav />
        <p className="callout critical">No pay periods loaded.</p>
      </div>
    )
  }

  const cost = resolveDisplayedEmployerCost(period)
  const variance = computePayrollBudgetVariance(
    period.budgetedEmployerCostMinor,
    cost.totalEmployerCostMinor,
  )
  const openExceptions = openPayrollExceptionCount(period)
  const overBudget = variance.varianceMinor > 0
  const grossWithOvertime = cost.grossWagesMinor + cost.overtimeMinor
  const otherEmployer =
    cost.allowancesMinor + cost.agencyMinor + cost.statutoryEmployerCostMinor + cost.otherEmployerCostMinor

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Payroll Cost Control</h1>
          <p className="muted">
            {period.frequency} payroll · {period.label} · Payday {formatDate(period.contractualPayday)} ·{' '}
            {period.providerName}
          </p>
        </div>
        <StatusPill tone={period.status === 'published' ? 'healthy' : 'attention'}>
          {statusLabel(period.status)}
        </StatusPill>
      </header>

      <WageHubNav />

      <p className="callout info">
        Employer cost only — employee PAYE, employee NI and net pay stay with the recognised payroll
        provider. Veyvio does not run FPS/EPS or produce payslips.
      </p>

      <section className={`cost-hero ${overBudget ? 'attention' : 'healthy'}`}>
        <div className="cost-hero-primary">
          <div className="cost-hero-eyebrow">Will the CEC wages budget hold?</div>
          <div className="cost-hero-label">Total employer payroll cost</div>
          <div className="cost-hero-value">
            <MoneyText amountMinor={cost.totalEmployerCostMinor} />
          </div>
          <div className="cost-hero-sub">
            Budget <MoneyText amountMinor={period.budgetedEmployerCostMinor} /> · Variance{' '}
            <MoneyText amountMinor={variance.varianceMinor} /> (
            {(variance.variancePercentHundredths / 100).toFixed(1)}%)
          </div>
        </div>
        <div className="cost-hero-side">
          <h2 className="cost-hero-side-title">Decision required</h2>
          <p className="cost-hero-side-copy">
            {openExceptions > 0
              ? `${openExceptions} payroll-cost exception${openExceptions === 1 ? '' : 's'} require approval before finalisation.`
              : 'No material payroll-cost exceptions on the current import.'}
          </p>
          <div className="cost-hero-actions">
            <Link className="btn cost-hero-btn" to="/wages/hours">
              Review driver hours
            </Link>
            <Link className="btn-ghost cost-hero-btn-secondary" to="/wages/approval">
              Approval workflow
            </Link>
          </div>
        </div>
      </section>

      <div className="kpi-grid dense">
        <Kpi label="Total employer cost" value={<MoneyText amountMinor={cost.totalEmployerCostMinor} />} />
        <Kpi
          label="Payroll budget"
          value={<MoneyText amountMinor={period.budgetedEmployerCostMinor} />}
        />
        <Kpi
          label="Variance"
          value={<MoneyText amountMinor={variance.varianceMinor} />}
          tone={overBudget ? 'critical' : 'healthy'}
          hint={`${(variance.variancePercentHundredths / 100).toFixed(1)}% vs budget`}
        />
        <Kpi label="Employees matched" value={String(period.employeeCount)} />
      </div>

      <div className="split">
        <section className="panel">
          <h2>Cost composition</h2>
          <ul className="stack-list">
            <li>
              Gross wages (incl. overtime){' '}
              <strong>
                <MoneyText amountMinor={grossWithOvertime} />
              </strong>
            </li>
            <li>
              Employer National Insurance{' '}
              <strong>
                <MoneyText amountMinor={cost.employerNiMinor} />
              </strong>
            </li>
            <li>
              Employer pension{' '}
              <strong>
                <MoneyText amountMinor={cost.employerPensionMinor} />
              </strong>
            </li>
            <li>
              Other employer costs{' '}
              <strong>
                <MoneyText amountMinor={otherEmployer} />
              </strong>
            </li>
            <li>
              Overtime (of which){' '}
              <strong>
                <MoneyText amountMinor={cost.overtimeMinor} />
              </strong>
            </li>
          </ul>
          <p className="muted small">
            Formula {cost.formulaVersion}. Employee deductions are excluded from employer cost.
          </p>
        </section>

        <section className="panel">
          <h2>Data status</h2>
          <ul className="stack-list">
            <li>
              Pre-payroll imported{' '}
              <strong>{period.lastImportAt ? formatDate(period.lastImportAt) : '—'}</strong>
            </li>
            <li>
              Employees matched <strong>{period.employeeCount}</strong>
            </li>
            <li>
              Final payroll <strong>{period.finalPayroll ? 'Received' : 'Not yet received'}</strong>
            </li>
            <li>
              Scheme ref <strong>{period.schemeRefToken}</strong>
            </li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Exceptions</h2>
        <div className="exception-list">
          {period.exceptions.map((ex) => (
            <article key={ex.id} className="exception-card">
              <StatusPill
                tone={
                  ex.severity === 'critical'
                    ? 'critical'
                    : ex.severity === 'attention'
                      ? 'attention'
                      : 'info'
                }
              >
                {ex.severity}
              </StatusPill>
              <div>
                <h3>{ex.title}</h3>
                <p className="muted">{ex.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export function PayPeriodsPage() {
  const { payPeriods } = useCostStore()
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Pay periods</h1>
          <p className="muted">Forecast → pre-payroll → final → published. Phase 1 shows seed periods only.</p>
        </div>
      </header>
      <WageHubNav />
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Tax year</th>
              <th>Payday</th>
              <th>Status</th>
              <th className="num">Employer cost</th>
              <th className="num">Budget</th>
              <th>Exceptions</th>
            </tr>
          </thead>
          <tbody>
            {payPeriods.map((p) => {
              const cost = resolveDisplayedEmployerCost(p)
              return (
                <tr key={p.id}>
                  <td>
                    <Link to="/wages">{p.label}</Link>
                  </td>
                  <td>{p.taxYear}</td>
                  <td>{formatDate(p.contractualPayday)}</td>
                  <td>{statusLabel(p.status)}</td>
                  <td className="num">
                    <MoneyText amountMinor={cost.totalEmployerCostMinor} />
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={p.budgetedEmployerCostMinor} />
                  </td>
                  <td>{openPayrollExceptionCount(p)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function statusLabel(status: PayPeriod['status']): string {
  return status.replace(/_/g, ' ')
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
