import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { computePmiDue, pmiStatusLabel, resolvePmiInterval } from '@/lib/maintenance/pmi'
import type { FleetWorkOrderRow, ServiceScheduleItem } from '@/lib/maintenance/types'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { DigitalPmiForm } from './DigitalPmiForm'

export function MaintenancePmiTab({
  vehicles,
  workOrders,
  schedule,
}: {
  vehicles: VehicleProfile[]
  workOrders: FleetWorkOrderRow[]
  schedule: ServiceScheduleItem[]
}) {
  const [searchParams] = useSearchParams()
  const deepWo = searchParams.get('wo')
  const [selectedWoId, setSelectedWoId] = useState<string | null>(deepWo)

  const pmiOrders = workOrders.filter((w) => w.type === 'pmi')
  const rows = vehicles
    .filter((v) => v.lifecycleStatus === 'active' || v.nextMaintenanceDate)
    .map((v) => {
      const interval = resolvePmiInterval(v)
      const stored = Boolean(v.pmiInterval)
      const due = computePmiDue({
        nextMaintenanceDate: v.nextMaintenanceDate,
        nextMaintenanceMileage: v.nextMaintenanceMileage,
        mileage: v.mileage,
        interval,
      })
      return { v, interval, due, stored }
    })
    .sort((a, b) => {
      const order = { overdue: 0, due: 1, due_soon: 2, scheduled: 3, ok: 4 }
      return order[a.due.status] - order[b.due.status]
    })

  const selected = useMemo(() => {
    if (!selectedWoId) return null
    const hubRow = pmiOrders.find((w) => w.workOrderId === selectedWoId)
    if (!hubRow) return null
    const vehicle = vehicles.find((v) => v.id === hubRow.vehicleId)
    const workOrder = vehicle?.workOrders.find((w) => w.id === selectedWoId)
    if (!vehicle || !workOrder) return null
    return { vehicle, workOrder }
  }, [selectedWoId, pmiOrders, vehicles])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-ink-soft">
        Formal Safety Inspection (PMI) records live in the{' '}
        <Link to="/inspections" className="font-medium text-command-600 hover:underline">
          Inspections centre
        </Link>
        . This tab is the Maintenance lens on intervals and PMI work orders for rectification.
      </div>

      <SectionCard
        title="PMI / safety inspection intervals"
        description="Preventive Maintenance Inspection is not a daily walkaround, MOT, or manufacturer service. Interval = earlier of calendar and mileage limits."
      >
        <p className="mb-3 text-sm text-ink-soft">
          Company default: 8 weeks. Vehicles 12+ years: guidance maximum 6 weeks (DVSA). Open a PMI work order to complete
          the digital checklist with evidence — or open the linked Inspection record for sign-off.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3">Vehicle</th>
                <th className="pb-2 pr-3">Interval</th>
                <th className="pb-2 pr-3">Reason / approver</th>
                <th className="pb-2 pr-3">Next due</th>
                <th className="pb-2 pr-3">Trigger</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ v, interval, due, stored }) => (
                <tr key={v.id} className="border-b border-border/60">
                  <td className="py-2 pr-3">
                    <Link to={`/vehicles/${v.id}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                      {v.registrationNumber}
                    </Link>
                    <p className="text-xs text-muted">{v.modelYear ?? '—'} · {v.homeDepotName}</p>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {interval.intervalWeeks} weeks
                    <p className="text-[11px] text-muted">{stored ? 'Vehicle policy' : 'Default'}</p>
                  </td>
                  <td className="py-2 pr-3 text-xs text-ink-soft max-w-[220px]">
                    {interval.reason}
                    {interval.approvedBy && (
                      <p className="mt-0.5 text-muted">Approved by {interval.approvedBy}</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {due.dueDate?.slice(0, 10) ?? '—'}
                    {due.dueMileage != null && (
                      <p className="text-muted">{due.dueMileage.toLocaleString()} mi</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-ink-soft">{due.trigger}</td>
                  <td className="py-2 pr-3">
                    <StatusPill status={due.status} />
                    <span className="sr-only">{pmiStatusLabel(due.status)}</span>
                  </td>
                  <td className="py-2 text-xs text-ink-soft">{interval.reviewDueAt ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Open PMI work orders" description={`${pmiOrders.length} PMI jobs — open digital checklist to record items and evidence`}>
        {pmiOrders.length === 0 ? (
          <p className="text-sm text-muted">No open PMI work orders. Schedule from Planner or Create work order.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {pmiOrders.map((w) => {
              const progress = w.pmiChecklistProgress
              return (
                <li key={w.workOrderId} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2">
                  <div>
                    <Link to={`/vehicles/${w.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                      {w.registrationNumber}
                    </Link>
                    <p className="text-ink-soft">{w.title}</p>
                    {progress && (
                      <p className="text-xs text-muted">
                        Checklist {progress.answered}/{progress.total}
                        {progress.complete ? ' · Complete' : ' · Incomplete'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={w.status} />
                    <button
                      type="button"
                      onClick={() => setSelectedWoId(w.workOrderId)}
                      className="text-xs font-medium text-command-600 hover:underline"
                    >
                      Open digital PMI
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>

      {selected && (
        <DigitalPmiForm
          vehicle={selected.vehicle}
          workOrder={selected.workOrder}
          onClose={() => setSelectedWoId(null)}
        />
      )}

      <SectionCard title="Service schedule (PMI-related)" description="Profile and work-order due dates">
        <ul className="space-y-1 text-sm">
          {schedule
            .filter((s) => s.serviceType.toLowerCase().includes('pmi') || s.serviceType === 'Scheduled service')
            .slice(0, 20)
            .map((s) => (
              <li key={s.id} className="flex justify-between gap-2 border-b border-border/60 py-1.5">
                <Link to={`/vehicles/${s.vehicleId}?tab=Maintenance`} className="text-command-600 hover:underline">
                  {s.registrationNumber}
                </Link>
                <StatusPill status={s.status} />
              </li>
            ))}
        </ul>
      </SectionCard>
    </div>
  )
}
