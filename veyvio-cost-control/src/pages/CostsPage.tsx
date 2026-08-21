import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  approvalLabel,
  categoryLabel,
  costCentreLabel,
  formatDate,
  formatPeriod,
  statusLabel,
  subcategoryLabel,
  validationLabel,
  vatTreatmentLabel,
} from '../lib/labels'
import type {
  ApprovalStatus,
  CostCategory,
  CostLifecycleStatus,
  CostRecord,
  ReviewItem,
} from '../domain/types'
import type { AuditEvent } from '../domain/review-actions'
import {
  isFullyReconciledCost,
  sagePostingDisplayLabel,
  type SagePostingResult,
} from '../integrations/sage'

const COST_VIEWS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/costs', label: 'All', end: true },
  { to: '/fuel', label: 'Fuel' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/wages', label: 'Wage hub' },
  { to: '/wages/ledger', label: 'Wage ledger' },
  { to: '/operating', label: 'Operating' },
]

export function CostsPage({
  title = 'All costs',
  filterCategory,
  filterStatus,
}: {
  title?: string
  filterCategory?: CostCategory | CostCategory[]
  filterStatus?: CostLifecycleStatus
}) {
  const { costs, reviews, bankTransactions, auditEvents, sageIntegration } = useCostStore()
  const location = useLocation()
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState('all')
  const [statusFilter, setStatusFilter] = useState<CostLifecycleStatus | 'all'>(
    filterStatus ?? 'all',
  )
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'missing' | 'present'>('all')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [selected, setSelected] = useState<CostRecord | null>(null)

  const periods = useMemo(
    () => ['all', ...new Set(costs.map((c) => c.accountingPeriod).sort().reverse())],
    [costs],
  )

  const enrichedRows = useMemo(() => {
    const cats = filterCategory
      ? Array.isArray(filterCategory)
        ? filterCategory
        : [filterCategory]
      : null
    return costs
      .filter((c) => (cats ? cats.includes(c.category) : true))
      .filter((c) => (filterStatus ? c.status === filterStatus : true))
      .map((c) =>
        enrichCost(c, reviews, bankTransactions, sageIntegration?.recentPostings ?? []),
      )
  }, [
    bankTransactions,
    costs,
    filterCategory,
    filterStatus,
    reviews,
    sageIntegration?.recentPostings,
  ])

  const rows = useMemo(() => {
    return enrichedRows
      .filter((c) => (statusFilter === 'all' ? true : c.cost.status === statusFilter))
      .filter((c) => (period === 'all' ? true : c.cost.accountingPeriod === period))
      .filter((c) =>
        evidenceFilter === 'all'
          ? true
          : evidenceFilter === 'missing'
            ? c.evidenceStatus === 'missing'
            : c.evidenceStatus === 'present',
      )
      .filter((c) => (attentionOnly ? c.requiresAttention : true))
      .filter((c) => {
        if (!q.trim()) return true
        const hay = `${c.cost.supplierName} ${c.cost.description} ${c.cost.reference}`.toLowerCase()
        return hay.includes(q.trim().toLowerCase())
      })
      .sort((a, b) => b.cost.transactionDate.localeCompare(a.cost.transactionDate))
  }, [attentionOnly, enrichedRows, evidenceFilter, period, q, statusFilter])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.cost.status] += row.cost.gross.amountMinor
        if (row.requiresAttention) acc.attention += 1
        return acc
      },
      {
        actual: 0,
        committed: 0,
        forecast: 0,
        estimated: 0,
        attention: 0,
      } as Record<CostLifecycleStatus | 'attention', number>,
    )
  }, [rows])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="muted">
            Master cost ledger for actual, committed and forecast costs. Inspect evidence, payment,
            reconciliation and audit context without leaving the page.
          </p>
        </div>
        <input
          className="search"
          placeholder="Search supplier, invoice or internal reference"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>

      <p className="callout info">
        Posted costs must not be silently edited or deleted. Corrections are handled through
        reversals, credit notes or approved adjustment records.
      </p>

      <div className="page-subnav" role="navigation" aria-label="Cost categories">
        {COST_VIEWS.map((view) => {
          const active = view.end
            ? location.pathname === view.to
            : location.pathname === view.to || location.pathname.startsWith(`${view.to}/`)
          return (
            <Link
              key={view.to}
              to={view.to}
              className={active ? 'page-chip active' : 'page-chip'}
            >
              {view.label}
            </Link>
          )
        })}
        <span className="page-subnav-sep" aria-hidden />
        <Link className="page-chip quiet" to="/vehicles">
          Vehicles
        </Link>
        <Link className="page-chip quiet" to="/suppliers">
          Suppliers
        </Link>
        <Link className="page-chip quiet" to="/imports">
          Import
        </Link>
      </div>

      <div className="kpi-grid dense">
        <div className="kpi">
          <div className="kpi-label">Actual</div>
          <div className="kpi-value">
            <MoneyText amountMinor={totals.actual} />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Committed</div>
          <div className="kpi-value">
            <MoneyText amountMinor={totals.committed} status="committed" />
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Forecast</div>
          <div className="kpi-value">
            <MoneyText amountMinor={totals.forecast + totals.estimated} />
          </div>
        </div>
        <div className={`kpi${totals.attention ? ' tone-critical' : ''}`}>
          <div className="kpi-label">Requiring attention</div>
          <div className="kpi-value">{totals.attention}</div>
        </div>
      </div>

      <section className="panel">
        <h2>Filters</h2>
        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            alignItems: 'end',
          }}
        >
          <label>
            <div className="muted small">Period</div>
            <select className="search" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {p === 'all' ? 'All periods' : formatPeriod(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div className="muted small">Cost type</div>
            <select
              className="search"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CostLifecycleStatus | 'all')}
            >
              <option value="all">All types</option>
              <option value="actual">Actual</option>
              <option value="committed">Committed</option>
              <option value="forecast">Forecast</option>
              <option value="estimated">Estimated</option>
            </select>
          </label>
          <label>
            <div className="muted small">Evidence status</div>
            <select
              className="search"
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value as 'all' | 'missing' | 'present')}
            >
              <option value="all">All evidence</option>
              <option value="present">Evidence present</option>
              <option value="missing">Evidence missing</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={attentionOnly}
              onChange={(e) => setAttentionOnly(e.target.checked)}
            />
            <span>Only show costs requiring attention</span>
          </label>
        </div>
      </section>

      {totals.attention ? (
        <section className="panel">
          <h2>Costs requiring attention</h2>
          <div className="exception-list">
            {rows
              .filter((row) => row.requiresAttention)
              .slice(0, 6)
              .map((row) => (
                <article
                  key={row.cost.id}
                  className="exception-card"
                  onClick={() => setSelected(row.cost)}
                  style={{ cursor: 'pointer' }}
                >
                  <StatusPill tone="attention">{row.attentionLabel}</StatusPill>
                  <div>
                    <h3>{row.cost.description}</h3>
                    <p className="muted">
                      {row.cost.supplierName} · {row.cost.reference} ·{' '}
                      <MoneyText amountMinor={row.cost.gross.amountMinor} />
                    </p>
                  </div>
                </article>
              ))}
          </div>
        </section>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction / accounting</th>
              <th>Supplier</th>
              <th>Cost</th>
              <th>Type</th>
              <th className="num">Gross</th>
              <th className="num">Net</th>
              <th className="num">VAT</th>
              <th>Approval</th>
              <th>Sage accounting</th>
              <th>Payment / bank</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.cost.id} className="clickable" onClick={() => setSelected(row.cost)}>
                <td>
                  <div>{formatDate(row.cost.transactionDate)}</div>
                  <div className="muted small">{formatPeriod(row.cost.accountingPeriod)}</div>
                </td>
                <td>{row.cost.supplierName}</td>
                <td>
                  <div>{row.cost.description}</div>
                  <div className="muted small">
                    {categoryLabel(row.cost.category)} · {row.cost.reference}
                  </div>
                </td>
                <td>
                  <StatusPill
                    tone={
                      row.cost.status === 'actual'
                        ? 'healthy'
                        : row.cost.status === 'forecast' || row.cost.status === 'estimated'
                          ? 'info'
                          : 'attention'
                    }
                  >
                    {statusLabel(row.cost.status)}
                  </StatusPill>
                </td>
                <td className="num">
                  <MoneyText amountMinor={row.cost.gross.amountMinor} />
                </td>
                <td className="num">
                  <MoneyText amountMinor={row.cost.net.amountMinor} />
                </td>
                <td className="num">
                  <MoneyText amountMinor={row.cost.vat.amountMinor} />
                </td>
                <td>
                  <StatusPill tone={approvalTone(row.approvalStatus)}>
                    {approvalLabel(row.approvalStatus)}
                  </StatusPill>
                </td>
                <td>
                  <StatusPill
                    tone={
                      row.posting?.postingStatus === 'rejected' ||
                      row.posting?.postingStatus === 'reversed'
                        ? 'critical'
                        : row.fullyReconciled
                          ? 'healthy'
                          : row.posting
                            ? 'info'
                            : 'neutral'
                    }
                  >
                    {row.posting
                      ? sagePostingDisplayLabel(row.posting.postingStatus)
                      : 'Not sent to Sage'}
                  </StatusPill>
                </td>
                <td>
                  <div>{row.paymentLabel}</div>
                  <div className="muted small">{row.bankLabel}</div>
                </td>
                <td>{row.evidenceLabel}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={11} className="muted">
                  No costs match this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <CostDetail
          cost={selected}
          review={reviews.find((r) => r.costId === selected.id) ?? null}
          relatedTransactions={bankTransactions.filter((t) => t.matchedCostId === selected.id)}
          posting={
            sageIntegration?.recentPostings.find((posting) => posting.veyvioCostId === selected.id) ??
            null
          }
          auditEvents={auditEvents.filter((a) => a.entityId === selected.id)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

function CostDetail({
  cost,
  review,
  relatedTransactions,
  posting,
  auditEvents,
  onClose,
}: {
  cost: CostRecord
  review: ReviewItem | null
  relatedTransactions: Array<{
    id: string
    bookedAt: string
    amountMinor: number
    providerTxnId: string
    status: 'booked' | 'pending'
  }>
  posting: SagePostingResult | null
  auditEvents: AuditEvent[]
  onClose: () => void
}) {
  const approvalStatus = deriveApprovalStatus(cost, review)
  const timeline = buildTimeline(cost, review, relatedTransactions, posting, auditEvents)
  const fullyReconciled = isFullyReconciledCost({
    approvedInVeyvio: approvalStatus === 'approved',
    sagePostingStatus: posting?.postingStatus ?? null,
    bankReconciliationStatus: posting?.bankReconciliationStatus ?? null,
  })

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <h2>Cost detail</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <dl className="detail-grid">
          <dt>Supplier</dt>
          <dd>{cost.supplierName}</dd>
          <dt>Description</dt>
          <dd>{cost.description}</dd>
          <dt>Reference</dt>
          <dd>{cost.reference}</dd>
          <dt>Transaction / accounting</dt>
          <dd>
            {formatDate(cost.transactionDate)} · {formatPeriod(cost.accountingPeriod)}
          </dd>
          <dt>Payment date</dt>
          <dd>{cost.paymentDate ? formatDate(cost.paymentDate) : 'Not scheduled'}</dd>
          <dt>Net / VAT / Gross</dt>
          <dd>
            <MoneyText amountMinor={cost.net.amountMinor} /> /{' '}
            <MoneyText amountMinor={cost.vat.amountMinor} /> /{' '}
            <MoneyText amountMinor={cost.gross.amountMinor} />
          </dd>
          <dt>Cost type</dt>
          <dd>
            {statusLabel(cost.status)} · version {cost.version}
          </dd>
          <dt>Approval</dt>
          <dd>{approvalLabel(approvalStatus)}</dd>
          <dt>Category</dt>
          <dd>
            {categoryLabel(cost.category)} · {subcategoryLabel(cost.subcategory)}
          </dd>
          <dt>Validation</dt>
          <dd>{validationLabel(cost.validationState)}</dd>
          <dt>VAT treatment</dt>
          <dd>{vatTreatmentLabel(cost.vatTreatment ?? 'standard')}</dd>
          <dt>Allocations</dt>
          <dd>
            {cost.allocations.map((a) => (
              <div key={`${a.budgetId}-${a.amountMinor}`}>
                {categoryLabel(a.category)} · {costCentreLabel(a.costCentreId)} ·{' '}
                <MoneyText amountMinor={a.amountMinor} />
                {a.vehicleId ? ` · ${a.vehicleId}` : ''}
              </div>
            ))}
          </dd>
          <dt>Budget line / centre</dt>
          <dd>
            {cost.allocations.map((a) => costCentreLabel(a.costCentreId)).join(', ')}
          </dd>
          <dt>Vehicle / programme</dt>
          <dd>
            {cost.allocations.some((a) => a.vehicleId)
              ? cost.allocations
                  .map((a) => a.vehicleId)
                  .filter(Boolean)
                  .join(', ')
              : 'Programme-wide / unassigned'}
          </dd>
          <dt>Evidence</dt>
          <dd>
            {cost.evidence.length
              ? cost.evidence.map((e) => `${e.label} (${e.sourceType})`).join(', ')
              : 'Missing'}
          </dd>
          <dt>Bank reconciliation</dt>
          <dd>
            {relatedTransactions.length
              ? relatedTransactions
                  .map(
                    (t) =>
                      `${formatDate(t.bookedAt)} · proposed match · ${t.providerTxnId}`,
                  )
                  .join('; ')
              : 'No linked bank transaction'}
          </dd>
          <dt>Sage accounting</dt>
          <dd>
            {posting
              ? `${sagePostingDisplayLabel(posting.postingStatus)} · ${posting.sageTransactionId}`
              : 'Not sent to Sage'}
          </dd>
          <dt>Final reconciliation</dt>
          <dd>
            <StatusPill tone={fullyReconciled ? 'healthy' : 'attention'}>
              {fullyReconciled
                ? 'Fully reconciled — Sage confirmed'
                : 'Not fully reconciled'}
            </StatusPill>
          </dd>
          <dt>Review</dt>
          <dd>
            {review
              ? `${review.title} · ${review.state}${review.resolutionNote ? ` · ${review.resolutionNote}` : ''}`
              : 'No open review'}
          </dd>
          <dt>Correction rule</dt>
          <dd>
            Posted rows are preserved. Use reversal, credit note or approved adjustment instead of
            silently changing history.
          </dd>
          <dt>Source key</dt>
          <dd>
            <code>{cost.sourceKey}</code>
          </dd>
        </dl>

        <section className="panel" style={{ marginTop: '1rem' }}>
          <h3>Audit history</h3>
          <ul className="stack-list">
            {timeline.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.title}</strong> · {formatDate(entry.date)}
                <div className="muted small">{entry.detail}</div>
              </li>
            ))}
          </ul>
        </section>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link className="btn" to="/audit">
            Open audit workspace
          </Link>
          <Link className="btn-ghost" to="/bank">
            Open cash & bank
          </Link>
          <Link className="btn-ghost" to="/imports">
            Open imports
          </Link>
        </div>
      </aside>
    </div>
  )
}

