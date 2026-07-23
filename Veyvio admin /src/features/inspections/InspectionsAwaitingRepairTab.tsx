import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { INSPECTION_TYPE_LABELS } from '@/lib/inspections/constants'
import type { InspectionRecord } from '@/lib/inspections/types'

export function InspectionsAwaitingRepairTab({ register }: { register: InspectionRecord[] }) {
  const rows = register.filter((r) => r.status === 'rectification_pending' || r.outcome === 'rectification_required')

  return (
    <SectionCard
      title="Awaiting rectification"
      description="Inspections blocked until Maintenance work orders and defects are closed"
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No inspections awaiting repair.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm">
              <div>
                <Link to={`/inspections/${r.id}`} className="font-medium tabular-nums text-command-600 hover:underline">
                  {r.registrationNumber}
                </Link>
                <span className="text-muted"> · {INSPECTION_TYPE_LABELS[r.inspectionType]}</span>
                <p className="mt-1 text-ink-soft">{r.depot}</p>
                {r.linkedWorkOrders.map((w) => (
                  <p key={w.workOrderId} className="mt-1 text-xs text-ink-soft">
                    WO:{' '}
                    <Link
                      to={`/maintenance?tab=work-orders&wo=${w.workOrderId}&vehicle=${encodeURIComponent(r.registrationNumber)}`}
                      className="text-command-600 hover:underline"
                    >
                      {w.title}
                    </Link>{' '}
                    · {w.status}
                  </p>
                ))}
                {r.linkedDefects.map((d) => (
                  <p key={d.defectId} className="text-xs text-ink-soft">
                    Defect:{' '}
                    <Link to={`/defects/${d.defectId}`} className="text-command-600 hover:underline">
                      {d.component}
                    </Link>{' '}
                    · {d.severity} · {d.status}
                  </p>
                ))}
              </div>
              <StatusPill status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
