import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import type {
  LiveActivityItem,
  LiveBoardFilter,
  LiveBoardTab,
  LiveExceptionCard,
  LiveOperationsModel,
  LiveRunRow,
  LiveSavedView,
  LiveTripRow,
} from '@/lib/live/live-operations'

const SAVED_VIEWS: { id: LiveSavedView; label: string }[] = [
  { id: 'all', label: 'All live operations' },
  { id: 'late', label: 'Late journeys' },
  { id: 'assistance', label: 'Driver assistance' },
  { id: 'vehicle_issues', label: 'Vehicle issues' },
  { id: 'morning_school', label: 'Morning school runs' },
  { id: 'my_exceptions', label: 'Exceptions' },
]

export function LiveControlBar({
  dateLabel,
  currentTime,
  lastUpdatedLabel,
  connectionMessage,
  connectionStatus,
  search,
  onSearch,
  paused,
  onTogglePause,
  onRefresh,
  savedView,
  onSavedView,
  listTab,
  onListTab,
}: {
  dateLabel: string
  currentTime: string
  lastUpdatedLabel: string
  connectionMessage: string
  connectionStatus: string
  search: string
  onSearch: (v: string) => void
  paused: boolean
  onTogglePause: () => void
  onRefresh: () => void
  savedView: LiveSavedView
  onSavedView: (v: LiveSavedView) => void
  listTab: 'active' | 'completed'
  onListTab: (t: 'active' | 'completed') => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Live Operations</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {dateLabel} · Current time {currentTime} · Last live update {lastUpdatedLabel}
          </p>
          <p
            className={cn(
              'mt-1 text-xs',
              connectionStatus === 'live'
                ? 'text-emerald-700'
                : connectionStatus === 'paused'
                  ? 'text-amber-800'
                  : 'text-red-800',
            )}
          >
            {connectionMessage}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/bookings/new/urgent"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Urgent booking
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium',
              paused
                ? 'border-amber-300 bg-amber-50 text-amber-900'
                : 'border-border hover:bg-surface-muted',
            )}
          >
            {paused ? 'Resume live updates' : 'Pause live updates'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {(['active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onListTab(tab)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium capitalize',
                listTab === tab ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search driver, vehicle, run…"
          className="w-full max-w-xs rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {SAVED_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onSavedView(v.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                savedView === v.id
                  ? 'bg-command-600 text-white'
                  : 'bg-surface text-ink-soft ring-1 ring-border',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LiveSummaryStrip({
  model,
  filter,
  onFilter,
}: {
  model: LiveOperationsModel
  filter: LiveBoardFilter
  onFilter: (f: LiveBoardFilter) => void
}) {
  const s = model.summary
  const cards: { id: LiveBoardFilter; title: string; value: number; sub: string; tone?: 'danger' | 'warning' }[] = [
    {
      id: 'active_runs',
      title: 'Active runs',
      value: s.activeRuns,
      sub: `${s.runsNotStarted} not started · ${s.runsCompleted} completed`,
    },
    {
      id: 'all',
      title: 'Active trips',
      value: s.activeTrips,
      sub: `${s.awaitingPickup} awaiting · ${s.onboard} onboard · ${s.travelling} travelling`,
    },
    {
      id: 'at_risk',
      title: 'Service health',
      value: s.atRisk + s.late,
      sub: `${s.onTime} on time · ${s.atRisk} at risk · ${s.late} late`,
      tone: s.late > 0 ? 'danger' : s.atRisk > 0 ? 'warning' : undefined,
    },
    {
      id: 'assistance',
      title: 'Drivers',
      value: s.driversActive,
      sub: `${s.driversOnBreak} on break · ${s.assistanceRequests} assistance`,
      tone: s.assistanceRequests > 0 ? 'danger' : undefined,
    },
    {
      id: 'exceptions',
      title: 'Exceptions',
      value: s.criticalExceptions + s.urgentExceptions,
      sub: `${s.criticalExceptions} critical · ${s.urgentExceptions} urgent · ${s.warningExceptions} warnings`,
      tone: s.criticalExceptions > 0 ? 'danger' : s.urgentExceptions > 0 ? 'warning' : undefined,
    },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((c) => (
        <button
          key={c.title}
          type="button"
          onClick={() => onFilter(c.id)}
          className={cn(
            'rounded-xl border bg-surface p-3 text-left transition hover:border-command-400',
            filter === c.id ? 'border-command-500 ring-1 ring-command-500' : 'border-border',
            c.tone === 'danger' && filter !== c.id && 'border-red-200',
            c.tone === 'warning' && filter !== c.id && 'border-amber-200',
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{c.title}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold tabular-nums',
              c.tone === 'danger' ? 'text-red-800' : c.tone === 'warning' ? 'text-amber-800' : 'text-ink',
            )}
          >
            {c.value}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">{c.sub}</p>
        </button>
      ))}
    </div>
  )
}

function healthClass(health: string) {
  if (health === 'late' || health === 'severely_late' || health === 'blocked') return 'text-red-700'
  if (health === 'at_risk') return 'text-amber-700'
  if (health === 'on_time' || health === 'completed') return 'text-emerald-700'
  return 'text-ink-soft'
}

export function LiveOperationsBoard({
  tab,
  onTab,
  runs,
  trips,
  selectedId,
  onSelect,
}: {
  tab: LiveBoardTab
  onTab: (t: LiveBoardTab) => void
  runs: LiveRunRow[]
  trips: LiveTripRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <SectionCard title="Operations board" className="flex min-h-0 flex-col overflow-hidden" flush>
      <div className="flex gap-1 border-b border-border bg-surface-muted p-2">
        {(['runs', 'trips', 'drivers', 'vehicles', 'exceptions'] as LiveBoardTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTab(t)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
              tab === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {(tab === 'runs' || tab === 'drivers' || tab === 'vehicles') && (
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Run</th>
                <th className="px-3 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Vehicle</th>
                <th className="px-3 py-2 font-medium">Progress</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Delay</th>
                <th className="px-3 py-2 font-medium">Next</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    No active operations match this filter.
                  </td>
                </tr>
              )}
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    'cursor-pointer border-b border-border hover:bg-surface-muted',
                    selectedId === r.id && 'bg-command-50',
                  )}
                  onClick={() => onSelect(r.id)}
                >
                  <td className="px-3 py-2.5 font-semibold text-ink">{r.runReference}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{r.driverName}</td>
                  <td className="px-3 py-2.5 font-medium tabular-nums">{r.vehicleRegistration}</td>
                  <td className="px-3 py-2.5 text-ink-soft">{r.progressLabel}</td>
                  <td className={cn('px-3 py-2.5 font-medium', healthClass(r.health))}>{r.healthLabel}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">
                    {r.delayMinutes > 0 ? `${r.delayMinutes} min` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-command-700">{r.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'trips' && (
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-muted">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">Trip</th>
                <th className="px-3 py-2 font-medium">Passenger stage</th>
                <th className="px-3 py-2 font-medium">Driver</th>
                <th className="px-3 py-2 font-medium">Vehicle</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Delay</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-border">
                  <td className="px-3 py-2.5">
                    <Link to={t.href} className="font-semibold text-command-700 hover:underline">
                      {t.tripReference}
                    </Link>
                    <p className="text-xs text-muted">{t.runReference}</p>
                  </td>
                  <td className="px-3 py-2.5 text-ink-soft">{t.passengerStage}</td>
                  <td className="px-3 py-2.5">{t.driverName}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium">{t.vehicleRegistration}</td>
                  <td className={cn('px-3 py-2.5 font-medium', healthClass(t.health))}>{t.healthLabel}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {t.delayMinutes > 0 ? `${t.delayMinutes} min` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'exceptions' && (
          <p className="p-4 text-sm text-muted">Open exceptions are listed in the queue below the map.</p>
        )}
      </div>
    </SectionCard>
  )
}

export function LiveExceptionQueue({
  exceptions,
}: {
  exceptions: LiveExceptionCard[]
}) {
  return (
    <SectionCard title="Exception queue" description="Critical first — decide and act" className="min-h-0 overflow-hidden" flush>
      <div className="max-h-64 space-y-2 overflow-y-auto p-3">
        {exceptions.length === 0 && (
          <p className="text-sm text-muted">No open live exceptions.</p>
        )}
        {exceptions.map((e) => (
          <Link
            key={e.id}
            to={e.href}
            className={cn(
              'block rounded-lg border p-3 hover:border-command-400',
              e.severity === 'critical'
                ? 'border-red-300 bg-red-50'
                : e.severity === 'urgent'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-border bg-surface',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{e.severity}</p>
              <span className="text-[10px] text-muted">{e.detectedAtLabel}</span>
            </div>
            <p className="font-medium text-ink">{e.title}</p>
            <p className="mt-1 text-xs text-ink-soft">{e.detail}</p>
            <p className="mt-1 text-xs text-ink-soft">Next: {e.recommendedAction}</p>
          </Link>
        ))}
      </div>
    </SectionCard>
  )
}

export function LiveActivityFeed({ items }: { items: LiveActivityItem[] }) {
  return (
    <SectionCard title="Live activity" description="Operational event stream" className="min-h-0 overflow-hidden" flush>
      <ul className="max-h-64 space-y-2 overflow-y-auto p-3">
        {items.length === 0 && <li className="text-sm text-muted">No recent live events.</li>}
        {items.map((item) => (
          <li key={item.id} className="border-b border-border pb-2 text-sm last:border-0">
            <p className="text-[11px] tabular-nums text-muted">
              {item.timeLabel} · {item.category}
            </p>
            {item.href ? (
              <Link to={item.href} className="font-medium text-ink hover:text-command-700">
                {item.description}
              </Link>
            ) : (
              <p className="font-medium text-ink">{item.description}</p>
            )}
            <p className="text-xs text-muted">{item.actor}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
