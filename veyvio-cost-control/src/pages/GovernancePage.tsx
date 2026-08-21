import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  fundingUnspentMinor,
  isRelatedPartySupplier,
  qualifiesForAuditExemption,
  resolveApprovalBand,
} from '../domain/clg-governance'
import { formatDate } from '../lib/labels'

export function GovernancePage() {
  const { organisation, clgProfile, clgPersons, approvalBands, fundingAwards, costs } =
    useCostStore()
  const exemption = qualifiesForAuditExemption(clgProfile)

  const relatedCosts = costs.filter(
    (c) => isRelatedPartySupplier(clgPersons, c.supplierName).related,
  )

  const exampleBand = resolveApprovalBand(approvalBands, 7_500_00, {
    relatedParty: false,
    unbudgeted: false,
  })
  const relatedBand = resolveApprovalBand(approvalBands, 200_00, {
    relatedParty: true,
    unbudgeted: false,
  })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>CLG governance</h1>
          <p className="muted">
            {organisation.tradingName} · Company Limited by Guarantee · Co. {clgProfile.companyNumber}
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn-secondary" to="/audit">
            Annual audit workspace
          </Link>
        </div>
      </header>

      <p className="callout info">
        Ordinary CLG — not automatically a charity or CIC. Members are guarantors (guarantee{' '}
        <MoneyText amountMinor={clgProfile.guaranteeAmountMinor} />
        ). Strong cost evidence, approvals, bank reconciliation and immutable audit remain required.
      </p>

      {clgProfile.charityStatus === 'pending_decision' ? (
        <p className="callout attention">
          Charity registration is <strong>OPEN</strong>. Confirm whether this CLG is also a registered
          charity before building Charity SORP fund accounting or Charity Commission returns.
        </p>
      ) : null}

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Legal form</div>
          <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
            CLG
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Charity status</div>
          <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
            {clgProfile.charityStatus.replaceAll('_', ' ')}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Audit exemption</div>
          <div className="kpi-value" style={{ fontSize: '1.1rem' }}>
            {exemption.qualifies ? 'Likely qualifies' : 'Still required'}
          </div>
          <div className="kpi-hint">
            Meet ≥2 of turnover / assets / employees · FY from 6 Apr 2025
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Related-party costs</div>
          <div className="kpi-value">{relatedCosts.length}</div>
        </div>
      </div>

      <div className="split">
        <section className="panel">
          <h2>Audit exemption assessment</h2>
          <ul className="stack-list">
            <li>
              Turnover ≤ £15m{' '}
              <StatusPill tone={exemption.met.turnover ? 'healthy' : 'critical'}>
                {exemption.met.turnover ? 'Met' : 'Not met'}
              </StatusPill>{' '}
              · <MoneyText amountMinor={clgProfile.turnoverMinor} />
            </li>
            <li>
              Assets ≤ £7.5m{' '}
              <StatusPill tone={exemption.met.assets ? 'healthy' : 'critical'}>
                {exemption.met.assets ? 'Met' : 'Not met'}
              </StatusPill>{' '}
              · <MoneyText amountMinor={clgProfile.totalAssetsMinor} />
            </li>
            <li>
              Employees ≤ 50{' '}
              <StatusPill tone={exemption.met.employees ? 'healthy' : 'critical'}>
                {exemption.met.employees ? 'Met' : 'Not met'}
              </StatusPill>{' '}
              · {clgProfile.averageEmployees}
            </li>
          </ul>
          {exemption.stillRequiredReasons.length ? (
            <div className="exception-list" style={{ marginTop: '0.75rem' }}>
              {exemption.stillRequiredReasons.map((r) => (
                <article key={r} className="exception-card">
                  <StatusPill tone="attention">Override</StatusPill>
                  <div>
                    <h3>Audit still required</h3>
                    <p className="muted">{r}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted small">
              Size tests met and no article/funder override on file. Directors still must keep
              adequate records and prepare compliant accounts.
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Approval limits</h2>
          <p className="muted small">
            Example bands — the CLG board must adopt the financial-control policy. Demo: £7,500 →{' '}
            {exampleBand.requiredApprovers}. Related-party £200 → {relatedBand.requiredApprovers}.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Required approval</th>
                </tr>
              </thead>
              <tbody>
                {approvalBands.map((b) => (
                  <tr key={b.id}>
                    <td>{b.label}</td>
                    <td>{b.requiredApprovers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Directors, members and related parties</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Roles</th>
                <th>Declared interests</th>
                <th className="num">Expenses YTD</th>
                <th className="num">Loans</th>
              </tr>
            </thead>
            <tbody>
              {clgPersons.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.displayName}</strong>
                    {p.relatedSupplierNames.length ? (
                      <div className="muted small">
                        Related supplier: {p.relatedSupplierNames.join(', ')}
                      </div>
                    ) : null}
                  </td>
                  <td>{p.roles.map((r) => r.replaceAll('_', ' ')).join(', ')}</td>
                  <td>{p.declaredInterests}</td>
                  <td className="num">
                    <MoneyText amountMinor={p.expensesYtdMinor} />
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={p.loansToOrFromMinor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {relatedCosts.length ? (
          <p className="callout attention" style={{ marginTop: '0.75rem' }}>
            {relatedCosts.length} ledger cost(s) match the related-party register (e.g. Hart &amp;
            Partners). Interested directors must not approve their own transactions — use independent
            directors or the board.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2>Funding restrictions</h2>
        {fundingAwards.map((f) => (
          <article key={f.id} style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.35rem' }}>
              {f.funderName}
            </h3>
            <p className="muted">{f.purpose}</p>
            <dl className="detail-grid">
              <dt>Period</dt>
              <dd>
                {formatDate(f.periodStart)} – {formatDate(f.periodEnd)}
              </dd>
              <dt>Eligible rules</dt>
              <dd>{f.eligibleRules}</dd>
              <dt>Awarded</dt>
              <dd>
                <MoneyText amountMinor={f.awardedMinor} />
              </dd>
              <dt>Received</dt>
              <dd>
                <MoneyText amountMinor={f.receivedMinor} />
              </dd>
              <dt>Spent</dt>
              <dd>
                <MoneyText amountMinor={f.spentMinor} />
              </dd>
              <dt>Committed</dt>
              <dd>
                <MoneyText amountMinor={f.committedMinor} />
              </dd>
              <dt>Unspent balance</dt>
              <dd>
                <MoneyText amountMinor={fundingUnspentMinor(f)} />
              </dd>
              <dt>Outputs</dt>
              <dd>{f.requiredOutputs}</dd>
              <dt>Reporting</dt>
              <dd>{f.reportingRequirements}</dd>
            </dl>
          </article>
        ))}
      </section>
    </div>
  )
}
