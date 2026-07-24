import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Repeat2 } from 'lucide-react'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { BOOKING_LIST_VIEWS, NON_ORDINARY_BOOKING_TYPES } from '@/lib/bookings/constants'
import { api } from '@/lib/api/client'
import { useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'

function journeyLabel(type: string): string {
  const normalised = type.replace(/-/g, '_')
  switch (normalised) {
    case 'one_way':
    case 'single':
      return 'One-way'
    case 'return':
      return 'Return'
    case 'multi_stop':
      return 'Multi-stop'
    case 'group':
      return 'Group'
    case 'recurring':
      return 'Recurring'
    default:
      return type.replace(/_/g, ' ')
  }
}

function isOrdinaryBooking(bookingType: string): boolean {
  const key = bookingType.replace(/-/g, '_')
  return !NON_ORDINARY_BOOKING_TYPES.has(key)
}

export function BookingsPage() {
  const companyId = useActiveCompanyId()
  const [view, setView] = useState<string>('all')
  const [search, setSearch] = useState('')

  const { data: bookings = [], isLoading, error, isError } = useQuery({
    queryKey: tKey(['bookings', view]),
    queryFn: () => api.getBookings({ view: view === 'all' ? undefined : view }),
    enabled: !!companyId,
  })

  const ordinary = useMemo(
    () => bookings.filter((b) => isOrdinaryBooking(b.bookingType)),
    [bookings],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return ordinary
    const q = search.toLowerCase()
    return ordinary.filter(
      (b) =>
        b.reference.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.passengerSummary.toLowerCase().includes(q),
    )
  }, [ordinary, search])

  const today = new Date().toISOString().slice(0, 10)
  const upcomingCount = ordinary.filter((b) => b.firstJourneyDate >= today).length
  const draftCount = ordinary.filter((b) => b.status === 'draft').length
  const awaitingSchedule = ordinary.filter((b) => b.schedulingStatus === 'unscheduled' && b.status !== 'draft').length
  const jobsToday = ordinary.filter((b) => b.firstJourneyDate === today).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Bookings</h1>
          <p className="text-sm text-ink-soft">
            Manage ordinary passenger and group transport requests.
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
            Create booking
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total upcoming" value={upcomingCount} />
        <StatCard label="Drafts" value={draftCount} />
        <StatCard label="Awaiting schedule" value={awaitingSchedule} tone={awaitingSchedule > 0 ? 'warn' : 'default'} />
        <StatCard label="Jobs today" value={jobsToday} />
      </div>

      <div className="flex flex-wrap gap-2">
        {BOOKING_LIST_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              view === v.id ? 'bg-command-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-border'
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
        className="w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
      />

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load bookings'}
        </p>
      )}

      <SectionCard title="Booking register" description={`${filtered.length} ordinary bookings`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No bookings yet.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Create an ordinary transport booking for a passenger or group.
            </p>
            <Link to="/bookings/new" className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
              Create booking
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Reference</th>
                <th className="pb-2 pr-4 font-medium">Customer</th>
                <th className="pb-2 pr-4 font-medium">Passenger / group</th>
                <th className="pb-2 pr-4 font-medium">Journey</th>
                <th className="pb-2 pr-4 font-medium">Next journey</th>
                <th className="pb-2 pr-4 font-medium">Jobs</th>
                <th className="pb-2 pr-4 font-medium">Booking status</th>
                <th className="pb-2 pr-4 font-medium">Scheduling</th>
                <th className="pb-2 font-medium">Warnings</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4">
                    <Link to={`/bookings/${b.id}`} className="font-medium text-command-600 hover:underline">
                      {b.reference}
                    </Link>
                    {['recurring', 'school'].includes(b.bookingType.replace(/-/g, '_')) && (
                      <Repeat2 className="mt-0.5 inline size-3.5 text-muted" aria-label="Recurring" />
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{b.customerName}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{b.passengerSummary}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{journeyLabel(b.bookingType)}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{b.firstJourneyDate}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">{b.tripCount || '—'}</td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={b.status} />
                  </td>
                  <td className="py-2.5 pr-4 capitalize text-ink-soft">{b.schedulingStatus}</td>
                  <td className="py-2.5 text-ink-soft">
                    {b.warningCount > 0 ? (
                      <span className="text-amber-700">{b.warningCount} warning{b.warningCount === 1 ? '' : 's'}</span>
                    ) : b.serviceRequirement !== 'standard' ? (
                      b.serviceRequirement
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

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: number
  tone?: 'default' | 'warn'
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className={`text-2xl font-bold tabular-nums ${tone === 'warn' ? 'text-amber-800' : ''}`}>{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}
