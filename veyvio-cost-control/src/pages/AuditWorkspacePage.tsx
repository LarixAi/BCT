import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  buildAnnualEvidencePack,
  findTraceabilityGaps,
  isRelatedPartySupplier,
  qualifiesForAuditExemption,
} from '../domain/clg-governance'
import type { CostRecord } from '../domain/types'
import { isFullyReconciledCost, sagePostingDisplayLabel } from '../integrations/sage'
import { formatDate } from '../lib/labels'

type EvidenceFilter = 'all' | 'complete' | 'attention' | 'missing'

export function AuditWorkspacePage() {
  const {
    organisation,
    costs,
    reviews,
    quarantine,
    quarterlyReview,
    incomeSummary,
    clgProfile,
    clgPersons,
    bankTransactions,
    sageIntegration,
    auditEvents,
  } = useCostStore()
  const [query, setQuery] = useState('')
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>('all')

  const openReviews = reviews.filter((review) => review.state === 'open').length
  const missingEvidenceCount = costs.filter(
    (cost) => cost.status === 'actual' && cost.evidence.length === 0,
  ).length
  const relatedPartyCostCount = costs.filter(
    (cost) => isRelatedPartySupplier(clgPersons, cost.supplierName).related,
  ).length
  const gaps = costs.flatMap(findTraceabilityGaps)
  const exemption = qualifiesForAuditExemption(clgProfile)
  const actualCosts = costs.filter((cost) => cost.status === 'actual')

  const evidenceRows = useMemo(
    () =>
      actualCosts.map((cost) => {
        const review = reviews.find((item) => item.costId === cost.id)
        const bank = bankTransactions.find((transaction) => transaction.matchedCostId === cost.id)
        const posting = sageIntegration.recentPostings.find(
          (item) => item.veyvioCostId === cost.id,
        )
        const complete = isFullyReconciledCost({
          approvedInVeyvio: cost.reviewState === 'approved',
          sagePostingStatus: posting?.postingStatus ?? null,
          bankReconciliationStatus: posting?.bankReconciliationStatus ?? null,
        })
        const missing = cost.evidence.length === 0
        return {
          cost,
          review,
          bank,
          posting,
          status: complete ? 'complete' : missing ? 'missing' : 'attention',
        } as const
      }),
    [actualCosts, bankTransactions, reviews, sageIntegration.recentPostings],
  )

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return evidenceRows
      .filter((row) => evidenceFilter === 'all' || row.status === evidenceFilter)
      .filter((row) => {
        if (!needle) return true
        const searchable = [
          row.cost.supplierName,
          row.cost.reference,
          row.cost.description,
          row.cost.id,
          ...row.cost.evidence.map((item) => item.label),
        ]
          .join(' ')
          .toLowerCase()
        return searchable.includes(needle)
      })
      .sort((a, b) => b.cost.transactionDate.localeCompare(a.cost.transactionDate))
  }, [evidenceFilter, evidenceRows, query])

  const pack = buildAnnualEvidencePack({
    organisationId: organisation.id,
    costs,
    openReviews,
    quarantineCount: quarantine.length,
    quarterlyLocked: quarterlyReview.status === 'locked',
    incomeApproved: Boolean(incomeSummary?.approvedByAccountant),
    relatedPartyCostCount,
    missingEvidenceCount,
  })
  const ready = pack.filter((item) => item.status === 'ready').length
  const partial = pack.filter((item) => item.status === 'partial').length
  const missing = pack.filter((item) => item.status === 'missing').length
  const completeCosts = evidenceRows.filter((row) => row.status === 'complete').length
  const blockerCount =
    missing + openReviews + quarantine.length + sageIntegration.failedExports.length

  return (
    <div className="page audit-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Assurance</p>
          <h1>Audit &amp; evidence</h1>
          <p className="muted">
            Follow every actual cost from source document to approval, accounting entry, payment
            and Sage-confirmed bank reconciliation.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              downloadEvidenceRegisterCsv({
                organisationName: organisation.tradingName,
                organisationId: organisation.id,
                rows: evidenceRows,
              })
            }
          >
            Download evidence index
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Print checklist
          </button>
          <Link className="btn-secondary" to="/board-pack">
            Board pack
          </Link>
        </div>
      </header>

      <nav className="page-subnav" aria-label="Audit workspace sections">
        <a className="page-chip active" href="#audit-overview">
          Overview
        </a>
        <a className="page-chip" href="#evidence-register">
          Evidence register
        </a>
        <a className="page-chip" href="#traceability">
          Traceability
        </a>
        <a className="page-chip" href="#audit-activity">
          Activity history
        </a>
      </nav>

      <section
        id="audit-overview"
        className={`audit-readiness ${blockerCount === 0 ? 'is-ready' : 'needs-attention'}`}
      >
        <div>
          <StatusPill tone={blockerCount === 0 ? 'healthy' : 'attention'}>
            {blockerCount === 0 ? 'Ready for external review' : 'Preparation in progress'}
          </StatusPill>
          <h2>
            {blockerCount === 0
              ? 'The current evidence pack has no open blockers'
              : `${blockerCount} item${blockerCount === 1 ? '' : 's'} must be cleared`}
          </h2>
          <p>
            {openReviews} open reviews · {quarantine.length} quarantined imports ·{' '}
            {sageIntegration.failedExports.length} Sage export exceptions · {missing} external or
            missing pack items
          </p>
        </div>
        <Link className="btn-secondary" to="/reviews">
          Resolve blockers
        </Link>
      </section>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Pack items ready</div>
          <div className="kpi-value">{ready}</div>
          <div className="kpi-hint">{partial} partial · {missing} missing/external</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Actual costs</div>
          <div className="kpi-value">{actualCosts.length}</div>
          <div className="kpi-hint">{missingEvidenceCount} without a document</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Fully traceable</div>
          <div className="kpi-value">
            {completeCosts} / {actualCosts.length}
          </div>
          <div className="kpi-hint">Approved, posted and Sage-confirmed</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Control gaps</div>
          <div className="kpi-value">{gaps.length}</div>
          <div className="kpi-hint">Across the current cost ledger</div>
        </div>
      </div>

      <section className="panel audit-boundary">
        <div>
          <h2>What this workspace proves</h2>
          <p className="muted">
            Veyvio preserves the cost, evidence, approval and control history. It supports the
            accountant, independent examiner or auditor; it does not replace statutory accounts
            software or professional assurance.
          </p>
        </div>
        <div>
          <h3>External records still required</h3>
          <p className="muted">
            Sage general ledger and VAT records · payroll records · bank statements · signed annual
            accounts · Companies House filings · independent examination or audit report.
          </p>
          <p className="small">
            {exemption.qualifies
              ? 'The current size profile suggests audit exemption may be available, unless an override or other legal requirement applies.'
              : 'The current size profile or override indicates external audit may be required.'}
          </p>
        </div>
      </section>

      <section id="evidence-register" className="panel">
        <div className="section-heading">
          <div>
            <h2>Transaction evidence register</h2>
            <p className="muted">
              The downloadable index uses integer minor units and stable IDs for reliable
              accountant-to-system matching.
            </p>
          </div>
          <span className="muted small">
            Showing {visibleRows.length} of {evidenceRows.length}
          </span>
        </div>
        <div className="audit-filters">
          <label>
            <span>Search evidence</span>
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Supplier, reference, document or cost ID"
            />
          </label>
          <label>
            <span>Traceability status</span>
            <select
              value={evidenceFilter}
              onChange={(event) => setEvidenceFilter(event.target.value as EvidenceFilter)}
            >
              <option value="all">All actual costs</option>
              <option value="complete">Fully traceable</option>
              <option value="attention">Needs attention</option>
              <option value="missing">Missing evidence</option>
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table className="data-table audit-register">
            <thead>
              <tr>
                <th>Date / cost</th>
                <th>Supplier / reference</th>
                <th>Gross</th>
                <th>Document</th>
                <th>Approval</th>
                <th>Sage ledger</th>
                <th>Bank</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.cost.id}>
                  <td>
                    {formatDate(row.cost.transactionDate)}
                    <small>{row.cost.id}</small>
                  </td>
                  <td>
                    <strong>{row.cost.supplierName}</strong>
                    <small>{row.cost.reference}</small>
                  </td>
                  <td className="num">
                    <MoneyText amountMinor={row.cost.gross.amountMinor} />
                  </td>
                  <td>
                    {row.cost.evidence.length ? (
                      <>
                        <strong>{row.cost.evidence[0].label}</strong>
                        <small>
                          {row.cost.evidence.length} file
                          {row.cost.evidence.length === 1 ? '' : 's'}
                        </small>
                      </>
                    ) : (
                      <StatusPill tone="critical">Missing</StatusPill>
                    )}
                  </td>
                  <td>
                    <StatusPill
                      tone={row.cost.reviewState === 'approved' ? 'healthy' : 'attention'}
                    >
                      {row.cost.reviewState.replaceAll('_', ' ')}
                    </StatusPill>
                    {row.review?.resolvedBy ? <small>By {row.review.resolvedBy}</small> : null}
                  </td>
                  <td>
                    {row.posting ? (
                      <>
                        <strong>{sagePostingDisplayLabel(row.posting.postingStatus)}</strong>
                        <small>{row.posting.sageTransactionId}</small>
                      </>
                    ) : (
                      <span className="muted">Not posted</span>
                    )}
                  </td>
                  <td>
                    {row.posting?.bankReconciliationStatus === 'sage_confirmed' ? (
                      <>
                        <strong>Sage confirmed</strong>
                        <small>{row.bank?.providerTxnId ?? 'Accounting record'}</small>
                      </>
                    ) : row.bank ? (
                      <>
                        <strong>Proposed match</strong>
                        <small>{row.bank.providerTxnId}</small>
                      </>
                    ) : (
                      <span className="muted">No match</span>
                    )}
                  </td>
                  <td>
                    <StatusPill
                      tone={
                        row.status === 'complete'
                          ? 'healthy'
                          : row.status === 'missing'
                            ? 'critical'
                            : 'attention'
                      }
                    >
                      {row.status === 'complete'
                        ? 'Complete'
                        : row.status === 'missing'
                          ? 'Evidence missing'
                          : 'Follow up'}
                    </StatusPill>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No actual costs match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section id="traceability" className="panel">
        <h2>Assurance and traceability</h2>
        <p className="muted">
          Open Banking matches are supporting evidence only. Final reconciliation is shown only
          after Sage confirms the official accounting reconciliation.
        </p>
        <div className="assurance-flow" aria-label="Cost assurance flow">
          {[
            ['1', 'Source', 'Invoice, payroll or expense evidence'],
            ['2', 'Authorise', 'Budget owner and finance review'],
            ['3', 'Account', 'Posted to the Sage general ledger'],
            ['4', 'Reconcile', 'Payment matched and Sage confirmed'],
            ['5', 'Report', 'Locked quarter and annual evidence pack'],
          ].map(([number, title, detail]) => (
            <article key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </div>

        <h3>Evidence pack checklist</h3>
        <div className="exception-list">
          {pack.map((item) => (
            <article key={item.id} className="exception-card">
              <StatusPill
                tone={
                  item.status === 'ready'
                    ? 'healthy'
                    : item.status === 'partial'
                      ? 'attention'
                      : 'critical'
                }
              >
                {item.status}
              </StatusPill>
              <div>
                <h3>{item.title}</h3>
                <p className="muted">
                  {item.level.replaceAll('_', ' ')} · {item.detail}
                </p>
                {item.href ? (
                  <Link className="btn-ghost" to={item.href}>
                    Open source
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        {gaps.length ? (
          <>
            <h3>Control gaps requiring attention</h3>
            <ul className="stack-list">
              {gaps.slice(0, 12).map((gap) => (
                <li key={`${gap.costId}_${gap.field}`}>
                  <code>{gap.costId}</code> · {gap.field} — {gap.detail}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="callout healthy">No traceability gaps on the current ledger sample.</p>
        )}
      </section>

      <section id="audit-activity" className="panel">
        <div className="section-heading">
          <div>
            <h2>Immutable activity history</h2>
            <p className="muted">
              Review decisions keep the actor, time, reason and before/after state. Corrections add
              a new event; they do not silently overwrite history.
            </p>
          </div>
          <StatusPill tone="info">{auditEvents.length} events</StatusPill>
        </div>
        {auditEvents.length ? (
          <div className="audit-timeline">
            {auditEvents.slice(0, 20).map((event) => (
              <article key={event.id}>
                <span className="audit-timeline-dot" />
                <div>
                  <strong>{event.action.replaceAll('.', ' · ').replaceAll('_', ' ')}</strong>
                  <p>
                    {event.entityType} <code>{event.entityId}</code> · {event.actorId}
                  </p>
                  {event.reason ? <p className="muted">Reason: {event.reason}</p> : null}
                </div>
                <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <p className="callout info">
            No review decisions have been recorded in this demo session. Approving, rejecting or
            requesting evidence from Reviews will add an immutable event here.
          </p>
        )}
      </section>
    </div>
  )
}

type EvidenceRow = {
  cost: CostRecord
  review: ReturnType<typeof useCostStore>['reviews'][number] | undefined
  bank: ReturnType<typeof useCostStore>['bankTransactions'][number] | undefined
  posting: ReturnType<typeof useCostStore>['sageIntegration']['recentPostings'][number] | undefined
  status: 'complete' | 'attention' | 'missing'
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function downloadEvidenceRegisterCsv(input: {
  organisationName: string
  organisationId: string
  rows: EvidenceRow[]
}) {
  const headers = [
    'organisation_id',
    'cost_id',
    'transaction_date',
    'supplier',
    'reference',
    'gross_minor',
    'currency',
    'evidence_labels',
    'evidence_source_types',
    'evidence_checksums',
    'review_state',
    'review_resolved_by',
    'sage_transaction_id',
    'sage_posting_status',
    'bank_provider_transaction_id',
    'sage_bank_reconciliation_status',
    'traceability_result',
  ]
  const values = input.rows.map(({ cost, review, bank, posting, status }) => [
    input.organisationId,
    cost.id,
    cost.transactionDate,
    cost.supplierName,
    cost.reference,
    cost.gross.amountMinor,
    cost.gross.currency,
    cost.evidence.map((item) => item.label).join(' | '),
    cost.evidence.map((item) => item.sourceType).join(' | '),
    cost.evidence.map((item) => item.checksum ?? '').join(' | '),
    cost.reviewState,
    review?.resolvedBy ?? '',
    posting?.sageTransactionId ?? '',
    posting?.postingStatus ?? 'not_posted',
    bank?.providerTxnId ?? '',
    posting?.bankReconciliationStatus ?? 'unreconciled',
    status,
  ])
  const csv = [headers, ...values]
    .map((row) => row.map((value) => csvCell(value)).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${input.organisationName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')}-audit-evidence-index.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
