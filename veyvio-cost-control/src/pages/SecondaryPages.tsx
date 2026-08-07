import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { FinancialViewsNav } from '../components/FinancialViewsNav'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import { getBankIntegrationConfig } from '../integrations/bank'
import { categoryLabel, formatDate, statusLabel } from '../lib/labels'
import type { CostRecord } from '../domain/types'

export function ForecastPage() {
  const { costs, lastValidSnapshot } = useCostStore()
  const forecastRows = costs.filter((c) => c.status === 'forecast' || c.status === 'estimated')
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Forecast</h1>
          <p className="muted">
            What do we now expect to spend? Actuals plus commitments and estimates — never presented
            as actual.
          </p>
        </div>
      </header>
      <FinancialViewsNav />
      <SimpleLedgerPage
        embed
        title="Forecast ledger"
        subtitle="Expected future costs with explicit forecast or estimated status."
        rows={forecastRows}
        footer={
          lastValidSnapshot ? (
            <p className="muted">
              Snapshot projected final{' '}
              <MoneyText amountMinor={lastValidSnapshot.projectedFinalMinor} /> includes forecast{' '}
              <MoneyText amountMinor={lastValidSnapshot.forecastMinor} status="forecast" />.
            </p>
          ) : null
        }
      />
    </div>
  )
}

export function CommitmentsPage() {
  const { costs } = useCostStore()
  return (
    <SimpleLedgerPage
      title="Commitments"
      subtitle="Future contractual or approved expenditure not yet actual."
      rows={costs.filter((c) => c.status === 'committed')}
    />
  )
}

