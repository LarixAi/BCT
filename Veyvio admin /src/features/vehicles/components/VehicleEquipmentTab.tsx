import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { equipmentNeedsAttention } from '@/lib/vehicles/equipment'
import { resolveFleetResourcesHub } from '@/lib/fleet-resources/resolve-hub'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import { useAuth } from '@/lib/auth-context'

const QUICK_KIT = [
  { name: 'Fire extinguisher', category: 'safety_equipment' },
  { name: 'First aid kit', category: 'safety_equipment' },
  { name: 'Emergency hammers', category: 'safety_equipment' },
  { name: 'Wheelchair restraint set', category: 'accessibility_equipment' },
] as const

export function VehicleEquipmentTab({
  vehicle,
  editable = false,
  actorName,
}: {
  vehicle: VehicleProfile
  editable?: boolean
  actorName?: string
}) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const resolvedActor =
    actorName ??
    ([user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.email ||
      'Command')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('safety_equipment')
  const [qrCode, setQrCode] = useState('')
  const [formError, setFormError] = useState('')

  const { data: resources } = useQuery({
    queryKey: tKey(['fleet-resources-hub']),
    queryFn: () =>
      resolveFleetResourcesHub({
        fetchLiveHub: () => api.getFleetResourcesHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })

  const fleetEquipment = (resources?.hub.equipment ?? []).filter((e) => e.vehicleId === vehicle.id)
  const attention = vehicle.equipment.filter(equipmentNeedsAttention)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profile', vehicle.id]) })
    void queryClient.invalidateQueries({ queryKey: tKey(['fleet-resources-hub']) })
  }

  const update = useMutation({
    mutationFn: ({ equipmentId, assigned }: { equipmentId: string; assigned: boolean }) =>
      api.updateVehicleEquipment(vehicle.id, { equipmentId, assigned }, resolvedActor),
    onSuccess: () => invalidate(),
  })

  const create = useMutation({
    mutationFn: (input: { name: string; category: string; qrCode?: string }) =>
      api.createResourceEquipment({
        name: input.name,
        category: input.category,
        vehicleId: vehicle.id,
        qrCode: input.qrCode || null,
        requiredForDuty: true,
        actorName: resolvedActor,
      }),
    onSuccess: () => {
      setName('')
      setQrCode('')
      setFormError('')
      invalidate()
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Equipment could not be saved')
    },
  })

  return (
    <div className="space-y-4">
      {attention.length > 0 && (
        <SectionCard title="Equipment exceptions" description="Missing, damaged, expired or not assigned">
          <ul className="space-y-2 text-sm">
            {attention.map((e) => (
              <li key={e.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="font-medium text-amber-950">{e.name}</p>
                <p className="text-xs text-amber-900">
                  {!e.assigned || e.conditionLabel === 'missing'
                    ? 'Missing / not assigned — creates a Yard task and Driver notification when live'
                    : e.conditionLabel === 'damaged'
                      ? 'Damaged — raise equipment report'
                      : e.expiryDate && new Date(e.expiryDate).getTime() < Date.now()
                        ? 'Expired — replace before duty'
                        : 'Needs attention'}
                  {e.qrCode ? ` · QR ${e.qrCode}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Onboard equipment"
        description={
          editable
            ? 'Assign required equipment before completing the equipment inventory onboarding stage'
            : 'Durable kit linked to this vehicle — same register Yard and Fleet Resources use'
        }
      >
        {vehicle.equipment.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-muted/40 px-4 py-5 text-sm text-ink-soft">
            <p className="font-medium text-ink">No equipment assets on this vehicle yet</p>
            <p className="mt-1 text-muted">
              Yard demo kit on a device does not count until it syncs to Command. Add kit here, or assign
              it in Yard while signed into the live depot so it writes to the shared register.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3 font-medium">Item</th>
                  <th className="pb-2 pr-3 font-medium">QR / asset</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Assigned</th>
                  <th className="pb-2 pr-3 font-medium">Expiry</th>
                  <th className="pb-2 pr-3 font-medium">Last checked</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.equipment.map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium">
                      {e.name}
                      {e.replacementValue != null && (
                        <span className="block text-xs text-muted">
                          Replacement £{e.replacementValue}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-ink-soft">
                      {e.qrCode ?? e.assetNumber ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 capitalize text-ink-soft">{e.category}</td>
                    <td className="py-2.5 pr-3">
                      {editable ? (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={e.assigned}
                            disabled={update.isPending}
                            onChange={(ev) => update.mutate({ equipmentId: e.id, assigned: ev.target.checked })}
                          />
                          <span>{e.assigned ? 'Yes' : 'No'}</span>
                        </label>
                      ) : (
                        e.assigned ? 'Yes' : 'No'
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-soft">
                      {e.expiryDate ? new Date(e.expiryDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {e.lastCheckedAt ? new Date(e.lastCheckedAt).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5">
                      <StatusPill
                        status={
                          equipmentNeedsAttention(e)
                            ? 'warning'
                            : e.assigned && e.serviceable && e.inDate
                              ? 'compliant'
                              : 'warning'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-ink">Add equipment to this vehicle</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_KIT.map((item) => (
              <button
                key={item.name}
                type="button"
                disabled={create.isPending}
                onClick={() => create.mutate({ name: item.name, category: item.category })}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-60"
              >
                + {item.name}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_140px_auto]">
            <label className="text-sm">
              <span className="text-muted">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                placeholder="e.g. First aid kit"
              />
            </label>
            <label className="text-sm">
              <span className="text-muted">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              >
                <option value="safety_equipment">Safety</option>
                <option value="accessibility_equipment">Accessibility</option>
                <option value="equipment">General</option>
                <option value="cleaning">Cleaning</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="text-muted">QR / asset code</span>
              <input
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-mono text-xs"
                placeholder="Optional"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                disabled={create.isPending || !name.trim()}
                onClick={() => create.mutate({ name: name.trim(), category, qrCode: qrCode.trim() || undefined })}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-command-600 px-4 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60 sm:w-auto"
              >
                {create.isPending ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
          {formError ? <p className="text-xs text-red-700">{formError}</p> : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Fleet Resources QR assets"
        description="Serialized kit currently issued to this vehicle"
      >
        {fleetEquipment.length === 0 ? (
          <p className="text-sm text-muted">
            No Fleet Resources equipment assets linked to this vehicle.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {fleetEquipment.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">
                    QR {item.qrCode} · {item.category.replace(/_/g, ' ')}
                    {item.expiryDate ? ` · expires ${new Date(item.expiryDate).toLocaleDateString('en-GB')}` : ''}
                    {item.lastCheckedAt
                      ? ` · checked ${new Date(item.lastCheckedAt).toLocaleDateString('en-GB')}`
                      : ''}
                  </p>
                </div>
                <StatusPill
                  status={
                    item.status === 'available' ||
                    item.status === 'assigned' ||
                    item.status === 'in_service'
                      ? 'compliant'
                      : 'warning'
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/fleet-resources?tab=equipment"
          className="mt-3 inline-block text-sm font-medium text-command-700 hover:underline"
        >
          Open fleet equipment register →
        </Link>
      </SectionCard>
    </div>
  )
}
