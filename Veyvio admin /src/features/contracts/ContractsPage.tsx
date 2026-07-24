import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function ContractsPage() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: tKey(['contracts']),
    queryFn: () => api.getContracts(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Contracts</h1>
        <p className="text-sm text-ink-soft">Customer agreements and service contracts</p>
      </div>

      <SectionCard title="Contract register" description={`${contracts.length} contracts`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Dates</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4 font-medium text-ink">{c.name}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{c.customer.organisationName}</td>
                  <td className="py-2.5 pr-4 capitalize text-ink-soft">{c.contractType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {new Date(c.startDate).toLocaleDateString('en-GB')}
                    {c.endDate ? ` – ${new Date(c.endDate).toLocaleDateString('en-GB')}` : ''}
                  </td>
                  <td className="py-2.5">
                    <StatusPill status={c.status} />
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
