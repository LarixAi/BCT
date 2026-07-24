import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { MapStopMarker } from '@/components/map/LiveVehicleMap'
import { RunWorkspacePage, type RunWorkspaceTab } from '@/features/runs/RunWorkspacePage'
import { api } from '@/lib/api/client'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const VALID_TABS: RunWorkspaceTab[] = [
  'overview',
  'trips',
  'timeline-duty',
  'driver',
  'vehicle',
  'crew',
  'breaks',
  'messages',
  'exceptions',
  'timeline',
]

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = VALID_TABS.includes(tabParam as RunWorkspaceTab) ? (tabParam as RunWorkspaceTab) : undefined

  const { data: opsTrip } = useQuery({
    queryKey: tKey(['operational-trip-by-duty', id]),
    queryFn: () => api.getOperationalTripByDuty(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: allTrips = [] } = useQuery({
    queryKey: tKey(['operational-trips']),
    queryFn: () => api.getOperationalTrips(),
  })

  const tripsOnRun = useMemo(
    () => allTrips.filter((t) => t.dutyId === id),
    [allTrips, id],
  )

  const { data: duty, isLoading, error, isError } = useQuery({
    queryKey: tKey(['duty', id]),
    queryFn: () => api.getDuty(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: track } = useQuery({
    queryKey: tKey(['duty-track', id]),
    queryFn: () => api.getDutyTrack(id!),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
  })

  const mapData = useMemo(() => {
    if (!duty) {
      return {
        mapVehicle: null as LiveDispatchVehicle | null,
        routeCoordinates: [] as [number, number][],
        pingCoordinates: [] as [number, number][],
        stopMarkers: [] as MapStopMarker[],
      }
    }

    const stops = duty.route?.stops ?? track?.duty.route?.stops ?? []
    const checkpoints = track?.checkpoints ?? []
    const pings = track?.pings ?? []
    const latestPing = pings[0] ?? null
    const lastLatitude = duty.lastLatitude ?? latestPing?.latitude ?? opsTrip?.gpsLat ?? null
    const lastLongitude = duty.lastLongitude ?? latestPing?.longitude ?? opsTrip?.gpsLng ?? null
    const lastPositionAt = duty.lastPositionAt ?? latestPing?.recordedAt ?? null

    const mapVehicle: LiveDispatchVehicle | null =
      lastLatitude != null && lastLongitude != null
        ? {
            dutyId: duty.id,
            reference: duty.reference,
            status: duty.status,
            routeName: duty.route?.name ?? null,
            driverId: duty.driver?.id ?? null,
            driverName: duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : null,
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
                ? Math.round((checkpoints.filter((c) => c.arrivedAt).length / stops.length) * 100)
                : null,
          }
        : null

    const routeFromStops: [number, number][] = stops
      .filter((s) => s.longitude != null && s.latitude != null)
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((s) => [s.longitude!, s.latitude!])

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

    return { mapVehicle, routeCoordinates, pingCoordinates, stopMarkers }
  }, [duty, track, opsTrip])

  if (isLoading) {
    return <p className="text-sm text-muted">Loading run…</p>
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

  return (
    <RunWorkspacePage
      duty={duty}
      trips={tripsOnRun}
      opsTrip={opsTrip ?? null}
      track={track}
      mapVehicle={mapData.mapVehicle}
      routeCoordinates={mapData.routeCoordinates}
      pingCoordinates={mapData.pingCoordinates}
      stopMarkers={mapData.stopMarkers}
      tab={tab}
      onTabChange={(next) => {
        const nextParams = new URLSearchParams(searchParams)
        if (next === 'overview') nextParams.delete('tab')
        else nextParams.set('tab', next)
        setSearchParams(nextParams, { replace: true })
      }}
    />
  )
}
