import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function PassengersPage() {
  const [search, setSearch] = useState('')

  const { data: passengers = [], isLoading } = useQuery({
    queryKey: ['passengers'],
    queryFn: () => api.getPassengers(),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return passengers
    const q = search.toLowerCase()
    return passengers.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.routeName?.toLowerCase().includes(q) ||
        p.customerName?.toLowerCase().includes(q),
    )
  }, [passengers, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Passengers</h1>
        <p className="text-sm text-slate-600">Passengers on active routes — mobility and safeguarding flags</p>
      </div>

      <input
        type="search"
        placeholder="Search name, route, customer…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
      />

      <SectionCard title="Passenger register" description={`${filtered.length} passengers`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Route</th>
                <th className="pb-2 pr-4 font-medium">Wheelchair</th>
                <th className="pb-2 pr-4 font-medium">Safeguarding</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium">{p.firstName} {p.lastName}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{p.customerName ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{p.routeName ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{p.needsWheelchair ? 'Yes' : 'No'}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{p.safeguardingFlag ? 'Yes' : 'No'}</td>
                  <td className="py-2.5">
                    <StatusPill status={p.status ?? 'active'} />
                  </td>
                  <td className="py-2.5">
                    <Link
                      to={`/bookings/new?passenger=${p.id}`}
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
