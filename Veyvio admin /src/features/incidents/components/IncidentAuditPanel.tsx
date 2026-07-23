import { SectionCard } from '@/components/ui'
import type { IncidentAuditEntry } from '@/lib/incidents/types'

export function IncidentAuditPanel({ entries }: { entries: IncidentAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <SectionCard title="Audit trail" description="Append-only record of safety decisions">
        <p className="text-sm text-muted">No audit entries yet.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Audit trail" description="Append-only record of safety decisions — user, role, and source application">
      <ul className="divide-y divide-border" data-testid="incident-audit-trail">
        {entries.map((entry) => (
          <li key={entry.id} className="py-3 first:pt-0 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-ink">{entry.action}</p>
              <time className="text-xs text-muted">{new Date(entry.occurredAt).toLocaleString('en-GB')}</time>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {entry.actorName} · {entry.role.replace(/_/g, ' ')} · {entry.sourceApplication}
            </p>
            {entry.detail && <p className="mt-1 text-ink-soft">{entry.detail}</p>}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
