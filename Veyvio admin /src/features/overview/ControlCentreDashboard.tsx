import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Download,
  MoreVertical,
  Route,
  Truck,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OpsDashboardModel, OpsSavedView } from '@/lib/ops/ops-dashboard'
import type { OpsActionSeverity } from '@/lib/ops/canonical-states'
import { ActionQueuePanel, viewShows } from './ControlCentrePanels'

const DASHBOARD_VIEWS: { id: OpsSavedView; label: string }[] = [
  { id: 'all', label: 'Operational overview' },
  { id: 'morning_release', label: 'Morning release' },
  { id: 'live_service', label: 'Live service' },
  { id: 'compliance', label: 'Compliance' },
]

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function lastSevenDayLabels(): string[] {
  const labels: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }))
  }
  return labels
}

function CardMenu({ items }: { items: Array<{ label: string; href: string }> }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
        aria-label="Card options"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-border bg-surface p-1.5">
            {items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-surface-muted"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function DashboardCard({
  title,
  menuItems,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title: string
  menuItems?: Array<{ label: string; href: string }>
  footer?: { label: string; href: string }
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {menuItems ? <CardMenu items={menuItems} /> : null}
      </div>
      <div className={`flex flex-1 flex-col ${bodyClassName ?? 'p-5'}`}>{children}</div>
      {footer ? (
        <div className="border-t border-border px-5 py-3">
          <Link to={footer.href} className="text-sm font-semibold text-command-700 hover:underline">
            {footer.label}
          </Link>
        </div>
      ) : null}
    </section>
  )
}

function MetricColumn({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: number | string
  detail: string
  tone?: 'neutral' | 'up' | 'down' | 'warning'
}) {
  const detailClass =
    tone === 'up'
      ? 'text-ready'
      : tone === 'down'
        ? 'text-critical'
        : tone === 'warning'
          ? 'text-attention'
          : 'text-muted'

  return (
    <div className="flex flex-col items-center px-3 py-5 text-center sm:px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-command-50 text-command-600">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-3 text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className={`mt-1 text-xs font-medium ${detailClass}`}>{detail}</p>
    </div>
  )
}

function MetricRow({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  value: number | string
  detail: string
  tone?: 'neutral' | 'up' | 'down' | 'warning'
}) {
  const detailClass =
    tone === 'up'
      ? 'text-ready'
      : tone === 'down'
        ? 'text-critical'
        : tone === 'warning'
          ? 'text-attention'
          : 'text-muted'
  return (
    <div className="flex items-start gap-3 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-command-50 text-command-600">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">{value}</p>
        <p className={`mt-0.5 text-xs font-medium ${detailClass}`}>{detail}</p>
      </div>
    </div>
  )
}

function ExceptionTrendChart({ openCount }: { openCount: number }) {
  const labels = lastSevenDayLabels()
  const values = labels.map((_, i) => (i === labels.length - 1 ? openCount : 0))
  const hasOnlyToday = openCount === 0 || values.filter((v) => v > 0).length <= 1

  const width = 400
  const height = 128
  const pad = { top: 12, right: 12, bottom: 28, left: 12 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const max = Math.max(...values, openCount, 1)

  const points = values.map((v, i) => {
    const x = pad.left + (values.length === 1 ? chartW / 2 : (i / (values.length - 1)) * chartW)
    const y = pad.top + chartH - (v / max) * chartH
    return { x, y, v }
  })

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPath = `${polyline} ${points[points.length - 1]?.x ?? pad.left},${pad.top + chartH} ${points[0]?.x ?? pad.left},${pad.top + chartH}`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full text-command-600" role="img" aria-label="Open exceptions trend">
        <defs>
          <linearGradient id="exception-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPath} fill="url(#exception-area)" />
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyline}
        />
        {points.map((p, i) => (
          <circle
            key={labels[i]}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4 : 2.5}
            fill="currentColor"
            className={i === points.length - 1 ? 'text-command-600' : 'text-command-400'}
          />
        ))}
        {labels.map((label, i) => {
          const x = pad.left + (labels.length === 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW)
          return (
            <text
              key={label}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted text-[10px] font-medium"
            >
              {label}
            </text>
          )
        })}
      </svg>
      <p className="mt-1 text-xs text-muted">
        {hasOnlyToday
          ? "Today's open count · historical trend not recorded yet"
          : 'Open exceptions · last 7 days'}
      </p>
    </div>
  )
}

