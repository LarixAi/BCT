import { Link } from 'react-router-dom'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

export function CostsTab({ hub }: { hub: FleetResourcesHubData }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Operating costs</h2>
        <p className="text-sm text-ink-soft">
          Fuel, fluids and linked ledger spend by vehicle. Maintenance labour stays in Maintenance.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Spend this month</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            £{hub.summary.spendThisMonth.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Avg resource cost / vehicle (proxy)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {hub.summary.costPerMileThisMonth != null
              ? `£${hub.summary.costPerMileThisMonth.toFixed(2)}`
              : '—'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Depot</th>
              <th className="px-3 py-2">Fuel</th>
              <th className="px-3 py-2">Fluids</th>
              <th className="px-3 py-2">Other</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">£ / 1k mi</th>
            </tr>
          </thead>
          <tbody>
            {hub.vehicleCosts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted">
                  No vehicle cost rows yet.
                </td>
              </tr>
            ) : (
              hub.vehicleCosts.map((v) => (
                <tr key={v.vehicleId} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link
                      to={`/vehicles/${v.vehicleId}`}
                      className="font-semibold tabular-nums text-command-700 hover:underline"
                    >
                      {v.registrationNumber}
                    </Link>
                    {v.fleetNumber && (
                      <div className="text-xs text-muted">{v.fleetNumber}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{v.depot}</td>
                  <td className="px-3 py-2 tabular-nums">£{v.fuelSpend.toFixed(2)}</td>
                  <td className="px-3 py-2 tabular-nums">£{v.fluidSpend.toFixed(2)}</td>
                  <td className="px-3 py-2 tabular-nums">£{v.otherSpend.toFixed(2)}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">£{v.totalSpend.toFixed(2)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {v.costPerMile != null ? `£${v.costPerMile.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
