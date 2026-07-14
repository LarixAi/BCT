import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import type { ChecksHubData } from '@/lib/checks/types'

export function ChecksTemplatesTab({ hub }: { hub: ChecksHubData }) {
  return (
    <div className="space-y-4">
      <SectionCard title="Check templates" description={`${hub.templates.length} active templates`}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Template</th>
              <th className="pb-2 pr-3 font-medium">Version</th>
              <th className="pb-2 pr-3 font-medium">Frequency</th>
              <th className="pb-2 pr-3 font-medium">Validity</th>
              <th className="pb-2 pr-3 font-medium">Questions</th>
              <th className="pb-2 font-medium">Approval</th>
            </tr>
          </thead>
          <tbody>
            {hub.templates.map((t) => (
              <tr key={t.id} className="border-b border-slate-50">
                <td className="py-2.5 pr-3">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.vehicleCategories.join(', ')}</p>
                </td>
                <td className="py-2.5 pr-3">{t.version}</td>
                <td className="py-2.5 pr-3 text-slate-600">{t.frequency}</td>
                <td className="py-2.5 pr-3">{t.validityHours}h</td>
                <td className="py-2.5 pr-3 tabular-nums">{t.questionCount}</td>
                <td className="py-2.5">{t.approvalRequired ? 'Required' : 'Auto'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Escalation rules" description="Configured per template">
        <ul className="space-y-2 text-sm">
          {hub.templates.flatMap((t) =>
            t.escalationRules.map((r) => (
              <li key={`${t.id}-${r}`} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span>{t.name}</span>
                <span className="text-slate-500">{r.replace(/_/g, ' ')}</span>
              </li>
            )),
          )}
        </ul>
      </SectionCard>
    </div>
  )
}

export function ChecksIntelligenceTab({ hub }: { hub: ChecksHubData }) {
  const intel = hub.intelligence

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Compliance intelligence" description={`${intel.suspiciousChecksToday} suspicious checks flagged today`}>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Recurring defect vehicles</h3>
        <ul className="mb-4 space-y-1 text-sm">
          {intel.recurringDefectVehicles.map((v) => (
            <li key={v.vehicleId}>
              {v.registrationNumber} — {v.defectCount} open defects
            </li>
          ))}
        </ul>
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Driver check quality</h3>
        <ul className="space-y-1 text-sm">
          {intel.driverQualityAlerts.map((d) => (
            <li key={d.driverName}>
              {d.driverName} — {d.missedChecks} missed checks
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Depot comparison">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="pb-2 text-left font-medium">Depot</th>
              <th className="pb-2 text-right font-medium">Pass rate</th>
              <th className="pb-2 text-right font-medium">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {intel.depotComparison.map((d) => (
              <tr key={d.depotName} className="border-b border-slate-50">
                <td className="py-2">{d.depotName}</td>
                <td className="py-2 text-right tabular-nums">{Math.round(d.passRate * 100)}%</td>
                <td className="py-2 text-right tabular-nums">{d.overdueCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Template performance" className="lg:col-span-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="pb-2 text-left font-medium">Template</th>
              <th className="pb-2 text-right font-medium">Fail rate</th>
              <th className="pb-2 text-right font-medium">Avg duration</th>
            </tr>
          </thead>
          <tbody>
            {intel.templatePerformance.map((t) => (
              <tr key={t.templateName} className="border-b border-slate-50">
                <td className="py-2">{t.templateName}</td>
                <td className="py-2 text-right">
                  <StatusPill status={t.failRate > 0.03 ? 'warning' : 'pass'} />
                  <span className="ml-2 tabular-nums">{Math.round(t.failRate * 100)}%</span>
                </td>
                <td className="py-2 text-right tabular-nums">{t.avgDurationMinutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
