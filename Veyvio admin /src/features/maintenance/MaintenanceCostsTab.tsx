import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { MaintenanceIntelligence } from '@/lib/maintenance/intelligence'

export function MaintenanceCostsTab({ intelligence }: { intelligence: MaintenanceIntelligence }) {
  const { plannedVsUnplanned } = intelligence
  const total = plannedVsUnplanned.planned + plannedVsUnplanned.unplanned

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Planned maintenance" value={`£${plannedVsUnplanned.planned.toLocaleString()}`} />
        <MetricCard label="Unplanned repairs" value={`£${plannedVsUnplanned.unplanned.toLocaleString()}`} />
        <MetricCard label="Warranty savings" value={`£${intelligence.warrantySavings.toLocaleString()}`} />
        <MetricCard
          label="Planned share"
          value={total > 0 ? `${Math.round((plannedVsUnplanned.planned / total) * 100)}%` : '—'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Fleet avg cost / mile"
          value={
            intelligence.fleetAvgCostPerMile != null
              ? `£${intelligence.fleetAvgCostPerMile.toFixed(2)}`
              : '—'
          }
        />
        <MetricCard label="Unplanned share" value={`${intelligence.unplannedSharePercent}%`} />
      </div>

      <SectionCard
        title="Cost alerts"
        description="Vehicles and patterns needing cost attention — predictive shell, not a forecast model"
      >
        {intelligence.costAlerts.length === 0 ? (
          <p className="text-sm text-slate-500">No cost alerts on the current fleet snapshot.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {intelligence.costAlerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-slate-900">{alert.registration}</p>
                  <p className="text-amber-950">{alert.message}</p>
                </div>
                <Link to={alert.href} className="text-xs font-medium text-command-600 hover:underline">
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Cost per mile" description="Maintenance spend relative to vehicle mileage">
        {intelligence.maintenanceCostPerMile.length === 0 ? (
          <p className="text-sm text-slate-500">Insufficient mileage data.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3 font-medium">Vehicle</th>
                <th className="pb-2 font-medium">Cost / mile</th>
              </tr>
            </thead>
            <tbody>
              {intelligence.maintenanceCostPerMile.map((row) => (
                <tr key={row.vehicleId} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <Link to={`/vehicles/${row.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                      {row.registration}
                    </Link>
                  </td>
                  <td className="py-2">£{row.costPerMile?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="High-cost vehicles" description="Vehicles approaching replacement threshold">
        {intelligence.highCostVehicles.length === 0 ? (
          <p className="text-sm text-slate-500">No vehicles above 50% of replacement threshold.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {intelligence.highCostVehicles.map((v) => (
              <li key={v.vehicleId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <Link to={`/vehicles/${v.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                  {v.registration}
                </Link>
                <span className="text-slate-600">
                  £{v.totalCost.toLocaleString()} / £{v.threshold.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Repeat defect categories" description="Open defects grouped by category">
        <ul className="space-y-2 text-sm">
          {intelligence.repeatDefectCategories.map((c) => (
            <li key={c.category} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="font-medium capitalize">{c.category}</span>
              <span className="text-slate-600">{c.vehicles.join(', ')}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Supplier performance">
        <ul className="space-y-2 text-sm">
          {intelligence.supplierScores.map((s) => (
            <li key={s.supplierId} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span>{s.name}</span>
              <span className="font-medium">{s.score}%</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  )
}
