import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { RELEASE_DECISION_LABELS } from '@/lib/vehicles/constants'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function VorBoardPage() {
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const vorVehicles = vehicles.filter((v) => v.operationalStatus === 'vor' || v.operationalStatus === 'in_workshop')

  return (
    <div className="space-y-6">
      <div>
        <Link to="/vehicles" className="text-sm font-medium text-command-600 hover:underline">← Back to vehicles</Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">VOR board</h1>
        <p className="text-sm text-ink-soft">Vehicles off road or in workshop — replacement planning and release tracking</p>
      </div>

      <SectionCard title="Off road vehicles" description={`${vorVehicles.length} vehicles`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : vorVehicles.length === 0 ? (
          <p className="text-sm text-muted">No vehicles currently VOR.</p>
        ) : (
          <ul className="space-y-3">
            {vorVehicles.map((v) => (
              <li key={v.id} className="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/vehicles/${v.id}`} className="font-semibold text-command-600 hover:underline">
                      {v.registrationNumber}
                    </Link>
                    <p className="text-sm text-ink-soft">{v.reference} · {v.currentDepotName}</p>
                    <p className="mt-1 text-sm text-red-800">{v.release.summary}</p>
                  </div>
                  <StatusPill status={v.operationalStatus} />
                </div>
                {v.vorRecords.filter((r) => !r.resolvedAt).map((r) => (
                  <p key={r.id} className="mt-2 text-xs text-ink-soft">
                    VOR: {r.reason} — reported by {r.reportedBy}
                  </p>
                ))}
                <p className="mt-2 text-xs text-muted">
                  Release: {RELEASE_DECISION_LABELS[v.releaseDecision]} · {v.openDefectCount} open defects
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
