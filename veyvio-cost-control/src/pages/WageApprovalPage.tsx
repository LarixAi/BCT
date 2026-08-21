import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { WageHubNav } from '../components/WageHubNav'
import { useCostStore } from '../data/CostStore'
import { formatHoursCenti } from '../domain/driver-wage-hours'
import {
  WAGE_BATCH_STAGE_LABELS,
  buildProviderExportPackage,
  canAdvanceWageBatch,
  type WageBatchLifecycle,
} from '../domain/wage-period-workflow'
import { formatDate } from '../lib/labels'

const FLOW: WageBatchLifecycle[] = [
  'draft',
  'validated',
  'supervisor_review',
  'payroll_manager_approval',
  'locked',
  'exported_to_provider',
  'final_returned',
  'posted_to_ledger',
]

/**
 * Hours → validate → approve → lock → provider → ledger.
 * No disputed hours reach payroll; post-lock corrections are adjustments only.
 */
export function WageApprovalPage() {
  const store = useCostStore()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [exportPreview, setExportPreview] = useState<string | null>(null)
  const [ensuring, setEnsuring] = useState(false)
  const ensureAttempted = useRef(false)
  const batches = store.wageBatches ?? []
  const primary = batches.find((b) => b.id === 'wb_2026_07') ?? batches[0]
  const period = store.payPeriods?.[0]

  useEffect(() => {
    if (primary || ensureAttempted.current) return
    ensureAttempted.current = true
    let cancelled = false
    setEnsuring(true)
    void store
      .ensureWageBatch()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not create wage-cost batch')
        }
      })
      .finally(() => {
        if (!cancelled) setEnsuring(false)
      })
    return () => {
      cancelled = true
    }
  }, [primary, store])

  if (!primary) {
    return (
      <div className="page">
        <WageHubNav />
        {error ? <p className="callout critical">{error}</p> : null}
        <p className="callout info">
          {ensuring ? 'Creating wage-cost batch…' : 'No wage-cost batch loaded.'}
        </p>
        {!ensuring ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setError(null)
              ensureAttempted.current = true
              setEnsuring(true)
              void store
                .ensureWageBatch()
                .catch((err) => {
                  setError(err instanceof Error ? err.message : 'Could not create wage-cost batch')
                })
                .finally(() => setEnsuring(false))
            }}
          >
            Create draft wage-cost batch
          </button>
        ) : null}
      </div>
    )
  }

  const advanceLabel = advanceButtonLabel(primary.status)

  async function onAdvance() {
    setError(null)
    setExportPreview(null)
    setBusy(true)
    try {
      await store.advanceWageBatchStatus(primary!.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance')
    } finally {
      setBusy(false)
    }
  }

  async function onClearDisputes() {
    setError(null)
    setBusy(true)
    try {
      for (const day of store.driverDays ?? []) {
        if (day.disputed) await store.clearDriverDayDispute(day.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear disputes')
    } finally {
      setBusy(false)
    }
  }

  function onPreviewExport() {
    setError(null)
    try {
      const latest = store.wageBatches.find((b) => b.id === primary!.id) ?? primary!
      if (latest.status !== 'locked' && latest.status !== 'exported_to_provider') {
        throw new Error('Lock the pay period before previewing the provider export')
      }
      setExportPreview(JSON.stringify(buildProviderExportPackage(latest), null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export preview failed')
    }
  }

  async function onAdjustment() {
    setError(null)
    setBusy(true)
    try {
      const personId = primary!.personSnapshots[0]?.employeeCostReferenceId
      if (!personId) throw new Error('No person on batch')
      await store.addWageAdjustment({
        batchId: primary!.id,
        employeeCostReferenceId: personId,
        reason: 'Post-lock overtime correction — original locked snapshot retained',
        grossDeltaMinor: -2_250,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Adjustment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Wage approval</h1>
          <p className="muted">
            {primary.label}
            {period ? ` · Payday ${formatDate(period.contractualPayday)}` : ''} ·{' '}
            {period?.providerName ?? 'Payroll provider'}
          </p>
        </div>
        <StatusPill tone={statusTone(primary.status)}>{WAGE_BATCH_STAGE_LABELS[primary.status]}</StatusPill>
      </header>

      <WageHubNav />

      <p className="callout info">
        Veyvio locks approved wage-cost inputs and sends them to the recognised payroll provider.
        PAYE, employee NI, FPS and the final payslip are calculated there — not in Cost Control.
      </p>

      <section className="panel">
        <h2>Workflow</h2>
        <ol className="stack-list">
          {FLOW.map((stage) => (
            <li key={stage}>
              <strong>{WAGE_BATCH_STAGE_LABELS[stage]}</strong>
              {primary.status === stage ? ' ← current' : ''}
              {stage === 'exception' ? null : null}
            </li>
          ))}
          {primary.status === 'exception' ? (
            <li>
              <strong>Exception</strong> ← current — resolve disputed hours before approval
            </li>
          ) : null}
        </ol>

        <div className="kpi-grid dense">
          <div className="kpi">
            <div className="kpi-label">Provisional gross (batch)</div>
            <div className="kpi-value">
              <MoneyText amountMinor={primary.totalProvisionalGrossMinor} />
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Open issues</div>
            <div className="kpi-value">{String(primary.validationIssues.length)}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Adjustments after lock</div>
            <div className="kpi-value">{String(primary.adjustments.length)}</div>
          </div>
        </div>

        {error ? <p className="callout critical">{error}</p> : null}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {primary.status === 'exception' ||
          primary.validationIssues.some((i) => i.code === 'disputed_hours') ? (
            <button type="button" className="btn" onClick={() => void onClearDisputes()} disabled={busy}>
              Clear disputed hours
            </button>
          ) : null}
          {canAdvanceWageBatch(primary.status) || primary.status === 'exception' ? (
            <button
              type="button"
              className="btn"
              onClick={() => void onAdvance()}
              disabled={busy || primary.status === 'exception'}
            >
              {advanceLabel}
            </button>
          ) : null}
          <button type="button" className="btn-ghost" onClick={onPreviewExport} disabled={busy}>
            Preview provider export
          </button>
          <button type="button" className="btn-ghost" onClick={() => void onAdjustment()} disabled={busy}>
            Add post-lock adjustment
          </button>
          <Link className="btn-ghost" to="/wages/hours">
            Review hours
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Validation</h2>
        {primary.validationIssues.length === 0 ? (
          <p className="muted">No open validation issues.</p>
        ) : (
          <ul className="stack-list">
            {primary.validationIssues.map((issue) => (
              <li key={`${issue.code}-${issue.driverDayId ?? issue.employeeCostReferenceId}`}>
                <StatusPill tone={issue.severity === 'critical' ? 'critical' : 'attention'}>
                  {issue.severity}
                </StatusPill>{' '}
                <strong>{issue.title}</strong> — {issue.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>People in batch</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Payroll id</th>
                <th>Payable h</th>
                <th>Regulated h</th>
                <th>Provisional gross</th>
                <th>NMW</th>
              </tr>
            </thead>
            <tbody>
              {primary.personSnapshots.map((p) => (
                <tr key={p.employeeCostReferenceId}>
                  <td>{p.displayName}</td>
                  <td>{p.externalPayrollId}</td>
                  <td>{formatHoursCenti(p.provisional.payableHoursCenti)}</td>
                  <td>{formatHoursCenti(p.provisional.regulatedWorkingTimeCenti)}</td>
                  <td>
                    <MoneyText amountMinor={p.provisional.grossPayMinor} />
                  </td>
                  <td>
                    <StatusPill tone={p.provisional.nmwCheck.passed ? 'healthy' : 'critical'}>
                      {p.provisional.nmwCheck.passed ? 'Pass' : 'Fail'}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {primary.adjustments.length > 0 ? (
        <section className="panel">
          <h2>Adjustments (original locked record retained)</h2>
          <ul className="stack-list">
            {primary.adjustments.map((adj) => (
              <li key={adj.id}>
                <MoneyText amountMinor={adj.grossDeltaMinor} /> — {adj.reason}
                <div className="muted">{adj.replacesSnapshotNote}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {exportPreview ? (
        <section className="panel">
          <h2>Provider export package (preview)</h2>
          <pre
            style={{
              overflow: 'auto',
              fontSize: '0.8rem',
              background: 'var(--cloud)',
              padding: '0.75rem',
              borderRadius: '0.4rem',
            }}
          >
            {exportPreview}
          </pre>
        </section>
      ) : null}

      <section className="panel">
        <h2>Payslip boundary</h2>
        <p className="muted">
          The provider payslip must show hours where pay varies, plus gross, deductions and net. Cost
          Control shows provisional gross lines for approval only — it does not issue the statutory
          payslip or submit FPS to HMRC.
        </p>
      </section>
    </div>
  )
}

function statusTone(status: WageBatchLifecycle): 'healthy' | 'attention' | 'critical' | 'neutral' {
  if (status === 'posted_to_ledger') return 'healthy'
  if (status === 'exception') return 'critical'
  if (status === 'locked' || status === 'exported_to_provider') return 'attention'
  return 'neutral'
}

function advanceButtonLabel(status: WageBatchLifecycle): string {
  switch (status) {
    case 'draft':
      return 'Mark validated'
    case 'validated':
      return 'Send to supervisor review'
    case 'supervisor_review':
      return 'Send to payroll manager'
    case 'payroll_manager_approval':
      return 'Approve and lock period'
    case 'locked':
      return 'Send inputs to payroll provider'
    case 'exported_to_provider':
      return 'Record final payroll return'
    case 'final_returned':
      return 'Post actual wage cost to ledger'
    default:
      return 'Advance'
  }
}
