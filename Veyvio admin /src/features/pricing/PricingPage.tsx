import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function PricingPage() {
  const { data: rules = [], isLoading } = useQuery({
    queryKey: tKey(['pricing']),
    queryFn: () => api.getPricingRules(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Pricing</h1>
        <p className="text-sm text-ink-soft">Rate cards and pricing rules for contracts and quotes</p>
      </div>

      <SectionCard title="Pricing rules">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Rate type</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4 font-medium text-ink">{r.name}</td>
                  <td className="py-2.5 pr-4 capitalize text-ink-soft">{r.rateType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 font-medium tabular-nums text-ink">
                    {new Intl.NumberFormat('en-GB', { style: 'currency', currency: r.currency }).format(r.amount)}
                  </td>
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
