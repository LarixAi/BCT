import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useDriverOnboardingData(driverId?: string) {
  const driverQuery = useQuery({
    queryKey: ['driver-profile', driverId],
    queryFn: () => api.getDriverProfile(driverId!),
    enabled: Boolean(driverId),
  })

  const depotsQuery = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
  })

  return {
    driver: driverQuery.data,
    driverLoading: Boolean(driverId) && driverQuery.isLoading,
    depots: depotsQuery.data ?? [],
  }
}