function deriveApprovalStatus(cost: CostRecord, review: ReviewItem | null): ApprovalStatus {
  if (review?.state === 'rejected') return 'disputed'
  if (review?.state === 'open') return 'under_review'
  if (review?.state === 'approved') return 'approved'
  if (cost.validationState === 'quarantined') return 'disputed'
  if (cost.validationState === 'pending') return 'under_review'
  return 'approved'
}

function approvalTone(status: ApprovalStatus): 'neutral' | 'attention' | 'healthy' | 'critical' {
  if (status === 'approved') return 'healthy'
  if (status === 'disputed') return 'critical'
  if (status === 'under_review') return 'attention'
  return 'neutral'
}

function enrichCost(
  cost: CostRecord,
  reviews: ReviewItem[],
  bankTransactions: Array<{
    matchedCostId: string | null
    status: 'booked' | 'pending'
    bookedAt: string
  }>,
  postings: SagePostingResult[],
) {
  const review = reviews.find((r) => r.costId === cost.id) ?? null
  const approvalStatus = deriveApprovalStatus(cost, review)
  const hasEvidence = cost.evidence.length > 0
  const matchedBank = bankTransactions.find((t) => t.matchedCostId === cost.id) ?? null
  const posting = postings.find((item) => item.veyvioCostId === cost.id) ?? null
  const fullyReconciled = isFullyReconciledCost({
    approvedInVeyvio: approvalStatus === 'approved',
    sagePostingStatus: posting?.postingStatus ?? null,
    bankReconciliationStatus: posting?.bankReconciliationStatus ?? null,
  })
  const evidenceStatus = hasEvidence ? 'present' : 'missing'

  let paymentLabel = 'Not paid'
  let bankLabel = 'No bank match'
  if (cost.status !== 'actual') {
    paymentLabel = cost.paymentDate ? `Due ${formatDate(cost.paymentDate)}` : 'Planned cost'
    bankLabel = matchedBank ? 'Proposed bank match' : 'Not yet banked'
  } else if (matchedBank) {
    paymentLabel = `Paid ${formatDate(matchedBank.bookedAt)}`
    bankLabel = fullyReconciled
      ? 'Sage-confirmed reconciliation'
      : 'Proposed bank match'
  } else if (cost.paymentDate) {
    paymentLabel = `Due ${formatDate(cost.paymentDate)}`
    bankLabel = 'Awaiting reconciliation'
  }

  const requiresAttention =
    !hasEvidence ||
    cost.validationState === 'pending' ||
    cost.validationState === 'quarantined' ||
    review?.state === 'open' ||
    review?.state === 'rejected' ||
    (cost.status === 'actual' && !fullyReconciled)

  let attentionLabel = 'Needs review'
  if (!hasEvidence) attentionLabel = 'Missing evidence'
  else if (cost.validationState === 'quarantined') attentionLabel = 'Quarantined'
  else if (review?.state === 'rejected') attentionLabel = 'Disputed'
  else if (review?.state === 'open') attentionLabel = 'Under review'
  else if (cost.status === 'actual' && !fullyReconciled) {
    attentionLabel = matchedBank ? 'Awaiting Sage reconciliation' : 'Unreconciled payment'
  }

  return {
    cost,
    review,
    approvalStatus,
    evidenceStatus,
    evidenceLabel: hasEvidence ? `${cost.evidence.length} file(s)` : 'Missing',
    paymentLabel,
    bankLabel,
    posting,
    fullyReconciled,
    requiresAttention: Boolean(requiresAttention),
    attentionLabel,
  }
}

