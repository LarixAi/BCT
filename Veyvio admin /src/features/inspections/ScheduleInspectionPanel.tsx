import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { INSPECTION_TYPE_LABELS } from '@/lib/inspections/constants'
import type { InspectionType } from '@/lib/inspections/types'
import { api } from '@/lib/api/client'

const TYPES = Object.keys(INSPECTION_TYPE_LABELS) as InspectionType[]

export function ScheduleInspectionPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })
  const [vehicleId, setVehicleId] = useState('')
  const [inspectionType, setInspectionType] = useState<InspectionType>('safety_pmi')
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [provider, setProvider] = useState('Fleet Workshop')
  const [driverInstruction, setDriverInstruction] = useState('')

  const schedule = useMutation({
    mutationFn: () =>
      api.scheduleInspection({
        vehicleId,
        inspectionType,
        dueDate,
        bookedDate: dueDate,
        provider,
        driverInstruction: driverInstruction || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections-hub'] })
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-midnight/30" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-ink">Schedule inspection</h2>
          <button type="button" onClick={onClose} className="text-sm text-ink-soft hover:text-ink">
            Close
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Vehicle</span>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                  {v.fleetNumber ? ` · ${v.fleetNumber}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Inspection type</span>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as InspectionType)}
              className="w-full rounded-lg border border-border px-3 py-2"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {INSPECTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Due / booked date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Provider</span>
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Driver instruction</span>
            <textarea
              value={driverInstruction}
              onChange={(e) => setDriverInstruction(e.target.value)}
              rows={3}
              placeholder="Return to depot by…"
              className="w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          {schedule.isError && (
            <p className="text-sm text-red-700">
              {schedule.error instanceof Error ? schedule.error.message : 'Could not schedule'}
            </p>
          )}
        </div>
        <div className="border-t border-border p-4">
          <button
            type="button"
            disabled={!vehicleId || schedule.isPending}
            onClick={() => schedule.mutate()}
            className="w-full rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
          >
            {schedule.isPending ? 'Scheduling…' : 'Schedule inspection'}
          </button>
        </div>
      </div>
    </div>
  )
}
