import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

function formatSchoolAddress(address: unknown): string | null {
  if (!address) return null
  if (typeof address === 'string') return address
  if (typeof address !== 'object') return null
  const row = address as Record<string, unknown>
  const parts = [row.line1, row.line2, row.city, row.town, row.postcode]
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

export function SchoolsPage() {
  const { data: schools = [], isLoading, isError, error } = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const rows = await api.getSchools()
      return (Array.isArray(rows) ? rows : []).map((s) => ({
        ...s,
        address: formatSchoolAddress(s.address) ?? (typeof s.address === 'string' ? s.address : null),
        routeCount: Number(s.routeCount ?? 0),
        pupilCount: Number(s.pupilCount ?? 0),
      }))
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Schools</h1>
        <p className="text-sm text-ink-soft">School contracts — routes and pupil transport volumes</p>
      </div>

      <SectionCard title="School register">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load schools'}</p>
        ) : schools.length === 0 ? (
          <p className="text-sm text-muted">No schools registered.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {schools.map((s) => (
              <div key={s.id} className="rounded-xl border border-border p-4">
                <h2 className="font-semibold text-ink">{s.name}</h2>
                {s.address && <p className="mt-1 text-sm text-muted">{s.address}</p>}
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Routes</dt>
                    <dd className="font-medium">{s.routeCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Pupils transported</dt>
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
