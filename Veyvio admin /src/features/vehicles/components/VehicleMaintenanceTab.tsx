import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { allowedWorkOrderTransitions } from '@/lib/maintenance/work-order-lifecycle'
import { WORK_ORDER_STATUS_LABELS } from '@/lib/vehicles/maintenance'
import { DEFECT_SEVERITY_LABELS } from '@/lib/vehicles/defects'
import {
  buildMaintenanceScheduleCards,
  computeVehicleHealth,
} from '@/lib/vehicles/vehicle-health'
import type { VehicleProfile, WorkOrderStatus } from '@/lib/vehicles/types'
import { VehicleVorEpisodeCard } from './VehicleVorEpisodeCard'
import { api } from '@/lib/api/client'

const SCHEDULE_STATUS: Record<string, string> = {
  ok: 'compliant',
  due_soon: 'warning',
  overdue: 'vor',
  missing: 'warning',
}

export function VehicleMaintenanceTab({ vehicle, actorName }: { vehicle: VehicleProfile; actorName: string }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('repair')
  const [expandedWo, setExpandedWo] = useState<string | null>(null)
  const [partName, setPartName] = useState('')
  const [partQty, setPartQty] = useState(1)
  const [partCost, setPartCost] = useState(0)

  const health = computeVehicleHealth(vehicle)
  const schedule = buildMaintenanceScheduleCards(vehicle)
  const openOrders = vehicle.workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status))
  const defectsAwaiting = vehicle.defects.filter((d) => d.status !== 'closed')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['maintenance-hub'] })
  }

  const create = useMutation({
    mutationFn: () =>
      api.createVehicleWorkOrder(
        vehicle.id,
        { type, title, scheduledDate: new Date().toISOString().slice(0, 10) },
        actorName,
      ),
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
      <SectionCard title="Vehicle health" description="Workshop control centre for this asset">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Health score</p>
                <p className="text-3xl font-bold tabular-nums text-ink">{health.score}%</p>
              </div>
              <StatusPill status={health.roadworthy ? 'compliant' : 'vor'} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={`h-full rounded-full ${
                  health.score >= 80 ? 'bg-emerald-500' : health.score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${health.score}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {health.upcomingServiceLabel ?? 'No upcoming service scheduled'}
              {health.upcomingServiceDate
                ? ` · ${new Date(health.upcomingServiceDate).toLocaleDateString('en-GB')}`
                : ''}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <HealthStat label="Roadworthy" value={health.roadworthy ? 'Yes' : 'No'} />
            <HealthStat label="VOR" value={health.vorActive ? 'Yes' : 'No'} />
            <HealthStat label="Open defects" value={String(health.openDefects)} />
            <HealthStat label="Critical" value={String(health.criticalDefects)} />
            <HealthStat label="Open WOs" value={String(health.openWorkOrders)} />
            <HealthStat label="Availability" value={health.availabilityLabel} />
          </dl>
        </div>
        <p className="mt-3 text-xs text-muted">
          Availability feeds Dispatch readiness. Completing a work order alone does not return the vehicle to road —
          use Return to service with verification.
        </p>
      </SectionCard>

      <SectionCard title="Scheduled maintenance" description="PMI, MOT and calibration windows">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {schedule.map((card) => (
            <div key={card.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{card.title}</p>
                  <p className="text-xs text-muted">{card.cadence}</p>
                </div>
                <StatusPill status={SCHEDULE_STATUS[card.status] ?? 'warning'} />
              </div>
              <p className="mt-3 text-sm">
                <span className="text-muted">Next </span>
                <span className="font-medium tabular-nums">{card.nextLabel}</span>
              </p>
              {card.detail && <p className="mt-1 text-xs text-ink-soft">{card.detail}</p>}
            </div>
          ))}
        </div>
        <Link to="/maintenance?tab=planner" className="mt-3 inline-block text-sm font-medium text-command-700 hover:underline">
          Open maintenance planner →
        </Link>
      </SectionCard>

      {vehicle.vorRecords.length > 0 && (
        <div className="space-y-3">
          {vehicle.vorRecords.map((vor) => (
            <VehicleVorEpisodeCard key={vor.id} record={vor} />
          ))}
        </div>
      )}

      <SectionCard
        title="Defects awaiting repair"
        description={`${defectsAwaiting.length} open — from Driver, Yard and Command`}
      >
        {defectsAwaiting.length === 0 ? (
          <p className="text-sm text-muted">No open defects.</p>
        ) : (
          <ul className="space-y-2">
            {defectsAwaiting.map((d) => (
              <li key={d.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {d.component || d.category} · {DEFECT_SEVERITY_LABELS[d.severity] ?? d.severity}
                    </p>
                    <p className="text-ink-soft">{d.description}</p>
                    <p className="text-xs text-muted">
                      {d.reportedBy} · {new Date(d.reportedAt).toLocaleString('en-GB')} · {d.source}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusPill status={d.status} />
                    <button
                      type="button"
                      className="text-xs font-medium text-command-700 hover:underline"
                      onClick={() => {
                        setType('repair')
                        setTitle(`Repair: ${d.component || d.category}`)
                      }}
                    >
                      Prepare work order
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link to={`/vehicles/${vehicle.id}?tab=defects`} className="mt-3 inline-block text-sm font-medium text-command-700 hover:underline">
          Open defects tab →
        </Link>
      </SectionCard>

      <SectionCard
        title="Open work orders"
        description={`${openOrders.length} active · status transitions follow the workshop pipeline`}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Work order title"
            className="min-w-[200px] flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            <option value="repair">Repair</option>
            <option value="routine_service">Routine service</option>
            <option value="pmi">PMI</option>
          </select>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={!title || create.isPending}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Create work order
          </button>
        </div>

        {vehicle.workOrders.length === 0 ? (
          <p className="text-sm text-muted">No work orders.</p>
        ) : (
          <ul className="space-y-2">
            {vehicle.workOrders.map((w) => (
              <li key={w.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{w.title}</p>
                    <p className="text-xs text-muted">
                      {WORK_ORDER_STATUS_LABELS[w.status]} · {w.provider ?? 'Unassigned'}
                      {w.partsCost != null && w.partsCost > 0 && ` · Parts £${w.partsCost}`}
                      {w.diagnosis ? ` · ${w.diagnosis}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={w.status} />
                    {!['completed', 'cancelled'].includes(w.status) && (
                      <button
                        type="button"
                        onClick={() => setExpandedWo(expandedWo === w.id ? null : w.id)}
                        className="text-xs font-medium text-command-600 hover:underline"
                      >
                        {expandedWo === w.id ? 'Hide' : 'Manage'}
                      </button>
                    )}
                  </div>
                </div>

                {expandedWo === w.id && (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    {(w.workCompleted || w.notes || w.technicianName) && (
                      <div className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-soft">
                        {w.technicianName && <p>Technician: {w.technicianName}</p>}
                        {w.workCompleted && <p>Work: {w.workCompleted}</p>}
                        {w.notes && <p>Notes: {w.notes}</p>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {allowedWorkOrderTransitions(w.status).map((next) => (
                        <button
                          key={next}
                          type="button"
                          disabled={transition.isPending}
                          onClick={() => transition.mutate({ workOrderId: w.id, status: next })}
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                        >
                          → {WORK_ORDER_STATUS_LABELS[next]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => complete.mutate(w.id)}
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        Quick complete
                      </button>
                    </div>
                    {w.parts.length > 0 && (
                      <ul className="text-xs text-ink-soft">
                        {w.parts.map((p) => (
                          <li key={p.id}>
                            {p.quantity}× {p.partName} — £{(p.quantity * p.unitCost).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        placeholder="Part name"
                        className="rounded border border-border px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        value={partQty}
                        onChange={(e) => setPartQty(Number(e.target.value))}
                        className="w-16 rounded border border-border px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        value={partCost}
                        onChange={(e) => setPartCost(Number(e.target.value))}
                        placeholder="£"
                        className="w-20 rounded border border-border px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={!partName || addPart.isPending}
                        onClick={() => addPart.mutate(w.id)}
                        className="text-xs font-medium text-command-600"
                      >
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

      {vehicle.downtimeEvents.length > 0 && (
        <SectionCard title="Downtime milestones" description="VOR and workshop stages">
          <ul className="space-y-1 text-sm">
            {vehicle.downtimeEvents.slice(-8).map((e) => (
              <li key={e.id} className="flex justify-between gap-2 text-ink-soft">
                <span>{e.stage.replace(/_/g, ' ')}</span>
                <span className="text-xs">{new Date(e.occurredAt).toLocaleString('en-GB')}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function HealthStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  )
}
