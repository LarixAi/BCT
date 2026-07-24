import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { WORK_ORDER_TYPE_LABELS } from '@/lib/maintenance/constants'
import {
  WORK_ORDER_KANBAN_LANES,
  WORK_ORDER_PIPELINE,
  allowedWorkOrderTransitions,
  groupWorkOrdersByKanbanLane,
} from '@/lib/maintenance/work-order-lifecycle'
import { WORK_ORDER_STATUS_LABELS } from '@/lib/vehicles/maintenance'
import type { FleetWorkOrderRow } from '@/lib/maintenance/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


type ViewMode = 'board' | 'table'

function estimateLabel(w: FleetWorkOrderRow): string {
  if (w.estimateTotal != null) return `£${w.estimateTotal.toFixed(2)}`
  if (w.actualCost != null) return `£${w.actualCost}`
  if (w.estimatedCost != null) return `~£${w.estimatedCost}`
  return '—'
}

export function MaintenanceWorkOrdersTab({
  workOrders,
  vehicleFilter = '',
  highlightWorkOrderId = '',
}: {
  workOrders: FleetWorkOrderRow[]
  vehicleFilter?: string
  highlightWorkOrderId?: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [view, setView] = useState<ViewMode>('board')
  const [selected, setSelected] = useState<FleetWorkOrderRow | null>(null)
  const [diagnosis, setDiagnosis] = useState('')

  const filtered = useMemo(
    () =>
      vehicleFilter
        ? workOrders.filter(
            (w) =>
              w.vehicleId === vehicleFilter ||
              w.registrationNumber.toLowerCase().includes(vehicleFilter.toLowerCase()),
          )
        : workOrders,
    [workOrders, vehicleFilter],
  )

  const open = useMemo(
    () => filtered.filter((w) => !['completed', 'cancelled'].includes(w.status)),
    [filtered],
  )

  const lanes = useMemo(() => groupWorkOrdersByKanbanLane(open), [open])

  const pipelineCounts = WORK_ORDER_PIPELINE.map((stage) => ({
    ...stage,
    count: filtered.filter((w) => w.status === stage.id).length,
  }))

  useEffect(() => {
    if (!highlightWorkOrderId) return
    const hit = filtered.find((w) => w.workOrderId === highlightWorkOrderId)
    if (hit && !['completed', 'cancelled'].includes(hit.status)) {
      setSelected(hit)
    }
  }, [highlightWorkOrderId, filtered])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['maintenance-hub']) })
    queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profiles']) })
  }

  const transition = useMutation({
    mutationFn: ({
      vehicleId,
      workOrderId,
      status,
    }: {
      vehicleId: string
      workOrderId: string
      status: FleetWorkOrderRow['status']
    }) =>
      api.updateVehicleWorkOrder(
        vehicleId,
        workOrderId,
        { status, diagnosis: diagnosis || undefined },
        actorName,
      ),
    onSuccess: () => {
      invalidate()
      setSelected(null)
      setDiagnosis('')
    },
  })

  const approveEstimate = useMutation({
    mutationFn: ({
      vehicleId,
      workOrderId,
      decision,
    }: {
      vehicleId: string
      workOrderId: string
      decision: 'approved' | 'rejected'
    }) =>
      api.approveVehicleWorkOrderEstimate(
        vehicleId,
        workOrderId,
        { decision, notes: diagnosis || undefined },
        actorName,
      ),
    onSuccess: () => {
      invalidate()
      setSelected(null)
      setDiagnosis('')
    },
  })

  const pendingEstimates = filtered.filter((w) => w.estimateStatus === 'submitted')

  function openManage(w: FleetWorkOrderRow) {
    setSelected(w)
    setDiagnosis(w.diagnosis ?? '')
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Workshop pipeline" description="Open work orders by lifecycle stage">
        <div className="flex flex-wrap gap-2">
          {pipelineCounts.map((stage) => (
            <div key={stage.id} className="rounded-lg border border-border px-3 py-2 text-center text-sm">
              <p className="text-lg font-bold tabular-nums text-ink">{stage.count}</p>
              <p className="text-xs text-ink-soft">{stage.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {pendingEstimates.length > 0 && (
        <SectionCard
          title="Estimates awaiting approval"
          description="Approve labour and parts before ordering from suppliers"
        >
          <ul className="space-y-2 text-sm">
            {pendingEstimates.map((w) => (
              <li
                key={w.workOrderId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-ink">
                    {w.registrationNumber} · {w.title}
                  </p>
                  <p className="text-xs text-amber-900">
                    Estimate £{w.estimateTotal?.toFixed(2) ?? '—'} · status {w.estimateStatus}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openManage(w)}
                  className="text-xs font-medium text-command-600 hover:underline"
                >
                  Review estimate
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard
        title="Work orders"
        description={`${open.length} open · ${filtered.length} shown${vehicleFilter ? ' (filtered)' : ` · ${workOrders.length} total`} · move via Manage, not drag-drop`}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('board')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              view === 'board'
                ? 'border-command-500 bg-command-50 text-command-800'
                : 'border-border text-ink-soft hover:bg-surface-muted'
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              view === 'table'
                ? 'border-command-500 bg-command-50 text-command-800'
                : 'border-border text-ink-soft hover:bg-surface-muted'
            }`}
          >
            Table
          </button>
        </div>

        {view === 'board' ? (
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {WORK_ORDER_KANBAN_LANES.map((lane) => {
              const cards = lanes[lane.id]
              return (
                <div key={lane.id} className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {lane.label}
                  </p>
                  <p className="mb-2 text-lg font-bold tabular-nums text-ink">{cards.length}</p>
                  <ul className="space-y-2">
                    {cards.map((w) => {
                      const highlighted =
                        highlightWorkOrderId && w.workOrderId === highlightWorkOrderId
                      return (
                        <li
                          key={w.workOrderId}
                          className={`rounded-lg border bg-surface p-2 text-sm ${
                            highlighted ? 'border-command-400 ring-1 ring-command-400' : 'border-border'
                          }`}
                        >
                          <Link
                            to={`/vehicles/${w.vehicleId}?tab=Maintenance`}
                            className="font-semibold tabular-nums text-command-600 hover:underline"
                          >
                            {w.registrationNumber}
                          </Link>
                          <p className="mt-0.5 text-ink">{w.title}</p>
                          <p className="text-xs text-muted">
                            {WORK_ORDER_TYPE_LABELS[w.type] ?? w.type} · {w.depot}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <StatusPill status={w.status} />
                            <span className="text-[11px] text-muted">
                              {WORK_ORDER_STATUS_LABELS[w.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-soft">
                            {estimateLabel(w)}
                            {w.estimateStatus === 'submitted' && ' · estimate submitted'}
                            {w.scheduledDate &&
                              ` · ${new Date(w.scheduledDate).toLocaleDateString('en-GB')}`}
                          </p>
                          {w.technicianName && (
                            <p className="text-[11px] text-muted">Tech: {w.technicianName}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => openManage(w)}
                            className="mt-2 text-xs font-medium text-command-600 hover:underline"
                          >
                            Manage
                          </button>
                        </li>
                      )
                    })}
                    {cards.length === 0 && <li className="text-xs text-muted">None</li>}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3 font-medium">WO</th>
                  <th className="pb-2 pr-3 font-medium">Vehicle</th>
                  <th className="pb-2 pr-3 font-medium">Title</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Estimate</th>
                  <th className="pb-2 pr-3 font-medium">Scheduled</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => (
                  <tr
                    key={w.workOrderId}
                    className={`border-b border-border/60 hover:bg-surface-muted ${
                      highlightWorkOrderId && w.workOrderId === highlightWorkOrderId
                        ? 'bg-command-50'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">{w.workOrderId}</td>
                    <td className="py-2.5 pr-3">
                      <Link
                        to={`/vehicles/${w.vehicleId}?tab=Maintenance`}
                        className="font-medium text-command-600 hover:underline"
                      >
                        {w.registrationNumber}
                      </Link>
                      <p className="text-xs text-muted">{w.depot}</p>
                    </td>
                    <td className="py-2.5 pr-3">{w.title}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {WORK_ORDER_TYPE_LABELS[w.type] ?? w.type}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={w.status} />
                      <p className="text-xs text-muted">{WORK_ORDER_STATUS_LABELS[w.status]}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {estimateLabel(w)}
                      {w.estimateStatus && (
                        <p className="text-xs capitalize text-muted">{w.estimateStatus}</p>
                      )}
                      {w.partsCount > 0 && (
                        <p className="text-xs text-muted">{w.partsCount} part(s)</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {w.scheduledDate ? new Date(w.scheduledDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5">
                      {!['completed', 'cancelled'].includes(w.status) && (
                        <button
                          type="button"
                          onClick={() => openManage(w)}
                          className="text-xs font-medium text-command-600 hover:underline"
                        >
                          Manage
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selected && (
        <SectionCard title={`Work order ${selected.workOrderId}`} description={selected.title}>
          <div className="space-y-3 text-sm">
            <p className="text-ink-soft">
              {selected.registrationNumber} · {WORK_ORDER_STATUS_LABELS[selected.status]}
            </p>
            <p className="text-xs text-muted">
              Status changes use allowed lifecycle transitions — cards do not move by dragging.
            </p>
            {selected.diagnosis && <p className="text-ink-soft">Diagnosis: {selected.diagnosis}</p>}
            {selected.estimateStatus && (
              <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                <p className="font-medium text-ink">Workshop estimate</p>
                <p className="text-ink-soft">
                  Total £{selected.estimateTotal?.toFixed(2) ?? '—'} · {selected.estimateStatus}
                </p>
                {selected.estimateStatus === 'submitted' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={approveEstimate.isPending}
                      onClick={() =>
                        approveEstimate.mutate({
                          vehicleId: selected.vehicleId,
                          workOrderId: selected.workOrderId,
                          decision: 'approved',
                        })
                      }
                      className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Approve estimate
                    </button>
                    <button
                      type="button"
                      disabled={approveEstimate.isPending}
                      onClick={() =>
                        approveEstimate.mutate({
                          vehicleId: selected.vehicleId,
                          workOrderId: selected.workOrderId,
                          decision: 'rejected',
                        })
                      }
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800"
                    >
                      Reject estimate
                    </button>
                  </div>
                )}
              </div>
            )}
            <label className="block">
              <span className="text-ink-soft">Diagnosis / notes</span>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
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
                    transition.mutate({
                      vehicleId: selected.vehicleId,
                      workOrderId: selected.workOrderId,
                      status: next,
                    })
                  }
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
                >
                  → {WORK_ORDER_STATUS_LABELS[next]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-muted"
              >
                Close
              </button>
            </div>
            {approveEstimate.isError && (
              <p className="text-red-700">
                {approveEstimate.error instanceof Error
                  ? approveEstimate.error.message
                  : 'Estimate update failed'}
              </p>
            )}
            {transition.isError && (
              <p className="text-red-700">
                {transition.error instanceof Error ? transition.error.message : 'Transition failed'}
              </p>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
