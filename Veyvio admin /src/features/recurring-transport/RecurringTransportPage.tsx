import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function RecurringTransportPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recurring-transport'],
    queryFn: () => api.getRecurringTransport(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Recurring Transport</h1>
        <p className="text-sm text-ink-soft">Standing patterns that generate runs on a schedule</p>
      </div>

      <SectionCard title="Recurring patterns" description={`${items.length} active patterns`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Route</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Days</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4 font-medium text-ink">{r.name}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{r.routeName}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{r.customerName}</td>
                  <td className="py-2.5 pr-4 uppercase text-ink-soft">{r.daysOfWeek.join(', ')}</td>
                  <td className="py-2.5">
                    <StatusPill status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
