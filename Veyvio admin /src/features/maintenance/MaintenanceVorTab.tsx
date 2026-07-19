import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { RELEASE_DECISION_LABELS } from '@/lib/vehicles/constants'
import type { FleetWorkOrderRow } from '@/lib/maintenance/types'
import type { VehicleProfile } from '@/lib/vehicles/types'

const LANES = [
  { id: 'new', label: 'Newly VOR', match: (v: VehicleProfile, wo?: FleetWorkOrderRow) => v.operationalStatus === 'vor' && !wo },
  {
    id: 'assessment',
    label: 'Awaiting assessment',
    match: (_v: VehicleProfile, wo?: FleetWorkOrderRow) =>
      wo != null && ['requested', 'awaiting_review', 'approved'].includes(wo.status),
  },
  {
    id: 'parts',
    label: 'Awaiting parts',
    match: (_v: VehicleProfile, wo?: FleetWorkOrderRow) => wo?.status === 'awaiting_parts',
  },
  {
    id: 'repair',
    label: 'Repair in progress',
    match: (v: VehicleProfile, wo?: FleetWorkOrderRow) =>
      v.operationalStatus === 'in_workshop' || wo?.status === 'in_progress' || wo?.status === 'vehicle_awaiting_workshop',
  },
  {
    id: 'retest',
    label: 'Re-test required',
    match: (_v: VehicleProfile, wo?: FleetWorkOrderRow) => wo?.status === 'quality_check',
  },
  {
    id: 'release',
    label: 'Ready for release',
    match: (_v: VehicleProfile, wo?: FleetWorkOrderRow) => wo?.status === 'awaiting_authorisation',
  },
] as const

export function MaintenanceVorTab({
  vehicles,
  workOrders,
}: {
  vehicles: VehicleProfile[]
  workOrders: FleetWorkOrderRow[]
}) {
  const board = vehicles.filter((v) => v.operationalStatus === 'vor' || v.operationalStatus === 'in_workshop')

  function openWo(v: VehicleProfile) {
    return workOrders.find(
      (w) =>
        w.vehicleId === v.id &&
        !['completed', 'cancelled', 'closed'].includes(w.status),
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="VOR board"
        description="No vehicle leaves this board by clicking Available — complete return-to-service on the vehicle profile"
      >
        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {LANES.map((lane) => {
            const cards = board.filter((v) => lane.match(v, openWo(v)))
            return (
              <div key={lane.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{lane.label}</p>
                <p className="mb-2 text-lg font-bold tabular-nums text-slate-900">{cards.length}</p>
                <ul className="space-y-2">
                  {cards.map((v) => {
                    const wo = openWo(v)
                    const vor = v.vorRecords.find((r) => !r.resolvedAt)
                    return (
                      <li key={v.id} className="rounded-lg border border-red-100 bg-white p-2 text-sm">
                        <Link to={`/vehicles/${v.id}?tab=Maintenance`} className="font-semibold text-command-600 hover:underline">
                          {v.registrationNumber}
                        </Link>
                        <p className="text-xs text-slate-500">{v.currentDepotName}</p>
                        <p className="mt-1 text-xs text-red-800">{vor?.reason ?? v.release.summary}</p>
                        {wo && (
                          <p className="mt-1 text-xs text-slate-600">
                            WO: {wo.title} · <StatusPill status={wo.status} />
                          </p>
                        )}
                        {(vor?.totalCost != null || vor?.downtimeHours != null) && (
                          <p className="mt-1 text-[11px] text-slate-600">
                            {vor.totalCost != null ? `Cost £${vor.totalCost.toLocaleString('en-GB')}` : 'Cost —'}
                            {vor.downtimeHours != null ? ` · ${vor.downtimeHours}h down` : ''}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-slate-500">
                          Release: {RELEASE_DECISION_LABELS[v.releaseDecision]}
                        </p>
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="mt-2 inline-block text-xs font-medium text-command-700 hover:underline"
                        >
                          Open RTS checklist →
                        </Link>
                      </li>
                    )
                  })}
                  {cards.length === 0 && <li className="text-xs text-slate-400">None</li>}
                </ul>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <p className="text-sm text-slate-600">
        Also available under Vehicles:{' '}
        <Link to="/vehicles/vor" className="font-medium text-command-600 hover:underline">
          /vehicles/vor
        </Link>
      </p>
    </div>
  )
}