function buildTimeline(
  cost: CostRecord,
  review: ReviewItem | null,
  relatedTransactions: Array<{
    id: string
    bookedAt: string
    amountMinor: number
    providerTxnId: string
    status: 'booked' | 'pending'
  }>,
  posting: SagePostingResult | null,
  auditEvents: AuditEvent[],
) {
  const timeline = [
    {
      id: `${cost.id}_created`,
      date: cost.createdAt,
      title: 'Cost created',
      detail: `${cost.reference} added to the master ledger.`,
    },
    ...(cost.updatedAt !== cost.createdAt
      ? [
          {
            id: `${cost.id}_updated`,
            date: cost.updatedAt,
            title: 'Cost updated',
            detail: `Version ${cost.version}${cost.correctionReason ? ` · ${cost.correctionReason}` : ''}.`,
          },
        ]
      : []),
    ...(review
      ? [
          {
            id: review.id,
            date: review.resolvedAt ?? review.createdAt,
            title: 'Review activity',
            detail: `${review.title} · ${review.state}${review.resolutionNote ? ` · ${review.resolutionNote}` : ''}`,
          },
        ]
      : []),
    ...relatedTransactions.map((t) => ({
      id: t.id,
      date: t.bookedAt,
      title: 'Bank match',
      detail: `${t.providerTxnId} · ${t.status} · ${t.amountMinor} minor units proposed. Final reconciliation remains with Sage.`,
    })),
    ...(posting
      ? [
          {
            id: `sage_${posting.sageTransactionId}`,
            date: posting.lastSageUpdateAt,
            title: 'Sage accounting update',
            detail: `${sagePostingDisplayLabel(posting.postingStatus)} · ${posting.sageTransactionId} · bank ${posting.bankReconciliationStatus}.`,
          },
        ]
      : []),
    ...auditEvents.map((a) => ({
      id: a.id,
      date: a.createdAt,
      title: a.action,
      detail: a.reason ?? `Actor ${a.actorId}`,
    })),
  ]

  return timeline.sort((a, b) => b.date.localeCompare(a.date))
}
