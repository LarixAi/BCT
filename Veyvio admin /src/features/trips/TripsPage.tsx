import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { VEYVIO_TERMS } from '@/lib/terminology'
import { api } from '@/lib/api/client'

export function TripsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['operational-trips', statusFilter],
    queryFn: () =>
      api.getOperationalTrips({
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Operational trips</h1>
        <p className="text-sm text-slate-600">
          {VEYVIO_TERMS.trip.definition} — driver-facing work packages containing jobs
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <strong>Terminology:</strong> A <strong>{VEYVIO_TERMS.trip.term}</strong> contains{' '}
        <strong>{VEYVIO_TERMS.job.term.toLowerCase()}s</strong>. A <strong>{VEYVIO_TERMS.run.term}</strong> (duty) may
        include one or more trips. <strong>{VEYVIO_TERMS.booking.term}s</strong> are commercial requests — see{' '}
        <Link to="/bookings" className="font-medium underline">
          Bookings
        </Link>
        . Route <strong>stops</strong> are on each{' '}
        <Link to="/runs" className="font-medium underline">
          run detail
        </Link>{' '}
        page.
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'in_progress', 'assigned', 'planned', 'completed'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              statusFilter === s ? 'bg-command-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <SectionCard title="Trips" description={`${trips.length} operational trips`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : trips.length === 0 ? (
          <p className="text-sm text-slate-500">No operational trips match this filter.</p>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Trip</th>
                <th className="pb-2 pr-4 font-medium">Run</th>
                <th className="pb-2 pr-4 font-medium">Driver</th>
                <th className="pb-2 pr-4 font-medium">Jobs</th>
                <th className="pb-2 pr-4 font-medium">Onboard</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4">
                    <Link to={`/ops-trips/${trip.id}`} className="font-medium text-command-600 hover:underline">
                      {trip.reference}
                    </Link>
                    <p className="text-xs text-slate-500">{trip.routeName}</p>
                  </td>
                  <td className="py-2.5 pr-4">
                    {trip.dutyId ? (
                      <Link to={`/runs/${trip.dutyId}`} className="text-command-600 hover:underline">
                        {trip.runReference ?? trip.dutyId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{trip.driverName ?? 'Unassigned'}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-slate-600">
                    {trip.completedJobCount}/{trip.totalJobCount}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-slate-600">{trip.passengersOnboard}</td>
                  <td className="py-2.5">
                    <StatusPill status={trip.status} />
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
