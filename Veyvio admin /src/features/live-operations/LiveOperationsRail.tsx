import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Bus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Route,
  Snowflake,
  Truck,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { DutyRecord } from '@/lib/api/types'
import {
  buildLiveRunLinks,
  driverAcknowledgementLabel,
  driverAcknowledgementState,
  hasPendingRouteRevision,
} from '@/lib/operations/live-operations-context'
import type { LiveExceptionCard, LiveRunRow } from '@/lib/live/live-operations'
import type { OperationalTrip } from '@/lib/transfers/types'

type LiveOperationsRailProps = {
  run: LiveRunRow | null
  trip: OperationalTrip | null
  duty: DutyRecord | null
  notificationCount?: number
  exception?: LiveExceptionCard | null
}

function healthTone(health: string): 'ready' | 'attention' | 'critical' | 'neutral' {
  if (health === 'late' || health === 'severely_late' || health === 'blocked') return 'critical'
  if (health === 'at_risk') return 'attention'
  if (health === 'on_time' || health === 'completed') return 'ready'
  return 'neutral'
}

const toneClasses = {
  ready: 'border-ready/30 bg-ready/10 text-ready',
  attention: 'border-attention/30 bg-attention/10 text-attention',
  critical: 'border-critical/30 bg-critical/10 text-critical',
  neutral: 'border-border bg-surface-muted text-ink-soft',
}

export function LiveOperationsRail({
  run,
  trip,
  duty,
  notificationCount = 0,
  exception,
}: LiveOperationsRailProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto absolute right-0 top-1/2 z-20 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-border bg-surface text-muted shadow-md hover:text-ink"
        aria-label="Expand live control panel"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 top-3 z-20 flex w-[min(280px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-lg shadow-black/5 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink">Live control</p>
          {run ? (
            <p className="truncate text-[10px] text-muted">
              {run.runReference} · {run.driverName}
            </p>
          ) : (
            <p className="text-[10px] text-muted">Select a run on the map</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-ink"
          aria-label="Collapse live control panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {run ? (
          <>
            <VehicleSummary run={run} />

            {exception ? <ExceptionAlert exception={exception} /> : null}

            <AcknowledgementBlock run={run} trip={trip} duty={duty} notificationCount={notificationCount} />

            <ActionLinks run={run} trip={trip} />
          </>
        ) : (
          <p className="px-1 py-2 text-xs leading-relaxed text-muted">
            Pick a driver from the tracking list or map to see run controls and status.
          </p>
        )}
      </div>
    </div>
  )
}

function VehicleSummary({ run }: { run: LiveRunRow }) {
  const tone = healthTone(run.health)
  const loadPct = run.passengerOnboard
    ? Math.min(100, 40 + (run.wheelchair ? 25 : 0) + (run.escortRequired ? 15 : 0))
    : 8

  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 p-2.5">
      <div className="flex items-start gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-command-600">
          <Bus className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tabular-nums text-ink">{run.vehicleRegistration}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold', toneClasses.ready)}>
              In service
            </span>
            <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold', toneClasses[tone])}>
              {run.healthLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {run.passengerOnboard ? (
          <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink-soft">
            Passenger onboard
          </span>
        ) : null}
        {run.wheelchair ? (
          <span className="inline-flex items-center gap-0.5 rounded border border-command-200 bg-command-50 px-1.5 py-0.5 text-[9px] font-semibold text-command-700">
            <Snowflake className="h-2.5 w-2.5" aria-hidden />
            Wheelchair
          </span>
        ) : null}
        {run.escortRequired ? (
          <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink-soft">
            Escort
          </span>
        ) : null}
        {!run.passengerOnboard && !run.wheelchair && !run.escortRequired ? (
          <span className="text-[10px] text-muted">No passengers onboard</span>
        ) : null}
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-command-600" style={{ width: `${loadPct}%` }} />
      </div>
    </div>
  )
}

function ExceptionAlert({ exception }: { exception: LiveExceptionCard }) {
  return (
    <Link
      to={exception.href}
      className="block rounded-lg border border-[#0B1526]/20 bg-[#0B1526] p-2.5 text-white transition hover:border-command-400/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug">{exception.title}</p>
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold">Alert</span>
      </div>
      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/65">{exception.detail}</p>
      <p className="mt-1 text-[10px] font-medium text-command-300">{exception.recommendedAction}</p>
    </Link>
  )
}

function AcknowledgementBlock({
  run,
  trip,
  duty,
  notificationCount,
}: {
  run: LiveRunRow
  trip: OperationalTrip | null
  duty: DutyRecord | null
  notificationCount: number
}) {
  const ackState = driverAcknowledgementState(trip, duty)
  const ackLabel = driverAcknowledgementLabel(ackState)
  const routeRevision = hasPendingRouteRevision(trip)
  const links = buildLiveRunLinks(run, trip)

  const items: Array<{ icon: typeof CheckCircle2; label: string; tone: 'ready' | 'warning' | 'neutral'; href?: string }> =
    [
      {
        icon: ackState === 'acknowledged' ? CheckCircle2 : AlertTriangle,
        label: ackLabel,
        tone: ackState === 'pending' ? 'warning' : ackState === 'acknowledged' ? 'ready' : 'neutral',
      },
    ]

  if (routeRevision && trip) {
    items.push({
      icon: Route,
      label: 'Route revision awaiting ack',
      tone: 'warning',
      href: links.tripRouteHref ?? undefined,
    })
  }

  if (notificationCount > 0) {
    items.push({
      icon: Bell,
      label: `${notificationCount} notifications`,
      tone: 'neutral',
      href: '/notifications',
    })
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <StatusRow key={item.label} {...item} />
      ))}
    </div>
  )
}

function ActionLinks({ run, trip }: { run: LiveRunRow; trip: OperationalTrip | null }) {
  const links = buildLiveRunLinks(run, trip)

  return (
    <div className="grid gap-1">
      <RailLink to={links.runHref} label="Open journey" />
      {links.tripHref ? <RailLink to={links.tripHref} label={`Trip ${trip?.reference}`} /> : null}
      <RailLink to={links.dispatchHref} label="Dispatch" icon={Truck} />
      <RailLink to={links.messagesHref} label="Message driver" icon={MessageSquare} />
      <RailLink to={links.exceptionsHref} label="Create exception" icon={AlertTriangle} />
    </div>
  )
}

function StatusRow({
  icon: Icon,
  label,
  tone,
  href,
}: {
  icon: typeof CheckCircle2
  label: string
  tone: 'ready' | 'warning' | 'neutral'
  href?: string
}) {
  const className = cn(
    'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px]',
    tone === 'ready' && 'border-ready/30 bg-ready/5 text-ready',
    tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-950',
    tone === 'neutral' && 'border-border bg-surface-muted/80 text-ink-soft',
  )
  const content = (
    <>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="font-medium leading-snug">{label}</span>
    </>
  )
  if (href) {
    return (
      <Link to={href} className={cn(className, 'hover:border-command-300')}>
        {content}
      </Link>
    )
  }
  return <div className={className}>{content}</div>
}

function RailLink({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon?: typeof Truck
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-ink hover:bg-surface-muted"
    >
      {Icon ? <Icon className="h-3.5 w-3.5 text-command-600" aria-hidden /> : null}
      {label}
    </Link>
  )
}
