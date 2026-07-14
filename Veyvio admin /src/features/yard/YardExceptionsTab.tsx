import { SectionCard } from '@/components/ui'
import type { YardHubData } from '@/lib/yard/types'

const SEVERITY_STYLES = {
  critical: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-slate-200 bg-slate-50',
} as const

export function YardExceptionsTab({ hub, onSelectVehicle }: { hub: YardHubData; onSelectVehicle?: (vehicleId: string) => void }) {
  const open = hub.exceptions.filter((e) => e.escalationStatus !== 'resolved')

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <SectionCard title="Operational exceptions" description={`${open.length} issues requiring intervention`}>
        {open.length === 0 ? (
          <p className="text-sm text-slate-500">No open exceptions at this depot.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((ex) => (
              <li key={ex.id} className={`rounded-lg border p-3 ${SEVERITY_STYLES[ex.severity]}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{ex.title}</p>
                    <p className="text-sm text-slate-700">{ex.detail}</p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium uppercase text-slate-600">{ex.severity}</span>
                </div>
                <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="inline font-medium">Impact: </dt>
                    <dd className="inline">{ex.operationalImpact}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium">Recommended: </dt>
                    <dd className="inline">{ex.recommendedAction}</dd>
                  </div>
                  {ex.ownerName && (
                    <div>
                      <dt className="inline font-medium">Owner: </dt>
                      <dd className="inline">{ex.ownerName}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline font-medium">Detected: </dt>
                    <dd className="inline">{new Date(ex.detectedAt).toLocaleString('en-GB')}</dd>
                  </div>
                </dl>
                {onSelectVehicle && (
                  <button
                    type="button"
                    onClick={() => onSelectVehicle(ex.vehicleId)}
                    className="mt-2 text-xs font-medium text-command-600 hover:underline"
                  >
                    View {ex.registrationNumber.split(',')[0]?.trim()} →
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Exception summary">
        <dl className="space-y-2 text-sm">
          <SummaryRow label="Critical" value={open.filter((e) => e.severity === 'critical').length} />
          <SummaryRow label="Warning" value={open.filter((e) => e.severity === 'warning').length} />
          <SummaryRow label="Info" value={open.filter((e) => e.severity === 'info').length} />
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Exceptions are derived from live vehicle state, tasks, and location data — they coordinate with Vehicles, Maintenance and Dispatch without duplicating those pages.
        </p>
      </SectionCard>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  )
}
