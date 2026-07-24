import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { buildSafeOpsDashboard } from '@/lib/api/safe-ops-dashboard'
import type { OpsDashboardModel } from '@/lib/ops/ops-dashboard'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const REFETCH_MS = 45_000

export function useOpsDashboard(depotId?: string) {
  const yardDepot = depotId && depotId !== 'all' ? depotId : undefined

  const results = useQueries({
    queries: [
      {
        queryKey: tKey(['dashboard']),
        queryFn: () => api.getDashboard(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['live-dispatch', 'active']),
        queryFn: () => api.getLiveDispatch(undefined, 'active'),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['duties', 'today']),
        queryFn: () => api.getDuties(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['yard-hub', yardDepot ?? 'default']),
        queryFn: () => api.getYardHub(yardDepot),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['checks-hub']),
        queryFn: () => api.getChecksHub(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['defects-hub']),
        queryFn: () => api.getDefectsHub(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['driver-directory-summary']),
        queryFn: () => api.getDriverDirectorySummary(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['vehicle-directory-summary']),
        queryFn: () => api.getVehicleDirectorySummary(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['driver-eligibility-exceptions']),
        queryFn: () => api.getDriverEligibilityExceptions(),
        refetchInterval: REFETCH_MS,
      },
      {
        queryKey: tKey(['vehicle-release-exceptions']),
        queryFn: () => api.getVehicleReleaseExceptions(),
        refetchInterval: REFETCH_MS,
      },
    ],
  })

  const [
    dashboardQ,
    liveQ,
    dutiesQ,
    yardQ,
    checksQ,
    defectsQ,
    driversSummaryQ,
    vehiclesSummaryQ,
    driverExceptionsQ,
    vehicleExceptionsQ,
  ] = results

  const isLoading = results.some((r) => r.isLoading)
  const isError = results.every((r) => r.isError)
  const error = results.find((r) => r.error)?.error

  const model: OpsDashboardModel | null = useMemo(() => {
    // Build as soon as any useful data arrives; safe defaults fill gaps
    if (isLoading && !dashboardQ.data && !dutiesQ.data && !yardQ.data) return null
    return buildSafeOpsDashboard({
      dashboard: dashboardQ.data,
      live: liveQ.data,
      duties: dutiesQ.data,
      yard: yardQ.data,
      checks: checksQ.data,
      defects: defectsQ.data,
      driversSummary: driversSummaryQ.data,
      vehiclesSummary: vehiclesSummaryQ.data,
      driverExceptions: driverExceptionsQ.data,
      vehicleExceptions: vehicleExceptionsQ.data,
    })
  }, [
    isLoading,
    dashboardQ.data,
    liveQ.data,
    dutiesQ.data,
    yardQ.data,
    checksQ.data,
    defectsQ.data,
    driversSummaryQ.data,
    vehiclesSummaryQ.data,
    driverExceptionsQ.data,
    vehicleExceptionsQ.data,
  ])

  return {
    model,
    isLoading: isLoading && !model,
    isError: isError && !model,
    error,
    connectionStatus: model?.syncHealth.connectionStatus ?? 'live',
  }
}
