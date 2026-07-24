import type { CSSProperties } from 'react'
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  ATTENDANCE_STRIP_CLASS,
  ATTENDANCE_TONE_CLASS,
} from '@/lib/attendance/constants'
import { findAttendanceForDuty, resolveDutyReadiness, type DutyReadiness } from '@/lib/attendance/schedule-layer'
import type { AttendanceBoardRow } from '@/lib/attendance/types'
import { cn } from '@/lib/cn'
import type { DutyRecord } from '@/lib/api/types'
import { runDriverName } from '@/lib/ops/runs-trips-schedule'
import { formatScheduleTimeRange, initialsForName } from './schedule-time-grid'

const READINESS_RING: Record<DutyReadiness, string> = {
  ready: 'ring-emerald-200',
  at_risk: 'ring-amber-200',
  cover_required: 'ring-red-200',
  unassigned: 'ring-border',
  unknown: 'ring-border',
}

export function ScheduleDutyCard({
  duty,
  board,
  selected,
  onSelect,
  compact,
  variant = 'default',
  className,
  style,
}: {
  duty: DutyRecord
  board: AttendanceBoardRow[]
  selected: boolean
  onSelect: (id: string) => void
  compact?: boolean
  variant?: 'default' | 'week'
  className?: string
  style?: CSSProperties
}) {
  const att = findAttendanceForDuty(duty, board)
  const readiness = resolveDutyReadiness(duty, att)
  const driverName = runDriverName(duty) ?? 'Unassigned'
  const tone = att ? ATTENDANCE_STATUS_TONE[att.status] : 'muted'
  const title = duty.route?.name ?? duty.reference
  const timeLabel = formatScheduleTimeRange(duty.startTime, duty.endTime)
  const vehicleReg = duty.vehicle?.registrationNumber

  if (variant === 'week') {
    return (
      <button
        type="button"
        onClick={() => onSelect(duty.id)}
        className={cn(
          'group w-full rounded-lg border border-border bg-white p-2.5 text-left shadow-sm transition hover:border-command-200 hover:shadow',
          'border-l-[3px]',
          ATTENDANCE_STRIP_CLASS[tone],
          selected && 'border-command-400 ring-2 ring-command-500/30',
          READINESS_RING[readiness],
          className,
        )}
      >
        <p className="text-[11px] font-semibold tabular-nums text-command-700">{timeLabel}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {driverName}
          {vehicleReg ? ` · ${vehicleReg}` : ''}
        </p>
        {att ? (
          <span
            className={cn(
              'mt-1.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
              ATTENDANCE_TONE_CLASS[tone],
            )}
          >
            {ATTENDANCE_STATUS_LABEL[att.status]}
          </span>
        ) : (
          <span className="mt-1.5 inline-flex text-[10px] font-medium text-muted">No clock-in yet</span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(duty.id)}
      style={style}
      className={cn(
        'group relative flex w-full flex-col rounded-xl border border-command-100/80 bg-gradient-to-br from-command-50/90 to-white text-left shadow-sm transition hover:shadow-md',
        'border-l-[3px]',
        ATTENDANCE_STRIP_CLASS[tone],
        selected && 'ring-2 ring-command-500 ring-offset-1',
        READINESS_RING[readiness],
        compact ? 'min-h-[3.25rem] p-2' : 'min-h-[4.5rem] p-2.5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('font-semibold tabular-nums text-command-800', compact ? 'text-[11px]' : 'text-xs')}>
            {timeLabel}
          </p>
          <p className={cn('truncate font-semibold text-ink', compact ? 'text-xs' : 'text-sm')}>{title}</p>
          {!compact && (
            <p className="mt-0.5 truncate text-xs text-ink-soft">{driverName}</p>
          )}
        </div>
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset',
            ATTENDANCE_TONE_CLASS[tone],
          )}
          aria-hidden
        >
          {initialsForName(driverName)}
        </span>
      </div>
      {att && !compact && (
        <span
          className={cn(
            'mt-1.5 inline-flex w-fit rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset',
            ATTENDANCE_TONE_CLASS[tone],
          )}
        >
          {ATTENDANCE_STATUS_LABEL[att.status]}
        </span>
      )}
    </button>
  )
}
