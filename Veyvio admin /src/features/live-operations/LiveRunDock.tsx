import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Phone, Route, Truck, User } from 'lucide-react'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { cn } from '@/lib/cn'
import type { LiveRunRow } from '@/lib/live/live-operations'

type TrackingTab = 'drivers' | 'vehicles' | 'runs'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(0)} km`
  return `${meters} m`
}

function formatEta(minutes: number): string {
  const eta = new Date(Date.now() + minutes * 60_000)
  return eta.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function runStatusTone(run: LiveRunRow): 'active' | 'done' | 'attention' {
  if (run.health === 'completed' || run.stage === 'COMPLETED') return 'done'
  if (run.health === 'late' || run.health === 'severely_late' || run.health === 'blocked') return 'attention'
  return 'active'
}

function progressPercent(run: LiveRunRow, vehicle: LiveDispatchVehicle | null): number {
  if (vehicle?.routeProgressPercent != null) return Math.min(100, Math.max(0, vehicle.routeProgressPercent))
  if (vehicle && vehicle.routeTotalStops > 0) {
    return Math.round((vehicle.routeCompletedStops / vehicle.routeTotalStops) * 100)
  }
  if (run.tripProgress) {
    const match = run.tripProgress.match(/(\d+)\s+of\s+(\d+)/)
    if (match) return Math.round((Number(match[1]) / Number(match[2])) * 100)
  }
  if (run.health === 'completed') return 100
  if (run.isMoving) return 55
  return 18
}

function stopsRemaining(run: LiveRunRow, vehicle: LiveDispatchVehicle | null): number {
  if (vehicle && vehicle.routeTotalStops > 0) {
    return Math.max(0, vehicle.routeTotalStops - vehicle.routeCompletedStops)
  }
  const match = run.progressLabel.match(/(\d+)\s+of\s+(\d+)/)
  if (match) return Math.max(0, Number(match[2]) - Number(match[1]))
  return 0
}

function DriverTrackingCard({
  run,
  vehicle,
  selected,
  onSelect,
}: {
  run: LiveRunRow
  vehicle: LiveDispatchVehicle | null
  selected: boolean
  onSelect: () => void
}) {
  const tone = runStatusTone(run)
  const progress = progressPercent(run, vehicle)
  const remaining = stopsRemaining(run, vehicle)
  const driverHref = run.driverId ? `/drivers/${run.driverId}` : null

  const statusBadge =
    tone === 'done' ? 'Done' : tone === 'attention' ? 'Needs attention' : 'Active'

  const routeStatus =
    run.nextStop != null
      ? run.isMoving
        ? 'En route to next stop'
        : run.stageLabel
      : run.stageLabel

  return (
    <article
      className={cn(
        'rounded-xl border bg-surface p-3 shadow-sm transition',
        selected ? 'border-command-500 ring-2 ring-command-500/20' : 'border-border hover:border-command-200',
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              tone === 'done' && 'bg-ready/10 text-ready',
              tone === 'active' && 'bg-command-50 text-command-700',
              tone === 'attention' && 'bg-critical/10 text-critical',
            )}
          >
            {statusBadge}
          </span>
          <span className="text-[10px] font-medium text-muted">{run.lastUpdateLabel}</span>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-command-50 text-xs font-bold text-command-700">
            {initials(run.driverName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{run.driverName}</p>
            <p className="truncate text-xs text-muted">{run.vehicleRegistration}</p>
            <p className="truncate text-xs text-muted">{run.serviceType}</p>
          </div>
          {driverHref ? (
            <Link
              to={driverHref}
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-command-600 hover:bg-command-50"
              aria-label={`Open ${run.driverName} profile`}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      </button>

      <div
        className={cn(
          'mt-3 rounded-lg border p-3',
          tone === 'done' ? 'border-ready/20 bg-ready/5' : 'border-command-100 bg-command-50/60',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">{routeStatus}</p>
            <p className="mt-0.5 text-[11px] font-medium text-command-700">#{run.runReference}</p>
          </div>
          <span className={cn('shrink-0 text-[10px] font-semibold', tone === 'done' ? 'text-ready' : 'text-command-700')}>
            {run.healthLabel}
          </span>
        </div>

        <p className="mt-2 text-[11px] text-muted">
          {run.serviceType} · {run.vehicleRegistration}
        </p>

        {vehicle?.nextStop ? (
          <p className="mt-1 text-[11px] text-ink-soft">
            Dist. left: {formatDistance(vehicle.nextStop.distanceM)} · ETA {formatEta(vehicle.nextStop.etaMinutes)}
          </p>
        ) : run.nextStop ? (
          <p className="mt-1 text-[11px] text-ink-soft">Next: {run.nextStop}</p>
        ) : null}

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] text-muted">
            <span>Route progress</span>
            <span className="font-semibold text-ink">{progress}%</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/80">
            <div
              className={cn('h-full rounded-full', tone === 'done' ? 'bg-ready' : 'bg-command-600')}
              style={{ width: `${progress}%` }}
            />
            <div className="h-full flex-1 bg-surface-muted/80" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/60 pt-3">
          <div className="text-center">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted">Stops</p>
            <p className="mt-0.5 text-[11px] font-bold text-ink">{run.tripProgress ?? run.progressLabel}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted">Health</p>
            <p className="mt-0.5 text-[11px] font-bold text-ink">{run.healthLabel}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-medium uppercase tracking-wide text-muted">Updated</p>
            <p className="mt-0.5 text-[11px] font-bold text-ink">{run.lastUpdateLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-medium text-muted">
          {remaining > 0 ? `${remaining} stop${remaining === 1 ? '' : 's'} remaining` : 'Route complete'}
        </p>
        <Link
          to={`/runs/${run.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-semibold text-command-700 hover:underline"
        >
          Open run →
        </Link>
      </div>
    </article>
  )
}

