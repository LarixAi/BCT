import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function IntegrationsPage() {
  const { data: integrations = [], isLoading } = useQuery({
    queryKey: tKey(['integrations']),
    queryFn: () => api.getIntegrations(),
  })

  const connected = integrations.filter((i) => i.status === 'connected').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Integrations</h1>
        <p className="text-sm text-ink-soft">Connected services — telematics, accounting and external portals</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold tabular-nums">{connected}</p>
          <p className="text-sm text-ink-soft">Connected</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold tabular-nums">{integrations.length}</p>
          <p className="text-sm text-ink-soft">Total integrations</p>
        </div>
      </div>

      <SectionCard title="Integration register">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-border">
            {integrations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-ink">{i.name}</p>
                  <p className="text-sm text-muted">{i.provider}</p>
                </div>
                <div className="text-right">
                  <StatusPill status={i.status} />
                  {i.lastSyncAt && (
                    <p className="mt-1 text-xs text-muted">
                      Last sync {new Date(i.lastSyncAt).toLocaleString('en-GB')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
