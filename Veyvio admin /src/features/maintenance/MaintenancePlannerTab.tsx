import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import {
  filterPlannerRows,
  mapEventTypeToWorkOrderType,
  uniquePlannerDepots,
  uniquePlannerEventTypes,
  type PlannerDueWindow,
  type PlannerFilters,
} from '@/lib/maintenance/planner'
import type { MaintenanceCalendarEvent, ServiceScheduleItem } from '@/lib/maintenance/types'
import { MaintenanceCalendarTab } from './MaintenanceCalendarTab'

export function MaintenancePlannerTab({
  schedule,
  calendar,
  dutyConflicts,
  onCreateWorkOrder,
}: {
  schedule: ServiceScheduleItem[]
  calendar: MaintenanceCalendarEvent[]
  dutyConflicts?: Record<string, number>
  onCreateWorkOrder?: (prefill: { vehicleId: string; type: string; title: string; scheduledDate?: string }) => void
}) {
  const [view, setView] = useState<'list' | 'month'>('list')
  const [filters, setFilters] = useState<PlannerFilters>({
    depot: 'all',
    eventType: 'all',
    status: 'all',
    dueWindow: 'all',
  })

  const depots = useMemo(() => uniquePlannerDepots(schedule), [schedule])
  const eventTypes = useMemo(() => uniquePlannerEventTypes(schedule), [schedule])
  const rows = useMemo(() => filterPlannerRows(schedule, filters), [schedule, filters])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === 'list' ? 'bg-command-50 text-command-800 ring-1 ring-command-500' : 'border border-border'}`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView('month')}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === 'month' ? 'bg-command-50 text-command-800 ring-1 ring-command-500' : 'border border-border'}`}
        >
          Month
        </button>
        {view === 'list' && (
          <>
            <select
              value={filters.depot}
              onChange={(e) => setFilters((f) => ({ ...f, depot: e.target.value }))}
              className="rounded-lg border border-border px-2 py-1.5 text-sm"
              aria-label="Filter by depot"
            >
              <option value="all">All depots</option>
              {depots.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={filters.eventType}
              onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}
              className="rounded-lg border border-border px-2 py-1.5 text-sm"
              aria-label="Filter by event type"
            >
              <option value="all">All types</option>
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as PlannerFilters['status'] }))}
              className="rounded-lg border border-border px-2 py-1.5 text-sm"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due soon</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <select
              value={filters.dueWindow}
              onChange={(e) => setFilters((f) => ({ ...f, dueWindow: e.target.value as PlannerDueWindow }))}
              className="rounded-lg border border-border px-2 py-1.5 text-sm"
              aria-label="Filter by due window"
            >
              <option value="all">Any due window</option>
              <option value="overdue">Overdue only</option>
              <option value="7d">Next 7 days</option>
              <option value="14d">Next 14 days</option>
            </select>
          </>
        )}
      </div>

      {view === 'month' ? (
        <MaintenanceCalendarTab events={calendar} />
      ) : (
        <SectionCard title="Maintenance planner" description="Upcoming services, PMI and workshop bookings">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3">Vehicle</th>
                  <th className="pb-2 pr-3">Depot</th>
                  <th className="pb-2 pr-3">Event type</th>
                  <th className="pb-2 pr-3">Next due</th>
                  <th className="pb-2 pr-3">Miles remaining</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Owner</th>
                  <th className="pb-2 pr-3">Conflict</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const conflicts = dutyConflicts?.[s.vehicleId] ?? 0
                  return (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/vehicles/${s.vehicleId}?tab=Maintenance`}
                          className="font-medium text-command-600 hover:underline"
                        >
                          {s.registrationNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-3 text-ink-soft">{s.depot}</td>
                      <td className="py-2 pr-3 text-ink-soft">{s.serviceType}</td>
                      <td className="py-2 pr-3 text-xs tabular-nums">{s.dueDate?.slice(0, 10) ?? '—'}</td>
                      <td className="py-2 pr-3 tabular-nums text-ink-soft">
                        {s.milesRemaining != null ? s.milesRemaining.toLocaleString() : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill status={s.status} />
                      </td>
                      <td className="py-2 pr-3 text-ink-soft">{s.owner ?? s.workshop ?? '—'}</td>
                      <td className="py-2 pr-3 text-xs">
                        {conflicts > 0 ? (
                          <span className="font-medium text-amber-800" title="Trips on operational date">
                            {conflicts} trip(s) on ops date
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/vehicles/${s.vehicleId}?tab=Maintenance`}
                            className="text-xs font-medium text-command-600 hover:underline"
                          >
                            Open
                          </Link>
                          {onCreateWorkOrder && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  onCreateWorkOrder({
                                    vehicleId: s.vehicleId,
                                    type: mapEventTypeToWorkOrderType(s.serviceType),
                                    title: s.serviceType,
                                    scheduledDate: s.dueDate?.slice(0, 10),
                                  })
                                }
                                className="text-xs font-medium text-command-600 hover:underline"
                              >
                                Create WO
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onCreateWorkOrder({
                                    vehicleId: s.vehicleId,
                                    type: mapEventTypeToWorkOrderType(s.serviceType),
                                    title: `Schedule: ${s.serviceType}`,
                                    scheduledDate: s.dueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
                                  })
                                }
                                className="text-xs font-medium text-command-600 hover:underline"
                              >
                                Schedule
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
