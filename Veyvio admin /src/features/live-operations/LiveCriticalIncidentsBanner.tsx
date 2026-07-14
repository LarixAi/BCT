import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SEVERITY_DISPLAY } from '@/lib/incidents/constants'
import { api } from '@/lib/api/client'

export function LiveCriticalIncidentsBanner() {
  const { data: hub } = useQuery({
    queryKey: ['incidents-hub'],
    queryFn: () => api.getIncidentsHub(),
    staleTime: 60_000,
  })

  const alerts = hub?.priorityAlerts ?? []
  if (alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/80 p-4" data-testid="live-critical-incidents">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-900">
            {alerts.length} critical incident{alerts.length > 1 ? 's' : ''} — live operations awareness
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-800">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <span className="font-medium">{alert.incidentRef}</span> — {alert.title}
                <span className="text-slate-600"> · {SEVERITY_DISPLAY[alert.severity]}</span>
                {alert.isSafeguarding && <span className="text-red-700"> · Safeguarding</span>}
              </li>
            ))}
          </ul>
        </div>
        <Link
          to="/incidents"
          className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
        >
          Open incidents
        </Link>
      </div>
    </div>
  )
}
