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
        <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-600">Company-wide and depot-specific operational notices</p>
      </div>

      <SectionCard title="Active announcements" description={`${announcements.length} notices`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements published.</p>
        ) : (
          <ul className="space-y-4">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{a.title}</h2>
                  {a.priority && <StatusPill status={a.priority} />}
                  {a.depotName && (
                    <span className="text-xs text-slate-500">{a.depotName}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-700">{a.body}</p>
                <time className="mt-2 block text-xs text-slate-400">
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
