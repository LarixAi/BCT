import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { isOperationsDemoLayerActive, OPERATIONS_DEMO_BANNER } from '@/lib/operations/operations-data-source'
import {
  flattenTripsToJobs,
  jobRegisterSummary,
  jobSourceLabel,
  type JobSourceType,
} from '@/lib/operations/job-register'
import { sourceHref } from '@/lib/operations/operational-trail'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unscheduled', label: 'Unscheduled' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'exceptions', label: 'Exceptions' },
] as const

type TabId = (typeof TABS)[number]['id']

function SourceBadge({ type }: { type: JobSourceType }) {
  const tone =
    type === 'dial_a_ride' ? 'bg-violet-50 text-violet-800' : type === 'school_route' ? 'bg-sky-50 text-sky-900' : 'bg-command-50 text-command-800'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {jobSourceLabel(type)}
    </span>
  )
}

export function JobsPage() {
  const [tab, setTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')

  const { data: trips = [], isLoading, error, isError } = useQuery({
    queryKey: tKey(['operational-trips']),
    queryFn: () => api.getOperationalTrips(),
  })

  const jobs = useMemo(() => flattenTripsToJobs(trips), [trips])
  const summary = useMemo(() => jobRegisterSummary(jobs), [jobs])

  const filtered = useMemo(() => {
    let list = jobs
    switch (tab) {
      case 'unscheduled':
        list = list.filter((j) => j.status === 'unstarted' || j.status === 'waiting')
        break
      case 'scheduled':
        list = list.filter((j) => j.tripId && j.status !== 'completed' && j.status !== 'cancelled')
        break
      case 'in_progress':
        list = list.filter((j) => j.status === 'onboard' || j.status === 'waiting')
        break
      case 'completed':
        list = list.filter((j) => j.status === 'completed')
        break
      case 'exceptions':
        list = list.filter((j) => Boolean(j.warning))
        break
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (j) =>
        j.reference.toLowerCase().includes(q) ||
        j.passengerName.toLowerCase().includes(q) ||
        j.journey.toLowerCase().includes(q) ||
        (j.sourceReference ?? '').toLowerCase().includes(q),
    )
  }, [jobs, tab, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Jobs</h1>
          <p className="text-sm text-ink-soft">
            All transport work requiring scheduling, delivery or completion.
          </p>
        </div>
        <Link
          to="/bookings/new/urgent"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
        >
          Create urgent booking
        </Link>
      </div>

      {isOperationsDemoLayerActive() && (
        <div className="rounded-xl border border-command-200 bg-command-50 px-4 py-3 text-sm text-command-950">
          <p className="font-semibold">{OPERATIONS_DEMO_BANNER.title}</p>
          <p className="mt-1 text-command-900">{OPERATIONS_DEMO_BANNER.body}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Unscheduled" value={summary.unscheduled} />
        <StatCard label="Due today" value={summary.dueToday} />
        <StatCard label="In progress" value={summary.inProgress} />
        <StatCard label="Exceptions" value={summary.exceptions} tone={summary.exceptions > 0 ? 'warn' : 'default'} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t.id ? 'bg-command-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search job, passenger, journey, source…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
      />

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load jobs'}
        </p>
      )}

      <SectionCard title="Job register" description={`${filtered.length} jobs`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No jobs match these filters.</p>
            <p className="mt-2 text-sm text-ink-soft">
              Jobs are generated from{' '}
              <Link to="/bookings" className="font-medium text-command-600 hover:underline">Bookings</Link>,{' '}
              <Link to="/dial-a-ride" className="font-medium text-command-600 hover:underline">Dial-a-Ride</Link> and{' '}
              <Link to="/school-routes" className="font-medium text-command-600 hover:underline">School Routes</Link>.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Job</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Passenger</th>
                <th className="pb-2 pr-4 font-medium">Journey</th>
                <th className="pb-2 pr-4 font-medium">Required time</th>
                <th className="pb-2 pr-4 font-medium">Requirements</th>
                <th className="pb-2 pr-4 font-medium">Trip</th>
                <th className="pb-2 pr-4 font-medium">Driver / vehicle</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 font-medium">Warning</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => (
                <tr key={job.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4 font-medium text-ink">{job.reference}</td>
                  <td className="py-2.5 pr-4">
                    <SourceBadge type={job.sourceType} />
                    {job.sourceId ? (
                      <Link to={sourceHref(job.sourceType, job.sourceId) ?? '#'} className="mt-1 block text-xs text-command-600 hover:underline">
                        {job.sourceReference}
                      </Link>
                    ) : job.sourceReference ? (
                      <span className="mt-1 block text-xs text-ink-soft">{job.sourceReference}</span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{job.passengerName}</td>
                  <td className="max-w-[220px] truncate py-2.5 pr-4 text-ink-soft" title={job.journey}>
                    {job.journey}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">{job.requiredTime}</td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {job.requirements.length ? job.requirements.join(', ') : '—'}
                  </td>
                  <td className="py-2.5 pr-4">
                    {job.tripId ? (
                      <Link to={`/trips/${job.tripId}`} className="text-command-600 hover:underline">
                        {job.tripReference}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {job.driverName ?? '—'}
                    {job.vehicleRegistration ? ` · ${job.vehicleRegistration}` : ''}
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusPill status={job.status} />
                  </td>
                  <td className="py-2.5 text-amber-800">{job.warning ?? '—'}</td>
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
