import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { countJobsToGenerate } from '@/lib/school-routes/job-generation'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function SchoolRouteDetailPage() {
  const { routeId = '' } = useParams()
  const queryClient = useQueryClient()

  const { data: route, isLoading } = useQuery({
    queryKey: tKey(['school-route', routeId]),
    queryFn: () => api.getSchoolRoute(routeId),
    enabled: !!routeId,
  })

  const publish = useMutation({
    mutationFn: () => api.publishSchoolRoute(routeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['school-route', routeId]) })
      queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
    },
  })

  if (isLoading || !route) {
    return <p className="p-6 text-sm text-muted">Loading school route…</p>
  }

  const jobCount = route.status === 'published' ? route.generatedJobCount : countJobsToGenerate(route)

  return (
    <div className="space-y-4">
      <div>
        <Link to="/school-routes" className="text-sm font-medium text-command-600 hover:underline">← School Routes</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{route.reference}</h1>
          <StatusPill status={route.status} />
        </div>
        <p className="text-sm text-ink-soft">{route.schoolName} · v{route.version}</p>
      </div>

      <SectionCard title="Route pattern">
        <p className="text-sm">{route.directionMode === 'both' ? 'AM & PM' : route.directionMode.toUpperCase()} · {route.pupils.length} pupils</p>
        <p className="mt-1 text-sm text-ink-soft">{route.term.termName}: {route.term.startDate} → {route.term.endDate}</p>
      </SectionCard>

      <SectionCard title="Jobs">
        <p className="text-sm">
          {route.status === 'published'
            ? `${route.generatedJobCount} jobs generated in rolling window`
            : `${jobCount} jobs will be generated on publish`}
        </p>
        {route.jobIds.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            View in <Link to="/jobs" className="font-medium text-command-600 hover:underline">Jobs</Link>
          </p>
        )}
      </SectionCard>

      <div className="flex flex-wrap gap-2">
        <Link to={`/school-routes/${route.id}/attendance`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Attendance
        </Link>
        {route.status !== 'published' && (
          <button
            type="button"
            onClick={() => publish.mutate()}
            disabled={publish.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            Publish route
          </button>
        )}
      </div>
    </div>
  )
}
