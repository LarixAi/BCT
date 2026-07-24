import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function SchoolRouteAttendancePage() {
  const { routeId = '' } = useParams()
  const { data: route } = useQuery({
    queryKey: tKey(['school-route', routeId]),
    queryFn: () => api.getSchoolRoute(routeId),
    enabled: !!routeId,
  })
  const { data: rows = [], isLoading } = useQuery({
    queryKey: tKey(['school-route-attendance', routeId]),
    queryFn: () => api.getSchoolRouteAttendance(routeId),
    enabled: !!routeId,
  })

  return (
    <div className="space-y-4">
      <div>
        <Link to={`/school-routes/${routeId}`} className="text-sm font-medium text-command-600 hover:underline">← Route detail</Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Attendance</h1>
        <p className="text-sm text-ink-soft">{route?.reference} · {route?.schoolName}</p>
      </div>
      <SectionCard title="Today's register">
        {isLoading ? (
          <p className="text-sm text-muted">Loading attendance…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="px-3 py-2">Pupil</th>
                <th className="px-3 py-2">Direction</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-3 py-2">{r.pupilName}</td>
                  <td className="px-3 py-2 uppercase">{r.direction}</td>
                  <td className="px-3 py-2 capitalize">{r.status.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
