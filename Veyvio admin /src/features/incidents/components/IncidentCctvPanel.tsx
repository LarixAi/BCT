import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { canUploadIncidentEvidence } from '@/lib/incidents/permissions'
import type { IncidentDetailRecord } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function IncidentCctvPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canPreserve = canUploadIncidentEvidence(user?.permissions ?? [])

  const preserve = useMutation({
    mutationFn: (assetId: string) =>
      api.requestCctvPreservationHub({ incidentId: incident.id, assetId, retentionHours: 72 }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['incident-detail', incident.id]) })
    },
  })

  if (incident.cctvAssets.length === 0) {
    return (
      <SectionCard title="CCTV integration" description="Live depot camera feeds (mock integration)">
        <p className="text-sm text-muted">No CCTV assets configured for this depot.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="CCTV integration" description="Request clip preservation from connected depot cameras">
      <ul className="divide-y divide-border" data-testid="incident-cctv-assets">
        {incident.cctvAssets.map((asset) => (
          <li key={asset.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
            <div>
              <p className="font-medium text-ink">{asset.label}</p>
              <p className="text-sm text-ink-soft">{asset.coverageArea} · {asset.retentionDays} day retention</p>
              {asset.clipRequested && asset.preservedUntil && (
                <p className="mt-1 text-xs text-emerald-700">
                  Preserved until {new Date(asset.preservedUntil).toLocaleString('en-GB')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${asset.available ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-muted text-ink-soft'}`}>
                {asset.available ? 'Online' : 'Offline'}
              </span>
              {canPreserve && asset.available && !asset.clipRequested && (
                <button
                  type="button"
                  disabled={preserve.isPending}
                  onClick={() => preserve.mutate(asset.id)}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-surface-muted"
                  data-testid={`preserve-cctv-${asset.id}`}
                >
                  Preserve clip
                </button>
              )}
              {asset.clipRequested && (
                <span className="text-xs font-medium text-emerald-700">Clip requested</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
