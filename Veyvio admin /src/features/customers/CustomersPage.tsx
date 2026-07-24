import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function CustomersPage() {
  const [search, setSearch] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: tKey(['customers']),
    queryFn: () => api.getCustomers(),
  })

  const { data: routes = [] } = useQuery({
    queryKey: tKey(['routes']),
    queryFn: () => api.getRoutes(),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q))
  }, [customers, search])

  const routeCountByCustomer = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of routes) {
      if (r.customer?.id) {
        map.set(r.customer.id, (map.get(r.customer.id) ?? 0) + 1)
      }
    }
    return map
  }, [routes])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Customers</h1>
        <p className="text-sm text-ink-soft">Schools, councils and commercial accounts linked to routes and contracts</p>
      </div>

      <input
        type="search"
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
      />

      <SectionCard title="Customer register" description={`${filtered.length} customers`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Routes</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4 font-medium text-ink">{c.name}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{routeCountByCustomer.get(c.id) ?? 0}</td>
                  <td className="py-2.5">
                    <StatusPill status={c.status ?? 'active'} />
                  </td>
                  <td className="py-2.5">
                    <Link
                      to={`/bookings/new?customer=${c.id}`}
                      className="text-sm font-medium text-command-600 hover:underline"
                    >
                      Create booking
                    </Link>
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
