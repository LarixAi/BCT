import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { WageHubNav } from '../components/WageHubNav'
import { useCostStore } from '../data/CostStore'
import {
  HOUR_CATEGORY_LABELS,
  computeProvisionalGross,
  formatHoursCenti,
  payableHoursForDay,
  regulatedWorkingTimeForDay,
  sumHoursByCategory,
  type DriverDayRecord,
  type HourCategory,
} from '../domain/driver-wage-hours'
import { formatDate } from '../lib/labels'

/**
 * Driver-day hours workbench — payable hours vs regulated working time.
 * Provisional wage cost only; PAYE stays with the payroll provider.
 */
export function WageHoursPage() {
  const store = useCostStore()
  const days = store.driverDays ?? []
  const rates = store.payRates ?? []
  const people = store.employeeCostReferences ?? []
  const period = store.payPeriods?.[0]

  const byPerson = new Map<string, DriverDayRecord[]>()
  for (const day of days) {
    const list = byPerson.get(day.employeeCostReferenceId) ?? []
    list.push(day)
    byPerson.set(day.employeeCostReferenceId, list)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Driver hours</h1>
          <p className="muted">
            {period ? `${period.label} · ` : ''}
            Payable hours for wage cost · regulated working time for compliance
          </p>
        </div>
        <Link className="btn" to="/wages/approval">
          Open approval workflow
        </Link>
      </header>

      <WageHubNav />

      <p className="callout info">
        Tachograph driving time is not the whole payable day. Checks, cleaning, loading, training and
        other work are recorded separately. Period of availability is tracked for working-time rules
        but is not paid as basic hours. Night / weekend / bank-holiday lines are premium overlays.
      </p>

      <div className="stack" style={{ gap: '1.25rem' }}>
        {[...byPerson.entries()].map(([personId, personDays]) => {
          const person = people.find((p) => p.id === personId)
          const sorted = [...personDays].sort((a, b) => a.workDate.localeCompare(b.workDate))
          const byCat = sumHoursByCategory(sorted)
          const provisional = computeProvisionalGross({
            days: sorted,
            rates,
            employeeCostReferenceId: personId,
            approvedAllowanceMinor: personId === 'ecr_drv1' ? 50_00 : 0,
            holidayPayMode: personId === 'ecr_drv2' ? 'rolled_up_separate' : 'leave_when_taken',
            rolledUpHolidayPayMinor: personId === 'ecr_drv2' ? 85_00 : 0,
          })
          const payable = provisional.payableHoursCenti
          const regulated = provisional.regulatedWorkingTimeCenti

          return (
            <section key={personId} className="panel">
              <div className="page-header" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{person?.displayName ?? personId}</h2>
                  <p className="muted" style={{ margin: '0.25rem 0 0' }}>
                    {person?.externalPayrollId} · {person?.roleTitle}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <StatusPill tone={provisional.nmwCheck.passed ? 'healthy' : 'critical'}>
                    {provisional.nmwCheck.passed ? 'NMW OK' : 'Below NMW'}
                  </StatusPill>
                  {sorted.some((d) => d.disputed) ? (
                    <StatusPill tone="critical">Disputed hours</StatusPill>
                  ) : null}
                </div>
              </div>

              <div className="kpi-grid dense">
                <div className="kpi">
                  <div className="kpi-label">Payable hours</div>
                  <div className="kpi-value">{formatHoursCenti(payable)}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Regulated working time</div>
                  <div className="kpi-value">{formatHoursCenti(regulated)}</div>
                </div>
                <div className="kpi">
                  <div className="kpi-label">Provisional gross</div>
                  <div className="kpi-value">
                    <MoneyText amountMinor={provisional.grossPayMinor} />
                  </div>
                </div>
              </div>

              <h3 className="section-title">Period hour categories</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Hours</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(HOUR_CATEGORY_LABELS) as HourCategory[])
                      .filter((c) => byCat[c] > 0)
                      .map((category) => (
                        <tr key={category}>
                          <td>{HOUR_CATEGORY_LABELS[category]}</td>
                          <td>{formatHoursCenti(byCat[category])}</td>
                          <td className="muted">
                            {category === 'unpaid_break'
                              ? 'Excluded from paid hours'
                              : category === 'period_of_availability'
                                ? 'Regulated only'
                                : category === 'night' ||
                                    category === 'weekend' ||
                                    category === 'bank_holiday'
                                  ? 'Premium overlay'
                                  : 'Payable'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <h3 className="section-title">Provisional wage lines</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Hours</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provisional.lines.map((line) => (
                      <tr key={`${line.label}-${line.amountMinor}`}>
                        <td>{line.label}</td>
                        <td>{line.hoursCenti === null ? '—' : formatHoursCenti(line.hoursCenti)}</td>
                        <td>
                          {line.rateMinor === null ? '—' : <MoneyText amountMinor={line.rateMinor} />}
                        </td>
                        <td>
                          <MoneyText amountMinor={line.amountMinor} />
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>
                        <strong>Gross pay (provisional)</strong>
                      </td>
                      <td />
                      <td />
                      <td>
                        <strong>
                          <MoneyText amountMinor={provisional.grossPayMinor} />
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="section-title">Daily records</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Payable</th>
                      <th>Regulated</th>
                      <th>Detail</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((day) => (
                      <tr key={day.id}>
                        <td>{formatDate(day.workDate)}</td>
                        <td>{day.source}</td>
                        <td>{formatHoursCenti(payableHoursForDay(day))}</td>
                        <td>{formatHoursCenti(regulatedWorkingTimeForDay(day))}</td>
                        <td className="muted">
                          {day.lines
                            .map((l) => `${HOUR_CATEGORY_LABELS[l.category]} ${formatHoursCenti(l.hoursCenti)}`)
                            .join(' · ')}
                        </td>
                        <td>
                          {day.disputed ? (
                            <StatusPill tone="critical">Disputed</StatusPill>
                          ) : (
                            <StatusPill tone="healthy">Clear</StatusPill>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
