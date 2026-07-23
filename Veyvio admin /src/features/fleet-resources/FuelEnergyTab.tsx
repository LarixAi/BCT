import { Link } from 'react-router-dom'
import { filterFuelTransactions } from '@/lib/fleet-resources/aggregate'
import {
  TRANSACTION_STATUS_LABEL,
  TRANSACTION_TYPE_LABEL,
} from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'missing_receipt', label: 'Missing receipt' },
  { id: 'anomaly', label: 'Anomalies' },
  { id: 'pending', label: 'Pending / queried' },
] as const

export function FuelEnergyTab({
  hub,
  filter,
  onFilter,
  search,
  onSearch,
}: {
  hub: FleetResourcesHubData
  filter: string
  onFilter: (next: string) => void
  search: string
  onSearch: (next: string) => void
}) {
  const rows = filterFuelTransactions(hub.transactions, filter, search)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Fuel & energy register</h2>
        <p className="text-sm text-ink-soft">
          Top-ups linked to vehicle, driver, odometer and receipt evidence.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.id
                ? 'bg-command-600 text-white'
                : 'border border-border text-ink-soft hover:bg-surface-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search reg, driver, site…"
          className="ml-auto min-w-[200px] flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Driver</th>
              <th className="px-3 py-2">Odo</th>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted">
                  No fuel transactions match this view.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2 text-ink-soft">
                    {new Date(t.createdAt).toLocaleString()}
                    <div className="text-xs text-muted">
                      {TRANSACTION_TYPE_LABEL[t.transactionType]}
                    </div>
                  </td>
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
                  <td className="px-3 py-2 tabular-nums">
                    {t.grossAmount != null ? `£${t.grossAmount.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2">{t.driverName ?? t.staffName ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {t.odometer != null ? t.odometer.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {t.receiptFileName ? (
                      <span className="text-emerald-700">{t.receiptFileName}</span>
                    ) : (
                      <span className="text-amber-800">Missing</span>
                    )}
                    {t.anomalyFlags.length > 0 && (
                      <div className="text-xs text-red-700">{t.anomalyFlags.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{TRANSACTION_STATUS_LABEL[t.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
