import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { formatIncidentAutomationActions } from '@/lib/incidents/automation'
import { canManageIncidentSettings } from '@/lib/incidents/permissions'
import type { IncidentSettings } from '@/lib/incidents/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { formatRoleList } from '@/lib/format'
import { IncidentIntegrationsPanel } from './components/IncidentIntegrationsPanel'

export function IncidentSettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canManage = canManageIncidentSettings(user?.permissions ?? [])

  const { data: settings, isLoading } = useQuery({
    queryKey: ['incident-settings'],
    queryFn: () => api.getIncidentSettings(),
  })

  const { data: hub } = useQuery({
    queryKey: ['incidents-hub'],
    queryFn: () => api.getIncidentsHub(),
  })

  const save = useMutation({
    mutationFn: (patch: Partial<IncidentSettings>) => api.updateIncidentSettings(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident-settings'] }),
  })

  if (isLoading || !settings) {
    return <p className="text-sm text-muted">Loading incident settings…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/incidents" className="text-sm text-command-600 hover:underline">← Incidents</Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Incident settings</h1>
        <p className="text-sm text-ink-soft">Company safety response rules, assessment clocks, and automation</p>
      </div>

      <SectionCard title="Response rules" description="Configurable safety controls for critical incidents">
        <dl className="grid gap-3 text-sm sm:grid-cols-2" data-testid="incident-settings">
          <ToggleRow
            label="Require senior acknowledgement for critical"
            value={settings.requireSeniorAckForCritical}
            disabled={!canManage}
            onChange={(v) => save.mutate({ requireSeniorAckForCritical: v })}
          />
          <ToggleRow
            label="Auto-block vehicle on critical"
            value={settings.autoBlockVehicleOnCritical}
            disabled={!canManage}
            onChange={(v) => save.mutate({ autoBlockVehicleOnCritical: v })}
          />
          <ToggleRow
            label="Auto-pause driver assignment on critical"
            value={settings.autoPauseDriverOnCritical}
            disabled={!canManage}
            onChange={(v) => save.mutate({ autoPauseDriverOnCritical: v })}
          />
          <ToggleRow
            label="Near-miss tracking enabled"
            value={settings.nearMissTrackingEnabled}
            disabled={!canManage}
            onChange={(v) => save.mutate({ nearMissTrackingEnabled: v })}
          />
          <div>
            <dt className="text-muted">ICO assessment window</dt>
            <dd className="font-medium">{settings.icoAssessmentHours} hours</dd>
          </div>
          <div>
            <dt className="text-muted">RIDDOR assessment window</dt>
            <dd className="font-medium">{settings.riddorAssessmentDays} days</dd>
          </div>
          <div>
            <dt className="text-muted">Welfare follow-up default</dt>
            <dd className="font-medium">{settings.welfareFollowUpDays} days</dd>
          </div>
          <div>
            <dt className="text-muted">Notify roles</dt>
            <dd className="font-medium">{formatRoleList(settings.notifyRoles)}</dd>
          </div>
        </dl>
      </SectionCard>

      <IncidentIntegrationsPanel />

      <SectionCard title="Automation rules" description="Automated responses when incidents are reported">
        <ul className="divide-y divide-border" data-testid="incident-automation-rules">
          {(hub?.automationRules ?? []).map((rule) => (
            <li key={rule.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{rule.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">{rule.description}</p>
                  <p className="mt-1 text-xs text-muted">{formatIncidentAutomationActions(rule.actions)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-muted text-ink-soft'}`}>
                  {rule.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      {hub && hub.recurringAlerts.length > 0 && (
        <SectionCard title="Recurring incident patterns" description="Multiple open incidents of the same type at a depot">
          <ul className="space-y-2 text-sm" data-testid="recurring-incidents">
            {hub.recurringAlerts.map((alert) => (
              <li key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {alert.summary} — {alert.incidentRefs.join(', ')}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string
  value: boolean
  disabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(!value)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${value ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-muted text-ink-soft'} disabled:opacity-50`}
        >
          {value ? 'Yes' : 'No'}
        </button>
      </dd>
    </div>
  )
}
