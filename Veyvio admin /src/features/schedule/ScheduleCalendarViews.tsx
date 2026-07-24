import { findAttendanceForDuty } from '@/lib/attendance/schedule-layer'
import type { AttendanceBoardRow } from '@/lib/attendance/types'
import { cn } from '@/lib/cn'
import type { DutyRecord } from '@/lib/api/types'
import { normalizeDutyDate, runDriverName } from '@/lib/ops/runs-trips-schedule'
import { ScheduleDutyCard } from './ScheduleDutyCard'
import {
  dutyColumnSpan,
  formatScheduleTimeRange,
  hourLabels,
  parseScheduleTime,
  SCHEDULE_GRID_END_HOUR,
  SCHEDULE_GRID_START_HOUR,
} from './schedule-time-grid'

const TOTAL_HOURS = SCHEDULE_GRID_END_HOUR - SCHEDULE_GRID_START_HOUR + 1

export function ScheduleDayCalendar({
  duties,
  board,
  selectedId,
  onSelect,
  dateIso,
}: {
  duties: DutyRecord[]
  board: AttendanceBoardRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  dateIso: string
}) {
  const hours = hourLabels()
  const dateLabel = new Date(dateIso + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  if (duties.length === 0) {
    return (
      <ScheduleEmpty
        title="No duties on this day"
        description="Try another date or clear the attendance filter."
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink-soft">{dateLabel}</p>
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <div
          className="grid min-w-[720px]"
          style={{ gridTemplateColumns: `repeat(${TOTAL_HOURS}, minmax(3.5rem, 1fr))` }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="border-b border-r border-border/70 bg-surface-muted/40 px-1 py-2 text-center text-[11px] font-semibold text-muted"
            >
              {h}
            </div>
          ))}
        </div>
        <div
          className="relative grid min-w-[720px] border-t-0"
          style={{
            gridTemplateColumns: `repeat(${TOTAL_HOURS}, minmax(3.5rem, 1fr))`,
            minHeight: '7.5rem',
          }}
        >
          {duties.map((duty) => {
            const { startCol, span } = dutyColumnSpan(duty.startTime, duty.endTime)
            return (
              <div
                key={duty.id}
                className="p-1"
                style={{ gridColumn: `${startCol} / span ${span}` }}
              >
                <ScheduleDutyCard
                  duty={duty}
                  board={board}
                  selected={selectedId === duty.id}
                  onSelect={onSelect}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ScheduleWeekCalendar({
  days,
  duties,
  board,
  selectedId,
  onSelect,
  anchor,
}: {
  days: string[]
  duties: DutyRecord[]
  board: AttendanceBoardRow[]
  selectedId: string | null
  onSelect: (id: string) => void
  anchor: string
}) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <div className="grid min-w-[960px] grid-cols-7 divide-x divide-border">
        {days.map((day) => {
          const dayDuties = duties
            .filter((d) => normalizeDutyDate(d.dutyDate) === day)
            .sort((a, b) => parseScheduleTime(a.startTime) - parseScheduleTime(b.startTime))
          const date = new Date(day + 'T12:00:00')
          const isToday = day === today
          const isAnchor = day === anchor

          return (
            <div
              key={day}
              className={cn(
                'flex min-w-0 flex-col',
                isAnchor && 'bg-command-50/50',
                isToday && !isAnchor && 'bg-sky-50/25',
              )}
            >
              <div
                className={cn(
                  'border-b border-border px-2 py-3 text-center',
                  isToday && 'ring-1 ring-inset ring-command-300',
                )}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
                <p
                  className={cn(
                    'text-lg font-bold tabular-nums',
                    isAnchor ? 'text-command-700' : 'text-ink',
                  )}
                >
                  {date.getDate()}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-muted">
                  {dayDuties.length === 0
                    ? 'No duties'
                    : `${dayDuties.length} dut${dayDuties.length === 1 ? 'y' : 'ies'}`}
                </p>
              </div>

              <div className="flex max-h-[32rem] flex-1 flex-col gap-2 overflow-y-auto p-2">
                {dayDuties.length === 0 ? (
                  <p className="py-8 text-center text-xs leading-relaxed text-muted">
                    Nothing scheduled
                  </p>
                ) : (
                  dayDuties.map((duty) => (
                    <ScheduleDutyCard
                      key={duty.id}
                      duty={duty}
                      board={board}
                      selected={selectedId === duty.id}
                      onSelect={onSelect}
                      variant="week"
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ScheduleMonthCalendar({
  anchor,
  duties,
  board,
  selectedId,
  onSelect,
}: {
  anchor: string
  duties: DutyRecord[]
  board: AttendanceBoardRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const monthStart = new Date(anchor + 'T12:00:00')
  monthStart.setDate(1)
  const startDow = (monthStart.getDay() + 6) % 7
  const gridStart = new Date(monthStart)
  gridStart.setDate(gridStart.getDate() - startDow)

  const cells: string[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    cells.push(d.toISOString().slice(0, 10))
  }

  const month = monthStart.getMonth()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/40">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase text-muted"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const inMonth = new Date(day + 'T12:00:00').getMonth() === month
          const dayDuties = duties
            .filter((d) => normalizeDutyDate(d.dutyDate) === day)
            .sort((a, b) => parseScheduleTime(a.startTime) - parseScheduleTime(b.startTime))
          const isToday = day === today
          const isSelected = day === anchor
          return (
            <div
              key={day}
              className={cn(
                'min-h-[6.5rem] border-b border-r border-border/70 p-1.5',
                !inMonth && 'bg-surface-muted/30',
                isSelected && 'bg-command-50/40',
                isToday && 'ring-1 ring-inset ring-command-400',
              )}
            >
              <p
                className={cn(
                  'mb-1 text-xs font-semibold tabular-nums',
                  inMonth ? 'text-ink' : 'text-muted',
                  isToday && 'text-command-700',
                )}
              >
                {new Date(day + 'T12:00:00').getDate()}
              </p>
              <ul className="space-y-1">
                {dayDuties.slice(0, 3).map((duty) => {
                  const att = findAttendanceForDuty(duty, board)
                  const driver = runDriverName(duty)
                  const time = formatScheduleTimeRange(duty.startTime, duty.endTime)
                  const route = duty.route?.name ?? duty.reference
                  return (
                    <li key={duty.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(duty.id)}
                        className={cn(
                          'w-full rounded-md bg-command-100/80 px-1.5 py-1 text-left hover:bg-command-200/80',
                          selectedId === duty.id && 'ring-1 ring-command-500',
                          att?.status === 'late' && 'bg-amber-100 text-amber-950',
                          att?.status === 'not_arrived' && 'bg-red-100 text-red-900',
                        )}
                      >
                        <p className="truncate text-[10px] font-semibold text-ink">{route}</p>
                        <p className="truncate text-[10px] text-ink-soft">
                          {time}
                          {driver ? ` · ${driver.split(' ')[0]}` : ' · Unassigned'}
                        </p>
                      </button>
                    </li>
                  )
                })}
                {dayDuties.length > 3 && (
                  <li className="px-1 text-[10px] text-muted">+{dayDuties.length - 3} more</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScheduleEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/30 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  )
}
