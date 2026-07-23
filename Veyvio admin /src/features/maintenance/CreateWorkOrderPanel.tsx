import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { WORK_ORDER_TYPE_LABELS } from '@/lib/maintenance/constants'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export type CreateWorkOrderPrefill = {
  vehicleId?: string
  type?: string
  title?: string
  scheduledDate?: string
}

export function CreateWorkOrderPanel({
  onClose,
  prefill,
}: {
  onClose: () => void
  prefill?: CreateWorkOrderPrefill | null
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const [vehicleId, setVehicleId] = useState(prefill?.vehicleId ?? '')
  const [title, setTitle] = useState(prefill?.title ?? '')
  const [type, setType] = useState(prefill?.type ?? 'repair')
  const [scheduledDate, setScheduledDate] = useState(
    prefill?.scheduledDate ?? new Date().toISOString().slice(0, 10),
  )
  const [provider, setProvider] = useState('Fleet Workshop')

  const create = useMutation({
    mutationFn: () =>
      api.createVehicleWorkOrder(
        vehicleId,
        { type, title, scheduledDate, provider },
        actorName,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      onClose()
    },
  })

  return (
    <SectionCard title="Create work order" description="Links to the vehicle record — completion alone does not return vehicle to service">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="text-ink-soft">Vehicle</span>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2">
            <option value="">Select vehicle…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} — {v.make} {v.model}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-ink-soft">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2">
            {Object.entries(WORK_ORDER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Scheduled date</span>
          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-ink-soft">Workshop / provider</span>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-2" />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={!vehicleId || !title || create.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Create work order
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft">
            Cancel
          </button>
        </div>
        {create.isError && (
          <p className="text-sm text-red-700 sm:col-span-2">{create.error instanceof Error ? create.error.message : 'Failed'}</p>
        )}
      </div>
    </SectionCard>
  )
}
