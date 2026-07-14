import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { SEVERITY_DISPLAY } from '@/lib/defects/constants'
import type { DefectRecurringInsight } from '@/lib/defects/types'

export function RecurringDefectsPanel({ insights }: { insights: DefectRecurringInsight[] }) {
  if (insights.length === 0) {
    return (
      <SectionCard title="Recurring defect intelligence">
        <p className="text-sm text-slate-500">No recurring component patterns detected in the current window.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Recurring defect intelligence" description="Patterns requiring engineering investigation rather than isolated repair">
      <ul className="space-y-3" data-testid="recurring-insights">
        {insights.map((insight) => (
          <li key={insight.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">
                  {insight.registrationNumber} — {insight.component}
                </p>
                <p className="text-sm text-slate-600">
                  {insight.occurrenceCount} occurrences in {insight.windowDays} days · {insight.depotName}
                </p>
                <p className="mt-2 text-sm text-amber-900">{insight.recommendation}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-900">
                  {SEVERITY_DISPLAY[insight.severity] ?? insight.severity}
                </span>
                {insight.openDefectIds[0] && (
                  <Link
                    to={`/defects/${insight.openDefectIds[0]}`}
                    className="text-sm font-medium text-command-600 hover:underline"
                  >
                    Review {insight.latestDefectRef}
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
