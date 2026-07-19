import {
  INTEGRATION_CATEGORY_LABEL,
  INTEGRATION_STATUS_LABEL,
} from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'

export function IntegrationsTab({ hub }: { hub: FleetResourcesHubData }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Integrations</h2>
        <p className="text-sm text-slate-600">
          Phase 4 stubs — connect fuel cards, telematics, accounting, suppliers, EV and depot dispensers.
          Live syncs write into the same resource ledger.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {hub.integrations.map((i) => (
          <article key={i.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {INTEGRATION_CATEGORY_LABEL[i.category]}
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-slate-900">{i.provider}</h3>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  i.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-800'
                    : i.status === 'error'
                      ? 'bg-red-50 text-red-800'
                      : i.status === 'configured'
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {INTEGRATION_STATUS_LABEL[i.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{i.notes}</p>
            <p className="mt-2 text-xs text-slate-500">
              Last sync:{' '}
              {i.lastSyncAt ? new Date(i.lastSyncAt).toLocaleString() : 'Not connected yet'}
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {i.status === 'available' ? 'Configure (stub)' : 'Manage (stub)'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
