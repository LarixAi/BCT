import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  amountsByLifecycle,
  computeOperatingPosition,
  costCentreIdFor,
  deriveApprovalStatus,
  deriveVatTreatment,
  filterOperatingLedger,
  listOperatingAttention,
  listOperatingCosts,
  OPERATING_GROUPS,
  operatingGroupFor,
  type OperatingGroupId,
  type OperatingLedgerFilters,
} from '../domain/operating-costs'
import type { ApprovalStatus, CostLifecycleStatus, CostRecord } from '../domain/types'
import {
  approvalLabel,
  categoryLabel,
  costCentreLabel,
  formatDate,
  formatPeriod,
  operatingGroupLabel,
  statusLabel,
  subcategoryLabel,
  vatTreatmentLabel,
} from '../lib/labels'

const COST_VIEWS = [
  { to: '/costs', label: 'All' },
  { to: '/fuel', label: 'Fuel' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/wages', label: 'Wage hub' },
  { to: '/operating', label: 'Operating' },
] as const

export function OperatingCostsPage() {
  const { organisation, budget, costs, reviews } = useCostStore()
  const [selected, setSelected] = useState<CostRecord | null>(null)
  const [filters, setFilters] = useState<OperatingLedgerFilters>({
    group: 'all',
    approval: 'all',
    lifecycle: 'all',
    query: '',
    period: 'all',
  })

  const operating = useMemo(
    () => listOperatingCosts(costs, organisation.id),
    [costs, organisation.id],
  )

  const position = useMemo(
    () =>
      computeOperatingPosition({
        organisationId: organisation.id,
        budget,
        costs,
      }),
    [organisation.id, budget, costs],
  )

  const attention = useMemo(
    () =>
      listOperatingAttention({
        organisationId: organisation.id,
        costs,
        reviews,
        position,
      }),
    [organisation.id, costs, reviews, position],
  )

  const periods = useMemo(() => {
    const set = new Set(operating.map((c) => c.accountingPeriod))
    return [...set].sort().reverse()
  }, [operating])

  const rows = useMemo(() => filterOperatingLedger(operating, filters), [operating, filters])

  const groupCounts = useMemo(() => {
    const counts: Record<OperatingGroupId | 'all', number> = {
      all: operating.length,
      premises: 0,
      technology: 0,
      insurance_professional: 0,
      office_admin: 0,
      training_staff: 0,
      recurring: 0,
      other: 0,
    }
    for (const c of operating) {
      counts[operatingGroupFor(c)] += 1
      if (c.subcategory && ['subscription', 'contract', 'licence', 'rent', 'telecoms', 'software'].includes(c.subcategory)) {
        counts.recurring += 1
      }
    }
    return counts
  }, [operating])

  const overspend = position.projectedRemainingMinor < 0
  const heroTone = overspend ? 'critical' : attention.length ? 'attention' : 'healthy'
  const approvedLine = budget.lines.find((l) => l.category === 'premises')

  return (
    <div className="page operating-page">
      <header className="page-header">
        <div>
          <h1>Operating costs</h1>
          <p className="muted">
            Premises, technology, professional fees, administration and approved overheads ·{' '}
            {budget.code} · FY {budget.financialYear}
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="btn-secondary" to="/imports">
            Import costs
          </Link>
          <Link className="btn-secondary" to="/budgets">
            CEC budget
          </Link>
        </div>
      </header>

      <div className="page-subnav" role="navigation" aria-label="Cost categories">
        {COST_VIEWS.map((view) => {
          const active = view.to === '/operating'
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
      </div>

      <section className={`cost-hero ${heroTone}`}>
        <div className="cost-hero-primary">
          <div className="cost-hero-eyebrow">Will the overhead budget hold?</div>
          <div className="cost-hero-label">Projected remaining</div>
          <div className="cost-hero-value">
            <MoneyText amountMinor={position.projectedRemainingMinor} />
          </div>
          <div className="cost-hero-sub">
            Projected final <MoneyText amountMinor={position.projectedFinalMinor} /> · Approved{' '}
            <MoneyText amountMinor={position.approvedMinor} />
            {approvedLine ? ` · ${approvedLine.label}` : null}
          </div>
        </div>
        <div className="cost-hero-side">
          <h2 className="cost-hero-side-title">
            {overspend
              ? 'Overspend risk'
              : attention.length
                ? 'Items need attention'
                : 'Overhead position healthy'}
          </h2>
          <p className="cost-hero-side-copy">
            {overspend
              ? 'Projected final cost exceeds the approved Premises & overhead budget. Clear disputed invoices and review commitments before period close.'
              : attention.length
                ? `${attention.length} operating item${attention.length === 1 ? '' : 's'} need a decision — drafts, missing invoices, disputes or open reviews.`
                : 'No material operating-cost exceptions on the current ledger.'}
          </p>
          <div className="cost-hero-actions">
            {attention.length ? (
              <a className="btn cost-hero-btn" href="#operating-attention">
                Review attention list
              </a>
            ) : (
              <a className="btn cost-hero-btn" href="#operating-ledger">
                Browse ledger
              </a>
            )}
            <Link className="btn-ghost cost-hero-btn-secondary" to="/reviews">
              Open reviews
            </Link>
          </div>
        </div>
      </section>

      <div className="kpi-grid dense">
        <Kpi label="Approved budget" value={<MoneyText amountMinor={position.approvedMinor} />} />
        <Kpi
          label="Actual"
          value={<MoneyText amountMinor={position.actualMinor} status="actual" />}
        />
        <Kpi
          label="Committed"
          value={<MoneyText amountMinor={position.committedMinor} status="committed" />}
        />
        <Kpi
          label="Forecast"
          value={<MoneyText amountMinor={position.forecastMinor} status="forecast" />}
        />
        <Kpi
          label="Projected final cost"
          value={<MoneyText amountMinor={position.projectedFinalMinor} />}
          hint="Actual + committed + forecast"
        />
        <Kpi
          label="Projected variance"
          value={<MoneyText amountMinor={position.varianceToApprovedMinor} />}
          tone={overspend ? 'critical' : 'healthy'}
          hint="Approved − projected final"
        />
      </div>

      <section className="panel" id="operating-attention">
        <div className="panel-header-row">
          <h2>Items requiring attention</h2>
          <StatusPill tone={attention.length ? 'attention' : 'healthy'}>
            {attention.length ? `${attention.length} open` : 'Clear'}
          </StatusPill>
        </div>
        {attention.length ? (
          <div className="exception-list">
            {attention.slice(0, 8).map((item) => (
              <article key={item.id} className="exception-card">
                <StatusPill
                  tone={
                    item.severity === 'critical'
                      ? 'critical'
                      : item.severity === 'attention'
                        ? 'attention'
                        : 'info'
                  }
                >
                  {item.severity}
                </StatusPill>
                <div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.detail}</p>
                  <div className="row-actions" style={{ marginTop: '0.4rem' }}>
                    {item.costId ? (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          const match = operating.find((c) => c.id === item.costId)
                          if (match) setSelected(match)
                        }}
                      >
                        Open cost
                      </button>
                    ) : null}
                    {item.href ? (
                      <Link className="btn-ghost" to={item.href}>
                        Go to queue
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No drafts, disputes, missing invoices or open reviews on operating costs.</p>
        )}
      </section>

      <section className="panel" id="operating-ledger">
        <div className="panel-header-row">
          <h2>Operating cost ledger</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {rows.length} of {operating.length} costs
          </p>
        </div>

        <div className="ops-group-chips" role="tablist" aria-label="Operating cost groups">
          <GroupChip
            label="All"
            count={groupCounts.all}
            active={filters.group === 'all'}
            onClick={() => setFilters((f) => ({ ...f, group: 'all' }))}
          />
          {OPERATING_GROUPS.map((g) => (
            <GroupChip
              key={g.id}
              label={g.label}
              detail={g.detail}
              count={groupCounts[g.id]}
              active={filters.group === g.id}
              onClick={() => setFilters((f) => ({ ...f, group: g.id }))}
            />
          ))}
        </div>

        <div className="ops-filters">
          <input
            className="search"
            placeholder="Search supplier, description, reference"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            aria-label="Search operating costs"
          />
          <label className="ops-filter-field">
            <span>Status</span>
            <select
              value={filters.approval}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  approval: e.target.value as ApprovalStatus | 'all',
                }))
              }
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under review</option>
              <option value="approved">Approved</option>
              <option value="disputed">Disputed</option>
            </select>
          </label>
          <label className="ops-filter-field">
            <span>Lifecycle</span>
            <select
              value={filters.lifecycle}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  lifecycle: e.target.value as CostLifecycleStatus | 'all',
                }))
              }
            >
              <option value="all">All amounts</option>
              <option value="actual">Actual</option>
              <option value="committed">Committed</option>
              <option value="forecast">Forecast</option>
              <option value="estimated">Estimated</option>
            </select>
          </label>
          <label className="ops-filter-field">
            <span>Period</span>
            <select
              value={filters.period}
              onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
            >
              <option value="all">All periods</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap ops-ledger-wrap">
          <table className="data-table ops-ledger">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Category / centre</th>
                <th>Description</th>
                <th className="num">Actual</th>
                <th className="num">Committed</th>
                <th className="num">Forecast</th>
                <th className="num">Budget rem.</th>
                <th>Evidence</th>
                <th>VAT</th>
                <th>Period / paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const amounts = amountsByLifecycle(c)
                const approval = deriveApprovalStatus(c)
                const vat = deriveVatTreatment(c)
                const centre = costCentreIdFor(c)
                const group = operatingGroupFor(c)
                const attentionRow =
                  approval === 'disputed' ||
                  approval === 'under_review' ||
                  approval === 'draft' ||
                  c.evidence.length === 0
                return (
                  <tr
                    key={c.id}
                    className={`clickable${attentionRow ? ' row-attention' : ''}`}
                    onClick={() => setSelected(c)}
                  >
                    <td>
                      <div className="ops-supplier">{c.supplierName}</div>
                      <div className="muted small">{c.reference}</div>
                    </td>
                    <td>
                      <div>
                        {categoryLabel(c.category)}
                        {c.subcategory ? ` · ${subcategoryLabel(c.subcategory)}` : ''}
                      </div>
                      <div className="muted small">
                        {costCentreLabel(centre)} · {operatingGroupLabel(group)}
                      </div>
                    </td>
                    <td>{c.description}</td>
                    <td className="num">
                      {amounts.actualMinor ? (
                        <MoneyText amountMinor={amounts.actualMinor} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {amounts.committedMinor ? (
                        <MoneyText amountMinor={amounts.committedMinor} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {amounts.forecastMinor ? (
                        <MoneyText amountMinor={amounts.forecastMinor} />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      <MoneyText amountMinor={position.projectedRemainingMinor} />
                    </td>
                    <td>
                      {c.evidence.length ? (
                        <span className="ops-evidence">{c.evidence.map((e) => e.label).join(', ')}</span>
                      ) : (
                        <StatusPill tone="attention">Missing</StatusPill>
                      )}
                    </td>
                    <td>
                      <div>{vatTreatmentLabel(vat)}</div>
                      <div className="muted small">
                        <MoneyText amountMinor={c.vat.amountMinor} />
                      </div>
                    </td>
                    <td>
                      <div>{formatPeriod(c.accountingPeriod)}</div>
                      <div className="muted small">
                        {c.paymentDate ? formatDate(c.paymentDate) : 'Payment TBD'}
                      </div>
                    </td>
                    <td>
                      <StatusPill
                        tone={
                          approval === 'approved'
                            ? 'healthy'
                            : approval === 'disputed'
                              ? 'critical'
                              : approval === 'under_review'
                                ? 'attention'
                                : 'info'
                        }
                      >
                        {approvalLabel(approval)}
                      </StatusPill>
                      <div className="muted small" style={{ marginTop: '0.25rem' }}>
                        {statusLabel(c.status)}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={11} className="muted">
                    No operating costs match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Approved budget for this view is the Premises &amp; overhead CEC line (
          <MoneyText amountMinor={position.approvedMinor} />
          ). Remaining and variance are pool-level — not split per invoice. Lifecycle status
          (actual / committed / forecast) stays separate from approval status (draft / under
          review / approved / disputed).
        </p>
      </section>

      {selected ? (
        <OperatingCostDetail
          cost={selected}
          approvedPoolMinor={position.approvedMinor}
          remainingMinor={position.projectedRemainingMinor}
          varianceMinor={position.varianceToApprovedMinor}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}

function GroupChip({
  label,
  detail,
  count,
  active,
  onClick,
}: {
  label: string
  detail?: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? 'page-chip active' : 'page-chip'}
      title={detail}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
      <span className="ops-chip-count">{count}</span>
    </button>
  )
}

function OperatingCostDetail({
  cost,
  approvedPoolMinor,
  remainingMinor,
  varianceMinor,
  onClose,
}: {
  cost: CostRecord
  approvedPoolMinor: number
  remainingMinor: number
  varianceMinor: number
  onClose: () => void
}) {
  const amounts = amountsByLifecycle(cost)
  const approval = deriveApprovalStatus(cost)
  const vat = deriveVatTreatment(cost)
  const centre = costCentreIdFor(cost)
  const group = operatingGroupFor(cost)

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <h2>Operating cost</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <dl className="detail-grid">
          <dt>Supplier</dt>
          <dd>{cost.supplierName}</dd>
          <dt>Cost category</dt>
          <dd>
            {categoryLabel(cost.category)}
            {cost.subcategory ? ` · ${subcategoryLabel(cost.subcategory)}` : ''}
            <div className="muted small">{operatingGroupLabel(group)}</div>
          </dd>
          <dt>Cost centre</dt>
          <dd>{costCentreLabel(centre)}</dd>
          <dt>Description</dt>
          <dd>{cost.description}</dd>
          <dt>Reference</dt>
          <dd>{cost.reference}</dd>
          <dt>Actual</dt>
          <dd>
            {amounts.actualMinor ? <MoneyText amountMinor={amounts.actualMinor} /> : '—'}
          </dd>
          <dt>Committed</dt>
          <dd>
            {amounts.committedMinor ? <MoneyText amountMinor={amounts.committedMinor} /> : '—'}
          </dd>
          <dt>Forecast</dt>
          <dd>
            {amounts.forecastMinor ? <MoneyText amountMinor={amounts.forecastMinor} /> : '—'}
          </dd>
          <dt>Approved budget (pool)</dt>
          <dd>
            <MoneyText amountMinor={approvedPoolMinor} />
          </dd>
          <dt>Remaining budget</dt>
          <dd>
            <MoneyText amountMinor={remainingMinor} />
          </dd>
          <dt>Projected variance</dt>
          <dd>
            <MoneyText amountMinor={varianceMinor} />
          </dd>
          <dt>Invoice / evidence</dt>
          <dd>
            {cost.evidence.length
              ? cost.evidence.map((e) => e.label).join(', ')
              : 'Missing — attach invoice or supporting evidence'}
          </dd>
          <dt>VAT treatment</dt>
          <dd>
            {vatTreatmentLabel(vat)} · Net <MoneyText amountMinor={cost.net.amountMinor} /> · VAT{' '}
            <MoneyText amountMinor={cost.vat.amountMinor} /> · Gross{' '}
            <MoneyText amountMinor={cost.gross.amountMinor} />
          </dd>
          <dt>Accounting period</dt>
          <dd>{formatPeriod(cost.accountingPeriod)}</dd>
          <dt>Payment date</dt>
          <dd>{cost.paymentDate ? formatDate(cost.paymentDate) : 'Not yet set'}</dd>
          <dt>Transaction date</dt>
          <dd>{formatDate(cost.transactionDate)}</dd>
          <dt>Status</dt>
          <dd>
            {approvalLabel(approval)} · Lifecycle {statusLabel(cost.status)} · v{cost.version}
          </dd>
          <dt>Source key</dt>
          <dd>
            <code>{cost.sourceKey}</code>
          </dd>
        </dl>
        {(approval === 'under_review' || approval === 'disputed') && (
          <p className="callout attention" style={{ marginTop: '1rem' }}>
            {approval === 'disputed'
              ? 'This cost is disputed. Resolve with the supplier before treating it as trusted actual spend.'
              : 'This cost is under review. A decision is required before the next trusted snapshot.'}
          </p>
        )}
      </aside>
    </div>
  )
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
