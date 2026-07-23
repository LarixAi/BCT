import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function AuditLogPage() {
  const [search, setSearch] = useState('')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api.getAuditLogs(),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.user?.email.toLowerCase().includes(q),
    )
  }, [logs, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit Log</h1>
        <p className="text-sm text-ink-soft">Company activity and change history</p>
      </div>

      <input
        type="search"
        placeholder="Search action, entity, user…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
      />

      <SectionCard title="Activity log" description={`${filtered.length} entries`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted">No audit entries yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">When</th>
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">Entity</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {new Date(log.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-soft">
                    {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                  </td>
                  <td className="py-2.5 pr-4 capitalize text-ink-soft">
                    {log.entityType.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 font-medium text-ink">{log.action.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
