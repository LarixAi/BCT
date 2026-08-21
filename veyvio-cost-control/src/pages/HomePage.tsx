import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { SpendFlowChart } from '../components/SpendFlowChart'
import { WorkspaceReadyBanner } from '../components/WorkspaceReadyBanner'
import { useCostStore } from '../data/CostStore'
import { buildSpendFlowSeries } from '../domain/spend-flow'
import { formatDate } from '../lib/labels'

export function HomePage() {
  const {
    budget,
    lastValidSnapshot,
    reviews,
    quarantine,
    imports,
    costs,
    organisation,
    workspaceStatus,
    workspaceError,
  } = useCostStore()
  const snap = lastValidSnapshot
  const openReviews = reviews.filter((r) => r.state === 'open')
  const missingEvidence = costs.filter(
    (c) => c.evidence.length === 0 && c.validationState !== 'quarantined',
  )
  const spendFlow = buildSpendFlowSeries(costs)
  const liveEmpty =
    organisation.id !== 'org_demo_cec' && costs.length === 0 && budget.lines.length === 0

  if (workspaceStatus === 'loading') {
    return (
      <Page title="Cost position" subtitle={`${organisation.tradingName} · loading`}>
        <p className="muted">Loading finance workspace from the Cost Control API…</p>
        <div className="kpi-grid dense" aria-hidden>
          <Kpi label="Approved budget" value={<MoneyText amountMinor={0} />} />
          <Kpi label="Actual" value={<MoneyText amountMinor={0} status="actual" />} />
          <Kpi label="Committed" value={<MoneyText amountMinor={0} status="committed" />} />
          <Kpi label="Forecast" value={<MoneyText amountMinor={0} status="forecast" />} />
        </div>
      </Page>
    )
  }

  if (!snap) {
    return (
      <Page title="Cost position" subtitle={organisation.tradingName}>
        <p className="callout critical">
          No valid financial snapshot. Last trusted totals are unavailable.
        </p>
      </Page>
    )
  }

  const overspend = snap.projectedRemainingMinor < 0
  const heroTone = liveEmpty
    ? 'attention'
    : overspend
      ? 'critical'
      : openReviews.length
        ? 'attention'
        : 'healthy'

  let recommendation: ReactNode
  let primaryTo = '/reviews'
  let primaryLabel = 'Open cost reviews'

  if (liveEmpty) {
    recommendation = (
      <>
        This company has an empty finance workspace. Import costs or connect Open Banking when you
        are ready — the layout below stays available with zero balances.
      </>
    )
    primaryTo = '/imports'
    primaryLabel = 'Import costs'
  } else if (overspend) {
    recommendation = (
      <>
        Projected final cost exceeds approved budget by{' '}
        <MoneyText amountMinor={Math.abs(snap.varianceToApprovedMinor)} />. Review open
        commitments and forecast assumptions before period close.
      </>
    )
    primaryTo = '/commitments'
    primaryLabel = 'Review commitments'
  } else if (openReviews.length) {
    recommendation = (
      <>
        {openReviews.length} cost review{openReviews.length === 1 ? '' : 's'} need a decision
        before the next snapshot is trusted for management reporting.
      </>
    )
  } else if (quarantine.length) {
    recommendation = (
      <>
        Quarantine still holds {quarantine.length} import row
        {quarantine.length === 1 ? '' : 's'}. Clear them before treating the ledger as complete.
      </>
    )
    primaryTo = '/imports'
    primaryLabel = 'Open imports'
  } else {
    recommendation = <>No material cost-control action required on the current snapshot.</>
    primaryTo = '/costs'
    primaryLabel = 'Browse all costs'
  }

  return (
    <Page
      title="Cost position"
      subtitle={`${budget.name} · ${budget.code} · FY ${budget.financialYear}`}
    >
      {liveEmpty || workspaceError ? (
        <WorkspaceReadyBanner
          organisationName={organisation.tradingName}
          workspaceError={workspaceError}
        />
      ) : null}

      <section className={`cost-hero ${heroTone}`}>
        <div className="cost-hero-primary">
          <div className="cost-hero-eyebrow">
            {liveEmpty ? 'Finance workspace ready' : 'Will the budget hold?'}
          </div>
          <div className="cost-hero-label">Projected remaining</div>
          <div className="cost-hero-value">
            <MoneyText amountMinor={snap.projectedRemainingMinor} />
          </div>
          <div className="cost-hero-sub">
            Projected final{' '}
            <MoneyText amountMinor={snap.projectedFinalMinor} /> · Approved{' '}
            <MoneyText amountMinor={snap.approvedMinor} />
          </div>
        </div>
        <div className="cost-hero-side">
          <h2 className="cost-hero-side-title">Primary recommendation</h2>
          <p className="cost-hero-side-copy">{recommendation}</p>
          <div className="cost-hero-actions">
            <Link className="btn cost-hero-btn" to={primaryTo}>
              {primaryLabel}
            </Link>
            <Link className="btn-ghost cost-hero-btn-secondary" to="/budgets">
              Budget lines
            </Link>
          </div>
        </div>
      </section>

      <section className="panel spend-flow-panel">
        <SpendFlowChart
          points={spendFlow}
          actualTotalMinor={snap.actualMinor}
          committedTotalMinor={snap.committedMinor}
        />
      </section>

      <div className="kpi-grid dense">
        <Kpi label="Approved budget" value={<MoneyText amountMinor={snap.approvedMinor} />} />
        <Kpi
          label="Actual"
          value={<MoneyText amountMinor={snap.actualMinor} status="actual" />}
        />
        <Kpi
          label="Committed"
          value={<MoneyText amountMinor={snap.committedMinor} status="committed" />}
        />
        <Kpi
          label="Forecast"
          value={<MoneyText amountMinor={snap.forecastMinor} status="forecast" />}
        />
        <Kpi
          label="Projected final cost"
          value={<MoneyText amountMinor={snap.projectedFinalMinor} />}
          hint="Actual + committed + forecast"
        />
        <Kpi
          label="Variance to approved"
          value={<MoneyText amountMinor={snap.varianceToApprovedMinor} />}
          tone={overspend ? 'critical' : 'healthy'}
        />
      </div>

      <div className="split">
        <section className="panel">
          <h2>Exceptions</h2>
          <ul className="stack-list">
            <li>
              Open reviews <strong>{openReviews.length}</strong>
            </li>
            <li>
              Missing evidence <strong>{missingEvidence.length}</strong>
            </li>
            <li>
              Quarantined imports <strong>{quarantine.length}</strong>
            </li>
          </ul>
        </section>
        <section className="panel">
          <h2>Data health</h2>
          <p className="muted">
            Last successful refresh {formatDate(snap.createdAt)}. Formula {snap.formulaVersion}.
            Calculation <code>{snap.calculationId.slice(0, 8)}</code>
          </p>
          <p className="muted">Import runs recorded: {imports.length}</p>
          {liveEmpty ? (
            <StatusPill tone="info">Awaiting first costs</StatusPill>
          ) : quarantine.length ? (
            <StatusPill tone="attention">Quarantine has unresolved rows</StatusPill>
          ) : (
            <StatusPill tone="healthy">Ledger publication healthy</StatusPill>
          )}
        </section>
      </div>
    </Page>
  )
}

function Page({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </header>
      {children}
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
