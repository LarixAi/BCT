import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { resolveFleetResourcesHub } from '@/lib/fleet-resources/resolve-hub'
import { api } from '@/lib/api/client'

export function VehicleFuelCostsPanel({
  vehicleId,
  registrationNumber,
  fuelLevelPercent,
}: {
  vehicleId: string
  registrationNumber: string
  fuelLevelPercent: number | null
}) {
  const { data } = useQuery({
    queryKey: ['fleet-resources-hub'],
    queryFn: () =>
      resolveFleetResourcesHub({
        fetchLiveHub: () => api.getFleetResourcesHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })

  const hub = data?.hub
  const vehicleCosts = Array.isArray(hub?.vehicleCosts) ? hub.vehicleCosts : []
  const transactions = Array.isArray(hub?.transactions) ? hub.transactions : []
  const costs = vehicleCosts.find((v) => v.vehicleId === vehicleId)
  const recent = transactions.filter((t) => t.vehicleId === vehicleId).slice(0, 4)

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Fuel & costs</h2>
          <p className="text-sm text-slate-600">
            Diesel/petrol spend for {registrationNumber}
            {fuelLevelPercent != null ? ` · fuel tank ${fuelLevelPercent}%` : ''}
            . AdBlue is tracked separately under fluids.
          </p>
        </div>
        <Link
          to="/fleet-resources?tab=fuel"
          className="text-sm font-medium text-command-700 hover:underline"
        >
          Open fuel ledger →
        </Link>
      </div>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-slate-500">Fuel (diesel / petrol)</dt>
          <dd className="font-semibold tabular-nums">
            {costs ? `£${costs.fuelSpend.toFixed(2)}` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">AdBlue & fluids</dt>
          <dd className="font-semibold tabular-nums">
            {costs ? `£${costs.fluidSpend.toFixed(2)}` : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">£ / 1k mi</dt>
          <dd className="font-semibold tabular-nums">
            {costs?.costPerMile != null ? `£${costs.costPerMile.toFixed(2)}` : '—'}
          </dd>
        </div>
      </dl>

      {recent.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
          {recent.map((t) => (
            <li key={t.id} className="flex justify-between gap-2 text-slate-700">
              <span>
                {t.resourceName} · {t.quantity}
                {t.unit}
              </span>
              <span className="tabular-nums text-slate-500">
                {t.grossAmount != null ? `£${t.grossAmount.toFixed(2)}` : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
