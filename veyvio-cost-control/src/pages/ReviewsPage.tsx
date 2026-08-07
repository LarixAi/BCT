import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import type { CostAllocation, CostCategory, ReviewItem } from '../domain/types'
import type { ReviewDecision } from '../domain/review-actions'
import { formatDate } from '../lib/labels'

export function ReviewsPage() {
  const {
    reviews,
    costs,
    resolveReviewDecision,
    budget,
    auditEvents,
    employeeCostReferences,
    sageIntegration,
  } = useCostStore()
  const open = reviews.filter((r) => r.state === 'open')
  const closed = reviews.filter((r) => r.state !== 'open')
  const [activeId, setActiveId] = useState<string | null>(open[0]?.id ?? null)
  const active = reviews.find((r) => r.id === activeId) ?? open[0] ?? null
  const activeCost = active ? costs.find((c) => c.id === active.costId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Cost reviews</h1>
          <p className="muted">
            Approve, reject, request evidence, or reallocate — never autonomously change budgets or
            payments. Every decision writes an audit event.
          </p>
        </div>
      </header>

      <div className="org-layout">
        <section className="panel">
          <h2>Open queue ({open.length})</h2>
          <ul className="review-list">
            {open.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`org-node${active?.id === r.id ? ' active' : ''}`}
                  onClick={() => setActiveId(r.id)}
                >
                  <span className="org-node-title">{r.title}</span>
                </button>
              </li>
            ))}
            {!open.length ? <li className="muted">No open reviews.</li> : null}
          </ul>
        </section>

        <section className="panel">
          {active && activeCost ? (
            <ReviewWorkbench
              review={active}
              cost={activeCost}
              budgetId={budget.id}
              defaultCategory={activeCost.category}
              personHint={findPersonHint(
                `${active.title} ${active.detail}`,
                employeeCostReferences ?? [],
              )}
              onDecide={async (decision) => {
                await resolveReviewDecision(active.id, decision)
                setActiveId(null)
              }}
            />
          ) : (
            <p className="muted">Select an open review to inspect evidence and act.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="org-tree-head">
          <h2>Integration exceptions ({sageIntegration.failedExports.length})</h2>
          <Link className="btn-ghost" to="/settings">
            Open integration settings
          </Link>
        </div>
        <p className="muted">
          Provider rejections remain separate from cost approval. Correct mappings or source data,
          then create an attributable retry; never alter an exported payload invisibly.
        </p>
        {sageIntegration.failedExports.length ? (
          <div className="exception-list">
            {sageIntegration.failedExports.map((exception) => {
              const cost = costs.find((item) => item.id === exception.veyvioCostId)
              return (
                <article className="exception-card" key={exception.id}>
                  <StatusPill tone="critical">Sage export failed</StatusPill>
                  <div>
                    <h3>{cost?.description ?? exception.veyvioCostId}</h3>
                    <p className="muted">
                      {exception.failureReason} · retry count {exception.retryCount} · payload{' '}
                      {exception.payloadVersion}
                    </p>
                    <p className="small">
                      Idempotency key: <code>{exception.idempotencyKey}</code>
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="callout healthy">No open integration exceptions.</p>
        )}
      </section>

      {closed.length ? (
        <section className="panel">
          <h2>Resolved</h2>
          <ul className="stack-list">
            {closed.map((r) => (
              <li key={r.id}>
                {r.title} · <StatusPill tone="neutral">{r.state}</StatusPill>
                {r.resolutionNote ? <span className="muted"> — {r.resolutionNote}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {auditEvents?.length ? (
        <section className="panel">
          <h2>Recent audit</h2>
          <ul className="stack-list">
            {auditEvents.slice(0, 8).map((e) => (
              <li key={e.id}>
                <code>{e.action}</code> · {e.entityType}/{e.entityId.slice(0, 8)} ·{' '}
                {formatDate(e.createdAt)}
                {e.reason ? <span className="muted"> — {e.reason}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function ReviewWorkbench({
  review,
  cost,
  budgetId,
  defaultCategory,
  personHint,
  onDecide,
}: {
  review: ReviewItem
  cost: NonNullable<ReturnType<typeof useCostStore>['costs'][number]>
  budgetId: string
  defaultCategory: CostCategory
  personHint: string | null
  onDecide: (decision: ReviewDecision) => void | Promise<void>
}) {
  const [reason, setReason] = useState('')
  const [evidenceLabel, setEvidenceLabel] = useState('')
  const [costCentre, setCostCentre] = useState(cost.allocations[0]?.costCentreId ?? 'cc_ops')
  const [error, setError] = useState<string | null>(null)

  function buildReallocation(): CostAllocation[] {
    return [
      {
        budgetId,
        category: defaultCategory,
        costCentreId: costCentre,
        vehicleId: cost.allocations[0]?.vehicleId ?? null,
        supplierId: null,
        amountMinor: cost.gross.amountMinor,
      },
    ]
  }

  async function run(decision: ReviewDecision) {
    setError(null)
    try {
      await onDecide(decision)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed')
    }
  }

  return (
    <div className="review-workbench">
      <div className="org-tree-head">
        <h2>{review.title}</h2>
        <StatusPill tone="attention">{review.signal.replaceAll('_', ' ')}</StatusPill>
      </div>
      <p className="muted">{review.detail}</p>
      <p className="small">
        {cost.supplierName} · <MoneyText amountMinor={cost.gross.amountMinor} status={cost.status} />{' '}
        · {formatDate(cost.transactionDate)} · <code>{cost.reference}</code>
      </p>

      <div className="profile-stat-grid" style={{ marginBottom: '1rem' }}>
        <div className="profile-stat">
          <div className="profile-stat-label">Evidence</div>
          <div className="profile-stat-value" style={{ fontSize: '0.95rem' }}>
            {cost.evidence.length
              ? cost.evidence.map((e) => e.label).join(', ')
              : 'None attached'}
          </div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-label">Allocation</div>
          <div className="profile-stat-value" style={{ fontSize: '0.95rem' }}>
            {cost.allocations.map((a) => a.costCentreId ?? 'unassigned').join(', ')}
          </div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-label">Version</div>
          <div className="profile-stat-value">{cost.version}</div>
        </div>
      </div>

      <div className="row-actions" style={{ marginBottom: '0.75rem' }}>
        {personHint ? (
          <Link to={`/wages/people/${personHint}`} className="btn-ghost">
            Open wage profile
          </Link>
        ) : null}
        <Link to={`/budgets/lines/${budgetLineForCategory(defaultCategory)}`} className="btn-ghost">
          Budget line
        </Link>
      </div>

      <label className="field">
        <span>Reason / note</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </label>
      <label className="field">
        <span>Attach evidence label (optional on approve)</span>
        <input
          value={evidenceLabel}
          onChange={(e) => setEvidenceLabel(e.target.value)}
          placeholder="quotation-tyres-2026.pdf"
        />
      </label>
      <label className="field">
        <span>Cost centre (for approve / reallocate)</span>
        <select value={costCentre} onChange={(e) => setCostCentre(e.target.value)}>
          <option value="cc_ops">cc_ops — Operations</option>
          <option value="cc_yard">cc_yard — Yard</option>
          <option value="cc_drv">cc_drv — Drivers</option>
          <option value="cc_fin">cc_fin — Finance</option>
          <option value="cc_exec">cc_exec — Executive</option>
          <option value="cc_ppl">cc_ppl — People & safety</option>
        </select>
      </label>

      {error ? <p className="callout critical">{error}</p> : null}

      <div className="review-actions">
        <button
          type="button"
          className="btn"
          onClick={() =>
            run({
              type: 'approve',
              reason: reason || undefined,
              evidenceLabel: evidenceLabel || undefined,
              allocations: buildReallocation(),
            })
          }
        >
          Approve
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            run({
              type: 'reallocate',
              reason: reason || 'Corrected cost centre allocation',
              allocations: buildReallocation(),
            })
          }
        >
          Reallocate & approve
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            run({
              type: 'request_evidence',
              reason: reason || 'Please attach supporting evidence',
            })
          }
        >
          Request evidence
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            if (!reason.trim()) {
              setError('Reject requires a reason')
              return
            }
            run({ type: 'reject', reason })
          }}
        >
          Reject
        </button>
        <button type="button" className="btn-ghost" onClick={() => run({ type: 'snooze', reason })}>
          Snooze
        </button>
      </div>
    </div>
  )
}

function budgetLineForCategory(category: CostCategory): string {
  const map: Partial<Record<CostCategory, string>> = {
    fuel: 'bl_fuel',
    maintenance: 'bl_maint',
    vehicle_ownership: 'bl_own',
    wages: 'bl_wages',
    premises: 'bl_ops',
  }
  return map[category] ?? 'bl_fuel'
}

function findPersonHint(
  haystack: string,
  people: { id: string; displayName: string; externalPayrollId: string }[],
): string | null {
  for (const p of people) {
    if (haystack.includes(p.externalPayrollId) || haystack.includes(p.displayName)) return p.id
  }
  return null
}
