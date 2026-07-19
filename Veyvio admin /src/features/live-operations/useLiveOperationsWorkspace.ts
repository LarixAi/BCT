import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { DutyRecord, LiveDispatchResponse, LiveDispatchVehicle } from '@/lib/api/types'
import { buildLiveOperations } from '@/lib/live/build-live-operations'
import type { LiveOperationsModel } from '@/lib/live/live-operations'

/** When live dispatch has no rows, still list duties — without inventing map coordinates. */
function dutiesAsLiveVehicles(duties: DutyRecord[], dateIso: string): LiveDispatchResponse {
  const active = duties.filter((d) =>
    ['planned', 'signed_on', 'in_progress', 'assigned', 'ready', 'passenger_boarded'].includes(d.status),
  )
  const vehicles: LiveDispatchVehicle[] = active.map((duty) => {
    const detail = duty as DutyRecord & {
      lastLatitude?: number | null
      lastLongitude?: number | null
      lastPositionAt?: string | null
    }
    const hasLiveGps =
      detail.lastLatitude != null &&
      detail.lastLongitude != null &&
      Number.isFinite(detail.lastLatitude) &&
      Number.isFinite(detail.lastLongitude)
    return {
      dutyId: duty.id,
      reference: duty.reference,
      status: duty.status,
      routeName: duty.route?.name ?? null,
      driverId: duty.driver?.id ?? null,
      driverName: duty.driver
        ? `${duty.driver.firstName} ${duty.driver.lastName}`.trim()
        : null,
      vehicleRegistration: duty.vehicle?.registrationNumber ?? null,
      lastLatitude: hasLiveGps ? detail.lastLatitude! : null,
      lastLongitude: hasLiveGps ? detail.lastLongitude! : null,
      lastPositionAt: hasLiveGps ? detail.lastPositionAt ?? null : null,
      staleMinutes: null,
      isStale: false,
      delayMinutes: null,
      plannedStartAt: duty.startTime ?? null,
      plannedEndAt: duty.endTime ?? null,
      staleThresholdMinutes: 10,
      nextStop: null,
      routeTotalStops: 0,
      routeCompletedStops: 0,
      routeProgressPercent: null,
    }
  })
  return {
    date: dateIso,
    generatedAt: new Date().toISOString(),
    trackingEnabled: true,
    vehicles,
  }
}

export function useLiveOperationsWorkspace(opts: {
  dateIso: string
  paused: boolean
  listTab: 'active' | 'completed'
}) {
  const refetchInterval = opts.paused ? false : 20_000

  const results = useQueries({
    queries: [
      {
        queryKey: ['live-dispatch', opts.dateIso, opts.listTab],
        queryFn: () => api.getLiveDispatch(opts.dateIso, opts.listTab),
        refetchInterval,
        retry: 1,
      },
      {
        queryKey: ['live-dispatch', opts.dateIso, 'completed'],
        queryFn: () => api.getLiveDispatch(opts.dateIso, 'completed'),
        refetchInterval: opts.paused ? false : 60_000,
        retry: 1,
      },
      {
        queryKey: ['duties', 'today-live', opts.dateIso],
        queryFn: () => api.getDuties({ date: opts.dateIso }),
        refetchInterval: opts.paused ? false : 45_000,
      },
      {
        queryKey: ['duties', 'all-fallback'],
        queryFn: () => api.getDuties(),
        refetchInterval: opts.paused ? false : 60_000,
      },
      {
        queryKey: ['dashboard'],
        queryFn: () => api.getDashboard(),
        refetchInterval: opts.paused ? false : 45_000,
      },
      {
        queryKey: ['driver-eligibility-exceptions'],
        queryFn: () => api.getDriverEligibilityExceptions(),
        refetchInterval: opts.paused ? false : 45_000,
      },
      {
        queryKey: ['vehicle-release-exceptions'],
        queryFn: () => api.getVehicleReleaseExceptions(),
        refetchInterval: opts.paused ? false : 45_000,
      },
    ],
  })

  const [liveQ, completedQ, dutiesQ, dutiesAllQ, dashboardQ, driverExQ, vehicleExQ] = results
  const isLoading = liveQ.isLoading && dutiesQ.isLoading && !liveQ.data && !dutiesQ.data
  const isError = liveQ.isError && dutiesQ.isError && dutiesAllQ.isError && !liveQ.data

  const livePayload = useMemo(() => {
    if (liveQ.data?.vehicles?.length) return liveQ.data
    const duties = (dutiesQ.data?.length ? dutiesQ.data : dutiesAllQ.data) ?? []
    if (duties.length) return dutiesAsLiveVehicles(duties, opts.dateIso)
    return (
      liveQ.data ?? {
        date: opts.dateIso,
        generatedAt: new Date().toISOString(),
        trackingEnabled: false,
        vehicles: [],
      }
    )
  }, [liveQ.data, dutiesQ.data, dutiesAllQ.data, opts.dateIso])

  const model: LiveOperationsModel | null = useMemo(() => {
    if (isLoading) return null
    return buildLiveOperations({
      live: livePayload,
      completedLive: completedQ.data,
      duties: dutiesQ.data ?? dutiesAllQ.data,
      dashboard: dashboardQ.data,
      driverExceptions: driverExQ.data,
      vehicleExceptions: vehicleExQ.data,
      paused: opts.paused,
    })
  }, [
    livePayload,
    completedQ.data,
    dutiesQ.data,
    dutiesAllQ.data,
    dashboardQ.data,
    driverExQ.data,
    vehicleExQ.data,
    opts.paused,
    isLoading,
  ])

  return {
    model,
    liveVehicles: livePayload.vehicles,
    dataUpdatedAt: liveQ.dataUpdatedAt || dutiesQ.dataUpdatedAt,
    isLoading,
    isError,
    error: liveQ.error ?? dutiesQ.error,
    refetch: () => {
      void liveQ.refetch()
      void completedQ.refetch()
      void dutiesQ.refetch()
      void dutiesAllQ.refetch()
      void dashboardQ.refetch()
    },
  }
}
