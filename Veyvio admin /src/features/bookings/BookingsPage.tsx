import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { BOOKING_LIST_VIEWS } from '@/lib/bookings/constants'
import { api } from '@/lib/api/client'

export function BookingsPage() {
  const [view, setView] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: bookings = [], isLoading, error, isError } = useQuery({
    queryKey: ['bookings', view],
    queryFn: () => api.getBookings({ view: view === 'all' ? undefined : view }),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return bookings
    const q = search.toLowerCase()
    return bookings.filter(
      (b) =>
        b.reference.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.passengerSummary.toLowerCase().includes(q),
    )
  }, [bookings, search])

  const draftCount = bookings.filter((b) => b.status === 'draft').length
  const unscheduledCount = bookings.filter((b) => b.schedulingStatus === 'unscheduled').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-600">
            Customer transport orders — each booking contains trips and stops for dispatch
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/bookings/new/urgent"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Urgent booking
          </Link>
          <Link
            to="/bookings/new"
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            + Create booking
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Bookings" value={bookings.length} />
        <StatCard label="Drafts" value={draftCount} />
        <StatCard label="Unscheduled" value={unscheduledCount} />
      </div>

      <div className="flex flex-wrap gap-2">
        {BOOKING_LIST_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === v.id ? 'bg-command-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search reference, customer, passenger…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
      />

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load bookings'}
        </p>
      )}

      <SectionCard title="Booking register" description={`${filtered.length} bookings`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">No bookings in this view.</p>
            <Link to="/bookings/new" className="mt-2 inline-block text-sm font-medium text-command-600 hover:underline">
              Create your first booking
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Reference</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Passenger</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">First date</th>
                <th className="pb-2 pr-4 font-medium">Trips</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Scheduling</th>
                <th className="pb-2 font-medium">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4">
                    <Link to={`/bookings/${b.id}`} className="font-medium text-command-600 hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{b.customerName}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{b.passengerSummary}</td>
                  <td className="py-2.5 pr-4 capitalize text-slate-600">{b.bookingType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{b.firstJourneyDate}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{b.tripCount}</td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="py-2.5 pr-4 capitalize text-slate-600">{b.schedulingStatus}</td>
                  <td className="py-2.5">
                    {b.warningCount > 0 ? (
                      <span className="text-amber-700">{b.warningCount}</span>
                    ) : (
                      '—'
                    )}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  )
}
