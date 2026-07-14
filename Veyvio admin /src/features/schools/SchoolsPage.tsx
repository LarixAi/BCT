import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function SchoolsPage() {
  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['schools'],
    queryFn: () => api.getSchools(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Schools</h1>
        <p className="text-sm text-slate-600">School contracts — routes and pupil transport volumes</p>
      </div>

      <SectionCard title="School register">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : schools.length === 0 ? (
          <p className="text-sm text-slate-500">No schools registered.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {schools.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <h2 className="font-semibold text-slate-900">{s.name}</h2>
                {s.address && <p className="mt-1 text-sm text-slate-500">{s.address}</p>}
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Routes</dt>
                    <dd className="font-medium">{s.routeCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Pupils transported</dt>
                    <dd className="font-medium">{s.pupilCount}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
