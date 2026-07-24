import { Link } from 'react-router-dom'
import { Bus, Snowflake } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { LiveExceptionCard, LiveRunRow } from '@/lib/live/live-operations'

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

export function LiveVehicleLoadCard({ run }: { run: LiveRunRow | null }) {
  if (!run) return null

  const tone = healthTone(run.health)
  const loadPct = run.passengerOnboard ? Math.min(100, 40 + (run.wheelchair ? 25 : 0) + (run.escortRequired ? 15 : 0)) : 8

  return (
    <div className="pointer-events-auto absolute right-3 top-3 z-20 w-[272px] rounded-xl border border-border bg-surface p-4 shadow-lg shadow-black/5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-command-600">
          <Bus className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{run.vehicleRegistration}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={cn('inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', toneClasses.ready)}>
              In service
            </span>
            <span className={cn('inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', toneClasses[tone])}>
              {run.healthLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="my-3 border-t border-border" />

      <p className="text-xs font-semibold text-ink">Passenger load</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {run.passengerOnboard ? (
          <span className="inline-flex rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
            Passenger onboard
          </span>
        ) : null}
        {run.wheelchair ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-command-200 bg-command-50 px-1.5 py-0.5 text-[10px] font-semibold text-command-700">
            <Snowflake className="h-3 w-3" aria-hidden />
            Wheelchair
          </span>
        ) : null}
        {run.escortRequired ? (
          <span className="inline-flex rounded-md border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
            Escort required
          </span>
        ) : null}
        {!run.passengerOnboard && !run.wheelchair && !run.escortRequired ? (
          <span className="text-[11px] text-muted">No passengers onboard</span>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px]">
          <span className="text-muted">Capacity used</span>
          <span className="font-semibold text-ink">{run.passengerOnboard ? 'Occupied' : 'Empty'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-command-600 transition-all" style={{ width: `${loadPct}%` }} />
        </div>
      </div>
    </div>
  )
}

export function LiveExceptionReportCard({ exception }: { exception: LiveExceptionCard | null }) {
  if (!exception) return null

  return (
    <Link
      to={exception.href}
      className="pointer-events-auto absolute bottom-14 right-3 z-20 block w-[272px] rounded-xl border border-white/10 bg-[#0B1526] p-4 text-white shadow-lg shadow-black/20 transition hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{exception.title}</p>
        <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
          Reports
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-white/65">{exception.detail}</p>
      <p className="mt-1 text-[11px] font-medium text-command-300">{exception.recommendedAction}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
        <div
          className={cn(
            'h-full rounded-full',
            exception.severity === 'critical' ? 'bg-critical w-[70%]' : 'bg-attention w-[45%]',
          )}
        />
      </div>
    </Link>
  )
}
