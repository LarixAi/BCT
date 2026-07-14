import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function CustomersPage() {
  const [search, setSearch] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.getCustomers(),
  })

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
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
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <p className="text-sm text-slate-600">Schools, councils and commercial accounts linked to routes and contracts</p>
      </div>

      <input
        type="search"
        placeholder="Search customers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
      />

      <SectionCard title="Customer register" description={`${filtered.length} customers`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Routes</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{c.name}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{routeCountByCustomer.get(c.id) ?? 0}</td>
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
