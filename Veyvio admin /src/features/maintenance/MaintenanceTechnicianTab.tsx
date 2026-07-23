import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { WORK_ORDER_TYPE_LABELS } from '@/lib/maintenance/constants'
import { allowedWorkOrderTransitions } from '@/lib/maintenance/work-order-lifecycle'
import type { FleetWorkOrderRow } from '@/lib/maintenance/types'
import { WORK_ORDER_STATUS_LABELS } from '@/lib/vehicles/maintenance'
import type { VehicleProfile, WorkOrderStatus } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { DigitalPmiForm } from './DigitalPmiForm'

const EXECUTION_STATUSES: WorkOrderStatus[] = [
  'scheduled',
  'vehicle_awaiting_workshop',
  'in_progress',
  'awaiting_parts',
  'awaiting_authorisation',
  'quality_check',
  'approved',
]

const QUICK_ACTIONS: { to: WorkOrderStatus; label: string }[] = [
  { to: 'in_progress', label: 'Start work' },
  { to: 'awaiting_parts', label: 'Awaiting parts' },
  { to: 'awaiting_authorisation', label: 'Submit estimate / approval' },
  { to: 'quality_check', label: 'Ready for inspection' },
  { to: 'completed', label: 'Mark completed' },
]

export function MaintenanceTechnicianTab({
  workOrders,
  vehicles,
}: {
  workOrders: FleetWorkOrderRow[]
  vehicles: VehicleProfile[]
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [filter, setFilter] = useState<'mine' | 'bay'>('bay')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [showPmi, setShowPmi] = useState(false)

  const queue = useMemo(() => {
    const open = workOrders.filter((w) => EXECUTION_STATUSES.includes(w.status))
    if (filter === 'mine') {
      const me = actorName.toLowerCase()
      return open.filter(
        (w) =>
          (w.technicianName ?? '').toLowerCase().includes(me.split(' ')[0] ?? '') ||
          (w.technicianName ?? '').toLowerCase() === me,
      )
    }
    return open.sort((a, b) => {
      const order = ['in_progress', 'awaiting_parts', 'quality_check', 'awaiting_authorisation', 'vehicle_awaiting_workshop', 'scheduled', 'approved']
      return order.indexOf(a.status) - order.indexOf(b.status)
    })
  }, [workOrders, filter, actorName])

  const selected = queue.find((w) => w.workOrderId === selectedId) ?? queue[0] ?? null
  const selectedVehicle = selected ? vehicles.find((v) => v.id === selected.vehicleId) : null
  const selectedWoEntity = selectedVehicle?.workOrders.find((w) => w.id === selected?.workOrderId)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
  }

  const transition = useMutation({
    mutationFn: (status: WorkOrderStatus) => {
      if (!selected) throw new Error('No job selected')
      return api.updateVehicleWorkOrder(
        selected.vehicleId,
        selected.workOrderId,
        { status, diagnosis: notes || undefined, technicianName: actorName },
        actorName,
      )
    },
    onSuccess: () => {
      invalidate()
      setNotes('')
    },
  })

  const allowed = selected ? allowedWorkOrderTransitions(selected.status) : []
  const quick = QUICK_ACTIONS.filter((a) => allowed.includes(a.to))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-ink-soft">
        Technician portal shell — workshop execution for open jobs. Full mobile tech app and bay assignment are
        Phase 2e+. Status moves still follow Maintenance lifecycle rules.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('bay')}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            filter === 'bay'
              ? 'border-command-500 bg-command-50 text-command-800'
              : 'border-border text-ink-soft'
          }`}
        >
          Workshop bay
        </button>
        <button
          type="button"
          onClick={() => setFilter('mine')}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            filter === 'mine'
              ? 'border-command-500 bg-command-50 text-command-800'
              : 'border-border text-ink-soft'
          }`}
        >
          Assigned to me
        </button>
        <span className="text-xs text-muted">{queue.length} jobs in queue</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <SectionCard title="Job queue" description="Tap a job to execute">
          {queue.length === 0 ? (
            <p className="text-sm text-muted">
              {filter === 'mine' ? 'No jobs assigned to you right now.' : 'No open workshop jobs.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((w) => {
                const active = (selected?.workOrderId ?? null) === w.workOrderId
                return (
                  <li key={w.workOrderId}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(w.workOrderId)
                        setShowPmi(false)
                        setNotes(w.diagnosis ?? '')
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                          : 'border-border bg-surface hover:border-border-strong'
                      }`}
                    >
                      <p className="font-semibold tabular-nums text-ink">{w.registrationNumber}</p>
                      <p className="text-ink-soft">{w.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusPill status={w.status} />
                        <span className="text-[11px] text-muted">
                          {WORK_ORDER_TYPE_LABELS[w.type] ?? w.type}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        {selected ? (
          <SectionCard
            title={`${selected.registrationNumber} · ${selected.title}`}
            description={`${WORK_ORDER_STATUS_LABELS[selected.status]} · ${selected.depot}`}
          >
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Type</p>
                  <p className="font-medium">{WORK_ORDER_TYPE_LABELS[selected.type] ?? selected.type}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Technician</p>
                  <p className="font-medium">{selected.technicianName ?? 'Unassigned'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Provider</p>
                  <p className="font-medium">{selected.provider ?? '—'}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted">Estimate</p>
                  <p className="font-medium">
                    {selected.estimateTotal != null
                      ? `£${selected.estimateTotal.toFixed(2)}`
                      : selected.estimatedCost != null
                        ? `~£${selected.estimatedCost}`
                        : '—'}
                    {selected.estimateStatus ? ` · ${selected.estimateStatus}` : ''}
                  </p>
                </div>
              </div>

              {selected.diagnosis && (
                <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-ink-soft">
                  Diagnosis on record: {selected.diagnosis}
                </p>
              )}

              <label className="block">
                <span className="text-ink-soft">Workshop notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  placeholder="Record findings, parts used, road-test notes…"
                />
              </label>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Quick actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {quick.length === 0 ? (
                    <p className="text-xs text-muted">No transitions available from this status.</p>
                  ) : (
                    quick.map((a) => (
                      <button
                        key={a.to}
                        type="button"
                        disabled={transition.isPending}
                        onClick={() => transition.mutate(a.to)}
                        className="rounded-lg bg-command-600 px-3 py-2 text-xs font-medium text-white hover:bg-command-700 disabled:opacity-60"
                      >
                        {a.label}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {selected.type === 'pmi' && selectedVehicle && selectedWoEntity && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium text-ink">Digital PMI checklist</p>
                  <p className="text-xs text-ink-soft">
                    Complete inspection items and brake evidence before marking the job complete.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPmi((v) => !v)}
                    className="mt-2 text-xs font-medium text-command-600 hover:underline"
                  >
                    {showPmi ? 'Hide checklist' : 'Open digital PMI'}
                  </button>
                </div>
              )}

              {showPmi && selectedVehicle && selectedWoEntity && (
                <DigitalPmiForm
                  vehicle={selectedVehicle}
                  workOrder={selectedWoEntity}
                  onClose={() => setShowPmi(false)}
                />
              )}

              <div className="flex flex-wrap gap-3 text-xs">
                <Link
                  to={`/vehicles/${selected.vehicleId}?tab=Maintenance`}
                  className="font-medium text-command-600 hover:underline"
                >
                  Vehicle maintenance →
                </Link>
                <Link
                  to={`/maintenance?tab=work-orders&wo=${selected.workOrderId}`}
                  className="font-medium text-command-600 hover:underline"
                >
                  Open on kanban →
                </Link>
                {selected.defectId && (
                  <Link
                    to={`/defects/${selected.defectId}`}
                    className="font-medium text-command-600 hover:underline"
                  >
                    Linked defect →
                  </Link>
                )}
              </div>

              {transition.isError && (
                <p className="text-red-700">
                  {transition.error instanceof Error ? transition.error.message : 'Update failed'}
                </p>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Job execution" description="Select a job from the queue">
            <p className="text-sm text-muted">No job selected.</p>
          </SectionCard>
        )}
      </div>
    </div>
  )
}
