import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LiveVehicleMap } from '@/components/map/LiveVehicleMap'
import { SectionCard } from '@/components/ui'
import { AssignmentHistoryPanel } from '@/features/transfers/AssignmentHistoryPanel'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { api } from '@/lib/api/client'
import type { LiveDispatchVehicle } from '@/lib/api/types'

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: opsTrip } = useQuery({
    queryKey: ['operational-trip-by-duty', id],
    queryFn: () => api.getOperationalTripByDuty(id!),
    enabled: !!id,
  })

  const { data: duty, isLoading, error, isError } = useQuery({
    queryKey: ['duty', id],
    queryFn: () => api.getDuty(id!),
    enabled: !!id,
  })

  const { data: track } = useQuery({
    queryKey: ['duty-track', id],
    queryFn: () => api.getDutyTrack(id!),
    enabled: !!id,
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

  const mapVehicle: LiveDispatchVehicle | null =
    duty.lastLatitude != null && duty.lastLongitude != null
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
          lastLatitude: duty.lastLatitude,
          lastLongitude: duty.lastLongitude,
          lastPositionAt: duty.lastPositionAt ?? null,
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

  const routeCoordinates: [number, number][] = stops
    .filter((s) => s.longitude != null && s.latitude != null)
    .sort((a, b) => a.stopOrder - b.stopOrder)
    .map((s) => [s.longitude!, s.latitude!])

  const pingCoordinates: [number, number][] = pings.map((p) => [p.longitude, p.latitude])

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
        <InfoCard label="Start" value={duty.startTime ?? '—'} />
        <InfoCard label="End" value={duty.endTime ?? '—'} />
      </div>

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
            <ManageAssignmentButton dutyId={duty.id} />
            {opsTrip && (
              <Link
                to={`/ops-trips/${opsTrip.id}`}
                className="text-sm font-medium text-command-600 hover:underline"
              >
                View operational trip →
              </Link>
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

      <SectionCard title="Route map" description="Planned stops and GPS trail" flush>
        <LiveVehicleMap
          vehicles={mapVehicle ? [mapVehicle] : []}
          routeLine={routeCoordinates}
          trailLine={pingCoordinates}
          className="h-80"
          edgeToEdge
          selectedDutyId={duty.id}
          selectedVehicle={mapVehicle}
        />
      </SectionCard>

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

      {opsTrip && <AssignmentHistoryPanel tripId={opsTrip.id} />}
    </div>
  )
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
