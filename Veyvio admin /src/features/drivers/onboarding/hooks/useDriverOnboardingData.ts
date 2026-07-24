import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function useDriverOnboardingData(driverId?: string) {
  const driverQuery = useQuery({
    queryKey: tKey(['driver-profile', driverId]),
    queryFn: () => api.getDriverProfile(driverId!),
    enabled: Boolean(driverId),
  })

  const depotsQuery = useQuery({
    queryKey: tKey(['depots']),
    queryFn: () => api.getDepots(),
  })

  return {
    driver: driverQuery.data,
    driverLoading: Boolean(driverId) && driverQuery.isLoading,
    depots: depotsQuery.data ?? [],
  }
}
