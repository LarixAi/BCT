import { Link } from 'react-router-dom'
import { AVAILABILITY_LABELS } from '@/lib/defects/constants'
import type { DefectPriorityAlert } from '@/lib/defects/types'

export function PriorityAlertPanel({ alerts }: { alerts: DefectPriorityAlert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-3" data-testid="priority-alerts">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-red-800">Immediate attention</h2>
      {alerts.map((alert) => (
        <div key={alert.id} className="rounded-xl border border-red-200 bg-red-50/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-ink">
                {alert.registrationNumber} — {alert.title}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{alert.summary}</p>
              <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Reported by</dt>
                  <dd className="font-medium">{alert.reportedBy}</dd>
                </div>
                <div>
                  <dt className="text-muted">Reported at</dt>
                  <dd className="font-medium">
                    {new Date(alert.reportedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Current location</dt>
                  <dd className="font-medium">{alert.location}</dd>
                </div>
                {alert.assignedRunReference && (
                  <div>
                    <dt className="text-muted">Assigned work</dt>
                    <dd className="font-medium">
                      {alert.assignedRunReference}
                      {alert.nextDepartureTime ? ` at ${alert.nextDepartureTime}` : ''}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted">Vehicle status</dt>
                  <dd className="font-medium">{AVAILABILITY_LABELS[alert.vehicleAvailability] ?? alert.vehicleAvailability}</dd>
                </div>
                <div>
                  <dt className="text-muted">Replacement vehicle</dt>
                  <dd className="font-medium">
                    {alert.replacementAssigned
                      ? 'Assigned'
                      : alert.replacementCandidates > 0
                        ? `${alert.replacementCandidates} candidates available`
                        : 'Not yet assigned'}
                  </dd>
                </div>
                {alert.dispatchBlocked && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Dispatch</dt>
                    <dd className="font-medium text-red-800">Blocked — safety rules prevent assignment</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/defects/${alert.defectId}`}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
              >
                Review defect
              </Link>
              {alert.assignedRunReference && (
                <Link to="/dispatch" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
                  Reassign work
                </Link>
              )}
              <Link to="/maintenance" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
                Assign maintenance
              </Link>
              <Link to="/exceptions" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
                View exception
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
