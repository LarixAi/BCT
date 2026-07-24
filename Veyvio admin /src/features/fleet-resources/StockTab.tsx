import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RESOURCE_CATEGORY_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const statusClass = {
  normal: 'text-emerald-700',
  low: 'text-amber-800',
  reorder: 'text-orange-800',
  out: 'text-red-700',
} as const

export function StockTab({ hub }: { hub: FleetResourcesHubData }) {
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const queryClient = useQueryClient()

  const receive = useMutation({
    mutationFn: (id: string) => api.receiveResourceTransfer(id, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tKey(['fleet-resources-hub']) }),
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-ink">Depot stock</h2>
        <p className="text-sm text-ink-soft">
          Levels move only through ledger transactions — purchases, issues, transfers and adjustments.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Depot</th>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Available</th>
              <th className="px-3 py-2">Reserved</th>
              <th className="px-3 py-2">Minimum</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {hub.stock.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2">{s.depotName}</td>
                <td className="px-3 py-2 font-medium">{s.resourceName}</td>
                <td className="px-3 py-2">{RESOURCE_CATEGORY_LABEL[s.category]}</td>
                <td className="px-3 py-2 tabular-nums">
                  {s.available}
                  {s.unit}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {s.reserved}
                  {s.unit}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {s.minimum}
                  {s.unit}
                </td>
                <td className={`px-3 py-2 font-medium capitalize ${statusClass[s.status]}`}>
                  {s.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-ink">Stock transfers</h3>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">To</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Requested by</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {hub.stockTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    No transfers in progress.
                  </td>
                </tr>
              ) : (
                hub.stockTransfers.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{t.resourceName}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {t.quantity}
                      {t.unit}
                    </td>
                    <td className="px-3 py-2">{t.fromDepotName}</td>
                    <td className="px-3 py-2">{t.toDepotName}</td>
                    <td className="px-3 py-2 capitalize">{t.status.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">{t.requestedBy}</td>
                    <td className="px-3 py-2 text-right">
                      {(t.status === 'pending' || t.status === 'in_transit') && (
                        <button
                          type="button"
                          disabled={receive.isPending}
                          onClick={() => receive.mutate(t.id)}
                          className="text-xs font-medium text-command-700 hover:underline disabled:opacity-60"
                        >
                          Mark received
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
