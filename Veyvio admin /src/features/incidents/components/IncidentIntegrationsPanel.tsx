import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { canManageIncidentSettings } from '@/lib/incidents/permissions'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function IncidentIntegrationsPanel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canProcess = canManageIncidentSettings(user?.permissions ?? [])

  const { data: hub } = useQuery({ queryKey: tKey(['incidents-hub']), queryFn: () => api.getIncidentsHub() })
  const feed = hub?.telematicsFeed ?? []
  const pending = feed.filter((f) => !f.processed)

  const process = useMutation({
    mutationFn: (feedItemId: string) => api.processTelematicsFeedHub({ feedItemId }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['incidents-hub']) })
    },
  })

  return (
    <SectionCard title="Telematics event bus" description="Incoming vehicle system events awaiting incident creation">
      {feed.length === 0 ? (
        <p className="text-sm text-muted">No telematics events in queue.</p>
      ) : (
        <ul className="divide-y divide-border" data-testid="telematics-feed">
          {feed.map((item) => (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
              <div>
                <p className="font-medium text-ink">
                  {item.eventType.replace(/_/g, ' ')} — {item.vehicleRegistration}
                </p>
                <p className="text-sm text-ink-soft">{item.location}</p>
                <p className="text-xs text-muted">
                  {item.telematicsReference} · {new Date(item.occurredAt).toLocaleString('en-GB')}
                </p>
                {item.processed && item.linkedIncidentId && (
                  <Link to={`/incidents/${item.linkedIncidentId}`} className="mt-1 inline-block text-xs text-command-600 hover:underline">
                    View incident
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.processed ? 'bg-surface-muted text-ink-soft' : 'bg-amber-100 text-amber-900'}`}>
                  {item.processed ? 'Processed' : 'Pending'}
                </span>
                {canProcess && !item.processed && (
                  <button
                    type="button"
                    disabled={process.isPending}
                    onClick={() => process.mutate(item.id)}
                    className="rounded-lg bg-command-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                    data-testid={`process-telematics-${item.id}`}
                  >
                    Create incident
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {hub && (
        <p className="mt-4 text-xs text-muted" data-testid="risk-summary">
          Risk scoring: {hub.riskSummary.highRiskCount} high-risk open incidents · avg score {hub.riskSummary.avgScore}
          {pending.length > 0 && ` · ${pending.length} telematics event(s) pending`}
        </p>
      )}
    </SectionCard>
  )
}
