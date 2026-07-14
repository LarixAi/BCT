import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { CHECK_TYPE_LABELS } from '@/lib/vehicles/checks'
import type { VehicleCheckType } from '@/lib/vehicles/types'
import type { ChecksHubData } from '@/lib/checks/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const TYPES = Object.keys(CHECK_TYPE_LABELS) as VehicleCheckType[]

export function StartAdminCheckPanel({ hub, onClose }: { hub: ChecksHubData; onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const [vehicleId, setVehicleId] = useState(hub.overview[0]?.vehicleId ?? '')
  const [checkType, setCheckType] = useState<VehicleCheckType>('yard_release')
  const [notes, setNotes] = useState('')

  const start = useMutation({
    mutationFn: () => api.startAdminCheck({ vehicleId, checkType, notes: notes || undefined }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks-hub'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
      onClose()
    },
  })

  return (
    <SectionCard title="Start admin check" description="Initiate a check on behalf of yard or maintenance staff">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Vehicle</span>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
            {hub.overview.map((r) => (
              <option key={r.vehicleId} value={r.vehicleId}>
                {r.registrationNumber} — {r.makeModel}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Check type</span>
          <select value={checkType} onChange={(e) => setCheckType(e.target.value as VehicleCheckType)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {CHECK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button type="button" onClick={() => start.mutate()} disabled={!vehicleId || start.isPending} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            Start check
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
            Cancel
          </button>
        </div>
      </div>
    </SectionCard>
  )
}
