import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { allowedWorkOrderTransitions } from '@/lib/maintenance/work-order-lifecycle'
import { WORK_ORDER_STATUS_LABELS } from '@/lib/vehicles/maintenance'
import type { VehicleProfile, WorkOrderStatus } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleMaintenanceTab({ vehicle, actorName }: { vehicle: VehicleProfile; actorName: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('repair')
  const [expandedWo, setExpandedWo] = useState<string | null>(null)
  const [partName, setPartName] = useState('')
  const [partQty, setPartQty] = useState(1)
  const [partCost, setPartCost] = useState(0)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
  }

  const create = useMutation({
    mutationFn: () => api.createVehicleWorkOrder(vehicle.id, { type, title, scheduledDate: new Date().toISOString().slice(0, 10) }, actorName),
    onSuccess: () => {
      invalidate()
      setTitle('')
    },
  })

  const transition = useMutation({
    mutationFn: ({ workOrderId, status }: { workOrderId: string; status: WorkOrderStatus }) =>
      api.updateVehicleWorkOrder(vehicle.id, workOrderId, { status }, actorName),
    onSuccess: invalidate,
  })

  const addPart = useMutation({
    mutationFn: (workOrderId: string) =>
      api.addVehicleWorkOrderPart(vehicle.id, workOrderId, { partName, quantity: partQty, unitCost: partCost }, actorName),
    onSuccess: () => {
      invalidate()
      setPartName('')
      setPartQty(1)
      setPartCost(0)
    },
  })

  const complete = useMutation({
    mutationFn: (workOrderId: string) => api.completeVehicleWorkOrder(vehicle.id, workOrderId, actorName, 0),
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-4">
      {vehicle.downtimeEvents.length > 0 && (
        <SectionCard title="Downtime timeline" description="VOR and workshop milestones for this vehicle">
          <ul className="space-y-1 text-sm">
            {vehicle.downtimeEvents.slice(-6).map((e) => (
              <li key={e.id} className="flex justify-between gap-2 text-slate-600">
                <span>{e.stage.replace(/_/g, ' ')}</span>
                <span className="text-xs">{new Date(e.occurredAt).toLocaleString('en-GB')}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Work orders" description="Status transitions follow the workshop pipeline — completing alone does not release the vehicle">
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Work order title" className="min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            <option value="repair">Repair</option>
            <option value="routine_service">Routine service</option>
            <option value="pmi">PMI</option>
          </select>
          <button type="button" onClick={() => create.mutate()} disabled={!title || create.isPending} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white">
            Create work order
          </button>
        </div>

        {vehicle.workOrders.length === 0 ? (
          <p className="text-sm text-slate-500">No work orders.</p>
        ) : (
          <ul className="space-y-2">
            {vehicle.workOrders.map((w) => (
              <li key={w.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{w.title}</p>
                    <p className="text-xs text-slate-500">
                      {WORK_ORDER_STATUS_LABELS[w.status]} · {w.provider ?? 'Unassigned'}
                      {w.partsCost != null && w.partsCost > 0 && ` · Parts £${w.partsCost}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={w.status} />
                    {!['completed', 'cancelled'].includes(w.status) && (
                      <button type="button" onClick={() => setExpandedWo(expandedWo === w.id ? null : w.id)} className="text-xs font-medium text-command-600 hover:underline">
                        {expandedWo === w.id ? 'Hide' : 'Manage'}
                      </button>
                    )}
                  </div>
                </div>

                {expandedWo === w.id && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap gap-2">
                      {allowedWorkOrderTransitions(w.status).map((next) => (
                        <button
                          key={next}
                          type="button"
                          disabled={transition.isPending}
                          onClick={() => transition.mutate({ workOrderId: w.id, status: next })}
                          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          → {WORK_ORDER_STATUS_LABELS[next]}
                        </button>
                      ))}
                      <button type="button" onClick={() => complete.mutate(w.id)} className="text-xs text-emerald-700 hover:underline">
                        Quick complete
                      </button>
                    </div>
                    {w.parts.length > 0 && (
                      <ul className="text-xs text-slate-600">
                        {w.parts.map((p) => (
                          <li key={p.id}>{p.quantity}× {p.partName} — £{(p.quantity * p.unitCost).toFixed(2)}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <input value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Part name" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                      <input type="number" value={partQty} onChange={(e) => setPartQty(Number(e.target.value))} className="w-16 rounded border border-slate-200 px-2 py-1 text-xs" />
                      <input type="number" value={partCost} onChange={(e) => setPartCost(Number(e.target.value))} placeholder="£" className="w-20 rounded border border-slate-200 px-2 py-1 text-xs" />
                      <button type="button" disabled={!partName || addPart.isPending} onClick={() => addPart.mutate(w.id)} className="text-xs font-medium text-command-600">
                        Add part
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
