import { Link } from 'react-router-dom'
import { SEVERITY_DISPLAY } from '@/lib/incidents/constants'
import type { IncidentPriorityAlert } from '@/lib/incidents/types'

export function PriorityIncidentBanner({ alerts }: { alerts: IncidentPriorityAlert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3" data-testid="priority-incidents">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800">
        {alerts.length} critical incident{alerts.length > 1 ? 's' : ''} require attention
      </h2>
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">
                {alert.incidentRef} — {alert.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">{alert.summary}</p>
              <p className="mt-2 text-sm text-slate-600">
                {SEVERITY_DISPLAY[alert.severity]} · {alert.location}
                {alert.isSafeguarding && ' · Safeguarding'}
                {alert.requiresAcknowledgement && ' · Awaiting acknowledgement'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/incidents/${alert.incidentId}`} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700">
                Review incident
              </Link>
              {alert.requiresAcknowledgement && (
                <Link to={`/incidents/${alert.incidentId}?action=acknowledge`} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50">
                  Acknowledge
                </Link>
              )}
              <Link to="/exceptions" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                Open command response
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
