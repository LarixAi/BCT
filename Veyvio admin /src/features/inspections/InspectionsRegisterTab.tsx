import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { ATTENTION_CARDS, INSPECTION_OUTCOME_LABELS, INSPECTION_STATUS_LABELS, INSPECTION_TYPE_LABELS, SAVED_VIEWS } from '@/lib/inspections/constants'
import { daysRemainingLabel } from '@/lib/inspections/due'
import { filterInspectionRegister } from '@/lib/inspections/aggregate'
import type { InspectionsHubData } from '@/lib/inspections/types'

export function InspectionsRegisterTab({
  hub,
  filter,
  onFilter,
  search,
  onSearch,
}: {
  hub: InspectionsHubData
  filter: string
  onFilter: (f: string) => void
  search: string
  onSearch: (s: string) => void
}) {
  const rows = useMemo(
    () => filterInspectionRegister(hub.register, filter, search),
    [hub.register, filter, search],
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {ATTENTION_CARDS.map((card) => {
          const value = hub.summary[card.id as keyof typeof hub.summary]
          const selected = filter === card.filterKey
          const critical = card.tone === 'critical'
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onFilter(card.filterKey)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                  : critical
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <p className={`text-xl font-bold tabular-nums ${critical ? 'text-red-800' : 'text-ink'}`}>
                {value}
                {'suffix' in card && card.suffix ? card.suffix : ''}
              </p>
              <p className={`text-xs ${critical ? 'text-red-700' : 'text-ink-soft'}`}>{card.label}</p>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Saved views</span>
        {SAVED_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onFilter(v.filterKey)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === v.filterKey
                ? 'border-command-500 bg-command-50 text-command-800'
                : 'border-border bg-surface text-ink-soft hover:bg-surface-muted'
            }`}
          >
            {v.label}
          </button>
        ))}
        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => onFilter('all')}
            className="text-xs font-medium text-command-600 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      <SectionCard
        title="Inspection register"
        description="Formal inspections only — daily vehicle checks stay in Vehicle Checks"
      >
        <div className="mb-3">
          <label className="block text-sm">
            <span className="sr-only">Search register</span>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search registration, depot, provider…"
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No inspections match this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-medium">Vehicle</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Due</th>
                  <th className="pb-2 pr-3 font-medium">Booked</th>
                  <th className="pb-2 pr-3 font-medium">Provider</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Outcome</th>
                  <th className="pb-2 font-medium">Links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                    <td className="py-2.5 pr-3">
                      <Link
                        to={`/inspections/${r.id}`}
                        className="font-medium tabular-nums text-command-600 hover:underline"
                      >
                        {r.registrationNumber}
                      </Link>
                      {r.fleetNumber && <span className="text-muted"> · {r.fleetNumber}</span>}
                      <p className="text-xs text-muted">{r.depot}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{INSPECTION_TYPE_LABELS[r.inspectionType]}</td>
                    <td className="py-2.5 pr-3">
                      <p className="tabular-nums text-ink">
                        {new Date(r.dueDate).toLocaleDateString('en-GB')}
                      </p>
                      <p className="text-xs text-muted">{daysRemainingLabel(r.dueDate)}</p>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-soft">
                      {r.bookedDate ? new Date(r.bookedDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{r.provider}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={r.status} />
                      <p className="mt-0.5 text-[11px] text-muted">
                        {INSPECTION_STATUS_LABELS[r.status] ?? r.status}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {INSPECTION_OUTCOME_LABELS[r.outcome] ?? r.outcome}
                    </td>
                    <td className="py-2.5 text-xs text-ink-soft">
                      {r.linkedWorkOrders.length > 0 && (
                        <p>
                          {r.linkedWorkOrders.length} WO
                          {r.linkedWorkOrders.length === 1 ? '' : 's'}
                        </p>
                      )}
                      {r.linkedDefects.length > 0 && (
                        <p>
                          {r.linkedDefects.length} defect
                          {r.linkedDefects.length === 1 ? '' : 's'}
                        </p>
                      )}
                      {r.linkedWorkOrders.length === 0 && r.linkedDefects.length === 0 && '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
