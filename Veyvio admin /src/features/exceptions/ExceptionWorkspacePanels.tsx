import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import {
  EXCEPTION_SMART_FILTERS,
  type ExceptionSmartFilter,
} from '@/lib/exceptions/exception-filters'
import type { ExceptionKpis } from '@/lib/exceptions/exception-kpis'
import type { ExceptionSeverity } from '@/lib/types'

export function ExceptionControlBar({
  dateLabel,
  openCount,
  search,
  onSearch,
  listTab,
  onListTab,
  smart,
  onSmart,
  onRaise,
  onRefresh,
  isLoading,
}: {
  dateLabel: string
  openCount: number
  search: string
  onSearch: (v: string) => void
  listTab: 'open' | 'resolved'
  onListTab: (t: 'open' | 'resolved') => void
  smart: ExceptionSmartFilter
  onSmart: (v: ExceptionSmartFilter) => void
  onRaise: () => void
  onRefresh: () => void
  isLoading?: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Exceptions</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {dateLabel} · {openCount} open · intervention inbox for Command
          </p>
          <p className={cn('mt-1 text-xs', isLoading ? 'text-amber-800' : 'text-emerald-700')}>
            {isLoading
              ? 'Refreshing exception sources…'
              : 'Aggregating Driver, Vehicle, Journey, Yard and Compliance signals'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRaise}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Raise exception
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Refresh
          </button>
          <Link
            to="/live-operations"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Live Operations
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {([
            { id: 'open', label: 'Open' },
            { id: 'resolved', label: 'Resolved' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onListTab(tab.id)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium',
                listTab === tab.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
              )}
            >
              {tab.label}
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
          {EXCEPTION_SMART_FILTERS.filter((f) => f.id !== 'resolved').map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onSmart(v.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                smart === v.id
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

type SummaryCardId = ExceptionSeverity | 'awaiting' | 'escalated' | 'sla'

export function ExceptionSummaryStrip({
  counts,
  kpis,
  active,
  onSelect,
}: {
  counts: Record<ExceptionSeverity, number>
  kpis: ExceptionKpis
  active: SummaryCardId | null
  onSelect: (id: SummaryCardId) => void
}) {
  const cards: {
    id: SummaryCardId
    title: string
    value: number
    sub: string
    tone?: 'danger' | 'warning'
  }[] = [
    {
      id: 'critical',
      title: 'Critical',
      value: counts.critical,
      sub: `${kpis.criticalOpen} open · need intervention now`,
      tone: counts.critical > 0 ? 'danger' : undefined,
    },
    {
      id: 'high',
      title: 'High',
      value: counts.high,
      sub: `${kpis.slaBreached} SLA breached overall`,
      tone: counts.high > 0 ? 'warning' : undefined,
    },
    {
      id: 'medium',
      title: 'Service pressure',
      value: counts.medium + counts.low,
      sub: `${counts.medium} medium · ${counts.low} information`,
    },
    {
      id: 'awaiting',
      title: 'Awaiting assignment',
      value: kpis.awaitingAssignment,
      sub: `${kpis.averageResolutionMinutes ?? '—'} min avg resolution`,
      tone: kpis.awaitingAssignment > 0 ? 'warning' : undefined,
    },
    {
      id: 'escalated',
      title: 'Escalated',
      value: kpis.escalated,
      sub: `${kpis.resolvedToday} resolved today`,
      tone: kpis.escalated > 0 ? 'danger' : undefined,
    },
  ]

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            'rounded-xl border bg-surface p-3 text-left transition hover:border-command-400',
            active === c.id ? 'border-command-500 ring-1 ring-command-500' : 'border-border',
            c.tone === 'danger' && active !== c.id && 'border-red-200',
            c.tone === 'warning' && active !== c.id && 'border-amber-200',
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
