import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function ContractsPage() {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api.getContracts(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Contracts</h1>
        <p className="text-sm text-slate-600">Customer agreements and service contracts</p>
      </div>

      <SectionCard title="Contract register" description={`${contracts.length} contracts`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Dates</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{c.customer.organisationName}</td>
                  <td className="py-2.5 pr-4 capitalize text-slate-600">{c.contractType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-slate-600">
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
