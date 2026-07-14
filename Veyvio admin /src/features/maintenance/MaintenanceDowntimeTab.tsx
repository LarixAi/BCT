import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { DOWNTIME_STAGE_LABELS } from '@/lib/maintenance/downtime'
import type { DowntimeAnalytics } from '@/lib/maintenance/types'

export function MaintenanceDowntimeTab({ downtime }: { downtime: DowntimeAnalytics }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Vehicles on downtime" value={downtime.vehiclesOnDowntime} />
        <MetricCard label="Avg downtime (hours)" value={downtime.averageDowntimeHours} />
        <MetricCard label="Avg approval delay (h)" value={downtime.averageApprovalDelayHours} />
        <MetricCard label="Avg parts wait (h)" value={downtime.averagePartsWaitHours} />
      </div>

      <SectionCard title="Downtime timeline" description="Recent VOR and workshop events across the fleet">
        {downtime.recentEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No downtime events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {downtime.recentEvents.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <Link to={`/vehicles/${e.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                    {e.registration}
                  </Link>
                  <p className="text-slate-700">{DOWNTIME_STAGE_LABELS[e.stage]}</p>
                  {e.notes && <p className="text-xs text-slate-500">{e.notes}</p>}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{new Date(e.occurredAt).toLocaleString('en-GB')}</p>
                  {e.actorName && <p>{e.actorName}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  )
}
