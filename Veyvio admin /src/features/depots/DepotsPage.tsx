import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function DepotsPage() {
  const { data: depots = [], isLoading } = useQuery({
    queryKey: ['depots'],
    queryFn: () => api.getDepots(),
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.getDrivers(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Depots</h1>
        <p className="text-sm text-slate-600">Operational depots — fleet and driver home bases</p>
      </div>

      <SectionCard title="Depot register">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {depots.map((depot) => {
              const driverCount = drivers.filter((d) => d.depotId === depot.id).length
              const vehicleCount = vehicles.filter((v) => v.depotId === depot.id).length
              return (
                <div key={depot.id} className="rounded-xl border border-slate-200 p-4">
                  <h2 className="font-semibold text-slate-900">{depot.name}</h2>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Drivers</dt>
                      <dd className="font-medium">{driverCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Vehicles</dt>
                      <dd className="font-medium">{vehicleCount}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
