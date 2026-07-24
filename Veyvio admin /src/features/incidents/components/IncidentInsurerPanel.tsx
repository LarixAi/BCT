import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { canAssessRegulatory } from '@/lib/incidents/permissions'
import type { IncidentDetailRecord } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function IncidentInsurerPanel({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canSubmit = canAssessRegulatory(user?.permissions ?? [])

  const { data: hub } = useQuery({ queryKey: tKey(['incidents-hub']), queryFn: () => api.getIncidentsHub() })
  const submission = incident.insurerSubmission
  const connectors = hub?.insurerConnectors ?? []

  const submit = useMutation({
    mutationFn: (connectorId: string) =>
      api.submitIncidentToInsurerHub({ incidentId: incident.id, connectorId }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['incident-detail', incident.id]) })
      queryClient.invalidateQueries({ queryKey: tKey(['incidents-hub']) })
    },
  })

  const hasInsurerAssessment = incident.regulatoryAssessments.some((r) => r.authority === 'insurer')

  if (!hasInsurerAssessment && !submission) {
    return null
  }

  return (
    <SectionCard title="Insurer connector" description="Submit incident pack to connected fleet insurer (mock API)">
      <div data-testid="incident-insurer-panel">
        {submission && (
          <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Insurer</dt>
              <dd className="font-medium">{submission.insurerName}</dd>
            </div>
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="font-medium capitalize">{submission.status.replace(/_/g, ' ')}</dd>
            </div>
            {submission.externalReference && (
              <div className="sm:col-span-2">
                <dt className="text-muted">External reference</dt>
                <dd className="font-mono text-sm">{submission.externalReference}</dd>
              </div>
            )}
          </dl>
        )}

        {canSubmit && submission?.status !== 'submitted' && (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">Select connector to submit:</p>
            <div className="flex flex-wrap gap-2">
              {connectors.map((conn) => (
                <button
                  key={conn.id}
                  type="button"
                  disabled={conn.status !== 'connected' || submit.isPending}
                  onClick={() => submit.mutate(conn.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
                  data-testid={`submit-insurer-${conn.id}`}
                >
                  Submit via {conn.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
