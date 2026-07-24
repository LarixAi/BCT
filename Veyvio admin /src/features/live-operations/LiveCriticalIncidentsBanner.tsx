import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, X } from 'lucide-react'
import { SEVERITY_DISPLAY } from '@/lib/incidents/constants'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function LiveCriticalIncidentsBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { data: hub } = useQuery({
    queryKey: tKey(['incidents-hub']),
    queryFn: () => api.getIncidentsHub(),
    staleTime: 60_000,
  })

  const alerts = hub?.priorityAlerts ?? []
  if (alerts.length === 0 || dismissed) return null

  const primary = alerts[0]
  const more = alerts.length - 1

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-critical/20 bg-critical/5 px-3 py-2 md:px-4"
      data-testid="live-critical-incidents"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-critical" aria-hidden />
      <p className="min-w-0 flex-1 truncate text-xs text-ink">
        <span className="font-semibold text-critical">
          {alerts.length} critical incident{alerts.length > 1 ? 's' : ''}
        </span>
        <span className="text-muted"> — </span>
        <span className="font-medium">{primary.incidentRef}</span>
        <span className="text-muted"> · {primary.title}</span>
        <span className="text-muted"> · {SEVERITY_DISPLAY[primary.severity]}</span>
        {primary.isSafeguarding ? <span className="font-medium text-critical"> · Safeguarding</span> : null}
        {more > 0 ? <span className="text-muted"> · +{more} more</span> : null}
      </p>
      <Link
        to="/incidents"
        className="shrink-0 rounded-md bg-command-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-command-700"
      >
        Open
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-critical/10 hover:text-ink"
        aria-label="Dismiss critical incident banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
