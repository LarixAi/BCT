import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { LiveSavedView } from '@/lib/live/live-operations'

const SAVED_VIEWS: { id: LiveSavedView; label: string }[] = [
  { id: 'all', label: 'All live' },
  { id: 'late', label: 'Late' },
  { id: 'assistance', label: 'Assistance' },
  { id: 'vehicle_issues', label: 'GPS issues' },
  { id: 'my_exceptions', label: 'Exceptions' },
]

export function LiveMapSyncBar({
  dateLabel,
  currentTime,
  lastUpdatedLabel,
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
  depotLabel,
  trackingDisabled,
}: {
  dateLabel: string
  currentTime: string
  lastUpdatedLabel: string
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
  depotLabel?: string | null
  trackingDisabled?: boolean
}) {
  const live = connectionStatus === 'live' && !paused

  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2 md:px-4">
        <h1 className="shrink-0 text-sm font-semibold text-ink">Live Operations</h1>
        <span
          className={cn(
            'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            live ? 'bg-ready/10 text-ready' : 'bg-attention/10 text-attention',
          )}
        >
          {paused ? 'Paused' : connectionStatus === 'live' ? 'Live' : connectionStatus}
        </span>
        <span className="hidden min-w-0 truncate text-[11px] text-muted lg:inline">
          {dateLabel} · {currentTime} · {lastUpdatedLabel}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="flex rounded-lg bg-surface-muted p-0.5">
            {(['active', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onListTab(tab)}
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-semibold capitalize',
                  listTab === tab ? 'bg-surface text-ink shadow-sm' : 'text-muted',
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
            placeholder="Search…"
            className="hidden h-7 w-36 rounded-lg border border-border px-2 text-xs sm:block md:w-44"
          />
          <button
            type="button"
            onClick={onRefresh}
            className="h-7 rounded-lg border border-border px-2 text-[11px] font-medium text-ink hover:bg-surface-muted"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className={cn(
              'h-7 rounded-lg border px-2 text-[11px] font-medium',
              paused
                ? 'border-attention/30 bg-attention/10 text-attention'
                : 'border-border text-ink hover:bg-surface-muted',
            )}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <Link
            to="/bookings/new/urgent"
            className="hidden h-7 items-center rounded-lg bg-command-600 px-2.5 text-[11px] font-semibold text-white hover:bg-command-700 sm:inline-flex"
          >
            Urgent booking
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-t border-border/60 px-3 py-1.5 md:px-4">
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onSavedView(v.id)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
              savedView === v.id ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft',
            )}
          >
            {v.label}
          </button>
        ))}
        {depotLabel ? (
          <span className="ml-auto shrink-0 text-[10px] text-muted">Depot: {depotLabel}</span>
        ) : null}
        {trackingDisabled ? (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
            GPS off
          </span>
        ) : null}
      </div>
    </div>
  )
}
