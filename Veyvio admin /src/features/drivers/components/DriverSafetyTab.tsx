import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { CATEGORY_LABELS, SEVERITY_DISPLAY, STATUS_LABELS } from '@/lib/incidents/constants'
import { api } from '@/lib/api/client'

export function DriverSafetyTab({ driverId }: { driverId: string }) {
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['driver-incidents', driverId],
    queryFn: () => api.getDriverIncidents(driverId),
  })

  if (isLoading) return <p className="text-sm text-muted">Loading incident history…</p>

  return (
    <div data-testid="driver-safety-tab">
    <SectionCard title="Safety and incidents" description="Restricted summaries — allegations are not proven misconduct until investigation is complete">
      {incidents.length === 0 ? (
        <p className="text-sm text-muted">No incidents linked to this driver.</p>
      ) : (
        <ul className="divide-y divide-border" data-testid="driver-incidents">
          {incidents.map((inc) => (
            <li key={inc.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted">{inc.incidentRef}</p>
                  <Link to={`/incidents/${inc.id}`} className="font-medium text-command-600 hover:underline">
                    {inc.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">
                    {CATEGORY_LABELS[inc.category] ?? inc.category} · {SEVERITY_DISPLAY[inc.severity]} · {STATUS_LABELS[inc.status]}
                  </p>
                  {inc.outcomeSummary && <p className="mt-1 text-sm text-ink-soft">{inc.outcomeSummary}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  {inc.isAllegation && <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-900">Under investigation</span>}
                  {inc.trainingActionRequired && <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-900">Training required</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
    </div>
  )
}
