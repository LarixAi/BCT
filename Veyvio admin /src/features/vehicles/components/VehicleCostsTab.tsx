import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { normalizeAdBlueRecords } from '@/lib/adblue/normalize'
import { resolveFleetResourcesHub } from '@/lib/fleet-resources/resolve-hub'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { VehicleVorEpisodeCard } from './VehicleVorEpisodeCard'
import { VehicleFuelCostsPanel } from '@/features/fleet-resources/VehicleFuelCostsPanel'
import { api } from '@/lib/api/client'

function money(value: number) {
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function VehicleCostsTab({ vehicle }: { vehicle: VehicleProfile }) {
  const { data: adblueRaw = [] } = useQuery({
    queryKey: ['vehicle-adblue', vehicle.id],
    queryFn: () => api.getVehicleAdBlueRecords(vehicle.id),
  })
  const { data: fleet } = useQuery({
    queryKey: ['fleet-resources-hub'],
    queryFn: () =>
      resolveFleetResourcesHub({
        fetchLiveHub: () => api.getFleetResourcesHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })

  const adblue = normalizeAdBlueRecords(adblueRaw)
  const hubCosts = fleet?.hub?.vehicleCosts.find((v) => v.vehicleId === vehicle.id)
  const transactions = (fleet?.hub?.transactions ?? []).filter((t) => t.vehicleId === vehicle.id)

  const vorCost = vehicle.vorRecords.reduce((sum, v) => sum + (v.totalCost ?? 0), 0)
  const woLabour = vehicle.workOrders.reduce((sum, w) => sum + (w.labourCost ?? 0), 0)
  const woParts = vehicle.workOrders.reduce((sum, w) => sum + (w.partsCost ?? 0), 0)
  const woTotal = vehicle.workOrders.reduce((sum, w) => sum + (w.actualCost ?? w.estimatedCost ?? 0), 0)
  const adblueCost = adblue.reduce((sum, row) => sum + (row.cost ?? 0), 0)
  const fuelSpend = hubCosts?.fuelSpend ?? 0
  const fluidSpend = hubCosts?.fluidSpend ?? adblueCost
  const lifetime = vorCost + woTotal + fuelSpend + fluidSpend + adblueCost

  const daysInFleet = Math.max(
    1,
    Math.ceil((Date.now() - new Date(vehicle.dateAddedToFleet).getTime()) / 86_400_000),
  )
  const costPerDay = lifetime / daysInFleet
  const costPerMile =
    vehicle.mileage && vehicle.mileage > 0 ? lifetime / vehicle.mileage : hubCosts?.costPerMile ?? null

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthSpend = transactions
    .filter((t) => new Date(t.createdAt).getTime() >= monthStart.getTime())
    .reduce((sum, t) => sum + (t.grossAmount ?? 0), 0)

  const breakdown = useMemo(() => {
    const rows = [
      { id: 'fuel', label: 'Fuel (diesel / petrol)', amount: fuelSpend },
      { id: 'maintenance', label: 'Maintenance / repairs', amount: woTotal + vorCost },
      { id: 'labour', label: 'Labour (WO)', amount: woLabour },
      { id: 'parts', label: 'Parts (WO)', amount: woParts },
      {
        id: 'adblue',
        label: 'AdBlue (not fuel)',
        amount: Math.max(adblueCost, fluidSpend > 0 && adblueCost === 0 ? fluidSpend : adblueCost),
      },
    ].filter((r) => r.amount > 0)
    const total = rows.reduce((s, r) => s + r.amount, 0) || 1
    return rows.map((r) => ({ ...r, pct: Math.round((r.amount / total) * 100) }))
  }, [fuelSpend, woTotal, vorCost, woLabour, woParts, adblueCost, fluidSpend])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Lifetime cost" value={money(lifetime)} />
        <Kpi label="Cost this month" value={money(monthSpend)} />
        <Kpi
          label="Cost per mile"
          value={costPerMile != null ? `£${costPerMile.toFixed(2)}` : '—'}
        />
        <Kpi label="Cost per day" value={money(costPerDay)} />
      </div>

      <SectionCard title="Cost breakdown" description="Running cost mix for this vehicle">
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No cost records yet.</p>
        ) : (
          <ul className="space-y-3">
            {breakdown.map((row) => (
              <li key={row.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{row.label}</span>
                  <span className="tabular-nums text-slate-600">
                    {money(row.amount)} · {row.pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-command-500" style={{ width: `${row.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Recent transactions" description="Ledger lines from Fleet Resources">
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No ledger transactions for this vehicle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Qty</th>
                  <th className="pb-2 pr-3 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Odometer</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 12).map((t) => (
                  <tr key={t.id} className="border-b border-slate-50">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="py-2 pr-3">{t.resourceName}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {t.quantity}
                      {t.unit}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {t.grossAmount != null ? money(t.grossAmount) : '—'}
                    </td>
                    <td className="py-2 tabular-nums">
                      {t.odometer != null ? t.odometer.toLocaleString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {vehicle.vorRecords.map((vor) => (
        <VehicleVorEpisodeCard key={vor.id} record={vor} />
      ))}

      <VehicleFuelCostsPanel
        vehicleId={vehicle.id}
        registrationNumber={vehicle.registrationNumber}
        fuelLevelPercent={vehicle.fuelLevelPercent}
      />
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}
