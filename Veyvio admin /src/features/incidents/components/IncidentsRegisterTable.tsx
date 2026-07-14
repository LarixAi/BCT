import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, SEVERITY_DISPLAY, STATUS_LABELS } from '@/lib/incidents/constants'
import type { IncidentRegisterRow } from '@/lib/incidents/types'
import { IncidentRiskBadge } from './IncidentRiskBadge'

const WARNING_ICONS: Record<string, string> = {
  unacknowledged: '!',
  vehicle_still_operational: 'V',
  driver_still_assigned: 'D',
  evidence_missing: 'E',
  external_deadline: 'R',
  actions_overdue: 'A',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function IncidentsRegisterTable({
  rows,
  onQuickView,
}: {
  rows: IncidentRegisterRow[]
  onQuickView?: (row: IncidentRegisterRow) => void
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No incidents match this view.</p>
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1280px] text-left text-sm" data-testid="incidents-register-table">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Incident</th>
              <th className="pb-2 pr-3 font-medium">Reported</th>
              <th className="pb-2 pr-3 font-medium">Severity</th>
              <th className="pb-2 pr-3 font-medium">Risk</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 font-medium">Involved</th>
              <th className="pb-2 pr-3 font-medium">Journey</th>
              <th className="pb-2 pr-3 font-medium">Depot</th>
              <th className="pb-2 pr-3 font-medium">Owner</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Deadline</th>
              <th className="pb-2 font-medium">External</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="py-2.5 pr-3">
                  <div className="flex items-start gap-2">
                    {row.warningFlags.length > 0 && (
                      <span className="mt-0.5 flex gap-0.5" title={row.warningFlags.join(', ')}>
                        {row.warningFlags.slice(0, 3).map((f) => (
                          <span key={f} className="rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-900">{WARNING_ICONS[f] ?? '!'}</span>
                        ))}
                      </span>
                    )}
                    <div>
                      <p className="font-mono text-xs text-slate-500">{row.incidentRef}</p>
                      <Link to={`/incidents/${row.id}`} className="font-medium text-command-600 hover:underline">
                        {row.title}
                      </Link>
                      {onQuickView && (
                        <button type="button" onClick={() => onQuickView(row)} className="ml-2 text-xs text-slate-500 hover:text-command-600" data-testid={`quick-view-${row.id}`}>
                          Quick view
                        </button>
                      )}
                      {row.isSafeguarding && <span className="ml-1 text-xs text-red-700">Safeguarding</span>}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-xs text-slate-600">{formatDateTime(row.reportedAt)}</td>
                <td className="py-2.5 pr-3"><SeverityBadge severity={row.severity} /></td>
                <td className="py-2.5 pr-3"><IncidentRiskBadge risk={row.riskScore} compact /></td>
                <td className="py-2.5 pr-3 text-slate-600">{CATEGORY_LABELS[row.category] ?? row.category}</td>
                <td className="py-2.5 pr-3 text-slate-600">{row.involvedSummary}</td>
                <td className="py-2.5 pr-3 text-slate-600">{row.journeyReference ?? '—'}</td>
                <td className="py-2.5 pr-3 text-slate-600">{row.depotName}</td>
                <td className="py-2.5 pr-3 text-slate-600">{row.ownerName ?? '—'}</td>
                <td className="py-2.5 pr-3 text-xs">{STATUS_LABELS[row.status] ?? row.status}</td>
                <td className="py-2.5 pr-3 text-xs">
                  {row.nextDeadline ? (
                    <span className={row.isOverdue ? 'font-medium text-red-700' : 'text-slate-600'}>
                      {row.nextDeadlineLabel ?? formatDateTime(row.nextDeadline)}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2.5 text-xs text-slate-600">{row.externalFlags.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Link key={row.id} to={`/incidents/${row.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
            <p className="font-mono text-xs text-slate-500">{row.incidentRef}</p>
            <p className="font-semibold text-slate-900">{row.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <SeverityBadge severity={row.severity} />
              <IncidentRiskBadge risk={row.riskScore} compact />
              {row.isSafeguarding && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">Safeguarding</span>}
            </div>
            <p className="mt-2 text-xs text-slate-500">{row.depotName} · {STATUS_LABELS[row.status]}</p>
          </Link>
        ))}
      </div>
    </>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-900',
    medium: 'bg-amber-100 text-amber-900',
    low: 'bg-slate-100 text-slate-700',
    near_miss: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[severity] ?? 'bg-slate-100'}`}>
      {SEVERITY_DISPLAY[severity] ?? severity}
    </span>
  )
}
