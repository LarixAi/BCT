import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function AssignmentHistoryPanel({ tripId }: { tripId: string }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['assignment-history', tripId],
    queryFn: () => api.getAssignmentHistory(tripId),
  })

  return (
    <SectionCard title="Change history" description="Immutable assignment and transfer records">
      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted">No assignment changes recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="pb-2 pr-3 font-medium">Time</th>
              <th className="pb-2 pr-3 font-medium">Change</th>
              <th className="pb-2 pr-3 font-medium">From</th>
              <th className="pb-2 pr-3 font-medium">To</th>
              <th className="pb-2 pr-3 font-medium">Reason</th>
              <th className="pb-2 font-medium">Admin</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3 text-xs text-muted">
                  {new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2 pr-3 font-medium">{h.changeType}</td>
                <td className="py-2 pr-3 text-ink-soft">
                  {h.fromDriverName ?? '—'}
                  {h.fromVehicleRegistration && ` · ${h.fromVehicleRegistration}`}
                </td>
                <td className="py-2 pr-3 text-ink-soft">
                  {h.toDriverName ?? '—'}
                  {h.toVehicleRegistration && ` · ${h.toVehicleRegistration}`}
                </td>
                <td className="py-2 pr-3 capitalize text-ink-soft">{h.reason}</td>
                <td className="py-2 text-ink-soft">{h.adminName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}
