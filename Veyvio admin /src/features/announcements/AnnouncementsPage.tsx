import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function AnnouncementsPage() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Announcements</h1>
        <p className="text-sm text-ink-soft">Company-wide and depot-specific operational notices</p>
      </div>

      <SectionCard title="Active announcements" description={`${announcements.length} notices`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-muted">No announcements published.</p>
        ) : (
          <ul className="space-y-4">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-ink">{a.title}</h2>
                  {a.priority && <StatusPill status={a.priority} />}
                  {a.depotName && (
                    <span className="text-xs text-muted">{a.depotName}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-soft">{a.body}</p>
                <time className="mt-2 block text-xs text-muted">
                  {new Date(a.publishedAt).toLocaleString('en-GB')}
                </time>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
