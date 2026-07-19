import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LiveVehicleMap, type MapStopMarker } from '@/components/map/LiveVehicleMap'
import { SectionCard } from '@/components/ui'
import { JourneySequencePanel } from '@/features/journey-sequence/JourneySequencePanel'
import { AssignmentHistoryPanel } from '@/features/transfers/AssignmentHistoryPanel'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { api } from '@/lib/api/client'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { cn } from '@/lib/cn'

const RUN_TABS = ['Overview', 'Journey sequence', 'Stops', 'Route map', 'Change history'] as const

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<(typeof RUN_TABS)[number]>('Overview')

  const { data: opsTrip } = useQuery({
    queryKey: ['operational-trip-by-duty', id],
    queryFn: () => api.getOperationalTripByDuty(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: duty, isLoading, error, isError } = useQuery({
    queryKey: ['duty', id],
    queryFn: () => api.getDuty(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: track } = useQuery({
    queryKey: ['duty-track', id],
    queryFn: () => api.getDutyTrack(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading run…</p>
  }

  if (isError || !duty) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
        {error instanceof Error ? error.message : 'Run not found'}
        <Link to="/runs" className="ml-2 font-medium underline">
          Back to runs
        </Link>
      </div>
    )
  }

  const stops = duty.route?.stops ?? track?.duty.route?.stops ?? []
  const checkpoints = track?.checkpoints ?? []
  const pings = track?.pings ?? []
  const latestPing = pings[0] ?? null
  const lastLatitude = duty.lastLatitude ?? latestPing?.latitude ?? opsTrip?.gpsLat ?? null
  const lastLongitude = duty.lastLongitude ?? latestPing?.longitude ?? opsTrip?.gpsLng ?? null
  const lastPositionAt =
    duty.lastPositionAt ?? latestPing?.recordedAt ?? null

  const mapVehicle: LiveDispatchVehicle | null =
    lastLatitude != null && lastLongitude != null
      ? {
          dutyId: duty.id,
          reference: duty.reference,
          status: duty.status,
          routeName: duty.route?.name ?? null,
          driverId: duty.driver?.id ?? null,
          driverName: duty.driver
            ? `${duty.driver.firstName} ${duty.driver.lastName}`
            : null,
          vehicleRegistration: duty.vehicle?.registrationNumber ?? null,
          lastLatitude,
          lastLongitude,
          lastPositionAt,
          staleMinutes: null,
          isStale: false,
          staleThresholdMinutes: 10,
          nextStop: null,
          routeTotalStops: stops.length,
          routeCompletedStops: checkpoints.filter((c) => c.arrivedAt).length,
          routeProgressPercent:
            stops.length > 0
              ? Math.round(
                  (checkpoints.filter((c) => c.arrivedAt).length / stops.length) * 100,
                )
              : null,
        }
      : null

  const routeFromStops: [number, number][] = stops
    .filter((s) => s.longitude != null && s.latitude != null)
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((s) => [s.longitude!, s.latitude!])

  /** Fallback when duty.route.stops is empty but ops jobs carry coordinates. */
  const routeFromJobs: [number, number][] = (() => {
    if (routeFromStops.length || !opsTrip?.jobs?.length) return []
    const coords: [number, number][] = []
    const jobs = [...opsTrip.jobs].sort((a, b) => a.sequence - b.sequence)
    for (const job of jobs) {
      if (job.pickupLongitude != null && job.pickupLatitude != null) {
        coords.push([job.pickupLongitude, job.pickupLatitude])
      }
    }
    const school = jobs.find((j) => j.dropoffLongitude != null && j.dropoffLatitude != null)
    if (school) coords.push([school.dropoffLongitude!, school.dropoffLatitude!])
    return coords
  })()

  const routeCoordinates = routeFromStops.length ? routeFromStops : routeFromJobs
  const pingCoordinates: [number, number][] = pings.map((p) => [p.longitude, p.latitude])

  const stopMarkers: MapStopMarker[] = (() => {
    if (stops.some((s) => s.latitude != null && s.longitude != null)) {
      return stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map((s) => {
          const drop = /drop|school|destination|hub|centre|center|primary|academy/i.test(
            `${s.name ?? ''} ${s.address ?? ''}`,
          )
          return {
            id: s.id,
            latitude: s.latitude!,
            longitude: s.longitude!,
            label: s.name || (drop ? 'Drop-off' : 'Pickup'),
            kind: drop ? ('dropoff' as const) : ('pickup' as const),
            order: s.stopOrder,
          }
        })
    }
    if (!opsTrip?.jobs?.length) return []
    const markers: MapStopMarker[] = []
    const jobs = [...opsTrip.jobs].sort((a, b) => a.sequence - b.sequence)
    jobs.forEach((job, index) => {
      if (job.pickupLatitude != null && job.pickupLongitude != null) {
        markers.push({
          id: `${job.id}-pickup`,
          latitude: job.pickupLatitude,
          longitude: job.pickupLongitude,
          label: `Pick up — ${job.passengerName}`,
          kind: 'pickup',
          order: index + 1,
        })
      }
    })
    const school = jobs.find((j) => j.dropoffLatitude != null && j.dropoffLongitude != null)
    if (school) {
      markers.push({
        id: `${school.id}-dropoff`,
        latitude: school.dropoffLatitude!,
        longitude: school.dropoffLongitude!,
        label: `Drop off — ${school.dropoffAddress}`,
        kind: 'dropoff',
        order: markers.length + 1,
      })
    }
    return markers
  })()

  return (
    <div className="space-y-6">
      <div>
        <Link to="/runs" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to runs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{duty.reference}</h1>
        <p className="text-sm text-slate-600">{duty.route?.name ?? 'No route assigned'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Status" value={duty.status.replace(/_/g, ' ')} />
        <InfoCard label="Date" value={new Date(duty.dutyDate).toLocaleDateString('en-GB')} />
        <InfoCard label="Start" value={formatDutyClock(duty.startTime)} />
        <InfoCard label="End" value={formatDutyClock(duty.endTime)} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {RUN_TABS.filter((t) => (t === 'Change history' ? Boolean(opsTrip) : true)).map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={cn(
              'shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium',
              tab === label
                ? 'border border-b-0 border-slate-200 bg-white text-command-700'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Assignment">
            <dl className="space-y-2 text-sm">
              <DetailRow
                label="Driver"
                value={
                  duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : 'Unassigned'
                }
              />
              <DetailRow label="Vehicle" value={duty.vehicle?.registrationNumber ?? 'Unassigned'} />
              {duty.passengerAssistant && (
                <DetailRow
                  label="Passenger assistant"
                  value={`${duty.passengerAssistant.firstName} ${duty.passengerAssistant.lastName}`}
                />
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <ManageAssignmentButton dutyId={duty.id} duty={duty} />
              {opsTrip && (
                <>
                  <button
                    type="button"
                    onClick={() => setTab('Journey sequence')}
                    className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-sm font-medium text-command-800 hover:bg-command-100"
                  >
                    Reorganise journey sequence
                  </button>
                  <Link
                    to={`/live-operations/trips/${opsTrip.id}?tab=journey`}
                    className="text-sm font-medium text-command-600 hover:underline"
                  >
                    Open trip workspace →
                  </Link>
                </>
              )}
              <Link to="/dispatch" className="text-sm font-medium text-command-600 hover:underline">
                Open dispatch →
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="Notes">
            <p className="text-sm text-slate-600">{duty.notes ?? 'No notes recorded.'}</p>
          </SectionCard>
        </div>
      )}

      {tab === 'Journey sequence' && (
        <JourneySequencePanel tripId={opsTrip?.id ?? null} duty={duty} initialTrip={opsTrip} />
      )}

      {tab === 'Route map' && (
        <SectionCard title="Route map" description="Planned stops and GPS trail" flush>
          <LiveVehicleMap
            vehicles={mapVehicle ? [mapVehicle] : []}
            routeLine={routeCoordinates}
            trailLine={pingCoordinates}
            stopMarkers={stopMarkers}
            className="h-80"
            edgeToEdge
            selectedDutyId={duty.id}
            selectedVehicle={mapVehicle}
          />
        </SectionCard>
      )}

      {tab === 'Stops' && (
        <SectionCard title="Stops / trips" description={`${stops.length} stops on this run`}>
          {stops.length === 0 ? (
            <p className="text-sm text-slate-500">No stops defined for this route.</p>
          ) : (
            <ol className="space-y-2">
              {stops
                .slice()
                .sort((a, b) => a.stopOrder - b.stopOrder)
                .map((stop) => {
                  const checkpoint = checkpoints.find((c) => c.routeStopId === stop.id)
                  return (
                    <li
                      key={stop.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {stop.stopOrder}
                      </span>
                      <div className="flex-1">
                        <Link
                          to={`/trips/${stop.id}?run=${duty.id}`}
                          className="font-medium text-command-600 hover:underline"
                        >
                          {stop.name}
                        </Link>
                        {stop.address && (
                          <p className="mt-0.5 text-xs text-slate-500">{stop.address}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-500">
                          {stop.pickupTime && `Pickup ${stop.pickupTime}`}
                          {stop.pickupTime && stop.dropoffTime && ' · '}
                          {stop.dropoffTime && `Drop-off ${stop.dropoffTime}`}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          checkpoint?.arrivedAt
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {checkpoint?.arrivedAt ? 'Arrived' : 'Pending'}
                      </span>
                    </li>
                  )
                })}
            </ol>
          )}
        </SectionCard>
      )}

      {tab === 'Change history' && opsTrip && <AssignmentHistoryPanel tripId={opsTrip.id} />}
    </div>
  )
}

function formatDutyClock(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    if (value.includes('T')) {
      return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
    return value.slice(0, 5)
  } catch {
    return value
  }
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
