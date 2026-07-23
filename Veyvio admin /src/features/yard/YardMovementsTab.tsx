import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import type { YardHubData } from '@/lib/yard/types'

export function YardMovementsTab({ hub }: { hub: YardHubData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Movement ledger" description="Physical vehicle movements recorded at this depot">
        {hub.movements.length === 0 ? (
          <p className="text-sm text-muted">No movements recorded.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">Vehicle</th>
                <th className="pb-2 pr-3 font-medium">From → To</th>
                <th className="pb-2 pr-3 font-medium">Reason</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Requested by</th>
                <th className="pb-2 font-medium">Completed</th>
              </tr>
            </thead>
            <tbody>
              {hub.movements.map((m) => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3 font-medium">{m.registrationNumber}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">
                    {m.fromLocation} → {m.toLocation}
                  </td>
                  <td className="py-2.5 pr-3">{m.reason}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill status={m.status} />
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{m.requestedBy}</td>
                  <td className="py-2.5 text-ink-soft">
                    {m.completedAt ? formatDate(m.completedAt.slice(0, 10)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Audit trail" description="Recent yard events at this depot">
        <ul className="space-y-2 text-sm">
          {hub.auditEvents.map((e) => (
            <li key={e.id} className="rounded-lg border border-border px-3 py-2">
              <p className="font-medium">{e.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted">
                {e.registrationNumber ?? '—'} · {e.actorName} · {e.source} · {new Date(e.occurredAt).toLocaleString('en-GB')}
                {e.detail ? ` · ${e.detail}` : ''}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
