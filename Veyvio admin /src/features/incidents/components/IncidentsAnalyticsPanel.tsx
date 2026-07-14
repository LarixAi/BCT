import { SectionCard } from '@/components/ui'
import { CATEGORY_LABELS, SEVERITY_DISPLAY } from '@/lib/incidents/constants'
import type { IncidentAnalytics, RecurringIncidentAlert } from '@/lib/incidents/types'

export function IncidentsAnalyticsPanel({
  analytics,
  recurringAlerts = [],
}: {
  analytics: IncidentAnalytics
  recurringAlerts?: RecurringIncidentAlert[]
}) {
  return (
    <SectionCard title="Incident analytics" description="Trends, causes and prevention reporting">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="incidents-analytics">
        <Stat label="Avg acknowledge" value={`${analytics.avgAcknowledgeHours} hr`} />
        <Stat label="Avg contain" value={`${analytics.avgContainHours} hr`} />
        <Stat label="Overdue actions" value={analytics.overdueActions} tone={analytics.overdueActions > 0 ? 'danger' : 'neutral'} />
        <Stat label="Near misses" value={analytics.nearMissRate} />
        <Stat label="Preventable" value={analytics.preventableCount} />
      </div>
      {recurringAlerts.length > 0 && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/60 p-4" data-testid="analytics-recurring">
          <h3 className="text-sm font-semibold text-amber-900">Recurring patterns</h3>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {recurringAlerts.map((alert) => (
              <li key={alert.id}>{alert.summary}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">By type</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.byType.map((t) => (
              <li key={t.category} className="flex justify-between"><span>{CATEGORY_LABELS[t.category] ?? t.category}</span><span className="tabular-nums">{t.count}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">By severity</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.bySeverity.map((s) => (
              <li key={s.severity} className="flex justify-between"><span>{SEVERITY_DISPLAY[s.severity]}</span><span className="tabular-nums">{s.count}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase text-slate-500">By depot</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.byDepot.map((d) => (
              <li key={d.depotName} className="flex justify-between"><span>{d.depotName}</span><span className="tabular-nums">{d.count}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'danger' }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
      <p className={`text-xl font-bold tabular-nums ${tone === 'danger' ? 'text-red-800' : 'text-slate-900'}`}>{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  )
}