function VehicleListItem({
  registration,
  run,
  selected,
  onSelect,
}: {
  registration: string
  run: LiveRunRow
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
        selected ? 'border-command-500 bg-command-50/50' : 'border-border bg-surface hover:border-command-200',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-command-600">
        <Truck className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold tabular-nums text-ink">{registration}</p>
        <p className="truncate text-xs text-muted">
          {run.driverName} · {run.healthLabel}
        </p>
      </div>
    </button>
  )
}

function RunListItem({
  run,
  selected,
  onSelect,
}: {
  run: LiveRunRow
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
        selected ? 'border-command-500 bg-command-50/50' : 'border-border bg-surface hover:border-command-200',
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-command-600">
        <Route className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{run.runReference}</p>
        <p className="truncate text-xs text-muted">
          {run.driverName} · {run.stageLabel}
        </p>
      </div>
    </button>
  )
}

export function LiveRunDock({
  runs,
  selectedId,
  vehiclesByDuty,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: {
  runs: LiveRunRow[]
  selectedId: string | null
  vehiclesByDuty: Map<string, LiveDispatchVehicle>
  onSelect: (id: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const [tab, setTab] = useState<TrackingTab>('drivers')

  const vehicleRows = useMemo(() => {
    const seen = new Map<string, LiveRunRow>()
    for (const run of runs) {
      if (!seen.has(run.vehicleRegistration)) seen.set(run.vehicleRegistration, run)
    }
    return [...seen.entries()]
  }, [runs])

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="pointer-events-auto absolute left-0 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-border bg-surface text-muted shadow-md hover:text-ink"
        aria-label="Expand tracking panel"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 top-3 z-20 flex w-[min(400px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/95 shadow-xl shadow-black/10 backdrop-blur-sm">
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="absolute -right-3 top-1/2 z-30 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border bg-surface text-xs text-muted hover:text-ink"
        aria-label="Collapse tracking panel"
      >
        ‹
      </button>

      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-bold text-ink">Tracking</p>
        <p className="text-[10px] text-muted">{runs.length} active on map</p>
      </div>

      <div className="flex gap-1 border-b border-border px-2 py-1.5">
        {(
          [
            { id: 'drivers' as const, label: 'Drivers', icon: User },
            { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
            { id: 'runs' as const, label: 'Runs', icon: Route },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-semibold',
              tab === id ? 'bg-command-600 text-white' : 'text-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {runs.length === 0 ? (
          <p className="p-2 text-sm text-muted">No active operations match this filter.</p>
        ) : tab === 'drivers' ? (
          runs.map((run) => (
            <DriverTrackingCard
              key={run.id}
              run={run}
              vehicle={vehiclesByDuty.get(run.id) ?? null}
              selected={selectedId === run.id}
              onSelect={() => onSelect(run.id)}
            />
          ))
        ) : tab === 'vehicles' ? (
          vehicleRows.map(([registration, run]) => (
            <VehicleListItem
              key={registration}
              registration={registration}
              run={run}
              selected={selectedId === run.id}
              onSelect={() => onSelect(run.id)}
            />
          ))
        ) : (
          runs.map((run) => (
            <RunListItem key={run.id} run={run} selected={selectedId === run.id} onSelect={() => onSelect(run.id)} />
          ))
        )}
      </div>
    </div>
  )
}
