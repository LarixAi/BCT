import { SectionCard } from '@/components/ui'
import { formatAutomationActions } from '@/lib/defects/automation'
import { formatSlaRemaining } from '@/lib/defects/sla'
import type { DefectsHubData } from '@/lib/defects/types'

export function DefectsRulesTab({ hub }: { hub: DefectsHubData }) {
  const { slaSettings, automationRules } = hub

  return (
    <div className="space-y-4">
      <SectionCard title="Service-level targets" description="Configurable response rules per company">
        <table className="w-full text-left text-sm" data-testid="defect-sla-table">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-4 font-medium">Severity</th>
              <th className="pb-2 pr-4 font-medium">Triage target</th>
              <th className="pb-2 font-medium">Repair action</th>
            </tr>
          </thead>
          <tbody>
            {(['dangerous', 'major', 'minor', 'advisory'] as const).map((sev) => (
              <tr key={sev} className="border-b border-slate-50">
                <td className="py-2 pr-4 capitalize">{sev === 'dangerous' ? 'Critical' : sev}</td>
                <td className="py-2 pr-4">{formatSlaRemaining(slaSettings.triageMinutes[sev])}</td>
                <td className="py-2">{formatSlaRemaining(slaSettings.repairMinutes[sev])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Block dispatch on critical</dt>
            <dd className="font-medium">{slaSettings.blockDispatchOnCritical ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Block dispatch pending assessment</dt>
            <dd className="font-medium">{slaSettings.blockDispatchOnPendingAssessment ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Recurring threshold</dt>
            <dd className="font-medium">{slaSettings.recurringComponentThreshold} failures in {slaSettings.recurringWindowDays} days</dd>
          </div>
          <div>
            <dt className="text-slate-500">Notify roles</dt>
            <dd className="font-medium">{slaSettings.notifyRoles.join(', ').replace(/_/g, ' ')}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Automation rules" description="Safety and operational rules applied when defects are reported">
        <ul className="divide-y divide-slate-100">
          {automationRules.map((rule) => (
            <li key={rule.id} className="py-3 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{rule.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{rule.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatAutomationActions(rule.actions)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${rule.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {rule.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
