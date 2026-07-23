import { SectionCard } from '@/components/ui'
import type { DefectAuditEntry } from '@/lib/defects/types'

export function DefectAuditPanel({ entries }: { entries: DefectAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <SectionCard title="Audit trail" description="Append-only record of safety decisions">
        <p className="text-sm text-muted">No audit entries for this defect yet.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Audit trail" description="Append-only record of safety decisions — user, role, previous and new values">
      <ul className="divide-y divide-border" data-testid="defect-audit-trail">
        {entries.map((entry) => (
          <li key={entry.id} className="py-3 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{entry.action}</p>
                <p className="text-xs text-muted">
                  {entry.actorName}
                  {entry.role ? ` · ${entry.role}` : ''}
                  {` · ${entry.sourceApplication}`}
                </p>
                {(entry.previousValue || entry.newValue) && (
                  <p className="mt-1 text-xs text-ink-soft">
                    {entry.previousValue && <span>From: {entry.previousValue}</span>}
                    {entry.previousValue && entry.newValue && ' → '}
                    {entry.newValue && <span>To: {entry.newValue}</span>}
                  </p>
                )}
                {entry.reason && <p className="mt-1 text-xs text-ink-soft">Reason: {entry.reason}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted">
                {new Date(entry.occurredAt).toLocaleString('en-GB')}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
