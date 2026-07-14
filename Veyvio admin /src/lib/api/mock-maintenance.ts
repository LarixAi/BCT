import { buildMaintenanceHub } from '@/lib/maintenance/aggregate'
import type { MaintenanceHubData } from '@/lib/maintenance/types'
import { mockVehiclesApi } from './mock-vehicles'

export const mockMaintenanceApi = {
  hub(): MaintenanceHubData {
    return buildMaintenanceHub(mockVehiclesApi.list())
  },
}
