import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import type { YardHubData } from '@/lib/yard/types'

export function YardMovementsTab({ hub }: { hub: YardHubData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Movement ledger" description="Physical vehicle movements recorded at this depot">
        {hub.movements.length === 0 ? (
          <p className="text-sm text-slate-500">No movements recorded.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
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
                <tr key={m.id} className="border-b border-slate-50">
                  <td className="py-2.5 pr-3 font-medium">{m.registrationNumber}</td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {m.fromLocation} → {m.toLocation}
                  </td>
                  <td className="py-2.5 pr-3">{m.reason}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill status={m.status} />
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">{m.requestedBy}</td>
                  <td className="py-2.5 text-slate-600">
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
            <li key={e.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <p className="font-medium">{e.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-slate-500">
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
