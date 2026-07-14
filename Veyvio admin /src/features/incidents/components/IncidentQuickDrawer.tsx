import { Link } from 'react-router-dom'
import { CATEGORY_LABELS, SEVERITY_DISPLAY, STATUS_LABELS } from '@/lib/incidents/constants'
import type { IncidentRegisterRow } from '@/lib/incidents/types'

export function IncidentQuickDrawer({
  row,
  onClose,
}: {
  row: IncidentRegisterRow | null
  onClose: () => void
}) {
  if (!row) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" data-testid="incident-quick-drawer" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-slate-500">{row.incidentRef}</p>
              <h2 className="text-lg font-semibold text-slate-900">{row.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{row.shortDescription}</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">✕</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{SEVERITY_DISPLAY[row.severity]}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5">{STATUS_LABELS[row.status]}</span>
            {row.isSafeguarding && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">Safeguarding</span>}
          </div>
        </div>
        <dl className="space-y-3 p-4 text-sm">
          <DrawerRow label="Category" value={CATEGORY_LABELS[row.category] ?? row.category} />
          <DrawerRow label="Involved" value={row.involvedSummary} />
          <DrawerRow label="Depot" value={row.depotName} />
          <DrawerRow label="Owner" value={row.ownerName ?? 'Unassigned'} />
          <DrawerRow label="Journey" value={row.journeyReference ?? '—'} />
          {row.nextDeadline && (
            <DrawerRow label="Next deadline" value={row.nextDeadlineLabel ?? new Date(row.nextDeadline).toLocaleString('en-GB')} />
          )}
        </dl>
        <div className="border-t border-slate-200 p-4">
          <Link
            to={`/incidents/${row.id}`}
            className="block w-full rounded-lg bg-command-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-command-700"
            data-testid="open-full-incident"
          >
            Open full incident
          </Link>
        </div>
      </div>
    </div>
  )
}

function DrawerRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
