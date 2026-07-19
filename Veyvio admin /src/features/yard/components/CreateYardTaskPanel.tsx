import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { YARD_TASK_PRIORITY_LABELS, YARD_TASK_TYPE_LABELS } from '@/lib/yard/constants'
import type { CreateYardTaskInput, YardHubData, YardTaskPriority, YardTaskType } from '@/lib/yard/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const TASK_TYPES = Object.keys(YARD_TASK_TYPE_LABELS) as YardTaskType[]
const PRIORITIES = Object.keys(YARD_TASK_PRIORITY_LABELS) as YardTaskPriority[]

export function CreateYardTaskPanel({
  hub,
  onClose,
  initialTaskType,
  initialVehicleId,
}: {
  hub: YardHubData
  onClose: () => void
  initialTaskType?: YardTaskType
  initialVehicleId?: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const [vehicleId, setVehicleId] = useState(initialVehicleId || hub.vehicles[0]?.vehicleId || '')
  const [taskType, setTaskType] = useState<YardTaskType>(initialTaskType ?? 'return_inspection')
  const [priority, setPriority] = useState<YardTaskPriority>('routine')
  const [assignedStaffName, setAssignedStaffName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [blockingRelease, setBlockingRelease] = useState(false)
  const [evidenceRequired, setEvidenceRequired] = useState(false)

  const create = useMutation({
    mutationFn: (input: CreateYardTaskInput) => api.createYardTask(input, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yard-hub', hub.depotId] })
      onClose()
    },
  })

  return (
    <SectionCard title="Create yard task" description="Task will be delivered to the Yard mobile app when assigned">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Vehicle</span>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
            {hub.vehicles.map((v) => (
              <option key={v.vehicleId} value={v.vehicleId}>
                {v.registrationNumber} — {v.makeModel}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Task type</span>
          <select value={taskType} onChange={(e) => setTaskType(e.target.value as YardTaskType)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {YARD_TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as YardTaskPriority)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {YARD_TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Assign to (optional)</span>
          <input value={assignedStaffName} onChange={(e) => setAssignedStaffName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Staff name" />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Instructions</span>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={blockingRelease} onChange={(e) => setBlockingRelease(e.target.checked)} />
          Blocks vehicle release
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={evidenceRequired} onChange={(e) => setEvidenceRequired(e.target.checked)} />
          Evidence required
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={() =>
              create.mutate({
                vehicleId,
                taskType,
                priority,
                assignedStaffName: assignedStaffName || undefined,
                instructions: instructions || undefined,
                blockingRelease,
                evidenceRequired,
              })
            }
            disabled={!vehicleId || create.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Create task
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
            Cancel
          </button>
        </div>
      </div>
    </SectionCard>
  )
}
