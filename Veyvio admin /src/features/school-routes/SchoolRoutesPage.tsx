import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { SCHOOL_ROUTE_TABS } from '@/lib/school-routes/constants'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function SchoolRoutesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'routes'

  const { data: summary } = useQuery({
    queryKey: tKey(['school-routes-summary']),
    queryFn: () => api.getSchoolRoutesSummary(),
  })

  const { data: routes = [], isLoading } = useQuery({
    queryKey: tKey(['school-routes', tab]),
    queryFn: () => api.getSchoolRoutes({ view: tab === 'routes' ? undefined : tab }),
    enabled: tab !== 'attendance',
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">School Routes</h1>
          <p className="text-sm text-ink-soft">Managed home-to-school services — routes generate dated jobs on a rolling calendar.</p>
        </div>
        <Link to="/school-routes/new" className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700">
          Create school route
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Active routes" value={String(summary?.activeRoutes ?? 0)} />
        <Stat label="Pupils today" value={String(summary?.pupilsToday ?? 0)} />
        <Stat label="Unscheduled jobs" value={String(summary?.unscheduledJobs ?? 0)} />
        <Stat label="Exceptions" value={String(summary?.exceptions ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {SCHOOL_ROUTE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === 'attendance') {
                window.location.href = '/school-routes/sch-route-1/attendance'
                return
              }
              setSearchParams({ tab: t.id })
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t.id ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SectionCard title="School route register">
        {isLoading ? (
          <p className="text-sm text-muted">Loading routes…</p>
        ) : routes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No school routes</p>
            <p className="mt-1 text-sm text-ink-soft">
              Create an AM or PM route with pupils, stops and term dates.
            </p>
            <Link to="/school-routes/new" className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
              Create school route
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">School</th>
                  <th className="px-3 py-2">AM/PM</th>
                  <th className="px-3 py-2">Pupils</th>
                  <th className="px-3 py-2">Days</th>
                  <th className="px-3 py-2">Next service</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-surface-muted/50">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/school-routes/${r.id}`} className="text-command-600 hover:underline">{r.reference}</Link>
                    </td>
                    <td className="px-3 py-2">{r.schoolName}</td>
                    <td className="px-3 py-2">{r.directionLabel}</td>
                    <td className="px-3 py-2">{r.pupilCount}</td>
                    <td className="px-3 py-2">{r.daysLabel}</td>
                    <td className="px-3 py-2">{r.nextService ?? '—'}</td>
                    <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Commercial schools in <Link to="/schools" className="font-medium text-command-600 hover:underline">Schools</Link>.
          Jobs in <Link to="/jobs" className="font-medium text-command-600 hover:underline">Jobs</Link>.
        </p>
      </SectionCard>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}
