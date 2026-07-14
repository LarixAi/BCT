import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { WORK_ORDER_TYPE_LABELS } from '@/lib/maintenance/constants'
import { WORK_ORDER_PIPELINE, allowedWorkOrderTransitions } from '@/lib/maintenance/work-order-lifecycle'
import { WORK_ORDER_STATUS_LABELS } from '@/lib/vehicles/maintenance'
import type { FleetWorkOrderRow } from '@/lib/maintenance/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function MaintenanceWorkOrdersTab({ workOrders }: { workOrders: FleetWorkOrderRow[] }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [selected, setSelected] = useState<FleetWorkOrderRow | null>(null)
  const [diagnosis, setDiagnosis] = useState('')

  const open = workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status))

  const pipelineCounts = WORK_ORDER_PIPELINE.map((stage) => ({
    ...stage,
    count: workOrders.filter((w) => w.status === stage.id).length,
  }))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
  }

  const transition = useMutation({
    mutationFn: ({ vehicleId, workOrderId, status }: { vehicleId: string; workOrderId: string; status: FleetWorkOrderRow['status'] }) =>
      api.updateVehicleWorkOrder(vehicleId, workOrderId, { status, diagnosis: diagnosis || undefined }, actorName),
    onSuccess: () => {
      invalidate()
      setSelected(null)
      setDiagnosis('')
    },
  })

  return (
    <div className="space-y-4">
      <SectionCard title="Workshop pipeline" description="Open work orders by lifecycle stage">
        <div className="flex flex-wrap gap-2">
          {pipelineCounts.map((stage) => (
            <div key={stage.id} className="rounded-lg border border-slate-200 px-3 py-2 text-center text-sm">
              <p className="text-lg font-bold tabular-nums text-slate-900">{stage.count}</p>
              <p className="text-xs text-slate-600">{stage.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Work orders" description={`${open.length} open · ${workOrders.length} total across fleet`}>
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">WO</th>
              <th className="pb-2 pr-3 font-medium">Vehicle</th>
              <th className="pb-2 pr-3 font-medium">Title</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Cost</th>
              <th className="pb-2 pr-3 font-medium">Scheduled</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map((w) => (
              <tr key={w.workOrderId} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{w.workOrderId}</td>
                <td className="py-2.5 pr-3">
                  <Link to={`/vehicles/${w.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                    {w.registrationNumber}
                  </Link>
                  <p className="text-xs text-slate-500">{w.depot}</p>
                </td>
                <td className="py-2.5 pr-3">{w.title}</td>
                <td className="py-2.5 pr-3 text-slate-600">{WORK_ORDER_TYPE_LABELS[w.type] ?? w.type}</td>
                <td className="py-2.5 pr-3">
                  <StatusPill status={w.status} />
                  <p className="text-xs text-slate-500">{WORK_ORDER_STATUS_LABELS[w.status]}</p>
                </td>
                <td className="py-2.5 pr-3 text-slate-600">
                  {w.actualCost != null ? `£${w.actualCost}` : w.estimatedCost != null ? `~£${w.estimatedCost}` : '—'}
                  {w.partsCount > 0 && <p className="text-xs text-slate-500">{w.partsCount} part(s)</p>}
                </td>
                <td className="py-2.5 pr-3 text-slate-600">
                  {w.scheduledDate ? new Date(w.scheduledDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="py-2.5">
                  {!['completed', 'cancelled'].includes(w.status) && (
                    <button type="button" onClick={() => setSelected(w)} className="text-xs font-medium text-command-600 hover:underline">
                      Manage
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {selected && (
        <SectionCard title={`Work order ${selected.workOrderId}`} description={selected.title}>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              {selected.registrationNumber} · {WORK_ORDER_STATUS_LABELS[selected.status]}
            </p>
            {selected.diagnosis && <p className="text-slate-700">Diagnosis: {selected.diagnosis}</p>}
            <label className="block">
              <span className="text-slate-600">Diagnosis / notes</span>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                rows={2}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {allowedWorkOrderTransitions(selected.status).map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={transition.isPending}
                  onClick={() =>
                    transition.mutate({ vehicleId: selected.vehicleId, workOrderId: selected.workOrderId, status: next })
                  }
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  → {WORK_ORDER_STATUS_LABELS[next]}
                </button>
              ))}
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-1.5 text-xs text-slate-500">
                Close
              </button>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