function HorizontalBars({ rows }: { rows: Array<{ label: string; value: number; href?: string }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No runs in the pipeline today.</p>
  }
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const pct = Math.round((row.value / max) * 100)
        const inner = (
          <>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-ink">{row.label}</span>
              <span className="shrink-0 tabular-nums font-semibold text-ink">{row.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-command-600" style={{ width: `${pct}%` }} />
            </div>
          </>
        )
        return row.href ? (
          <Link key={row.label} to={row.href} className="block hover:opacity-90">
            {inner}
          </Link>
        ) : (
          <div key={row.label}>{inner}</div>
        )
      })}
    </div>
  )
}

function DonutChart({
  segments,
  center,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  center: React.ReactNode
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-36 w-36 items-center justify-center rounded-full border border-border bg-surface-muted text-center text-xs text-muted">
          No open defects
        </div>
      </div>
    )
  }
  let acc = 0
  const gradient = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 100
      acc += s.value
      const end = (acc / total) * 100
      return `${s.color} ${start}% ${end}%`
    })
    .join(', ')

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative h-36 w-36 shrink-0">
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-surface text-center">
          {center}
        </div>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-soft">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DriverStatusPill({ label, tone }: { label: string; tone: 'ready' | 'attention' | 'critical' | 'neutral' }) {
  const classes = {
    ready: 'border-ready/30 bg-ready/10 text-ready',
    attention: 'border-attention/30 bg-attention/10 text-attention',
    critical: 'border-critical/30 bg-critical/10 text-critical',
    neutral: 'border-border bg-surface-muted text-ink-soft',
  }
  return (
    <span className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${classes[tone]}`}>
      {label}
    </span>
  )
}

function FleetPerformanceCard({ model }: { model: OpsDashboardModel }) {
  const blockedDetail =
    model.topLine.runsBlocked > 0
      ? `${model.topLine.runsBlocked} blocked before release`
      : 'All scheduled runs clear'

  return (
    <DashboardCard
      title="Fleet performance summary"
      menuItems={[
        { label: 'Open dispatch', href: '/dispatch' },
        { label: 'Live operations', href: '/live-operations' },
      ]}
      bodyClassName="p-0"
    >
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <MetricColumn
          icon={Route}
          label="Active trips"
          value={model.topLine.activeTrips}
          detail={model.topLine.activeTrips > 0 ? 'Live from Driver app' : 'No trips in progress'}
          tone={model.topLine.activeTrips > 0 ? 'up' : 'neutral'}
        />
        <MetricColumn
          icon={Bus}
          label="Runs blocked"
          value={model.topLine.runsBlocked}
          detail={blockedDetail}
          tone={model.topLine.runsBlocked > 0 ? 'warning' : 'up'}
        />
        <MetricColumn
          icon={CheckCircle2}
          label="Checks passed"
          value={model.checks.passed}
          detail={
            model.checks.failed > 0
              ? `${model.checks.failed} failed · needs review`
              : `${model.checks.incomplete} still incomplete`
          }
          tone={model.checks.failed > 0 ? 'down' : model.checks.incomplete > 0 ? 'warning' : 'up'}
        />
      </div>
    </DashboardCard>
  )
}

function ActiveOperationsCard({ model }: { model: OpsDashboardModel }) {
  const openExceptions = model.actionQueue.length

  return (
    <DashboardCard
      title="Open exceptions"
      menuItems={[
        { label: 'Exception queue', href: '/exceptions' },
        { label: 'Export report', href: '/reports' },
      ]}
    >
      <p className="text-3xl font-bold tabular-nums text-ink">{openExceptions}</p>
      <p className="mt-1 text-sm text-muted">
        {model.topLine.criticalExceptions > 0
          ? `${model.topLine.criticalExceptions} critical · needs owner now`
          : 'No critical exceptions right now'}
      </p>
      <div className="mt-5 flex-1">
        <ExceptionTrendChart openCount={openExceptions} />
      </div>
    </DashboardCard>
  )
}

function DriverOverviewCard({ model }: { model: OpsDashboardModel }) {
  const d = model.drivers
  const onDuty = d.currentlyDriving ?? d.signedOn
  const available = Math.max(d.eligible - onDuty, 0)
  const blocked = d.blocked
  const total = Math.max(d.scheduled, onDuty + available + blocked, 1)
  const pct = (n: number) => `${(n / total) * 100}%`
  const utilisation = Math.round((onDuty / total) * 100)

  const driverRows =
    model.liveTrips.length > 0
      ? model.liveTrips.slice(0, 4).map((t) => ({
          id: t.id,
          name: t.driverName,
          meta: t.runReference,
          status: t.hasException ? 'Exception' : t.stage,
          tone: (t.hasException ? 'attention' : t.isStale ? 'critical' : 'ready') as
            | 'ready'
            | 'attention'
            | 'critical'
            | 'neutral',
          href: t.href,
        }))
      : model.pipeline.slice(0, 4).map((r) => ({
          id: r.id,
          name: r.driverName,
          meta: r.runReference,
          status: r.releaseLabel,
          tone: (r.releaseLabel === 'Blocked'
            ? 'critical'
            : r.releaseLabel === 'Released'
              ? 'ready'
              : 'neutral') as 'ready' | 'attention' | 'critical' | 'neutral',
          href: r.href,
        }))

  return (
    <DashboardCard
      title="Driver overview"
      menuItems={[
        { label: 'All drivers', href: '/drivers' },
        { label: 'Dispatch', href: '/dispatch' },
      ]}
      footer={{ label: 'More details →', href: '/drivers' }}
    >
      <p className="text-2xl font-bold tabular-nums text-ink">{d.scheduled}</p>
      <p className="mt-1 text-sm text-muted">
        Scheduled today · {onDuty} on duty · {blocked} blocked
      </p>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full bg-ready" style={{ width: pct(onDuty) }} title="On duty" />
        <div className="h-full bg-command-600" style={{ width: pct(available) }} title="Available" />
        <div className="h-full bg-critical" style={{ width: pct(blocked) }} title="Blocked" />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
        <span>
          <span className="font-semibold text-ink">{onDuty}</span> on duty
        </span>
        <span>
          <span className="font-semibold text-ink">{available}</span> available
        </span>
        <span>
          <span className="font-semibold text-ink">{blocked}</span> blocked
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">Current utilisation: {utilisation}% on duty</p>
      <ul className="mt-4 divide-y divide-border">
        {driverRows.length === 0 ? (
          <li className="py-3 text-sm text-muted">No drivers on live trips or runs yet.</li>
        ) : (
          driverRows.map((row) => (
            <li key={row.id}>
              <Link
                to={row.href}
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-surface-muted/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-bold text-ink-soft">
                    {row.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
                    <p className="truncate text-xs text-muted">{row.meta}</p>
                  </div>
                </div>
                <DriverStatusPill label={row.status} tone={row.tone} />
              </Link>
            </li>
          ))
        )}
      </ul>
    </DashboardCard>
  )
}

function RunsPipelineCard({ model }: { model: OpsDashboardModel }) {
  const counts = model.pipeline.reduce<Record<string, number>>((acc, row) => {
    acc[row.releaseLabel] = (acc[row.releaseLabel] ?? 0) + 1
    return acc
  }, {})
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value, href: '/dispatch' }))

  return (
    <DashboardCard
      title="Runs by release status"
      menuItems={[
        { label: 'Open dispatch', href: '/dispatch' },
        { label: 'Bookings', href: '/bookings' },
      ]}
      footer={{ label: 'More details →', href: '/dispatch' }}
    >
      <p className="text-2xl font-bold tabular-nums text-ink">{model.pipeline.length}</p>
      <p className="mt-1 text-sm text-muted">Runs in today&apos;s readiness pipeline</p>
      <div className="mt-5 flex-1">
        <HorizontalBars rows={rows} />
      </div>
    </DashboardCard>
  )
}

function DefectsSnapshotCard({ model }: { model: OpsDashboardModel }) {
  const d = model.defectsVor
  const segments = [
    { label: 'Critical', value: d.critical, color: '#D92D20' },
    { label: 'Awaiting repair', value: d.awaitingRepair, color: '#D97706' },
    { label: 'Awaiting verification', value: d.awaitingVerification, color: '#2F6BFF' },
    { label: 'VOR vehicles', value: d.vorVehicles, color: '#667085' },
  ]
  const total = segments.reduce((s, x) => s + x.value, 0)

  return (
    <DashboardCard
      title="Defects & VOR"
      menuItems={[
        { label: 'Defect register', href: '/defects' },
        { label: 'Vehicle inspections', href: '/inspections' },
      ]}
    >
      <p className="text-2xl font-bold tabular-nums text-ink">{total}</p>
      <p className="mt-1 text-sm text-muted">Track safety exposure before vehicles return to service</p>
      <div className="mt-4 flex-1">
        <DonutChart
          segments={segments}
          center={
            <>
              <p className="text-lg font-bold tabular-nums text-ink">{total}</p>
              <p className="text-[10px] font-medium text-muted">Open items</p>
            </>
          }
        />
      </div>
      {d.affectingActiveRuns > 0 ? (
        <p className="mt-4 rounded-lg border border-critical/20 bg-critical/5 px-3 py-2 text-xs font-medium text-critical">
          {d.affectingActiveRuns} defect{d.affectingActiveRuns === 1 ? '' : 's'} affecting active runs
        </p>
      ) : null}
    </DashboardCard>
  )
}

export function ControlCentreDashboard({
  model,
  view,
  onViewChange,
  userFirstName,
  operationalDate,
  headline,
  severityFilter,
  onSeverityFilterChange,
}: {
  model: OpsDashboardModel
  view: OpsSavedView
  onViewChange: (view: OpsSavedView) => void
  userFirstName: string
  operationalDate: string
  headline: string
  severityFilter: 'all' | OpsActionSeverity
  onSeverityFilterChange: (value: 'all' | OpsActionSeverity) => void
}) {
  const greeting = greetingForHour(new Date().getHours())
  const showOverviewWidgets = view === 'all' || viewShows(view, 'top')

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-border bg-command-50 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">
              {greeting}, {userFirstName}
            </h1>
            <p className="mt-1 text-sm font-medium text-ink">{headline}</p>
            <p className="mt-0.5 text-xs text-muted">
              {operationalDate} · Fleet, drivers, yard and compliance in one operational picture
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/reports"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-muted"
            >
              <Download className="h-4 w-4" aria-hidden />
              Export report
            </Link>
            <Link
              to="/exceptions"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-command-600 px-4 text-sm font-semibold text-white hover:bg-command-700"
            >
              Open exceptions
            </Link>
          </div>
        </div>
      </header>

      <nav className="flex gap-6 overflow-x-auto border-b border-border">
        {DASHBOARD_VIEWS.map((tab) => {
          const active = view === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onViewChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-medium transition ${
                active
                  ? 'border-command-600 text-command-700'
                  : 'border-transparent text-muted hover:border-border hover:text-ink'
              }`}
            >
              {active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-command-600" aria-hidden />
              ) : null}
              {tab.label}
            </button>
          )
        })}
      </nav>

      {showOverviewWidgets && (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <FleetPerformanceCard model={model} />
          </div>
          <div className="xl:col-span-8">
            <ActiveOperationsCard model={model} />
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        {(view === 'all' || viewShows(view, 'live') || viewShows(view, 'top')) && (
          <div className="xl:col-span-4">
            <DriverOverviewCard model={model} />
          </div>
        )}
        {(view === 'all' || viewShows(view, 'pipeline') || viewShows(view, 'top')) && (
          <div className="xl:col-span-4">
            <RunsPipelineCard model={model} />
          </div>
        )}
        {(view === 'all' || view === 'compliance' || viewShows(view, 'defects')) && (
          <div className="xl:col-span-4">
            <DefectsSnapshotCard model={model} />
          </div>
        )}
      </div>

      {view !== 'all' && viewShows(view, 'actions') && (
        <DashboardCard
          title="Action queue"
          menuItems={[{ label: 'View all exceptions', href: '/exceptions' }]}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'critical', 'urgent', 'warning'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSeverityFilterChange(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  severityFilter === s
                    ? 'bg-command-600 text-white'
                    : 'bg-surface text-ink-soft ring-1 ring-border'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <ActionQueuePanel model={model} severityFilter={severityFilter} bare />
        </DashboardCard>
      )}

      {view !== 'all' && viewShows(view, 'yard') && (
        <DashboardCard
          title="Yard snapshot"
          menuItems={[{ label: 'Open yard', href: '/yard' }]}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricRow
              icon={Truck}
              label="In yard"
              value={model.yard.onSite}
              detail={`${model.yard.openTasks} open tasks`}
            />
            <MetricRow
              icon={Users}
              label="Preparing"
              value={model.yard.preparing}
              detail={`${model.yard.overdueTasks} overdue`}
              tone={model.yard.overdueTasks > 0 ? 'warning' : 'neutral'}
            />
            <MetricRow
              icon={AlertTriangle}
              label="Safety critical"
              value={model.yard.safetyCriticalTasks}
              detail="Yard tasks needing attention"
              tone={model.yard.safetyCriticalTasks > 0 ? 'down' : 'neutral'}
            />
          </div>
        </DashboardCard>
      )}
    </div>
  )
}
