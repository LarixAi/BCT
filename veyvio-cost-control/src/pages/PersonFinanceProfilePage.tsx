import { Link, useParams } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { PersonAvatar } from '../components/PersonAvatar'
import { WageHubNav } from '../components/WageHubNav'
import { useCostStore } from '../data/CostStore'
import {
  findEmployeeCostReference,
  holidayRemainingDays,
  hoursUtilisationPercent,
  personCostComposition,
} from '../domain/org-structure'
import { formatMoney } from '../domain/money'

/**
 * Person wage / employer-cost profile — not Command admin staff, not a payslip.
 * Shows pay inputs needed to explain employer cost for the active period.
 */
export function PersonFinanceProfilePage() {
  const { personId = '' } = useParams()
  const store = useCostStore()
  const people = store.employeeCostReferences ?? []
  const orgNodes = store.orgNodes ?? []
  const person = findEmployeeCostReference(people, personId)
  const period = store.payPeriods?.[0]
  const teamTitle = orgNodes.find((n) => n.id === person?.orgNodeId)?.title

  if (!person) {
    return (
      <div className="page">
        <WageHubNav />
        <p className="callout critical">Person not found in this organisation’s wage cost register.</p>
        <Link to="/wages/organisation" className="btn-ghost">
          Back to organisation
        </Link>
      </div>
    )
  }

  const inputs = person.payInputs
  const composition = personCostComposition(person)
  const hue = inputs?.avatarHue ?? 168

  return (
    <div className="page">
      <header className="page-header person-profile-header">
        <div className="person-profile-identity">
          <PersonAvatar name={person.displayName} hue={hue} size="lg" />
          <div>
            <p className="person-profile-eyebrow">Wage finance profile</p>
            <h1>{person.displayName}</h1>
            <p className="muted">
              {person.roleTitle}
              {teamTitle ? ` · ${teamTitle}` : ''} · {person.externalPayrollId} · {person.costCentre}
            </p>
          </div>
        </div>
        <div className="person-profile-actions">
          {person.wageCostBearing ? (
            person.allocationComplete ? (
              <StatusPill tone="healthy">Allocation complete</StatusPill>
            ) : (
              <StatusPill tone="attention">Allocation incomplete</StatusPill>
            )
          ) : (
            <StatusPill tone="neutral">No wage cost</StatusPill>
          )}
          <Link to="/wages/organisation" className="btn-ghost">
            Organisation
          </Link>
        </div>
      </header>

      <WageHubNav />

      <p className="callout info">
        Employer cost inputs for Cost Control — not Command HR, not a payslip, and not HMRC tax
        calculation. NI and bank details are masked; full PAYE stays with the recognised payroll
        provider.
        {period ? ` Period: ${period.label}.` : null}
      </p>

      {!person.wageCostBearing ? (
        <p className="callout attention">
          This role is unpaid for employer wage cost (board / volunteer). No pay inputs are held
          here.
        </p>
      ) : null}

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Employer cost (period)</div>
          <div className="kpi-value">
            {person.wageCostBearing ? (
              <MoneyText amountMinor={person.expectedEmployerCostMinor} />
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Contracted hours / week</div>
          <div className="kpi-value">{inputs ? inputs.contractedHoursPerWeek : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Hours completed (period)</div>
          <div className="kpi-value">{inputs ? inputs.hoursCompletedThisPeriod : '—'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Hours utilisation</div>
          <div className="kpi-value">{inputs ? `${hoursUtilisationPercent(inputs)}%` : '—'}</div>
        </div>
      </div>

      {inputs ? (
        <div className="person-profile-grid">
          <section className="panel">
            <h2>Pay composition</h2>
            <p className="muted small">
              How this person’s employer cost builds for the period. Employee tax and employee NI are
              not Cost Control inputs.
            </p>
            <dl className="profile-dl">
              <div>
                <dt>Basic contractual pay</dt>
                <dd>
                  <MoneyText amountMinor={composition.basicPayMinor} />
                </dd>
              </div>
              <div>
                <dt>Overtime</dt>
                <dd>
                  <MoneyText amountMinor={composition.overtimeMinor} />
                  <span className="muted small">
                    {' '}
                    ({inputs.overtimeHoursThisPeriod}h @ {formatMoney(inputs.hourlyRateMinor)}/h
                    guide)
                  </span>
                </dd>
              </div>
              <div>
                <dt>Employer NI (cost input)</dt>
                <dd>
                  <MoneyText amountMinor={composition.employerNiMinor} />
                </dd>
              </div>
              <div>
                <dt>Employer pension</dt>
                <dd>
                  <MoneyText amountMinor={composition.employerPensionMinor} />
                </dd>
              </div>
              <div className="profile-dl-total">
                <dt>Total employer cost</dt>
                <dd>
                  <MoneyText amountMinor={composition.totalMinor} />
                </dd>
              </div>
            </dl>
            {!composition.matchesExpected ? (
              <p className="callout attention">
                Composition does not match the expected employer cost register value — review before
                publishing.
              </p>
            ) : (
              <p className="muted small">Composition matches the wage cost register.</p>
            )}
          </section>

          <section className="panel">
            <h2>Hours & leave</h2>
            <p className="muted small">
              Inputs that explain variance — contracted vs worked, holiday, and sick absence in the
              period.
            </p>
            <div className="profile-stat-grid">
              <div className="profile-stat">
                <div className="profile-stat-label">Contracted / week</div>
                <div className="profile-stat-value">{inputs.contractedHoursPerWeek}h</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-label">Completed (period)</div>
                <div className="profile-stat-value">{inputs.hoursCompletedThisPeriod}h</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-label">Overtime hours</div>
                <div className="profile-stat-value">{inputs.overtimeHoursThisPeriod}h</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-label">Holiday remaining</div>
                <div className="profile-stat-value">
                  {holidayRemainingDays(inputs)} / {inputs.holidayDaysEntitlement}
                </div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-label">Holiday taken</div>
                <div className="profile-stat-value">{inputs.holidayDaysTaken}d</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-label">Sick (period)</div>
                <div
                  className={`profile-stat-value${inputs.sickDaysThisPeriod ? ' tone-attention' : ''}`.trim()}
                >
                  {inputs.sickDaysThisPeriod}d
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2>Identity & payment (masked)</h2>
            <p className="muted small">
              Stored masked for reconciliation against the payroll provider. Cost Control never holds
              full NI or full bank account numbers in this phase.
            </p>
            <dl className="profile-dl">
              <div>
                <dt>NI number</dt>
                <dd className="mono">{inputs.niNumberMasked}</dd>
              </div>
              <div>
                <dt>Bank</dt>
                <dd>{inputs.bankName}</dd>
              </div>
              <div>
                <dt>Sort code</dt>
                <dd className="mono">{inputs.bankSortCodeMasked}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd className="mono">{inputs.bankAccountMasked}</dd>
              </div>
              <div>
                <dt>Payroll provider id</dt>
                <dd className="mono">{person.externalPayrollId}</dd>
              </div>
              <div>
                <dt>Employment</dt>
                <dd>{person.employmentKind}</dd>
              </div>
            </dl>
          </section>
        </div>
      ) : person.wageCostBearing ? (
        <p className="callout attention">
          Pay inputs are missing for this wage-cost member. Import or complete the person record
          before finalising the period.
        </p>
      ) : null}
    </div>
  )
}
