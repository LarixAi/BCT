import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { SUMMARY_CARD_GROUPS } from '@/lib/maintenance/constants'
import { filterFleetRows } from '@/lib/maintenance/aggregate'
import { PRIORITY_GROUP_LABELS } from '@/lib/maintenance/constants'
import { MAINTENANCE_STATUS_LABELS } from '@/lib/maintenance/constants'
import { DEFECT_SEVERITY_LABELS } from '@/lib/vehicles/defects'
import type { MaintenanceHubData } from '@/lib/maintenance/types'

export function MaintenanceOverviewTab({
  hub,
  filter,
  onFilter,
  search,
  onSearch,
}: {
  hub: MaintenanceHubData
  filter: string
  onFilter: (f: string) => void
  search: string
  onSearch: (s: string) => void
}) {
  const fleetRows = useMemo(() => filterFleetRows(hub.fleetRows, filter, search), [hub.fleetRows, filter, search])

  return (
    <div className="space-y-6">
      {SUMMARY_CARD_GROUPS.map((group) => (
        <div key={group.title}>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {group.cards.map((card) => {
              const value = hub.summary[card.group][card.id as keyof typeof hub.summary[typeof card.group]]
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onFilter(card.filterKey)}
                  className={`rounded-xl border p-3 text-left transition ${
                    filter === card.filterKey
                      ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
                  <p className="text-xs text-slate-600">{card.label}</p>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <SectionCard title="Maintenance priority board" description="Safety, compliance and workshop items requiring action">
        {hub.priorityQueue.length === 0 ? (
          <p className="text-sm text-slate-500">No priority maintenance items.</p>
        ) : (
          <div className="space-y-4">
            {(['critical', 'urgent', 'attention'] as const).map((group) => {
              const items = hub.priorityQueue.filter((i) => i.priorityGroup === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {PRIORITY_GROUP_LABELS[group]}
                  </h3>
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {items.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm">
                        <div>
                          <Link to={`/vehicles/${item.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                            {item.registrationNumber}
                          </Link>
                          <span className="text-slate-500"> · {item.depot}</span>
                          <p className="mt-1 text-slate-800">{item.issue}</p>
                          <p className="text-xs text-slate-500">
                            {item.operationalImpact} · {MAINTENANCE_STATUS_LABELS[item.maintenanceStage] ?? item.maintenanceStage}
                            {item.upcomingWork && ` · ${item.upcomingWork}`}
                          </p>
                        </div>
                        <StatusPill status={item.severity === 'dangerous' ? 'non_compliant' : item.priorityGroup === 'urgent' ? 'warning' : 'info'} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search registration, depot, issue…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        {filter !== 'all' && (
          <button type="button" onClick={() => onFilter('all')} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Clear filter
          </button>
        )}
      </div>

      <SectionCard title="Maintenance fleet list" description={`${fleetRows.length} vehicles · operational and maintenance status shown separately`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3 font-medium">Vehicle</th>
                <th className="pb-2 pr-3 font-medium">Depot</th>
                <th className="pb-2 pr-3 font-medium">Operational</th>
                <th className="pb-2 pr-3 font-medium">Maintenance</th>
                <th className="pb-2 pr-3 font-medium">Current issue</th>
                <th className="pb-2 pr-3 font-medium">Next service</th>
                <th className="pb-2 pr-3 font-medium">Compliance</th>
                <th className="pb-2 pr-3 font-medium">Downtime</th>
                <th className="pb-2 pr-3 font-medium">Workshop</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fleetRows.map((row) => (
                <tr key={row.vehicleId} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2.5 pr-3">
                    <Link to={`/vehicles/${row.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                      {row.registrationNumber}
                    </Link>
                    {row.fleetNumber && <p className="text-xs text-slate-500">{row.fleetNumber}</p>}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">{row.depot}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill status={row.operationalStatus} />
                  </td>
                  <td className="py-2.5 pr-3 text-slate-700">{MAINTENANCE_STATUS_LABELS[row.maintenanceStatus]}</td>
                  <td className="py-2.5 pr-3">
                    <p className="max-w-[200px] truncate text-slate-700">{row.currentIssue ?? '—'}</p>
                    {row.severity && <p className="text-xs text-slate-500">{DEFECT_SEVERITY_LABELS[row.severity]}</p>}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {row.nextServiceDate ? new Date(row.nextServiceDate).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-slate-600">{row.complianceSummary}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{row.downtimeHours != null ? `${row.downtimeHours}h` : '—'}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{row.workshop ?? '—'}</td>
                  <td className="py-2.5">
                    <Link to={`/vehicles/${row.vehicleId}?tab=Maintenance`} className="text-xs font-medium text-command-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
