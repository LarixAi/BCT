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
        <p className="text-sm text-slate-500">Loading…</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-500">No assignment changes recorded.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
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
              <tr key={h.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 pr-3 text-xs text-slate-500">
                  {new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2 pr-3 font-medium">{h.changeType}</td>
                <td className="py-2 pr-3 text-slate-600">
                  {h.fromDriverName ?? '—'}
                  {h.fromVehicleRegistration && ` · ${h.fromVehicleRegistration}`}
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {h.toDriverName ?? '—'}
                  {h.toVehicleRegistration && ` · ${h.toVehicleRegistration}`}
                </td>
                <td className="py-2 pr-3 capitalize text-slate-600">{h.reason}</td>
                <td className="py-2 text-slate-600">{h.adminName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}
