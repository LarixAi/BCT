import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  BusFront,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LayoutGrid,
  PackageCheck,
  Search,
  SlidersHorizontal,
  Table2,
  UserRound,
  X,
} from 'lucide-react'
import { StatusPill } from '@/components/ui/status'
import { WORK_ORDER_TYPE_LABELS } from '@/lib/maintenance/constants'
import {
  WORK_ORDER_KANBAN_LANES,
  WORK_ORDER_PIPELINE,
  allowedWorkOrderTransitions,
  groupWorkOrdersByKanbanLane,
} from '@/lib/maintenance/work-order-lifecycle'
import { WORK_ORDER_STATUS_LABELS } from '@/lib/vehicles/maintenance'
import type {
  FleetWorkOrderRow,
  MaintenanceOverviewSummary,
} from '@/lib/maintenance/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'

type ViewMode = 'board' | 'table'
type DueFilter = 'all' | 'overdue' | 'today' | 'next-7-days' | 'unscheduled'

type MaintenanceWorkOrdersTabProps = {
  workOrders: FleetWorkOrderRow[]
  summary: MaintenanceOverviewSummary
  vehicleFilter?: string
  highlightWorkOrderId?: string
  defectsOpen?: boolean
  onToggleDefects?: () => void
}

const severityStyles: Record<string, { label: string; className: string }> = {
  dangerous: {
    label: 'Dangerous',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  major: {
    label: 'Major',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  minor: {
    label: 'Minor',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  advisory: {
    label: 'Advisory',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
}

const laneAccent: Record<string, string> = {
  intake: 'bg-command-500',
  workshop: 'bg-sky-500',
  parts: 'bg-orange-500',
  approval: 'bg-amber-500',
  inspection: 'bg-violet-500',
}

function estimateLabel(w: FleetWorkOrderRow): string {
  if (w.estimateTotal != null) return `£${w.estimateTotal.toFixed(2)}`
  if (w.actualCost != null) return `£${w.actualCost.toFixed(2)}`
  if (w.estimatedCost != null) return `~£${w.estimatedCost.toFixed(2)}`
  return '—'
}

function formatSource(value: string): string {
  if (!value) return 'Maintenance'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDueDate(w: FleetWorkOrderRow): Date | null {
  const raw =
    w.targetCompletionDate ??
    w.scheduledDate ??
    (w as FleetWorkOrderRow & { requestedDate?: string | null; scheduledStart?: string | null }).requestedDate ??
    (w as FleetWorkOrderRow & { scheduledStart?: string | null }).scheduledStart ??
    null
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function dueLabel(w: FleetWorkOrderRow): {
  label: string
  className: string
  bucket: DueFilter
} {
  const due = getDueDate(w)
  if (!due) {
    return {
      label: 'No due date',
      className: 'text-muted',
      bucket: 'unscheduled',
    }
  }

  const today = startOfToday()
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000)

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)}d`,
      className: 'font-medium text-red-600',
      bucket: 'overdue',
    }
  }

  if (diffDays === 0) {
    return {
      label: 'Today',
      className: 'font-medium text-orange-600',
      bucket: 'today',
    }
  }

  if (diffDays === 1) {
    return {
      label: 'Tomorrow',
      className: 'font-medium text-amber-600',
      bucket: 'next-7-days',
    }
  }

  if (diffDays <= 7) {
    return {
      label: `${diffDays} days`,
      className: 'text-amber-700',
      bucket: 'next-7-days',
    }
  }

  return {
    label: due.toLocaleDateString('en-GB'),
    className: 'text-ink-soft',
    bucket: 'all',
  }
}

function matchesDueFilter(w: FleetWorkOrderRow, filter: DueFilter): boolean {
  if (filter === 'all') return true

  const meta = dueLabel(w)
  if (filter === 'next-7-days') {
    return meta.bucket === 'today' || meta.bucket === 'next-7-days'
  }
  return meta.bucket === filter
}

function SeverityPill({ severity }: { severity: FleetWorkOrderRow['severity'] }) {
  if (!severity) return null
  const meta = severityStyles[severity] ?? {
    label: severity,
    className: 'border-border bg-surface-muted text-ink-soft',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

function EmptyLane() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/60 px-3 py-8 text-center">
      <p className="text-xs font-medium text-muted">No work orders</p>
    </div>
  )
}

export function MaintenanceWorkOrdersTab({
  workOrders,
  summary,
  vehicleFilter = '',
  highlightWorkOrderId = '',
  defectsOpen = false,
  onToggleDefects,
}: MaintenanceWorkOrdersTabProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const [view, setView] = useState<ViewMode>('board')
  const [selected, setSelected] = useState<FleetWorkOrderRow | null>(null)
  const [diagnosis, setDiagnosis] = useState('')

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [technician, setTechnician] = useState('all')
  const [depot, setDepot] = useState('all')
  const [due, setDue] = useState<DueFilter>('all')

  const technicians = useMemo(
    () =>
      [...new Set(workOrders.map((w) => w.technicianName).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b),
      ),
    [workOrders],
  )

  const depots = useMemo(
    () =>
      [...new Set(workOrders.map((w) => w.depot).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [workOrders],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return workOrders.filter((w) => {
      if (
        vehicleFilter &&
        w.vehicleId !== vehicleFilter &&
        !w.registrationNumber.toLowerCase().includes(vehicleFilter.toLowerCase())
      ) {
        return false
      }

      if (q) {
        const haystack = [
          w.workOrderId,
          w.registrationNumber,
          w.title,
          w.depot,
          w.technicianName ?? '',
          w.creationSource,
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(q)) return false
      }

      if (status !== 'all' && w.status !== status) return false
      if (severity !== 'all' && w.severity !== severity) return false
      if (technician !== 'all' && w.technicianName !== technician) return false
      if (depot !== 'all' && w.depot !== depot) return false
      if (!matchesDueFilter(w, due)) return false

      return true
    })
  }, [workOrders, vehicleFilter, search, status, severity, technician, depot, due])

  const open = useMemo(
    () => filtered.filter((w) => !['completed', 'cancelled'].includes(w.status)),
    [filtered],
  )

  const lanes = useMemo(() => groupWorkOrdersByKanbanLane(open), [open])

  const pendingApprovals = useMemo(
    () =>
      open.filter(
        (w) => w.status === 'awaiting_authorisation' || w.estimateStatus === 'submitted',
      ).length,
    [open],
  )

  useEffect(() => {
    if (!highlightWorkOrderId) return
    const hit = workOrders.find((w) => w.workOrderId === highlightWorkOrderId)
    if (hit) {
      setSelected(hit)
      setDiagnosis(hit.diagnosis ?? '')
    }
  }, [highlightWorkOrderId, workOrders])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['maintenance-hub']) })
    queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profiles']) })
  }

  const transition = useMutation({
    mutationFn: ({
      vehicleId,
      workOrderId,
      status: nextStatus,
    }: {
      vehicleId: string
      workOrderId: string
      status: FleetWorkOrderRow['status']
    }) =>
      api.updateVehicleWorkOrder(
        vehicleId,
        workOrderId,
        { status: nextStatus, diagnosis: diagnosis || undefined },
        actorName,
      ),
    onSuccess: () => {
      invalidate()
      setSelected(null)
      setDiagnosis('')
    },
  })

  const approveEstimate = useMutation({
    mutationFn: ({
      vehicleId,
      workOrderId,
      decision,
    }: {
      vehicleId: string
      workOrderId: string
      decision: 'approved' | 'rejected'
    }) =>
      api.approveVehicleWorkOrderEstimate(
        vehicleId,
        workOrderId,
        { decision, notes: diagnosis || undefined },
        actorName,
      ),
    onSuccess: () => {
      invalidate()
      setSelected(null)
      setDiagnosis('')
    },
  })

  function openManage(w: FleetWorkOrderRow) {
    setSelected(w)
    setDiagnosis(w.diagnosis ?? '')
  }

  const attentionCards = [
    {
      id: 'critical-defects',
      label: 'Safety critical defects',
      value: summary.attention.safetyCriticalDefects,
      hint: 'Immediate review',
      icon: AlertTriangle,
      iconClass: 'text-red-600',
    },
    {
      id: 'vor',
      label: 'VOR vehicles',
      value: summary.attention.vor,
      hint: 'Unavailable for service',
      icon: BusFront,
      iconClass: 'text-orange-600',
    },
    {
      id: 'approval',
      label: 'Awaiting approval',
      value: Math.max(summary.workshopPosition.awaitingApproval, pendingApprovals),
      hint: 'Manager action',
      icon: Clock3,
      iconClass: 'text-amber-600',
    },
    {
      id: 'open',
      label: 'Open work orders',
      value: workOrders.filter((w) => !['completed', 'cancelled'].includes(w.status)).length,
      hint: 'Across all stages',
      icon: ClipboardList,
      iconClass: 'text-command-600',
    },
    {
      id: 'due-today',
      label: 'Due today',
      value: summary.attention.dueToday,
      hint: 'Maintenance due',
      icon: CalendarDays,
      iconClass: 'text-violet-600',
    },
    {
      id: 'parts',
      label: 'Awaiting parts',
      value: summary.attention.awaitingParts,
      hint: 'Supply dependency',
      icon: PackageCheck,
      iconClass: 'text-emerald-600',
    },
  ]

  const hasActiveFilters =
    search ||
    status !== 'all' ||
    severity !== 'all' ||
    technician !== 'all' ||
    depot !== 'all' ||
    due !== 'all'

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Attention required</h2>
            <p className="mt-0.5 text-xs text-muted">
              Live maintenance signals that may need action.
            </p>
          </div>

          {onToggleDefects && (
            <button
              type="button"
              onClick={onToggleDefects}
              className="text-sm font-medium text-command-600 hover:text-command-700 hover:underline"
            >
              {defectsOpen ? 'Hide defect register' : 'View defect register'}
            </button>
          )}
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-6">
          {attentionCards.map((card) => {
            const Icon = card.icon
            return (
              <div key={card.id} className="bg-surface px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-border bg-surface-muted p-2.5">
                    <Icon className={`h-5 w-5 ${card.iconClass}`} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tabular-nums text-ink">
                      {card.value}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-ink">
                      {card.label}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{card.hint}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">Work Orders</h2>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
                {open.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {vehicleFilter ? 'Filtered vehicle view' : 'Across the selected depot scope'}
            </p>
          </div>

          <div className="flex items-center rounded-xl border border-border bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setView('board')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === 'board'
                  ? 'bg-surface text-command-700 shadow-sm ring-1 ring-border'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === 'table'
                  ? 'bg-surface text-command-700 shadow-sm ring-1 ring-border'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              <Table2 className="h-4 w-4" />
              Table
            </button>
          </div>
        </div>

        <div className="border-b border-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[240px] flex-1 xl:max-w-[340px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vehicle / reg / WO..."
                className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-command-400 focus:ring-2 focus:ring-command-100"
              />
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink-soft outline-none focus:border-command-400"
            >
              <option value="all">Status</option>
              {WORK_ORDER_PIPELINE.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink-soft outline-none focus:border-command-400"
            >
              <option value="all">Priority</option>
              <option value="dangerous">Dangerous</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="advisory">Advisory</option>
            </select>

            <select
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink-soft outline-none focus:border-command-400"
            >
              <option value="all">Technician</option>
              {technicians.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={depot}
              onChange={(e) => setDepot(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink-soft outline-none focus:border-command-400"
            >
              <option value="all">Depot</option>
              {depots.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={due}
              onChange={(e) => setDue(e.target.value as DueFilter)}
              className="h-10 rounded-xl border border-border bg-surface px-3 text-sm text-ink-soft outline-none focus:border-command-400"
            >
              <option value="all">Due date</option>
              <option value="overdue">Overdue</option>
              <option value="today">Today</option>
              <option value="next-7-days">Next 7 days</option>
              <option value="unscheduled">No due date</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStatus('all')
                  setSeverity('all')
                  setTechnician('all')
                  setDepot('all')
                  setDue('all')
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-ink-soft hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}

            <div className="ml-auto hidden h-10 items-center rounded-xl border border-border px-3 text-xs text-muted 2xl:flex">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {filtered.length} shown
            </div>
          </div>
        </div>

        {view === 'board' ? (
          <div className="overflow-x-auto px-5 py-5">
            <div className="grid min-w-[1180px] grid-cols-5 gap-3">
              {WORK_ORDER_KANBAN_LANES.map((lane) => {
                const cards = lanes[lane.id]
                return (
                  <section
                    key={lane.id}
                    className="overflow-hidden rounded-2xl border border-border bg-surface-muted/45"
                  >
                    <div className="relative border-b border-border bg-surface px-4 py-3">
                      <div
                        className={`absolute inset-x-0 top-0 h-0.5 ${laneAccent[lane.id] ?? 'bg-command-500'}`}
                      />
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
                          {lane.label}
                        </h3>
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold tabular-nums text-ink">
                          {cards.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 p-3">
                      {cards.map((w) => {
                        const dueMeta = dueLabel(w)
                        const highlighted =
                          highlightWorkOrderId && w.workOrderId === highlightWorkOrderId

                        return (
                          <article
                            key={w.workOrderId}
                            className={`rounded-xl border bg-surface p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                              highlighted
                                ? 'border-command-400 ring-2 ring-command-100'
                                : 'border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <Link
                                  to={`/vehicles/${w.vehicleId}?tab=Maintenance`}
                                  className="text-xs font-bold tabular-nums text-command-700 hover:underline"
                                >
                                  {w.registrationNumber}
                                </Link>
                                <p className="mt-0.5 font-mono text-[10px] text-muted">
                                  {w.workOrderId}
                                </p>
                              </div>
                              <SeverityPill severity={w.severity} />
                            </div>

                            <h4 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-ink">
                              {w.title}
                            </h4>

                            <div className="mt-2">
                              <StatusPill status={w.status} />
                            </div>

                            <dl className="mt-3 space-y-1.5 text-[11px]">
                              <div className="flex gap-2">
                                <dt className="w-11 shrink-0 text-muted">Source</dt>
                                <dd className="truncate text-ink-soft">
                                  {formatSource(w.creationSource)}
                                </dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-11 shrink-0 text-muted">Due</dt>
                                <dd className={dueMeta.className}>{dueMeta.label}</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="w-11 shrink-0 text-muted">Tech</dt>
                                <dd className="flex min-w-0 items-center gap-1.5 text-ink-soft">
                                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted" />
                                  <span className="truncate">
                                    {w.technicianName ?? 'Unassigned'}
                                  </span>
                                </dd>
                              </div>
                              {w.partsCount > 0 && (
                                <div className="flex gap-2">
                                  <dt className="w-11 shrink-0 text-muted">Parts</dt>
                                  <dd className="text-ink-soft">
                                    {w.partsCount} part{w.partsCount === 1 ? '' : 's'}
                                  </dd>
                                </div>
                              )}
                              {(w.estimateTotal != null ||
                                w.actualCost != null ||
                                w.estimatedCost != null) && (
                                <div className="flex gap-2">
                                  <dt className="w-11 shrink-0 text-muted">Cost</dt>
                                  <dd className="font-medium tabular-nums text-ink-soft">
                                    {estimateLabel(w)}
                                  </dd>
                                </div>
                              )}
                            </dl>

                            <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
                              <span className="max-w-[65%] truncate text-[10px] text-muted">
                                {WORK_ORDER_TYPE_LABELS[w.type] ?? w.type}
                              </span>
                              <button
                                type="button"
                                onClick={() => openManage(w)}
                                className="text-xs font-semibold text-command-600 hover:text-command-700 hover:underline"
                              >
                                {w.status === 'quality_check'
                                  ? 'Inspect'
                                  : !w.technicianName &&
                                      ['requested', 'awaiting_review', 'approved', 'scheduled'].includes(
                                        w.status,
                                      )
                                    ? 'Assign'
                                    : 'Manage'}
                              </button>
                            </div>
                          </article>
                        )
                      })}

                      {cards.length === 0 && <EmptyLane />}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto px-5 py-5">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-semibold">Work order</th>
                  <th className="pb-3 pr-4 font-semibold">Vehicle</th>
                  <th className="pb-3 pr-4 font-semibold">Issue</th>
                  <th className="pb-3 pr-4 font-semibold">Priority</th>
                  <th className="pb-3 pr-4 font-semibold">Status</th>
                  <th className="pb-3 pr-4 font-semibold">Technician</th>
                  <th className="pb-3 pr-4 font-semibold">Due</th>
                  <th className="pb-3 pr-4 font-semibold">Estimate</th>
                  <th className="pb-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const dueMeta = dueLabel(w)
                  return (
                    <tr
                      key={w.workOrderId}
                      className={`border-b border-border/70 transition hover:bg-surface-muted/60 ${
                        highlightWorkOrderId === w.workOrderId ? 'bg-command-50' : ''
                      }`}
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-muted">
                        {w.workOrderId}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          to={`/vehicles/${w.vehicleId}?tab=Maintenance`}
                          className="font-semibold text-command-700 hover:underline"
                        >
                          {w.registrationNumber}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">{w.depot}</p>
                      </td>
                      <td className="max-w-[260px] py-3 pr-4">
                        <p className="font-medium text-ink">{w.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {formatSource(w.creationSource)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <SeverityPill severity={w.severity} />
                      </td>
                      <td className="py-3 pr-4">
                        <StatusPill status={w.status} />
                        <p className="mt-1 text-[11px] text-muted">
                          {WORK_ORDER_STATUS_LABELS[w.status]}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {w.technicianName ?? 'Unassigned'}
                      </td>
                      <td className={`py-3 pr-4 text-xs ${dueMeta.className}`}>
                        {dueMeta.label}
                      </td>
                      <td className="py-3 pr-4 font-medium tabular-nums text-ink-soft">
                        {estimateLabel(w)}
                      </td>
                      <td className="py-3">
                        {!['completed', 'cancelled'].includes(w.status) && (
                          <button
                            type="button"
                            onClick={() => openManage(w)}
                            className="text-xs font-semibold text-command-600 hover:underline"
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted">
                      No work orders match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close work order drawer"
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px]"
            onClick={() => {
              setSelected(null)
              setDiagnosis('')
            }}
          />

          <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">{selected.workOrderId}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{selected.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/vehicles/${selected.vehicleId}?tab=Maintenance`}
                    className="font-semibold text-command-700 hover:underline"
                  >
                    {selected.registrationNumber}
                  </Link>
                  <StatusPill status={selected.status} />
                  <SeverityPill severity={selected.severity} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null)
                  setDiagnosis('')
                }}
                className="rounded-lg border border-border p-2 text-muted hover:bg-surface-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Depot</p>
                  <p className="mt-1 text-sm font-medium text-ink">{selected.depot}</p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Technician</p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {selected.technicianName ?? 'Unassigned'}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Due</p>
                  <p className={`mt-1 text-sm ${dueLabel(selected).className}`}>
                    {dueLabel(selected).label}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted">Estimate</p>
                  <p className="mt-1 text-sm font-medium tabular-nums text-ink">
                    {estimateLabel(selected)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold text-ink">Work order details</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Source</dt>
                    <dd className="text-right text-ink-soft">
                      {formatSource(selected.creationSource)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Type</dt>
                    <dd className="text-right text-ink-soft">
                      {WORK_ORDER_TYPE_LABELS[selected.type] ?? selected.type}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Provider</dt>
                    <dd className="text-right text-ink-soft">{selected.provider ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Parts</dt>
                    <dd className="text-right text-ink-soft">{selected.partsCount}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Road test</dt>
                    <dd className="text-right text-ink-soft">
                      {selected.roadTestRequired ? 'Required' : 'Not required'}
                    </dd>
                  </div>
                </dl>
              </div>

              {selected.estimateStatus && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-5 w-5 text-amber-700" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-amber-950">Workshop estimate</h3>
                      <p className="mt-1 text-sm text-amber-900">
                        Total £{selected.estimateTotal?.toFixed(2) ?? '—'} ·{' '}
                        {selected.estimateStatus}
                      </p>

                      {selected.estimateStatus === 'submitted' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={approveEstimate.isPending}
                            onClick={() =>
                              approveEstimate.mutate({
                                vehicleId: selected.vehicleId,
                                workOrderId: selected.workOrderId,
                                decision: 'approved',
                              })
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-command-600 px-3 py-2 text-xs font-semibold text-white hover:bg-command-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve estimate
                          </button>
                          <button
                            type="button"
                            disabled={approveEstimate.isPending}
                            onClick={() =>
                              approveEstimate.mutate({
                                vehicleId: selected.vehicleId,
                                workOrderId: selected.workOrderId,
                                decision: 'rejected',
                              })
                            }
                            className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-ink">Diagnosis / notes</span>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={5}
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-command-400 focus:ring-2 focus:ring-command-100"
                  placeholder="Workshop diagnosis, notes or approval context..."
                />
              </label>

              {(transition.isError || approveEstimate.isError) && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  The work order could not be updated. No status change has been assumed.
                </div>
              )}
            </div>

            <div className="border-t border-border bg-surface px-6 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Allowed next actions
              </p>
              <div className="flex flex-wrap gap-2">
                {allowedWorkOrderTransitions(selected.status).map((next) => (
                  <button
                    key={next}
                    type="button"
                    disabled={transition.isPending}
                    onClick={() =>
                      transition.mutate({
                        vehicleId: selected.vehicleId,
                        workOrderId: selected.workOrderId,
                        status: next,
                      })
                    }
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink-soft hover:border-command-300 hover:bg-command-50 hover:text-command-700 disabled:opacity-50"
                  >
                    {WORK_ORDER_STATUS_LABELS[next] ?? next}
                  </button>
                ))}

                {allowedWorkOrderTransitions(selected.status).length === 0 && (
                  <span className="text-xs text-muted">No further lifecycle actions available.</span>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