export function SuppliersPage() {
  const { costs } = useCostStore()
  const map = new Map<string, number>()
  for (const c of costs) {
    map.set(c.supplierName, (map.get(c.supplierName) ?? 0) + c.gross.amountMinor)
  }
  const rows = [...map.entries()].sort((a, b) => b[1] - a[1])
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Suppliers</h1>
          <p className="muted">Spend by supplier from the canonical ledger.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th className="num">Gross spend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, amount]) => (
              <tr key={name}>
                <td>{name}</td>
                <td className="num">
                  <MoneyText amountMinor={amount} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const {
    lastValidSnapshot,
    organisation,
    budget,
    costs,
    reviews,
    quarantine,
    quarterlyReview,
    incomeSummary,
    bankConnection,
    sageIntegration,
    wageBatches,
  } = useCostStore()
  const snap = lastValidSnapshot
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<'all' | ReportGroup>('all')
  const openReviews = reviews.filter((review) => review.state === 'open').length
  const reports = useMemo<ReportDefinition[]>(
    () => [
      {
        id: 'cost-position',
        title: 'CEC cost position',
        description: 'Approved budget, actual, committed, forecast and projected remaining.',
        group: 'management',
        route: '/',
        status: snap ? 'ready' : 'blocked',
        statusDetail: snap ? `Snapshot ${snap.id.slice(0, 8)}` : 'No valid snapshot',
      },
      {
        id: 'cost-ledger',
        title: 'Detailed cost ledger',
        description: 'Transaction-level actual, commitment and forecast records with evidence status.',
        group: 'operations',
        route: '/costs',
        status: quarantine.length ? 'attention' : 'ready',
        statusDetail: `${costs.length} records · ${quarantine.length} quarantined`,
        exportKind: 'cost_csv',
      },
      {
        id: 'budget-variance',
        title: 'Budget and variance',
        description: 'Approved CEC lines compared with actual and projected final cost.',
        group: 'management',
        route: '/budgets',
        status: snap ? 'ready' : 'blocked',
        statusDetail: `Budget ${budget.code} v${budget.version}`,
      },
      {
        id: 'forecast',
        title: 'Full-year forecast',
        description: 'Expected final cost built from actuals, commitments and remaining forecasts.',
        group: 'management',
        route: '/forecast',
        status: openReviews ? 'attention' : 'ready',
        statusDetail: `${openReviews} open review(s)`,
      },
      {
        id: 'cash-flow',
        title: 'Cost cash-flow outlook',
        description: 'Short-term payment timing and projected bank headroom.',
        group: 'management',
        route: '/cash-flow',
        status: bankConnection.status === 'connected' ? 'ready' : 'attention',
        statusDetail:
          bankConnection.status === 'connected'
            ? 'Bank feed connected'
            : 'Demonstration bank feed',
      },
      {
        id: 'management-accounts',
        title: 'Management income & expenditure',
        description: 'Management surplus or deficit from controlled income summary and cost ledger.',
        group: 'management',
        route: '/management-accounts',
        status: incomeSummary?.approvedByAccountant ? 'ready' : 'attention',
        statusDetail: incomeSummary?.approvedByAccountant
          ? 'Income mapping approved'
          : 'Accountant approval required',
      },
      {
        id: 'quarterly',
        title: 'Quarterly budget review',
        description: 'Quarter actuals, material variances, owners, actions and lock gates.',
        group: 'board',
        route: '/budgets/quarterly',
        status: quarterlyReview.status === 'locked' ? 'ready' : 'attention',
        statusDetail: `${quarterlyReview.quarter} · ${quarterlyReview.status.replaceAll('_', ' ')}`,
      },
      {
        id: 'board-pack',
        title: 'Board finance pack',
        description: 'Decision-focused management pack generated from the quarterly review.',
        group: 'board',
        route: '/board-pack',
        status: quarterlyReview.status === 'locked' ? 'ready' : 'attention',
        statusDetail:
          quarterlyReview.status === 'locked' ? 'Locked source' : 'Draft management pack',
      },
      {
        id: 'wage-cost',
        title: 'Driver wage-cost report',
        description: 'Employer wage costs, approved hours, adjustments and provider reconciliation.',
        group: 'operations',
        route: '/wages',
        status: wageBatches.some((batch) => batch.status === 'exception')
          ? 'attention'
          : 'ready',
        statusDetail: `${wageBatches.length} wage batch(es)`,
      },
      {
        id: 'vehicles',
        title: 'Vehicle cost report',
        description: 'Ownership, fuel, maintenance and whole-life cost by vehicle.',
        group: 'operations',
        route: '/vehicles',
        status: 'ready',
        statusDetail: 'Ledger-derived',
      },
      {
        id: 'audit-evidence',
        title: 'Audit and evidence pack',
        description: 'Traceability from authorised budget to evidence, ledger and reconciliation.',
        group: 'assurance',
        route: '/audit',
        status: openReviews || quarantine.length ? 'attention' : 'ready',
        statusDetail: `${openReviews} review(s) · ${quarantine.length} quarantine item(s)`,
      },
      {
        id: 'integration',
        title: 'Accounting integration exceptions',
        description: 'Sage export failures, retries, posting and bank-reconciliation status.',
        group: 'assurance',
        route: '/reviews',
        status: sageIntegration.failedExports.length ? 'blocked' : 'ready',
        statusDetail: `${sageIntegration.failedExports.length} failed export(s)`,
      },
    ],
    [
      bankConnection.status,
      budget.code,
      budget.version,
      costs.length,
      incomeSummary?.approvedByAccountant,
      openReviews,
      quarantine.length,
      quarterlyReview.quarter,
      quarterlyReview.status,
      sageIntegration.failedExports.length,
      snap,
      wageBatches,
    ],
  )
  const filtered = reports.filter((report) => {
    const matchesGroup = group === 'all' || report.group === group
    const needle = query.trim().toLowerCase()
    const matchesQuery =
      !needle ||
      `${report.title} ${report.description} ${report.statusDetail}`
        .toLowerCase()
        .includes(needle)
    return matchesGroup && matchesQuery
  })
  const readyCount = reports.filter((report) => report.status === 'ready').length
  const attentionCount = reports.filter((report) => report.status === 'attention').length
  const blockedCount = reports.filter((report) => report.status === 'blocked').length

  return (
    <div className="page reports-page">
      <header className="page-header">
        <div>
          <h1>Report centre</h1>
          <p className="muted">
            Trusted cost, management, board and assurance reports from the current ledger snapshot.
          </p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Print report register
          </button>
          <button
            type="button"
            className="btn"
            disabled={!snap}
            onClick={() => {
              if (snap) downloadCostLedgerCsv({ organisation, budget, snapshot: snap, costs })
            }}
          >
            Download cost ledger CSV
          </button>
        </div>
      </header>

      <p className="callout info">
        Reports in Veyvio are management and cost-control reports. Statutory accounts, VAT returns
        and the official general ledger remain in Sage and with the accountant.
      </p>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Reports available</div>
          <div className="kpi-value">{reports.length}</div>
          <div className="kpi-hint">{readyCount} ready to use</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Needs attention</div>
          <div className="kpi-value">{attentionCount}</div>
          <div className="kpi-hint">Can be viewed with disclosure</div>
        </div>
        <div className={`kpi${blockedCount ? ' tone-critical' : ''}`}>
          <div className="kpi-label">Blocked</div>
          <div className="kpi-value">{blockedCount}</div>
          <div className="kpi-hint">Resolve before relying on output</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Current snapshot</div>
          <div className="kpi-value">{snap ? snap.id.slice(0, 8) : 'None'}</div>
          <div className="kpi-hint">
            {snap ? `Created ${formatDate(snap.createdAt)}` : 'Reporting unavailable'}
          </div>
        </div>
      </div>

      <section className="panel report-controls">
        <label>
          <span className="muted small">Find a report</span>
          <input
            className="search"
            type="search"
            placeholder="Search cost, board, audit or wages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="page-subnav" role="tablist" aria-label="Report groups">
          {(['all', 'management', 'operations', 'board', 'assurance'] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                className={group === item ? 'page-chip active' : 'page-chip'}
                onClick={() => setGroup(item)}
              >
                {item === 'all' ? 'All reports' : reportGroupLabel(item)}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="report-grid" aria-live="polite">
        {filtered.map((report) => (
          <article className="report-card" key={report.id}>
            <div className="report-card-head">
              <span className="report-group">{reportGroupLabel(report.group)}</span>
              <StatusPill tone={reportStatusTone(report.status)}>
                {report.status === 'attention' ? 'Needs attention' : report.status}
              </StatusPill>
            </div>
            <h2>{report.title}</h2>
            <p>{report.description}</p>
            <div className="report-source">{report.statusDetail}</div>
            <div className="report-actions">
              <Link className="btn-secondary" to={report.route}>
                Open report
              </Link>
              {report.exportKind === 'cost_csv' && snap ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() =>
                    downloadCostLedgerCsv({ organisation, budget, snapshot: snap, costs })
                  }
                >
                  Download CSV
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!filtered.length ? (
          <div className="panel">
            <h2>No matching reports</h2>
            <p className="muted">Try another search term or report group.</p>
          </div>
        ) : null}
      </section>

      <section className="panel report-assurance">
        <div>
          <h2>Report identification</h2>
          <p className="muted">
            Every downloaded cost-ledger row carries its organisation, budget, snapshot,
            calculation and formula identifiers.
          </p>
        </div>
        {snap ? (
          <dl className="detail-grid compact">
            <dt>Organisation</dt>
            <dd>{organisation.tradingName}</dd>
            <dt>Budget</dt>
            <dd>
              {budget.code} · version {snap.budgetVersion}
            </dd>
            <dt>Currency</dt>
            <dd>{organisation.currency}</dd>
            <dt>Snapshot</dt>
            <dd>
              <code>{snap.id}</code>
            </dd>
            <dt>Calculation</dt>
            <dd>
              <code>{snap.calculationId}</code>
            </dd>
            <dt>Formula</dt>
            <dd>{snap.formulaVersion}</dd>
          </dl>
        ) : (
          <p className="callout critical">No valid snapshot is available for reporting.</p>
        )}
      </section>
    </div>
  )
}

type ReportGroup = 'management' | 'operations' | 'board' | 'assurance'
type ReportStatus = 'ready' | 'attention' | 'blocked'
type ReportDefinition = {
  id: string
  title: string
  description: string
  group: ReportGroup
  route: string
  status: ReportStatus
  statusDetail: string
  exportKind?: 'cost_csv'
}

function reportGroupLabel(group: ReportGroup): string {
  if (group === 'management') return 'Management'
  if (group === 'operations') return 'Cost operations'
  if (group === 'board') return 'Quarterly & board'
  return 'Assurance'
}

function reportStatusTone(status: ReportStatus): 'healthy' | 'attention' | 'critical' {
  if (status === 'ready') return 'healthy'
  if (status === 'attention') return 'attention'
  return 'critical'
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadCostLedgerCsv(input: {
  organisation: ReturnType<typeof useCostStore>['organisation']
  budget: ReturnType<typeof useCostStore>['budget']
  snapshot: NonNullable<ReturnType<typeof useCostStore>['lastValidSnapshot']>
  costs: ReturnType<typeof useCostStore>['costs']
}) {
  const headers = [
    'organisation_id',
    'organisation_name',
    'budget_code',
    'budget_version',
    'snapshot_id',
    'calculation_id',
    'formula_version',
    'cost_id',
    'transaction_date',
    'accounting_period',
    'supplier',
    'reference',
    'description',
    'category',
    'status',
    'net_minor',
    'vat_minor',
    'gross_minor',
    'currency',
    'validation_state',
    'evidence_count',
    'source_key',
  ]
  const rows = input.costs.map((cost) => [
    input.organisation.id,
    input.organisation.tradingName,
    input.budget.code,
    input.snapshot.budgetVersion,
    input.snapshot.id,
    input.snapshot.calculationId,
    input.snapshot.formulaVersion,
    cost.id,
    cost.transactionDate,
    cost.accountingPeriod,
    cost.supplierName,
    cost.reference,
    cost.description,
    cost.category,
    cost.status,
    cost.net.amountMinor,
    cost.vat.amountMinor,
    cost.gross.amountMinor,
    cost.gross.currency,
    cost.validationState,
    cost.evidence.length,
    cost.sourceKey,
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${input.organisation.tradingName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')}-${input.budget.code.toLowerCase()}-cost-ledger.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const { identity, activeMembership } = useAuth()
  const {
    organisation,
    budget,
    approvalBands,
    quarterlyReview,
    imports,
    quarantine,
    auditEvents,
    bankConnection,
    startBankConnect,
    completeBankConnect,
    disconnectBank,
    refreshBankFeed,
    sageIntegration,
  } = useCostStore()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const config = getBankIntegrationConfig()
  const sage = sageIntegration

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('bank_callback') !== '1') return
    const state = params.get('state') ?? ''
    const code = params.get('code') ?? undefined
    const sandbox = params.get('bank_sandbox') === '1'
    let cancelled = false
    void (async () => {
      setBusy(true)
      setError(null)
      try {
        await completeBankConnect({ state, authorizationCode: code, sandbox })
        if (!cancelled) {
          setMessage(
            sandbox
              ? 'Sandbox Open Banking consent completed — AIS feed connected.'
              : 'Open Banking consent completed — AIS feed connected.',
          )
          window.history.replaceState({}, '', '/settings')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Bank connect failed')
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [completeBankConnect])

  const connected = bankConnection?.status === 'connected'
  const sageConnected = sage?.connection.status === 'connected'
  const mappedCodes = sage?.mappings.filter((mapping) => mapping.mapped).length ?? 0
  const totalCodes = sage?.mappings.length ?? 0
  const setupItems = [
    {
      label: 'Company workspace',
      ready: Boolean(organisation.name && organisation.timezone && organisation.currency),
      detail: `${organisation.tradingName} · ${organisation.currency}`,
      href: '#organisation-settings',
    },
    {
      label: 'Financial controls',
      ready: approvalBands.length > 0 && budget.lines.length > 0,
      detail: `${budget.code} · ${approvalBands.length} approval bands`,
      href: '#finance-settings',
    },
    {
      label: 'Sage accounting',
      ready: sageConnected && sage?.unmappedCount === 0,
      detail: sageConnected ? `${mappedCodes}/${totalCodes} codes mapped` : 'Connection required',
      href: '#sage-settings',
    },
    {
      label: 'Open Banking',
      ready: connected,
      detail: connected ? 'Read-only feed connected' : 'Connection required',
      href: '#bank-settings',
    },
  ]
  const readySetupItems = setupItems.filter((item) => item.ready).length

  return (
    <div className="page settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Settings</h1>
          <p className="muted">
            Configure the finance workspace, access controls and read-only integrations for this
            company.
          </p>
        </div>
        <StatusPill tone={readySetupItems === setupItems.length ? 'healthy' : 'attention'}>
          {readySetupItems} of {setupItems.length} core areas ready
        </StatusPill>
      </header>

      <nav className="page-subnav" aria-label="Settings sections">
        <a className="page-chip active" href="#settings-overview">
          Overview
        </a>
        <a className="page-chip" href="#organisation-settings">
          Organisation
        </a>
        <a className="page-chip" href="#finance-settings">
          Financial controls
        </a>
        <a className="page-chip" href="#access-settings">
          Access
        </a>
        <a className="page-chip" href="#sage-settings">
          Sage accounting
        </a>
        <a className="page-chip" href="#bank-settings">
          Open Banking
        </a>
        <a className="page-chip" href="#data-settings">
          Data &amp; assurance
        </a>
      </nav>

      <section className="settings-overview" id="settings-overview">
        <div className="settings-overview-copy">
          <span className="muted small">Active workspace</span>
          <h2>{organisation.tradingName}</h2>
          <p>
            {budget.code} · FY {budget.financialYear} · {activeMembership?.role.replaceAll('_', ' ')}
          </p>
        </div>
        <div className="settings-readiness-list">
          {setupItems.map((item) => (
            <a key={item.label} href={item.href}>
              <StatusPill tone={item.ready ? 'healthy' : 'attention'}>
                {item.ready ? 'Ready' : 'Action'}
              </StatusPill>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      </section>

      {(sage?.failedExports.length ?? 0) > 0 ? (
        <p className="callout critical">
          {sage.failedExports.length} Sage export exception
          {sage.failedExports.length === 1 ? '' : 's'} must be resolved before the accounting
          integration is treated as complete. <Link to="/reviews">Open Reviews</Link>
        </p>
      ) : null}

      <section className="panel" id="organisation-settings">
        <div className="section-heading">
          <div>
            <h2>Organisation</h2>
            <p className="muted">The legal and operating context applied to every finance record.</p>
          </div>
          <StatusPill tone="neutral">Company-level</StatusPill>
        </div>
        <dl className="detail-grid">
          <dt>Name</dt>
          <dd>{organisation.name}</dd>
          <dt>Trading name</dt>
          <dd>{organisation.tradingName}</dd>
          <dt>Currency</dt>
          <dd>{organisation.currency}</dd>
          <dt>Timezone</dt>
          <dd>{organisation.timezone}</dd>
          <dt>Active CEC budget</dt>
          <dd>
            {budget.name} ({budget.code})
          </dd>
        </dl>
        <p className="muted small">
          Company identity changes should require authorised administrator approval and create an
          audit event. Operational, booking and dispatch settings remain outside this app.
        </p>
      </section>

      <section className="panel" id="finance-settings">
        <div className="section-heading">
          <div>
            <h2>Financial controls</h2>
            <p className="muted">
              The budget, financial year and approval rules used to control costs.
            </p>
          </div>
          <Link className="btn-secondary" to="/budgets">
            Open budget
          </Link>
        </div>
        <div className="settings-control-grid">
          <article>
            <span>Financial year</span>
            <strong>{budget.financialYear}</strong>
            <small>Budget {budget.code} · version {budget.version}</small>
          </article>
          <article>
            <span>Currency</span>
            <strong>{budget.currency}</strong>
            <small>All authoritative amounts use integer pence</small>
          </article>
          <article>
            <span>Budget lines</span>
            <strong>{budget.lines.length}</strong>
            <small>Original baseline is immutable</small>
          </article>
          <article>
            <span>Quarterly control</span>
            <strong>{quarterlyReview.status.replaceAll('_', ' ')}</strong>
            <small>{quarterlyReview.quarter} · version {quarterlyReview.version}</small>
          </article>
        </div>
        <h3>Approval bands</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Up to</th>
                <th>Required role</th>
                <th>Additional control</th>
              </tr>
            </thead>
            <tbody>
              {approvalBands.map((band) => (
                <tr key={band.id}>
                  <td><MoneyText amountMinor={band.minInclusiveMinor} /></td>
                  <td>
                    {band.maxInclusiveMinor === null ? (
                      'No upper limit'
                    ) : (
                      <MoneyText amountMinor={band.maxInclusiveMinor} />
                    )}
                  </td>
                  <td>{band.requiredApprovers}</td>
                  <td>
                    {band.relatedPartyOverride
                      ? 'Related-party override'
                      : band.unbudgetedRequiresBoard
                        ? 'Unbudgeted cost requires board'
                        : 'Standard finance approval'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Approval-rule changes must be versioned and must never rewrite decisions already made.
        </p>
      </section>

      <section className="panel" id="access-settings">
        <div className="section-heading">
          <div>
            <h2>Access &amp; security</h2>
            <p className="muted">
              Company-scoped access with finance roles and a clear signed-in identity.
            </p>
          </div>
          <StatusPill tone={identity && activeMembership ? 'healthy' : 'critical'}>
            {identity && activeMembership ? 'Session verified' : 'Access issue'}
          </StatusPill>
        </div>
        <dl className="detail-grid">
          <dt>Signed-in user</dt>
          <dd>{identity?.displayName ?? 'Unknown'}</dd>
          <dt>Email</dt>
          <dd>{identity?.email ?? '—'}</dd>
          <dt>Finance role</dt>
          <dd>{activeMembership?.role.replaceAll('_', ' ') ?? 'No active role'}</dd>
          <dt>Company access</dt>
          <dd>
            {identity?.memberships.length ?? 0} authorised workspace
            {(identity?.memberships.length ?? 0) === 1 ? '' : 's'}
          </dd>
          <dt>Data isolation</dt>
          <dd>Organisation ID enforced on finance records and API contracts</dd>
        </dl>
        <p className="callout info">
          Production access should use single sign-on or managed identity, multi-factor
          authentication, short-lived sessions and least-privilege roles. Shared finance accounts
          should not be permitted.
        </p>
      </section>

      <section className="panel" id="sage-settings">
        <div className="section-heading">
          <div>
            <h2>Sage accounting</h2>
            <p className="muted">Official accounting ledger and statutory-record integration.</p>
          </div>
          <StatusPill tone={sageConnected ? 'healthy' : 'attention'}>
            {sage?.connection.status ?? 'disconnected'}
          </StatusPill>
        </div>
        <p className="callout info">
          Veyvio owns cost purpose, budget, forecast, commitment, evidence and approval. Sage owns
          the general ledger, VAT, accounts payable and statutory accounts. Product choice stays
          open until the CLG accountant confirms Sage Accounting, Sage 50, Payroll or Intacct.
        </p>
        <dl className="detail-grid">
          <dt>Connection status</dt>
          <dd>
            <StatusPill tone={sageConnected ? 'healthy' : 'attention'}>
              {sage?.connection.status ?? 'disconnected'}
            </StatusPill>
          </dd>
          <dt>Sage organisation</dt>
          <dd>{sage?.connection.sageOrganisationName ?? 'Not connected'}</dd>
          <dt>Sage product</dt>
          <dd>{sageProductLabel(sage?.connection.productId ?? 'undecided')}</dd>
          <dt>Last successful sync</dt>
          <dd>
            {sage?.connection.lastSuccessfulSyncAt
              ? formatDate(sage.connection.lastSuccessfulSyncAt)
              : 'Never'}
          </dd>
          <dt>Last failed sync</dt>
          <dd>
            {sage?.connection.lastFailedSyncAt
              ? `${formatDate(sage.connection.lastFailedSyncAt)}${
                  sage.connection.lastFailureReason
                    ? ` — ${sage.connection.lastFailureReason}`
                    : ''
                }`
              : 'None'}
          </dd>
          <dt>Accounting year / open periods</dt>
          <dd>
            {sage?.connection.accountingYearLabel ?? '—'} ·{' '}
            {sage?.connection.openPeriodsLabel ?? '—'}
          </dd>
          <dt>Permissions</dt>
          <dd>
            Journals read {sage?.connection.permissions.readJournals ? 'yes' : 'no'} · write{' '}
            {sage?.connection.permissions.writeJournals ? 'yes' : 'no'} · Suppliers read{' '}
            {sage?.connection.permissions.readSuppliers ? 'yes' : 'no'} · Purchase invoices write{' '}
            {sage?.connection.permissions.writePurchaseInvoices ? 'yes' : 'no'}
          </dd>
        </dl>

        <h3 style={{ marginTop: '1rem' }}>Code mappings</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Veyvio key</th>
                <th>Sage code</th>
                <th>Label</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(sage?.mappings ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{m.kind.replaceAll('_', ' ')}</td>
                  <td>{m.veyvioKey}</td>
                  <td>{m.sageCode || '—'}</td>
                  <td>{m.sageLabel || '—'}</td>
                  <td>
                    <StatusPill tone={m.mapped ? 'healthy' : 'attention'}>
                      {m.mapped ? 'Mapped' : 'Unmapped'}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Unmapped records: {sage?.unmappedCount ?? 0}. Failed exports enter a visible exception
          queue — values are never corrected silently.
        </p>

        {(sage?.failedExports.length ?? 0) > 0 ? (
          <>
            <h3 style={{ marginTop: '1rem' }}>Failed exports</h3>
            <ul className="stack-list">
              {sage?.failedExports.map((ex) => (
                <li key={ex.id}>
                  <code>{ex.veyvioCostId}</code> · {ex.failureReason} · retries {ex.retryCount} ·{' '}
                  {formatDate(ex.failedAt)}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {(sage?.recentPostings.length ?? 0) > 0 ? (
          <>
            <h3 style={{ marginTop: '1rem' }}>Recent Sage confirmations</h3>
            <ul className="stack-list">
              {sage?.recentPostings.map((p) => (
                <li key={p.sageTransactionId}>
                  <code>{p.veyvioCostId}</code> → {p.sageTransactionId} · {p.postingStatus} · bank{' '}
                  {p.bankReconciliationStatus} · updated {formatDate(p.lastSageUpdateAt)}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <div className="row-actions" style={{ marginTop: '0.75rem' }}>
          <button type="button" className="btn" disabled title="Awaiting CLG product confirmation">
            Connect Sage (pending product choice)
          </button>
          <button type="button" className="btn-ghost" disabled>
            Disconnect / reauthorise
          </button>
        </div>
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Boundary: <code>veyvio-cost-control/docs/product-boundary.md</code> · Types:{' '}
          <code>src/integrations/sage/</code>
        </p>
      </section>

      <section className="panel" id="bank-settings">
        <div className="section-heading">
          <div>
            <h2>Business bank</h2>
            <p className="muted">Open Banking Account Information Services (AIS), read only.</p>
          </div>
          <StatusPill tone={connected ? 'healthy' : 'attention'}>
            {bankConnection?.status ?? 'disconnected'}
          </StatusPill>
        </div>
        <p className="muted small">
          Read-only account and transaction feed for cost monitoring and proposed matching. Official
          accounting bank reconciliation remains in Sage. Payment initiation is not supported.
          Client secrets never live in the browser — configure{' '}
          <code>VITE_BANK_TOKEN_PROXY_URL</code> for production.
        </p>
        <dl className="detail-grid">
          <dt>Status</dt>
          <dd>
            <StatusPill tone={connected ? 'healthy' : 'attention'}>
              {bankConnection?.status ?? 'disconnected'}
            </StatusPill>
          </dd>
          <dt>Provider</dt>
          <dd>{bankConnection?.providerId ?? config.providerId}</dd>
          <dt>Institution</dt>
          <dd>{bankConnection?.institutionName ?? '—'}</dd>
          <dt>Configured mode</dt>
          <dd>{config.mode}</dd>
          <dt>Token proxy</dt>
          <dd>{config.tokenProxyBaseUrl ?? 'Not set (sandbox only)'}</dd>
        </dl>

        {message ? <p className="callout healthy">{message}</p> : null}
        {error ? <p className="callout critical">{error}</p> : null}

        <div className="row-actions" style={{ marginTop: '0.75rem' }}>
          {!connected ? (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true)
                  setError(null)
                  setMessage(null)
                  try {
                    const { consentUrl } = await startBankConnect('NatWest Business')
                    window.location.assign(consentUrl)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not start bank connect')
                    setBusy(false)
                  }
                })()
              }}
            >
              Connect bank (sandbox)
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    try {
                      await refreshBankFeed()
                      setMessage('Bank feed synced.')
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Sync failed')
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Sync now
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    try {
                      await disconnectBank()
                      setMessage('Bank disconnected. Demo feed restored.')
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Disconnect failed')
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              >
                Disconnect
              </button>
              <Link to="/bank" className="btn-ghost">
                Open bank view
              </Link>
            </>
          )}
        </div>
        <p className="muted small" style={{ marginTop: '0.75rem' }}>
          Setup guide: <code>docs/deploy/cost-control-bank-open-banking.md</code>
        </p>
      </section>

      <section className="panel" id="data-settings">
        <div className="section-heading">
          <div>
            <h2>Data &amp; assurance</h2>
            <p className="muted">
              Import history, exceptions and immutable activity supporting the audit trail.
            </p>
          </div>
          <Link className="btn-secondary" to="/audit-evidence">
            Open audit workspace
          </Link>
        </div>
        <div className="settings-control-grid">
          <article>
            <span>Import runs</span>
            <strong>{imports.length}</strong>
            <small>Source runs retained for traceability</small>
          </article>
          <article>
            <span>Quarantined rows</span>
            <strong>{quarantine.length}</strong>
            <small>Excluded from trusted calculations</small>
          </article>
          <article>
            <span>Audit events</span>
            <strong>{auditEvents.length}</strong>
            <small>Review decisions and corrections</small>
          </article>
          <article>
            <span>Quarter snapshot</span>
            <strong>{quarterlyReview.status === 'locked' ? 'Locked' : 'Not locked'}</strong>
            <small>Locked versions never change</small>
          </article>
        </div>
        <p className="callout info">
          Retention, backup, restore testing and subject-access procedures must be configured in the
          production platform. Destructive deletion should require explicit authorisation and must
          never remove records subject to accounting or legal retention.
        </p>
      </section>
    </div>
  )
}

function sageProductLabel(id: string): string {
  switch (id) {
    case 'sage_accounting':
      return 'Sage Accounting'
    case 'sage_50':
      return 'Sage 50 Accounts'
    case 'sage_payroll':
      return 'Sage Payroll'
    case 'sage_50_payroll':
      return 'Sage 50 Payroll'
    case 'sage_intacct':
      return 'Sage Intacct'
    default:
      return 'Undecided — confirm with accountant'
  }
}

function SimpleLedgerPage({
  title,
  subtitle,
  rows,
  footer,
  embed,
}: {
  title: string
  subtitle: string
  rows: CostRecord[]
  footer?: ReactNode
  embed?: boolean
}) {
  return (
    <div className={embed ? undefined : 'page'}>
      {!embed ? (
        <header className="page-header">
          <div>
            <h1>{title}</h1>
            <p className="muted">{subtitle}</p>
          </div>
        </header>
      ) : (
        <p className="muted">{subtitle}</p>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Supplier</th>
              <th>Description</th>
              <th>Category</th>
              <th>Status</th>
              <th className="num">Gross</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{formatDate(c.transactionDate)}</td>
                <td>{c.supplierName}</td>
                <td>{c.description}</td>
                <td>{categoryLabel(c.category)}</td>
                <td>{statusLabel(c.status)}</td>
                <td className="num">
                  <MoneyText amountMinor={c.gross.amountMinor} status={c.status} />
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No rows.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}
