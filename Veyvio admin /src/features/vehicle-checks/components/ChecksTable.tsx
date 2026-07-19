import { Link } from 'react-router-dom'
import { StatusPill } from '@/components/ui/status'
import { RELEASE_STATUS_LABELS } from '@/lib/checks/constants'
import type { ChecksOperationalRow } from '@/lib/checks/types'

export function ChecksTable({ rows, showActions = true }: { rows: ChecksOperationalRow[]; showActions?: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No checks match these filters.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const urgencyScore = row.urgencyScore ?? 0
        const exceptionLabels = row.exceptionLabels ?? []
        const suspiciousFlagCount = row.suspiciousFlagCount ?? 0
        const defectCount = row.defectCount ?? 0
        return (
        <div
          key={row.checkId}
          className={`rounded-xl border p-4 transition hover:border-slate-300 ${
            urgencyScore >= 80 ? 'border-red-300 bg-red-50/60' : urgencyScore >= 40 ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/vehicle-checks/${row.checkId}`} className="text-base font-semibold text-command-700 hover:underline">
                  {row.registrationNumber}
                </Link>
                <StatusPill status={row.operationalStatus} />
                {row.result && <StatusPill status={row.result} />}
              </div>
              <p className="text-sm text-slate-600">
                {row.makeModel ?? '—'} · {row.fleetNumber ?? '—'} · {row.checkTypeLabel ?? 'Vehicle check'}
              </p>
              {exceptionLabels.length > 0 && (
                <p className="mt-1 text-sm font-medium text-amber-900">{exceptionLabels.join(' · ')}</p>
              )}
              {suspiciousFlagCount > 0 && (
                <p className="text-xs text-purple-800">{suspiciousFlagCount} review flag(s)</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {row.completedBy ? `Completed by ${row.completedBy}` : 'Not completed'}
                {row.submittedAt ? ` · ${new Date(row.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                {row.depotName ? ` · ${row.depotName}` : ''}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{RELEASE_STATUS_LABELS[row.operationalStatus] ?? row.operationalStatus}</p>
              {row.validUntil && <p>Valid until {new Date(row.validUntil).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
              {defectCount > 0 && <p className="font-medium text-red-800">{defectCount} defect(s)</p>}
            </div>
          </div>
          {showActions && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/vehicle-checks/${row.checkId}`} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50">
                Review check
              </Link>
              <Link to={`/vehicles/${row.vehicleId}`} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium hover:bg-slate-50">
                Open vehicle
              </Link>
            </div>
          )}
        </div>
        )
      })}
    </div>
  )
}
