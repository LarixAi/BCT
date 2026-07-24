import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, MapPin, Route } from 'lucide-react'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { JourneySequencePanel } from '@/features/journey-sequence/JourneySequencePanel'
import { AssignmentHistoryPanel } from '@/features/transfers/AssignmentHistoryPanel'
import { ManageAssignmentDrawer } from '@/features/transfers/ManageAssignmentDrawer'
import { TransferNotificationPanel } from '@/features/transfers/TransferNotificationPanel'
import { OperationalTrail } from '@/components/operations/OperationalTrail'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { buildTrailFromTrip } from '@/lib/operations/operational-trail'
import {
  buildTripRouteVersions,
  buildTripTimeline,
  jobOnboardLabel,
  stopOnboardSummary,
  tripRouteMetrics,
  tripRouteWarning,
  tripStops,
} from '@/lib/trips/trip-route'
import type { OperationalTrip } from '@/lib/transfers/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'stops', label: 'Stops' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'route', label: 'Route' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'messages', label: 'Messages' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'timeline', label: 'Timeline' },
] as const

type TripTab = (typeof TABS)[number]['id']

type TripOperationalDetailPageProps = {
  trip: OperationalTrip
  tab?: TripTab
  onTabChange?: (tab: TripTab) => void
}

export function TripOperationalDetailPage({ trip, tab: controlledTab, onTabChange }: TripOperationalDetailPageProps) {
  const [internalTab, setInternalTab] = useState<TripTab>('overview')
  const [showTransfer, setShowTransfer] = useState(false)
  const tab = controlledTab ?? internalTab

  const setTab = (next: TripTab) => {
    onTabChange?.(next)
    if (!controlledTab) setInternalTab(next)
  }

  const stops = useMemo(() => tripStops(trip), [trip])
  const metrics = useMemo(() => tripRouteMetrics(trip, stops), [trip, stops])
  const routeWarning = tripRouteWarning(trip)
  const versions = useMemo(() => buildTripRouteVersions(trip), [trip])
  const timeline = useMemo(() => buildTripTimeline(trip), [trip])

  const { data: duty } = useQuery({
    queryKey: tKey(['duty', trip.dutyId]),
    queryFn: () => api.getDuty(trip.dutyId!),
    enabled: Boolean(trip.dutyId),
  })

  const trail = useMemo(() => buildTrailFromTrip(trip, duty ?? null), [trip, duty])

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/trips"
          className="text-sm font-medium text-command-600 hover:underline"
        >
          ← Back to trips
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{trip.reference}</h1>
          <StatusPill status={trip.status} />
          {routeWarning && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5" />
              {routeWarning}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {trip.routeName ?? 'Operational trip'}
          {trip.runReference ? ` · Run ${trip.runReference}` : ''}
          {duty?.dutyDate ? ` · ${duty.dutyDate}` : ''}
        </p>
      </div>

      <OperationalTrail steps={trail} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Info label="Driver" value={trip.driverName ?? 'Unassigned'} />
        <Info label="Vehicle" value={trip.vehicleRegistration ?? 'Unassigned'} />
        <Info label="Jobs" value={`${trip.completedJobCount}/${trip.totalJobCount}`} />
        <Info label="Stops" value={String(metrics.stopCount)} />
        <Info label="Route version" value={`v${trip.manifestVersion}`} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium',
              tab === item.id
                ? 'border border-b-0 border-border bg-surface text-command-700'
                : 'text-ink-soft hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Trip summary">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Depot" value={trip.depotName ?? '—'} />
              <DetailRow label="Assignment" value={trip.assignmentStatus} />
              <DetailRow label="Dispatcher" value={trip.dispatcherName ?? '—'} />
              <DetailRow label="Delay" value={trip.delayMinutes > 0 ? `${trip.delayMinutes} min` : 'On time'} />
              <DetailRow label="Onboard now" value={String(trip.passengersOnboard)} />
              <DetailRow
                label="Driver acknowledged"
                value={trip.acknowledgedAt ? 'Yes' : 'Pending'}
              />
            </dl>
          </SectionCard>
          <SectionCard title="Route snapshot">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Distance" value={`${metrics.distanceKm} km`} />
              <DetailRow label="Duration" value={`${metrics.durationMinutes} min`} />
              <DetailRow label="Dead mileage" value={`${metrics.deadMileageKm} km`} />
              <DetailRow label="Latest version" value={`v${trip.manifestVersion}`} />
            </dl>
            {routeWarning && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">{routeWarning}</p>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'stops' && (
        <SectionCard title="Ordered stops" description="Operating sequence for this vehicle journey">
          <ol className="space-y-3">
            {stops.map((stop) => {
              const onboard = stopOnboardSummary(stop, trip)
              return (
                <li
                  key={stop.id}
                  className="flex gap-3 rounded-xl border border-border bg-surface px-3 py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-command-50 text-sm font-semibold text-command-800">
                    {stop.position}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{stop.label}</p>
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium capitalize text-ink-soft">
                        {stop.kind.replace(/_/g, ' ')}
                      </span>
                      {onboard && (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900">
                          {onboard}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{stop.address ?? '—'}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Planned {stop.plannedTime ?? '—'}
                      {stop.estimatedTime && stop.estimatedTime !== stop.plannedTime
                        ? ` · ETA ${stop.estimatedTime}`
                        : ''}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </SectionCard>
      )}

      {tab === 'jobs' && (
        <SectionCard title="Jobs on trip" description="Each job is one passenger movement">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Passenger</th>
                <th className="pb-2 pr-3 font-medium">Pickup</th>
                <th className="pb-2 pr-3 font-medium">Drop-off</th>
                <th className="pb-2 pr-3 font-medium">Planned</th>
                <th className="pb-2 pr-3 font-medium">Onboard state</th>
                <th className="pb-2 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody>
              {[...trip.jobs]
                .sort((a, b) => a.sequence - b.sequence)
                .map((job) => (
                  <tr key={job.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3 tabular-nums text-muted">{job.sequence}</td>
                    <td className="py-2.5 pr-3 font-medium">{job.passengerName}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{job.pickupAddress}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{job.dropoffAddress}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-soft">{job.plannedPickupTime}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={job.status} />
                      <span className="ml-1 text-xs text-ink-soft">{jobOnboardLabel(job)}</span>
                    </td>
                    <td className="py-2.5 text-xs text-muted">
                      {job.wheelchairRequired && 'Wheelchair '}
                      {job.escortRequired && 'Assistant '}
                      {job.safeguardingFlag && 'Safeguarding'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {tab === 'route' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <SectionCard title="Route map" description="Stop sequence preview">
              <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-sky-50 via-surface to-emerald-50">
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="w-full max-w-md space-y-2">
                    {stops.slice(0, 6).map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 shrink-0 text-command-600" />
                        <span className="truncate text-ink">{stop.label}</span>
                        <span className="ml-auto tabular-nums text-xs text-ink-soft">
                          {stop.plannedTime ?? '—'}
                        </span>
                        {index < Math.min(stops.length, 6) - 1 && (
                          <Route className="absolute left-3 hidden h-full w-px bg-border lg:block" />
                        )}
                      </div>
                    ))}
                    {stops.length > 6 && (
                      <p className="text-xs text-ink-soft">+{stops.length - 6} more stops</p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Route metrics">
              <dl className="space-y-3 text-sm">
                <DetailRow label="Stops" value={String(metrics.stopCount)} />
                <DetailRow label="Distance" value={`${metrics.distanceKm} km`} />
                <DetailRow label="Duration" value={`${metrics.durationMinutes} min`} />
                <DetailRow label="Dead mileage" value={`${metrics.deadMileageKm} km`} />
                <DetailRow label="Passengers onboard" value={String(metrics.passengersOnboard)} />
              </dl>
            </SectionCard>
          </div>

          <SectionCard title="Route versions" description="Every published change creates a new version">
            <ul className="space-y-2">
              {versions.map((version) => (
                <li
                  key={version.version}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium text-ink">
                      Version {version.version} — published{' '}
                      {new Date(version.publishedAt).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-sm text-ink-soft">{version.summary}</p>
                  </div>
                  {version.requiresDriverAck && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        version.acknowledged
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-900',
                      )}
                    >
                      {version.acknowledged ? 'Acknowledged' : 'Awaiting driver ack'}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Reorganise route" description="Reorder pickups and publish with driver notification">
            <JourneySequencePanel tripId={trip.id} />
          </SectionCard>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          <SectionCard
            title="Driver and vehicle"
            action={
              <button
                type="button"
                onClick={() => setShowTransfer(true)}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
              >
                Manage assignment
              </button>
            }
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Driver" value={trip.driverName ?? 'Unassigned'} />
              <DetailRow label="Vehicle" value={trip.vehicleRegistration ?? 'Unassigned'} />
              <DetailRow label="Depot" value={trip.depotName ?? '—'} />
              <DetailRow label="Assignment status" value={trip.assignmentStatus} />
              <DetailRow
                label="Accepted"
                value={trip.acceptedAt ? new Date(trip.acceptedAt).toLocaleString('en-GB') : '—'}
              />
              <DetailRow label="Acknowledged" value={trip.acknowledgedAt ? 'Yes' : 'Pending'} />
            </dl>
          </SectionCard>
          <AssignmentHistoryPanel tripId={trip.id} />
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-4">
          <SectionCard title="Trip communications">
            <p className="text-sm text-ink-soft">
              Messages about this trip are linked to run {trip.runReference ?? trip.reference}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/messages?compose=1&to=${encodeURIComponent(trip.driverName ?? '')}&run=${encodeURIComponent(trip.runReference ?? trip.reference)}`}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
              >
                Message driver
              </Link>
              {trip.dutyId && (
                <Link
                  to={`/runs/${trip.dutyId}`}
                  className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
                >
                  Open parent run
                </Link>
              )}
            </div>
          </SectionCard>
          <TransferNotificationPanel tripId={trip.id} />
        </div>
      )}

      {tab === 'exceptions' && (
        <SectionCard title="Exceptions" description="Operational issues linked to this trip">
          <p className="text-sm text-ink-soft">
            No open exceptions on this trip. Create one if a passenger no-show, safeguarding concern, or
            vehicle issue needs recording.
          </p>
          <Link
            to={`/exceptions?create=1&run=${encodeURIComponent(trip.runReference ?? trip.reference)}&trip=${encodeURIComponent(trip.reference)}`}
            className="mt-3 inline-flex rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700"
          >
            Create exception
          </Link>
        </SectionCard>
      )}

      {tab === 'timeline' && (
        <SectionCard title="Trip timeline" description="Route publishes, assignments, and status changes">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">No timeline events yet.</p>
          ) : (
            <ol className="space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-3 border-l-2 border-command-200 pl-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                      {new Date(event.at).toLocaleString('en-GB')}
                    </p>
                    <p className="font-medium text-ink">{event.title}</p>
                    <p className="text-sm text-ink-soft">{event.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      )}

      {showTransfer && (
        <ManageAssignmentDrawer tripId={trip.id} onClose={() => setShowTransfer(false)} />
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold capitalize text-ink">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}
