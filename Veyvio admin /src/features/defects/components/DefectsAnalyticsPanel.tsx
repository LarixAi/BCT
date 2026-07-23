import { SectionCard } from '@/components/ui'
import type { DefectAnalytics } from '@/lib/defects/types'

export function DefectsAnalyticsPanel({ analytics }: { analytics: DefectAnalytics }) {
  return (
    <SectionCard title="Operational intelligence" description="Defect patterns across the fleet">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="defects-analytics">
        <Stat label="SLA breaches" value={analytics.slaBreaches} tone={analytics.slaBreaches > 0 ? 'danger' : 'neutral'} />
        <Stat label="Average age" value={`${analytics.avgAgeHours} hr`} />
        <Stat label="Reopened" value={analytics.reopenedCount} tone={analytics.reopenedCount > 0 ? 'warning' : 'neutral'} />
        <Stat label="Closed this week" value={analytics.closedThisWeek} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">By depot</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.byDepot.slice(0, 5).map((d) => (
              <li key={d.depotName} className="flex justify-between gap-2">
                <span className="text-ink-soft">{d.depotName}</span>
                <span className="tabular-nums text-ink">
                  {d.openCount}
                  {d.criticalCount > 0 && <span className="ml-1 text-red-700">({d.criticalCount} critical)</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">By category</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between gap-2 capitalize">
                <span className="text-ink-soft">{c.category}</span>
                <span className="tabular-nums text-ink">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">By source</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {analytics.bySource.map((s) => (
              <li key={s.source} className="flex justify-between gap-2 capitalize">
                <span className="text-ink-soft">{s.source}</span>
                <span className="tabular-nums text-ink">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'danger' | 'warning' }) {
  const toneClass =
    tone === 'danger' ? 'text-red-800' : tone === 'warning' ? 'text-amber-800' : 'text-ink'
  return (
    <div className="rounded-lg border border-border bg-surface-muted/50 p-3">
      <p className={`text-xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  )
}
