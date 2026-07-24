import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EQUIPMENT_STATUS_LABEL } from '@/lib/fleet-resources/constants'
import type { FleetResourcesHubData } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { useState } from 'react'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function EquipmentTab({ hub }: { hub: FleetResourcesHubData }) {
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const queryClient = useQueryClient()
  const [assignId, setAssignId] = useState<string | null>(null)
  const [vehicleId, setVehicleId] = useState('')

  const { data: vehicles = [] } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const assign = useMutation({
    mutationFn: () =>
      api.assignResourceEquipment({
        equipmentId: assignId!,
        vehicleId: vehicleId || null,
        actorName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['fleet-resources-hub']) })
      setAssignId(null)
      setVehicleId('')
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Equipment assets</h2>
        <p className="text-sm text-ink-soft">
          QR-style IDs for safety and accessibility kit — assign to vehicles or return to depot stock.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">QR / ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Expiry</th>
              <th className="px-3 py-2">Duty</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {hub.equipment.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted">
                  No equipment assets on the register yet. Kit recorded on each vehicle profile will
                  appear here once available.
                </td>
              </tr>
            ) : (
              hub.equipment.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{e.qrCode}</td>
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        e.status === 'missing' || e.status === 'expired' || e.status === 'unserviceable'
                          ? 'font-medium text-red-700'
                          : ''
                      }
                    >
                      {EQUIPMENT_STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {e.vehicleId ? (
                      <Link
                        to={`/vehicles/${e.vehicleId}?tab=equipment`}
                        className="font-semibold tabular-nums text-command-700 hover:underline"
                      >
                        {e.registrationNumber}
                      </Link>
                    ) : (
                      e.depotName ?? '—'
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{e.expiryDate ?? '—'}</td>
                  <td className="px-3 py-2">{e.requiredForDuty ? 'Required' : 'Optional'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignId(e.id)
                        setVehicleId(e.vehicleId ?? '')
                      }}
                      className="text-xs font-medium text-command-700 hover:underline"
                    >
                      {e.vehicleId ? 'Reassign' : 'Assign'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assignId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-midnight/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-ink">Assign equipment</h3>
            <p className="mt-1 text-sm text-ink-soft">Leave vehicle empty to return to depot stock.</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium text-ink-soft">Vehicle</span>
              <select
                value={vehicleId}
                onChange={(ev) => setVehicleId(ev.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2"
              >
                <option value="">Depot stock</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignId(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assign.isPending}
                onClick={() => assign.mutate()}
                className="rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Save assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
