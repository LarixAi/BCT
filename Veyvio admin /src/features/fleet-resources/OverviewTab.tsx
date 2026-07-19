import { Link } from 'react-router-dom'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

const severityClass = {
  critical: 'border-red-200 bg-red-50 text-red-950',
  high: 'border-amber-200 bg-amber-50 text-amber-950',
  medium: 'border-slate-200 bg-slate-50 text-slate-900',
  low: 'border-slate-200 bg-white text-slate-700',
} as const

export function OverviewTab({
  hub,
  onOpenFilter,
}: {
  hub: FleetResourcesHubData
  onOpenFilter: (tab: string, filter?: string) => void
}) {
  const s = hub.summary
  const cards = [
    { label: 'Missing receipts', value: s.missingReceipts, tab: 'fuel', filter: 'missing_receipt' },
    { label: 'Fuel anomalies', value: s.suspectedCardMisuse, tab: 'fuel', filter: 'anomaly' },
    { label: 'Tyres needing attention', value: s.tyresNeedingAttention, tab: 'tyres' },
    { label: 'Missing equipment', value: s.missingEquipment, tab: 'equipment' },
    { label: 'Low depot stock', value: s.lowDepotStock, tab: 'stock' },
    { label: 'Unapproved purchases', value: s.unapprovedPurchases, tab: 'purchasing' },
    { label: 'Cards blocked', value: s.resourceBlocks, tab: 'cards' },
    { label: 'Spend this month', value: `£${s.spendThisMonth.toFixed(0)}`, tab: 'costs' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onOpenFilter(c.tab, c.filter)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-command-300 hover:bg-slate-50"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{c.value}</p>
          </button>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Needs attention</h2>
        <p className="text-sm text-slate-600">Exceptions before routine — resolve these before the next shift peak.</p>
        {hub.alerts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No resource exceptions open.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {hub.alerts.slice(0, 12).map((a) => (
              <li key={a.id}>
                <Link
                  to={a.href}
                  className={`block rounded-xl border px-4 py-3 ${severityClass[a.severity]}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{a.title}</p>
                    {a.registrationNumber && (
                      <span className="font-semibold tabular-nums">{a.registrationNumber}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm opacity-90">{a.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
