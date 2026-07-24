import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { LiveVehicleMap, type MapStopMarker } from '@/components/map/LiveVehicleMap'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { JourneySequencePanel } from '@/features/journey-sequence/JourneySequencePanel'
import { AssignmentHistoryPanel } from '@/features/transfers/AssignmentHistoryPanel'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { TransferNotificationPanel } from '@/features/transfers/TransferNotificationPanel'
import { OperationalTrail } from '@/components/operations/OperationalTrail'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { buildTrailFromDuty } from '@/lib/operations/operational-trail'
import type { DutyDetailRecord, DutyTrackResponse, LiveDispatchVehicle } from '@/lib/api/types'
import {
  deriveRunLifecycle,
  formatWorkingTime,
  lifecycleLabel,
  runWorkingTimeMinutes,
  validateRunPublish,
} from '@/lib/runs/run-register'
import { formatDutyClock } from '@/lib/ops/runs-trips-schedule'
import type { OperationalTrip } from '@/lib/transfers/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'trips', label: 'Trips' },
  { id: 'timeline-duty', label: 'Duty timeline' },
  { id: 'driver', label: 'Driver' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'crew', label: 'Crew' },
  { id: 'breaks', label: 'Breaks' },
  { id: 'messages', label: 'Messages' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'timeline', label: 'Timeline' },
] as const

export type RunWorkspaceTab = (typeof TABS)[number]['id']

type RunWorkspacePageProps = {
  duty: DutyDetailRecord
  trips: OperationalTrip[]
  opsTrip: OperationalTrip | null
  track?: DutyTrackResponse
  mapVehicle: LiveDispatchVehicle | null
  routeCoordinates: [number, number][]
  pingCoordinates: [number, number][]
  stopMarkers: MapStopMarker[]
  tab?: RunWorkspaceTab
  onTabChange?: (tab: RunWorkspaceTab) => void
}

