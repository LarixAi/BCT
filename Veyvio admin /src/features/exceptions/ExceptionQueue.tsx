import { SectionCard, StatusBadge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { EXCEPTION_MODULE_FILTERS } from '@/lib/exceptions/exception-filters'
import type { ExceptionCategory, OperationalException } from '@/lib/types'

function typeLabel(ex: OperationalException) {
  if (ex.typeCode) return ex.typeCode.replace(/_/g, ' ')
  return ex.category
}

function slaLabel(ex: OperationalException) {
  if (ex.slaMinutesRemaining == null) return '—'
  if (ex.slaMinutesRemaining < 0) return 'Breached'
  return `${ex.slaMinutesRemaining} min`
}

function priorityClass(severity: string) {
  if (severity === 'critical') return 'text-red-700'
  if (severity === 'high') return 'text-amber-800'
  if (severity === 'medium') return 'text-amber-700'
  return 'text-command-700'
}

export function ExceptionQueue({
  rows,
  selectedId,
  selectedIds,
  module,
  onModule,
  onSelect,
  onToggleSelect,
  onToggleAll,
}: {
  rows: OperationalException[]
  selectedId: string | null
  selectedIds: Set<string>
  module: ExceptionCategory | 'all'
  onModule: (id: ExceptionCategory | 'all') => void
  onSelect: (ex: OperationalException) => void
  onToggleSelect: (id: string) => void
  onToggleAll: (checked: boolean) => void
}) {
  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.has(r.id))

  return (
    <SectionCard
      title="Exception queue"
      description="Discover, decide and act"
      className="flex min-h-0 flex-col overflow-hidden"
      flush
    >
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {EXCEPTION_MODULE_FILTERS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onModule(t.id)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium',
              module === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-slate-500">
            No exceptions match this filter.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => onToggleAll(e.target.checked)}
                    aria-label="Select all exceptions"
                  />
                </th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Age</th>
                <th className="px-3 py-2 font-medium">SLA</th>
                <th className="px-3 py-2 font-medium">Next</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ex) => {
                const breached = ex.slaMinutesRemaining != null && ex.slaMinutesRemaining < 0
                return (
                  <tr
                    key={ex.id}
                    onClick={() => onSelect(ex)}
                    className={cn(
                      'cursor-pointer border-b border-slate-100 hover:bg-slate-50',
                      selectedId === ex.id && 'bg-command-50',
                      ex.status === 'resolved' && 'opacity-70',
                    )}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ex.id)}
                        onChange={() => onToggleSelect(ex.id)}
                        aria-label={`Select ${ex.title}`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge kind="severity" value={ex.severity} />
                      {ex.escalated && (
                        <span className="mt-1 block text-[10px] font-semibold uppercase text-red-700">
                          Escalated
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 capitalize text-slate-600">{typeLabel(ex)}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{ex.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {ex.description ?? ex.relatedRecord}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{ex.owner ?? '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-700">{ex.ageMinutes} min</td>
                    <td
                      className={cn(
                        'px-3 py-2.5 tabular-nums font-medium',
                        breached ? 'text-red-700' : 'text-slate-700',
                      )}
                    >
                      {slaLabel(ex)}
                    </td>
                    <td className={cn('px-3 py-2.5 text-xs font-medium', priorityClass(ex.severity))}>
                      {ex.recommendedAction
                        ? ex.recommendedAction.split(/[.!]/)[0]
                        : ex.status.replace(/_/g, ' ')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </SectionCard>
  )
}
