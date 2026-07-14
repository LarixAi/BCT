import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { MOVEMENT_REASONS } from '@/lib/yard/constants'
import type { RecordYardMovementInput, YardHubData } from '@/lib/yard/types'
import { api } from '@/lib/api/client'

export function RecordMovementPanel({
  hub,
  actorName,
  onClose,
}: {
  hub: YardHubData
  actorName: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [vehicleId, setVehicleId] = useState(hub.vehicles[0]?.vehicleId ?? '')
  const [destinationBay, setDestinationBay] = useState('Bay B12')
  const [reason, setReason] = useState<string>(MOVEMENT_REASONS[0])

  const record = useMutation({
    mutationFn: (input: RecordYardMovementInput) => api.recordYardMovement(input, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yard-hub'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-profile'] })
      onClose()
    },
  })

  return (
    <SectionCard title="Record vehicle movement" description="Manual movement — updates yard location and audit trail">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-slate-600">Vehicle</span>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5">
            {hub.vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.registrationNumber} — {v.bay ?? v.zone}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Destination</span>
          <input value={destinationBay} onChange={(e) => setDestinationBay(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5">
            {MOVEMENT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!vehicleId || record.isPending}
          onClick={() => record.mutate({ vehicleId, destinationBay, reason })}
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Record movement
        </button>
        <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">
          Cancel
        </button>
      </div>
    </SectionCard>
  )
}
