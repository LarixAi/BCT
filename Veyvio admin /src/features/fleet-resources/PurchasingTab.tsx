import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function PurchasingTab({ hub }: { hub: FleetResourcesHubData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const approve = useMutation({
    mutationFn: (id: string) => api.approveResourcePurchase(id, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fleet-resources-hub'] }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Purchase requests</h2>
        <p className="text-sm text-ink-soft">
          Approvals stay separate from the requester — no self-approval for spend above policy.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Est. cost</th>
              <th className="px-3 py-2">Depot / vehicle</th>
              <th className="px-3 py-2">Urgency</th>
              <th className="px-3 py-2">Requested by</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {hub.purchaseRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted">
                  No purchase requests.
                </td>
              </tr>
            ) : (
              hub.purchaseRequests.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.resourceName}</div>
                    <div className="text-xs text-muted">{p.reason}</div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {p.quantity}
                    {p.unit}
                  </td>
                  <td className="px-3 py-2 tabular-nums">£{p.estimatedCost.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {p.depotName ?? '—'}
                    {p.registrationNumber && p.vehicleId && (
                      <div>
                        <Link
                          to={`/vehicles/${p.vehicleId}`}
                          className="font-semibold tabular-nums text-command-700 hover:underline"
                        >
                          {p.registrationNumber}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 capitalize">{p.urgency}</td>
                  <td className="px-3 py-2">{p.requestedBy}</td>
                  <td className="px-3 py-2 capitalize">{p.status}</td>
                  <td className="px-3 py-2 text-right">
                    {p.status === 'pending' && (
                      <button
                        type="button"
                        disabled={approve.isPending || p.requestedBy === actorName}
                        title={
                          p.requestedBy === actorName
                            ? 'Requester cannot approve their own purchase'
                            : undefined
                        }
                        onClick={() => approve.mutate(p.id)}
                        className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
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