export function RunWorkspacePage({
  duty,
  trips,
  opsTrip,
  track,
  mapVehicle,
  routeCoordinates,
  pingCoordinates,
  stopMarkers,
  tab: controlledTab,
  onTabChange,
}: RunWorkspacePageProps) {
  const queryClient = useQueryClient()
  const [internalTab, setInternalTab] = useState<RunWorkspaceTab>('overview')
  const [publishMessage, setPublishMessage] = useState<string | null>(null)
  const tab = controlledTab ?? internalTab

  const setTab = (next: RunWorkspaceTab) => {
    onTabChange?.(next)
    if (!controlledTab) setInternalTab(next)
  }

  const lifecycle = deriveRunLifecycle(duty)
  const publishValidation = validateRunPublish(duty, trips.length)
  const stops = duty.route?.stops ?? track?.duty.route?.stops ?? []
  const checkpoints = track?.checkpoints ?? []

  const breaks = useMemo(() => {
    const working = runWorkingTimeMinutes(duty)
    if (working < 240) return []
    const midpoint = duty.startTime ? addMinutesToClock(duty.startTime, Math.floor(working / 2)) : '12:00'
    return [{ id: 'break-1', label: 'Statutory break', at: midpoint, durationMinutes: 30 }]
  }, [duty])

  const trail = useMemo(() => buildTrailFromDuty(duty, opsTrip), [duty, opsTrip])

  const timelineEvents = useMemo(() => {
    const events: { id: string; at: string; title: string; detail: string }[] = []
    if (duty.publishedAt) {
      events.push({
        id: 'published',
        at: duty.publishedAt,
        title: 'Run published',
        detail: duty.reference,
      })
    }
    for (const cp of checkpoints) {
      if (cp.arrivedAt) {
        events.push({
          id: `stop-${cp.routeStopId}`,
          at: cp.arrivedAt,
          title: `Arrived ${cp.name}`,
          detail: `Stop ${cp.stopOrder}`,
        })
      }
    }
    if (duty.lastPositionAt) {
      events.push({
        id: 'position',
        at: duty.lastPositionAt,
        title: 'Last GPS position',
        detail: duty.vehicle?.registrationNumber ?? 'Vehicle',
      })
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [duty, checkpoints])

  const publishMutation = useMutation({
    mutationFn: () => api.publishDuty(duty.id),
    onSuccess: () => {
      setPublishMessage('Run published — driver must acknowledge before departure.')
      queryClient.invalidateQueries({ queryKey: tKey(['duty', duty.id]) })
      queryClient.invalidateQueries({ queryKey: tKey(['duties']) })
    },
    onError: (err: Error) => setPublishMessage(err.message),
  })

  const driverName = duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : null

  return (
    <div className="space-y-6">
      <div>
        <Link to="/runs" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to runs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{duty.reference}</h1>
          <StatusPill status={lifecycle} />
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium capitalize text-ink-soft">
            {lifecycleLabel(lifecycle)}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {duty.route?.name ?? 'No route'} · {duty.dutyDate} · {formatWorkingTime(runWorkingTimeMinutes(duty))} duty
        </p>
      </div>

      <OperationalTrail steps={trail} />

      {publishMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
          {publishMessage}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <InfoCard label="Driver" value={driverName ?? 'Unassigned'} />
        <InfoCard label="Vehicle" value={duty.vehicle?.registrationNumber ?? 'Unassigned'} />
        <InfoCard label="Trips" value={String(trips.length)} />
        <InfoCard label="Window" value={`${formatDutyClock(duty.startTime)} – ${formatDutyClock(duty.endTime)}`} />
        <InfoCard label="Status" value={duty.status.replace(/_/g, ' ')} />
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
          <SectionCard title="Run summary">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Lifecycle" value={lifecycleLabel(lifecycle)} />
              <DetailRow label="Publication" value={duty.publicationStatus ?? 'draft'} />
              <DetailRow label="Depot" value="Wembley Depot" />
              <DetailRow label="Working time" value={formatWorkingTime(runWorkingTimeMinutes(duty))} />
              <DetailRow label="Trips" value={String(trips.length)} />
              <DetailRow
                label="Driver ack"
                value={duty.driverLifecycleStatus ?? (duty.acknowledgementRequired ? 'Pending' : '—')}
              />
            </dl>
          </SectionCard>

          <SectionCard
            title="Publish run"
            action={
              <button
                type="button"
                disabled={!publishValidation.canPublish || publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                Publish run
              </button>
            }
          >
            {publishValidation.canPublish ? (
              <p className="flex items-center gap-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Ready to publish — no blocking assignment errors.
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-red-900">
                {publishValidation.blockers.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {publishValidation.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-amber-900">
                {publishValidation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <ManageAssignmentButton dutyId={duty.id} duty={duty} />
              <Link
                to={`/schedule?mode=planning`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Open schedule planning
              </Link>
            </div>
          </SectionCard>

          {opsTrip && (
            <SectionCard title="Route map" className="lg:col-span-2" flush>
              <LiveVehicleMap
                vehicles={mapVehicle ? [mapVehicle] : []}
                routeLine={routeCoordinates}
                trailLine={pingCoordinates}
                stopMarkers={stopMarkers}
                className="h-64"
                edgeToEdge
                selectedDutyId={duty.id}
                selectedVehicle={mapVehicle}
              />
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'trips' && (
        <SectionCard title="Trips on this run" description={`${trips.length} vehicle journeys`}>
          {trips.length === 0 ? (
            <p className="text-sm text-muted">No trips linked to this run yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3 font-medium">Trip</th>
                  <th className="pb-2 pr-3 font-medium">Route</th>
                  <th className="pb-2 pr-3 font-medium">Jobs</th>
                  <th className="pb-2 pr-3 font-medium">Driver</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => (
                  <tr key={trip.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-3">
                      <Link to={`/trips/${trip.id}`} className="font-medium text-command-600 hover:underline">
                        {trip.reference}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{trip.routeName ?? '—'}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{trip.totalJobCount}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{trip.driverName ?? '—'}</td>
                    <td className="py-2.5">
                      <StatusPill status={trip.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      )}

      {tab === 'timeline-duty' && (
        <SectionCard title="Duty timeline" description="Sign-on through sign-off">
          <ol className="relative space-y-4 border-l-2 border-command-200 pl-6">
            <TimelineItem
              time={formatDutyClock(duty.startTime)}
              title="Planned sign-on"
              detail={driverName ?? 'Driver unassigned'}
              done={['signed_on', 'in_progress', 'passenger_boarded', 'completed'].includes(duty.status)}
            />
            {stops
              .slice()
              .sort((a, b) => a.stopOrder - b.stopOrder)
              .map((stop) => {
                const cp = checkpoints.find((c) => c.routeStopId === stop.id)
                return (
                  <TimelineItem
                    key={stop.id}
                    time={stop.pickupTime ?? stop.dropoffTime ?? '—'}
                    title={stop.name}
                    detail={stop.address ?? 'Stop'}
                    done={Boolean(cp?.arrivedAt)}
                  />
                )
              })}
            {breaks.map((b) => (
              <TimelineItem key={b.id} time={b.at} title={b.label} detail={`${b.durationMinutes} min`} done={false} />
            ))}
            <TimelineItem
              time={formatDutyClock(duty.endTime)}
              title="Planned sign-off"
              detail={formatWorkingTime(runWorkingTimeMinutes(duty))}
              done={duty.status === 'completed' || duty.status === 'signed_off'}
            />
          </ol>
        </SectionCard>
      )}

      {tab === 'driver' && (
        <SectionCard title="Driver">
          {duty.driver ? (
            <dl className="space-y-2 text-sm">
              <DetailRow label="Name" value={driverName!} />
              <DetailRow label="Status" value={duty.driver.status ?? '—'} />
              <DetailRow label="Lifecycle" value={duty.driverLifecycleStatus ?? '—'} />
            </dl>
          ) : (
            <p className="text-sm text-muted">No driver assigned.</p>
          )}
          <div className="mt-4">
            <ManageAssignmentButton dutyId={duty.id} duty={duty} />
          </div>
        </SectionCard>
      )}

      {tab === 'vehicle' && (
        <SectionCard title="Vehicle">
          {duty.vehicle ? (
            <dl className="space-y-2 text-sm">
              <DetailRow label="Registration" value={duty.vehicle.registrationNumber} />
              <DetailRow label="Status" value={duty.vehicle.status ?? '—'} />
            </dl>
          ) : (
            <p className="text-sm text-muted">No vehicle assigned.</p>
          )}
        </SectionCard>
      )}

      {tab === 'crew' && (
        <SectionCard title="Crew">
          <dl className="space-y-2 text-sm">
            <DetailRow label="Driver" value={driverName ?? 'Unassigned'} />
            <DetailRow
              label="Passenger assistant"
              value={
                duty.passengerAssistant
                  ? `${duty.passengerAssistant.firstName} ${duty.passengerAssistant.lastName}`
                  : 'None assigned'
              }
            />
          </dl>
        </SectionCard>
      )}

      {tab === 'breaks' && (
        <SectionCard title="Breaks">
          {breaks.length === 0 ? (
            <p className="text-sm text-muted">No statutory break required for this duty length.</p>
          ) : (
            <ul className="space-y-2">
              {breaks.map((b) => (
                <li key={b.id} className="rounded-xl border border-border px-3 py-2.5 text-sm">
                  <p className="font-medium text-ink">{b.label}</p>
                  <p className="text-ink-soft">
                    {b.at} · {b.durationMinutes} minutes
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === 'messages' && (
        <div className="space-y-4">
          <SectionCard title="Run messages">
            <Link
              to={`/messages?compose=1&to=${encodeURIComponent(driverName ?? '')}&run=${encodeURIComponent(duty.reference)}`}
              className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
            >
              Message driver
            </Link>
          </SectionCard>
          {opsTrip && <TransferNotificationPanel tripId={opsTrip.id} />}
        </div>
      )}

      {tab === 'exceptions' && (
        <SectionCard title="Exceptions">
          <p className="text-sm text-ink-soft">Record operational issues against this run.</p>
          <Link
            to={`/exceptions?create=1&run=${encodeURIComponent(duty.reference)}`}
            className="mt-3 inline-flex rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700"
          >
            Create exception
          </Link>
        </SectionCard>
      )}

      {tab === 'timeline' && (
        <div className="space-y-4">
          <SectionCard title="Event timeline">
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-muted">No events recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {timelineEvents.map((event) => (
                  <li key={event.id} className="border-l-2 border-command-200 pl-4">
                    <p className="text-xs text-ink-soft">{new Date(event.at).toLocaleString('en-GB')}</p>
                    <p className="font-medium text-ink">{event.title}</p>
                    <p className="text-sm text-ink-soft">{event.detail}</p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
          {opsTrip && <AssignmentHistoryPanel tripId={opsTrip.id} />}
          {opsTrip && (
            <SectionCard title="Journey sequence">
              <JourneySequencePanel tripId={opsTrip.id} duty={duty} initialTrip={opsTrip} />
            </SectionCard>
          )}
        </div>
      )}
    </div>
  )
}

function TimelineItem({
  time,
  title,
  detail,
  done,
}: {
  time: string
  title: string
  detail: string
  done: boolean
}) {
  return (
    <li className="relative">
      <span
        className={cn(
          'absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full ring-2 ring-white',
          done ? 'bg-emerald-500' : 'bg-surface-muted',
        )}
      />
      <p className="text-xs font-medium tabular-nums text-ink-soft">{time}</p>
      <p className="font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-soft">{detail}</p>
    </li>
  )
}

function addMinutesToClock(value: string, minutes: number): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes
  const h = Math.floor((total % (24 * 60)) / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function InfoCard({ label, value }: { label: string; value: string }) {
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
