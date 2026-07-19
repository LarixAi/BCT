import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { useOperationalContext } from '@/lib/context'
import {
  filterRuns,
  formatDelayLabel,
  formatDutyClock,
  runDriverName,
  runScheduleDelayMinutes,
  runSummary,
  type RunBoardFilter,
} from '@/lib/ops/runs-trips-schedule'

const FILTERS: { id: RunBoardFilter; label: string }[] = [
  { id: 'all', label: 'All runs' },
  { id: 'active', label: 'Active' },
  { id: 'starting_soon', label: 'Starting soon' },
  { id: 'delayed', label: 'Delayed' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'completed', label: 'Completed' },
]

export function RunsPage() {
  const { operationalDate, operationalDateIso } = useOperationalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [date, setDate] = useState(operationalDateIso)
  const [filter, setFilter] = useState<RunBoardFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('duty'))

  const { data: duties = [], isLoading, error, isError, refetch, isFetching } = useQuery({
    queryKey: ['duties', date],
    queryFn: () => api.getDuties({ date }),
  })

  useEffect(() => {
    const duty = searchParams.get('duty')
    if (duty) setSelectedId(duty)
  }, [searchParams])

  const summary = useMemo(() => runSummary(duties), [duties])
  const filtered = useMemo(() => filterRuns(duties, filter, search), [duties, filter, search])
  const selected = duties.find((d) => d.id === selectedId) ?? null

  function selectRun(id: string) {
    setSelectedId(id)
    const next = new URLSearchParams(searchParams)
    next.set('duty', id)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Runs</h1>
            <p className="mt-0.5 text-sm text-slate-700">
              {operationalDate} · Who is driving what today?
            </p>
            <p className={cn('mt-1 text-xs', isFetching ? 'text-amber-800' : 'text-emerald-700')}>
              {isFetching ? 'Refreshing duties…' : 'Dispatcher duty board — one run = one driver duty'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Refresh
            </button>
            <Link
              to="/dispatch"
              className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-sm font-medium text-command-800 hover:bg-command-100"
            >
              Dispatch
            </Link>
            <Link
              to="/trips"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Trips
            </Link>
            <Link
              to="/schedule"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Schedule
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search driver, vehicle, run…"
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  filter === f.id ? 'bg-command-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load runs'}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {(
          [
            { id: 'active' as const, title: "Today's active", value: summary.active },
            { id: 'starting_soon' as const, title: 'Starting soon', value: summary.startingSoon },
            { id: 'completed' as const, title: 'Completed', value: summary.completed },
            { id: 'delayed' as const, title: 'Delayed', value: summary.delayed, tone: 'warning' as const },
            { id: 'unassigned' as const, title: 'Unassigned', value: summary.unassigned, tone: 'danger' as const },
          ] as const
        ).map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setFilter(card.id)}
            className={cn(
              'rounded-xl border bg-white p-3 text-left transition hover:border-command-400',
              filter === card.id ? 'border-command-500 ring-1 ring-command-500' : 'border-slate-200',
              'tone' in card && card.tone === 'danger' && filter !== card.id && 'border-red-200',
              'tone' in card && card.tone === 'warning' && filter !== card.id && 'border-amber-200',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{card.title}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold tabular-nums',
                'tone' in card && card.tone === 'danger'
                  ? 'text-red-800'
                  : 'tone' in card && card.tone === 'warning'
                    ? 'text-amber-800'
                    : 'text-slate-900',
              )}
            >
              {card.value}
            </p>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_340px]">
        <SectionCard title="Runs board" description={`${filtered.length} duties`} className="min-h-0 overflow-hidden" flush>
          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No runs match this filter.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 font-medium">Driver</th>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Start</th>
                    <th className="px-3 py-2 font-medium">Finish</th>
                    <th className="px-3 py-2 font-medium">Run</th>
                    <th className="px-3 py-2 font-medium">Delay</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((duty) => {
                    const delayMinutes = runScheduleDelayMinutes(duty)
                    return (
                      <tr
                        key={duty.id}
                        onClick={() => selectRun(duty.id)}
                        className={cn(
                          'cursor-pointer border-b border-slate-100 hover:bg-slate-50',
                          selectedId === duty.id && 'bg-command-50',
                        )}
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          {runDriverName(duty) ?? <span className="text-red-700">Unassigned</span>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-slate-700">
                          {duty.vehicle?.registrationNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {formatDutyClock(duty.startTime)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-700">
                          {formatDutyClock(duty.endTime)}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900">{duty.reference}</p>
                          <p className="text-xs text-slate-500">{duty.route?.name ?? '—'}</p>
                        </td>
                        <td
                          className={cn(
                            'px-3 py-2.5 tabular-nums',
                            delayMinutes >= 20
                              ? 'font-semibold text-red-800'
                              : delayMinutes >= 8
                                ? 'font-medium text-amber-800'
                                : 'text-slate-600',
                          )}
                        >
                          {formatDelayLabel(delayMinutes)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                            {duty.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </SectionCard>

        <RunDetailPanel duty={selected} />
      </div>
    </div>
  )
}

function RunDetailPanel({ duty }: { duty: DutyRecord | null }) {
  if (!duty) {
    return (
      <SectionCard title="Selected run" description="Duty card">
        <p className="text-sm text-slate-500">Select a run to open the duty card — driver, vehicle, trips and actions.</p>
      </SectionCard>
    )
  }

  const driver = runDriverName(duty)
  const delayMinutes = runScheduleDelayMinutes(duty)
  const delayLabel = formatDelayLabel(delayMinutes)

  return (
    <SectionCard
      title={duty.reference}
      description={`${duty.status.replace(/_/g, ' ')} · ${duty.route?.name ?? 'No route'}`}
      className="min-h-0 overflow-hidden"
      flush
    >
      <div className="max-h-[560px] space-y-3 overflow-y-auto p-4 text-sm">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Driver</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{driver ?? 'Unassigned'}</p>
          <p className="text-xs text-slate-500">
            Clock window {formatDutyClock(duty.startTime)} – {formatDutyClock(duty.endTime)}
          </p>
        </div>
        <Row label="Vehicle" value={duty.vehicle?.registrationNumber ?? '—'} />
        <Row
          label="Duty"
          value={`${formatDutyClock(duty.startTime)} – ${formatDutyClock(duty.endTime)}`}
        />
        <Row label="Route" value={duty.route?.name ?? '—'} />
        <Row label="Status" value={duty.status.replace(/_/g, ' ')} />
        <Row label="Delay" value={delayMinutes > 0 ? delayLabel : 'None'} />

        {delayMinutes >= 8 && (
          <p
            className={cn(
              'rounded-lg border px-3 py-2 text-xs',
              delayMinutes >= 20
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-950',
            )}
          >
            {delayMinutes >= 20
              ? `This run is ${delayLabel.replace('+', '')} past plan — check Live Operations and contact the driver.`
              : `This run is ${delayLabel.replace('+', '')} behind plan.`}
          </p>
        )}

        {(!duty.driver || duty.status === 'unassigned') && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            Assignment blocked until a compliant driver and release-ready vehicle are set.
          </p>
        )}
        {duty.vehicle?.status === 'off_road' && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            Vehicle is VOR / off road — swap vehicle before this duty continues.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <ActionLink label="Open run detail" href={`/runs/${duty.id}`} primary />
          <ActionLink label="Live operations" href={`/live-operations?duty=${encodeURIComponent(duty.id)}`} />
          <ActionLink label="Trips on this run" href={`/trips?run=${encodeURIComponent(duty.reference)}`} />
          <ActionLink label="Message driver" href={`/messages?compose=1&to=${encodeURIComponent(driver ?? '')}&run=${encodeURIComponent(duty.reference)}`} />
          <ActionLink label="Dispatch" href="/dispatch" />
          <ActionLink label="Create exception" href={`/exceptions?create=1&run=${encodeURIComponent(duty.reference)}`} />
        </div>
      </div>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium capitalize text-slate-900">{value}</span>
    </div>
  )
}

function ActionLink({ label, href, primary }: { label: string; href: string; primary?: boolean }) {
  return (
    <Link
      to={href}
      className={cn(
        'rounded-lg border px-2 py-2 text-center text-xs font-medium',
        primary
          ? 'border-command-200 bg-command-50 text-command-800 hover:bg-command-100'
          : 'border-slate-200 text-slate-700 hover:bg-slate-50',
      )}
    >
      {label}
    </Link>
  )
}
