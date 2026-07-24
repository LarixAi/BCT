import { Sparkles } from 'lucide-react'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { OptimisationSuggestion } from '@/lib/schedule/schedule-optimisation'

type ScheduleOptimisationPanelProps = {
  suggestions: OptimisationSuggestion[]
  onApplyCrew?: (driverId: string, vehicleId?: string) => void
  onApplyGrouping?: (jobIds: string[]) => void
}

const categoryLabel: Record<OptimisationSuggestion['category'], string> = {
  grouping: 'Trip grouping',
  stop_order: 'Stop order',
  crew: 'Crew',
  capacity: 'Capacity',
  dead_mileage: 'Dead mileage',
}

export function ScheduleOptimisationPanel({
  suggestions,
  onApplyCrew,
  onApplyGrouping,
}: ScheduleOptimisationPanelProps) {
  return (
    <SectionCard
      title="Optimisation"
      description="Suggested grouping, stop order, crew and mileage improvements"
    >
      {suggestions.length === 0 ? (
        <p className="text-sm text-ink-soft">No optimisation suggestions for the current selection.</p>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm',
                suggestion.priority === 'high'
                  ? 'border-command-200 bg-command-50/50'
                  : 'border-border bg-surface',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {categoryLabel[suggestion.category]}
                  </p>
                  <p className="mt-0.5 font-semibold text-ink">{suggestion.title}</p>
                  <p className="mt-1 text-xs text-ink-soft">{suggestion.detail}</p>
                  <p className="mt-1 text-xs font-medium text-command-700">{suggestion.impactLabel}</p>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-command-600" aria-hidden />
              </div>
              {suggestion.category === 'crew' && suggestion.driverId && onApplyCrew ? (
                <button
                  type="button"
                  onClick={() => onApplyCrew(suggestion.driverId!, suggestion.vehicleId)}
                  className="mt-2 text-xs font-semibold text-command-700 hover:underline"
                >
                  Apply crew suggestion
                </button>
              ) : null}
              {suggestion.category === 'grouping' && suggestion.jobIds?.length && onApplyGrouping ? (
                <button
                  type="button"
                  onClick={() => onApplyGrouping(suggestion.jobIds!)}
                  className="mt-2 text-xs font-semibold text-command-700 hover:underline"
                >
                  Select jobs for new trip
                </button>
              ) : null}
              {suggestion.category === 'stop_order' ? (
                <p className="mt-2 text-xs text-ink-soft">Open the trip route tab to publish a reordered version.</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
