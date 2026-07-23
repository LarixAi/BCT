import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import { useOperationalContext } from '@/lib/context'
import { filterTrips, tripSummary, type TripBoardFilter } from '@/lib/ops/runs-trips-schedule'
import type { OperationalTrip } from '@/lib/transfers/types'

const FILTERS: { id: TripBoardFilter; label: string }[] = [
  { id: 'all', label: 'All trips' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'delayed', label: 'Delayed' },
  { id: 'complete', label: 'Complete' },
  { id: 'cancelled', label: 'Cancelled' },
]

export function TripsPage() {
  const { operationalDate } = useOperationalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<TripBoardFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('trip'))

  const { data: trips = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['operational-trips'],
    queryFn: () => api.getOperationalTrips(),
  })

  useEffect(() => {
    const trip = searchParams.get('trip')
    if (trip) setSelectedId(trip)
    const run = searchParams.get('run')
    if (run) setSearch(run)

    const status = searchParams.get('status') ?? searchParams.get('filter')
    if (!status) return
    const mapped =
      status === 'completed' || status === 'complete'
        ? 'complete'
        : status === 'cancelled'
          ? 'cancelled'
          : status === 'active'
            ? 'active'
            : status === 'upcoming'
              ? 'upcoming'
              : status === 'delayed'
                ? 'delayed'
                : null
    if (mapped) setFilter(mapped)
  }, [searchParams])

  const summary = useMemo(() => tripSummary(trips), [trips])
  const filtered = useMemo(() => filterTrips(trips, filter, search), [trips, filter, search])
  const selected = trips.find((t) => t.id === selectedId) ?? null

  function selectTrip(id: string) {
    setSelectedId(id)
    const next = new URLSearchParams(searchParams)
    next.set('trip', id)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Trips</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              {operationalDate} · What journeys are taking place?
            </p>
            <p className={cn('mt-1 text-xs', isFetching ? 'text-amber-800' : 'text-emerald-700')}>
              {isFetching
                ? 'Refreshing journeys…'
                : 'Service delivery board — passengers, pickups and drop-offs'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Refresh
            </button>
            <Link
              to="/runs"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Runs
            </Link>
            <Link
              to="/live-operations"
              className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-sm font-medium text-command-800 hover:bg-command-100"
            >
              Live Operations
            </Link>
            <Link
              to="/bookings"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Bookings
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search passenger, school, driver, trip…"
            className="w-full max-w-xs rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  filter === f.id ? 'bg-command-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-border',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {(
          [
            { id: 'all' as const, title: "Today's trips", value: summary.total },
            { id: 'complete' as const, title: 'Complete', value: summary.complete },
            { id: 'active' as const, title: 'Active', value: summary.active },
            { id: 'upcoming' as const, title: 'Upcoming', value: summary.upcoming },
            { id: 'delayed' as const, title: 'Delayed', value: summary.delayed, tone: 'warning' as const },
            { id: 'cancelled' as const, title: 'Cancelled', value: summary.cancelled, tone: 'danger' as const },
          ] as const
        ).map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setFilter(card.id)}
            className={cn(
              'rounded-xl border bg-surface p-3 text-left transition hover:border-command-400',
              filter === card.id ? 'border-command-500 ring-1 ring-command-500' : 'border-border',
              'tone' in card && card.tone === 'danger' && filter !== card.id && 'border-red-200',
              'tone' in card && card.tone === 'warning' && filter !== card.id && 'border-amber-200',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{card.title}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold tabular-nums',
                'tone' in card && card.tone === 'danger'
                  ? 'text-red-800'
                  : 'tone' in card && card.tone === 'warning'
                    ? 'text-amber-800'
                    : 'text-ink',
              )}
            >
              {card.value}
            </p>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_340px]">
        <SectionCard title="Trip board" description={`${filtered.length} journeys`} className="min-h-0 overflow-hidden" flush>
          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">No trips match this filter.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface text-[11px] uppercase tracking-wide text-muted">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium">Trip</th>
                    <th className="px-3 py-2 font-medium">Pickup</th>
                    <th className="px-3 py-2 font-medium">Passengers</th>
                    <th className="px-3 py-2 font-medium">Vehicle</th>
                    <th className="px-3 py-2 font-medium">Driver</th>
                    <th className="px-3 py-2 font-medium">Run</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((trip) => {
                    const jobs = trip.jobs ?? []
                    const firstJob = jobs[0]
                    return (
                      <tr
                        key={trip.id}
                        onClick={() => selectTrip(trip.id)}
                        className={cn(
                          'cursor-pointer border-b border-border hover:bg-surface-muted',
                          selectedId === trip.id && 'bg-command-50',
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-ink">{trip.reference}</p>
                          <p className="text-xs text-muted">{trip.routeName ?? '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-ink-soft">
                          {firstJob?.plannedPickupTime
                            ? new Date(firstJob.plannedPickupTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-ink-soft">
                          {trip.passengersOnboard}/{trip.totalJobCount}
                          {trip.delayMinutes > 0 && (
                            <span className="ml-1 text-xs font-medium text-amber-800">+{trip.delayMinutes}m</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                          {trip.vehicleRegistration ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-ink-soft">{trip.driverName ?? 'Unassigned'}</td>
                        <td className="px-3 py-2.5">
                          {trip.dutyId ? (
                            <Link
                              to={`/runs/${trip.dutyId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-command-700 hover:underline"
                            >
                              {trip.runReference ?? 'Run'}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill status={trip.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </SectionCard>

        <TripDetailPanel trip={selected} />
      </div>
    </div>
  )
}

function TripDetailPanel({ trip }: { trip: OperationalTrip | null }) {
  if (!trip) {
    return (
      <SectionCard title="Selected trip" description="Journey card">
        <p className="text-sm text-muted">
          Select a trip to see passengers, pickup/drop-off and actions. Runs organise the driver — trips organise the passengers.
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={trip.reference}
      description={`${trip.status.replace(/_/g, ' ')} · ${trip.routeName ?? 'Journey'}`}
      className="min-h-0 overflow-hidden"
      flush
    >
      <div className="max-h-[560px] space-y-3 overflow-y-auto p-4 text-sm">
        <Row label="Driver" value={trip.driverName ?? 'Unassigned'} />
        <Row label="Vehicle" value={trip.vehicleRegistration ?? '—'} />
        <Row label="Run" value={trip.runReference ?? '—'} />
        <Row label="Depot" value={trip.depotName ?? '—'} />
        <Row label="Progress" value={`${trip.completedJobCount}/${trip.totalJobCount} jobs`} />
        <Row label="Onboard" value={String(trip.passengersOnboard)} />
        <Row label="Delay" value={trip.delayMinutes > 0 ? `${trip.delayMinutes} min` : 'None'} />

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Passengers</p>
          <ul className="mt-2 space-y-2">
            {(trip.jobs ?? []).length === 0 && (
              <li className="text-muted">No passenger jobs on this trip.</li>
            )}
            {(trip.jobs ?? []).map((job) => (
              <li key={job.id} className="rounded-lg border border-border px-2.5 py-2">
                <p className="font-medium text-ink">{job.passengerName}</p>
                <p className="text-xs text-muted">
                  {job.pickupAddress} → {job.dropoffAddress}
                </p>
                <p className="mt-1 text-[11px] capitalize text-ink-soft">
                  {job.status.replace(/_/g, ' ')}
                  {job.wheelchairRequired ? ' · Wheelchair' : ''}
                  {job.escortRequired ? ' · Escort' : ''}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            to={`/live-operations/trips/${trip.id}?tab=journey`}
            className="rounded-lg border border-command-200 bg-command-50 px-2 py-2 text-center text-xs font-medium text-command-800 hover:bg-command-100"
          >
            Open journey sequence
          </Link>
          {trip.dutyId && (
            <Link
              to={`/runs/${trip.dutyId}`}
              className="rounded-lg border border-border px-2 py-2 text-center text-xs font-medium hover:bg-surface-muted"
            >
              Open parent run
            </Link>
          )}
          <Link
            to={`/messages?compose=1&to=${encodeURIComponent(trip.driverName ?? '')}&run=${encodeURIComponent(trip.runReference ?? trip.reference)}`}
            className="rounded-lg border border-border px-2 py-2 text-center text-xs font-medium hover:bg-surface-muted"
          >
            Message driver
          </Link>
          <Link
            to={`/exceptions?create=1&run=${encodeURIComponent(trip.runReference ?? trip.reference)}`}
            className="rounded-lg border border-border px-2 py-2 text-center text-xs font-medium hover:bg-surface-muted"
          >
            Create exception
          </Link>
        </div>
      </div>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium capitalize text-ink">{value}</span>
    </div>
  )
}
