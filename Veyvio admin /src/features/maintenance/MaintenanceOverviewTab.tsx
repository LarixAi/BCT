import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { ATTENTION_CARDS, PRIORITY_GROUP_LABELS, SUMMARY_CARD_GROUPS } from '@/lib/maintenance/constants'
import { filterFleetRows } from '@/lib/maintenance/aggregate'
import { MAINTENANCE_STATUS_LABELS } from '@/lib/maintenance/constants'
import type { MaintenanceHubData } from '@/lib/maintenance/types'

export function MaintenanceOverviewTab({
  hub,
  filter,
  onFilter,
  search,
  onSearch,
  onOpenTab,
}: {
  hub: MaintenanceHubData
  filter: string
  onFilter: (f: string) => void
  search: string
  onSearch: (s: string) => void
  onOpenTab?: (tab: string) => void
}) {
  const fleetRows = useMemo(() => filterFleetRows(hub.fleetRows, filter, search), [hub.fleetRows, filter, search])
  const upcoming = useMemo(() => {
    const now = Date.now()
    const horizon = now + 30 * 24 * 60 * 60 * 1000
    return hub.calendar
      .filter((e) => {
        const t = new Date(e.date).getTime()
        return t >= now - 24 * 60 * 60 * 1000 && t <= horizon
      })
      .slice(0, 16)
  }, [hub.calendar])

  const fa = hub.summary.fleetAvailability
  const risk = hub.summary.maintenanceRisk

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {ATTENTION_CARDS.map((card) => {
          const value = hub.summary.attention[card.id as keyof typeof hub.summary.attention]
          const selected = filter === card.filterKey
          const critical = card.tone === 'critical'
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (card.filterKey === 'vor' && onOpenTab) onOpenTab('vor')
                else onFilter(card.filterKey)
              }}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                  : critical
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <p className={`text-xl font-bold tabular-nums ${critical ? 'text-red-800' : 'text-ink'}`}>{value}</p>
              <p className={`text-xs ${critical ? 'text-red-700' : 'text-ink-soft'}`}>{card.label}</p>
            </button>
          )
        })}
      </div>

      <SectionCard title="Maintenance attention" description="Critical and overdue items ordered by risk">
        {hub.priorityQueue.length === 0 ? (
          <p className="text-sm text-muted">No priority maintenance items.</p>
        ) : (
          <div className="space-y-4">
            {(['critical', 'urgent', 'attention'] as const).map((group) => {
              const items = hub.priorityQueue.filter((i) => i.priorityGroup === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {PRIORITY_GROUP_LABELS[group]}
                  </h3>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {items.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm">
                        <div>
                          <Link
                            to={`/vehicles/${item.vehicleId}?tab=Maintenance`}
                            className="font-medium text-command-600 hover:underline"
                          >
                            {item.registrationNumber}
                          </Link>
                          {item.fleetNumber && <span className="text-muted"> · {item.fleetNumber}</span>}
                          <span className="text-muted"> · {item.depot}</span>
                          <p className="mt-1 text-ink">{item.issue}</p>
                          <p className="text-xs text-muted">
                            {item.operationalImpact} ·{' '}
                            {MAINTENANCE_STATUS_LABELS[item.maintenanceStage] ?? item.maintenanceStage}
                            {item.responsiblePerson && ` · Owner: ${item.responsiblePerson}`}
                            {item.deadline && ` · Deadline: ${item.deadline.slice(0, 10)}`}
                          </p>
                          {item.recommendedAction && (
                            <p className="mt-1 text-xs font-medium text-command-800">→ {item.recommendedAction}</p>
                          )}
                        </div>
                    <StatusPill status={item.severity ?? item.status ?? 'open'} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Upcoming 30 days" description="PMI, service, MOT and workshop bookings">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled in the next 30 days.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcoming.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-1.5">
                  <span className="flex items-center gap-2">
                    <EventIcon type={e.eventType} />
                    <Link to={`/vehicles/${e.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                      {e.registrationNumber}
                    </Link>
                    <span className="text-ink-soft">
                      {(e.title ?? '').replace(` — ${e.registrationNumber}`, '')}
                    </span>
                  </span>
                  <span className="text-xs tabular-nums text-muted">{e.date.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Fleet availability impact" description="Whether enough vehicles are ready for the next period">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Meta label="Available" value={String(fa.available)} />
            <Meta label="Available with advisory" value={String(fa.availableWithAdvisory)} />
            <Meta label="In workshop / maintenance" value={String(fa.inMaintenance)} />
            <Meta label="VOR" value={String(fa.vor)} />
            <Meta label="Awaiting parts" value={String(fa.awaitingParts)} />
            <Meta label="Ready for release" value={String(fa.readyForRelease)} />
            <Meta label="Due soon (still usable)" value={String(fa.dueSoonUsable)} />
            <Meta
              label="Maintenance holds (not assignable)"
              value={String(fa.vor + fa.inMaintenance + fa.awaitingParts)}
            />
          </dl>
          <p className="mt-3 text-xs text-muted">
            Dispatch uses the shared vehicle readiness projection — VOR and workshop holds block allocation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/yard?task=prepare_for_service&tab=tasks"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
            >
              Prepare for workshop →
            </Link>
            <Link
              to="/yard?task=return_inspection&tab=tasks"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-muted"
            >
              Return from workshop →
            </Link>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Maintenance risk" description="Repeat defects, missing evidence and approaching statutory tests">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { key: 'overdueServices', label: 'Overdue services / PMI', filterKey: 'overdue_service', tab: null, tone: 'critical' as const },
              { key: 'dueWithin7Days', label: 'Due within 7 days', filterKey: 'due_soon', tab: null, tone: 'default' as const },
              { key: 'safetyCriticalDefects', label: 'Safety-critical defects', filterKey: 'safety_critical', tab: null, tone: 'critical' as const },
              { key: 'repeatDefectVehicles', label: 'Repeat defect vehicles', filterKey: 'advisory', tab: null, tone: 'default' as const },
              { key: 'motApproaching', label: 'MOT approaching', filterKey: 'all', tab: 'service', tone: 'default' as const },
              { key: 'tachoApproaching', label: 'Tacho approaching', filterKey: 'all', tab: 'service', tone: 'default' as const },
              { key: 'missingEvidence', label: 'Missing PMI evidence', filterKey: 'all', tab: 'compliance', tone: 'critical' as const },
            ] as const
          ).map((card) => {
            const value = Number(risk?.[card.key] ?? 0)
            const critical = card.tone === 'critical' && value > 0
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  if (card.tab && onOpenTab) onOpenTab(card.tab)
                  else onFilter(card.filterKey)
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  critical
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <p className={`text-xl font-bold tabular-nums ${critical ? 'text-red-800' : 'text-ink'}`}>{value}</p>
                <p className={`text-xs ${critical ? 'text-red-700' : 'text-ink-soft'}`}>{card.label}</p>
              </button>
            )
          })}
        </div>
      </SectionCard>

      {SUMMARY_CARD_GROUPS.map((group) => (
        <div key={group.title}>
          <h2 className="mb-2 text-sm font-semibold text-ink-soft">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {group.cards.map((card) => {
              const value = hub.summary.fleetAvailability[card.id as keyof typeof hub.summary.fleetAvailability] ?? 0
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onFilter(card.filterKey)}
                  className={`rounded-xl border p-3 text-left transition ${
                    filter === card.filterKey
                      ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                      : 'border-border bg-surface hover:border-border-strong'
                  }`}
                >
                  <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
                  <p className="text-xs text-ink-soft">{card.label}</p>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <SectionCard title="Fleet register" description="Filter from the cards above">
        <input
          type="search"
          placeholder="Search registration, fleet no, depot…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="mb-3 w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3">Vehicle</th>
                <th className="pb-2 pr-3">Depot</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Issue</th>
                <th className="pb-2 pr-3">Next service</th>
                <th className="pb-2">WOs</th>
              </tr>
            </thead>
            <tbody>
              {fleetRows.map((r) => (
                <tr key={r.vehicleId} className="border-b border-border/60">
                  <td className="py-2 pr-3">
                    <Link to={`/vehicles/${r.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                      {r.registrationNumber}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">{r.depot}</td>
                  <td className="py-2 pr-3">
                    <StatusPill status={r.maintenanceStatus ?? r.operationalStatus ?? 'unknown'} />
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">{r.currentIssue ?? '—'}</td>
                  <td className="py-2 pr-3 text-xs text-ink-soft">{r.nextServiceDate?.slice(0, 10) ?? '—'}</td>
                  <td className="py-2 tabular-nums">{r.openWorkOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}

function EventIcon({ type }: { type: string }) {
  const label =
    type === 'mot'
      ? 'MOT'
      : type === 'calibration'
        ? 'TAC'
        : type === 'retorque'
          ? 'WHEEL'
          : type === 'work_order'
            ? 'WO'
            : type === 'inspection'
              ? 'PMI'
              : 'SVC'
  return (
    <span className="inline-flex min-w-[2.5rem] justify-center rounded bg-surface-muted px-1 py-0.5 text-[10px] font-semibold text-ink-soft">
      {label}
    </span>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}
