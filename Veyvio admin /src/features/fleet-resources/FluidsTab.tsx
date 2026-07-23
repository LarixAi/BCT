import { Link } from 'react-router-dom'
import { filterFluidTransactions } from '@/lib/fleet-resources/aggregate'
import { TRANSACTION_STATUS_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'
import { useState } from 'react'

export function FluidsTab({ hub }: { hub: FleetResourcesHubData }) {
  const [search, setSearch] = useState('')
  const rows = filterFluidTransactions(hub.transactions, search)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Fluids & AdBlue</h2>
          <p className="text-sm text-ink-soft">
            AdBlue and other fluids — not diesel or petrol. Fuel purchases stay on the Fuel tab.
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reg, fluid, depot…"
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Depot</th>
              <th className="px-3 py-2">Linked WO</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 text-ink-soft">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium">{t.resourceName}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">
                  {t.vehicleId ? (
                    <Link to={`/vehicles/${t.vehicleId}`} className="text-command-700 hover:underline">
                      {t.registrationNumber}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {t.quantity}
                  {t.unit}
                </td>
                <td className="px-3 py-2">{t.depotName ?? '—'}</td>
                <td className="px-3 py-2">
                  {t.workOrderId ? (
                    <Link to="/maintenance?tab=work-orders" className="text-command-700 hover:underline">
                      {t.workOrderId}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">{TRANSACTION_STATUS_LABEL[t.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
