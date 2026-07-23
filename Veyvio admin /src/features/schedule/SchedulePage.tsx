import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  ATTENDANCE_STRIP_CLASS,
  ATTENDANCE_TONE_CLASS,
  SCORE_BAND_LABEL,
} from '@/lib/attendance/constants'
import {
  DUTY_READINESS_LABEL,
  dutyMatchesAttendanceFilter,
  findAttendanceForDuty,
  findLeaveForPerson,
  resolveDutyReadiness,
  weekCellLabel,
  type ScheduleAttendanceFilter,
} from '@/lib/attendance/schedule-layer'
import type { AttendanceBoardRow, CoverCandidate, LeaveRequestRecord } from '@/lib/attendance/types'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'
import {
  detectScheduleConflicts,
  runDriverName,
  weekDates,
} from '@/lib/ops/runs-trips-schedule'
import { assertDriverAssignableOnDate } from '@/lib/holiday/assignment-guard'

type ScheduleView = 'day' | 'week' | 'timeline'

const ATTENDANCE_FILTERS: { id: ScheduleAttendanceFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'on_time', label: 'On time' },
  { id: 'late', label: 'Late' },
  { id: 'not_arrived', label: 'Not arrived' },
  { id: 'approved_leave', label: 'Leave' },
  { id: 'sick', label: 'Sick' },
  { id: 'cover_required', label: 'Cover required' },
  { id: 'attendance_concern', label: 'Attendance concern' },
]

export function SchedulePage() {
  const { operationalDateIso } = useOperationalContext()
  const { user } = useAuth()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Operations'
  const queryClient = useQueryClient()
  const [anchor, setAnchor] = useState(operationalDateIso)
  const [view, setView] = useState<ScheduleView>('day')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [attFilter, setAttFilter] = useState<ScheduleAttendanceFilter>('all')
  const [coverOpen, setCoverOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [coverMessage, setCoverMessage] = useState<string | null>(null)

  const days = useMemo(() => weekDates(anchor), [anchor])
  const from = days[0]
  const to = days[6]

  const { data: weekDuties = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['duties-week', from, to],
    queryFn: () => api.getDuties({ from, to }),
  })

  const { data: attendance } = useQuery({
    queryKey: ['attendance-hub'],
    queryFn: () => api.getAttendanceHub(),
  })

  const board = attendance?.board ?? []
  const leave = attendance?.leaveRequests ?? []
  const summary = attendance?.summary

  const dayDuties = useMemo(
    () => weekDuties.filter((d) => d.dutyDate === anchor),
    [weekDuties, anchor],
  )

  const filteredDayDuties = useMemo(
    () => dayDuties.filter((d) => dutyMatchesAttendanceFilter(d, board, attFilter)),
    [dayDuties, board, attFilter],
  )

  const filteredWeekDuties = useMemo(
    () => weekDuties.filter((d) => dutyMatchesAttendanceFilter(d, board, attFilter)),
    [weekDuties, board, attFilter],
  )

  const conflicts = useMemo(() => detectScheduleConflicts(weekDuties), [weekDuties])
  const selected = weekDuties.find((d) => d.id === selectedId) ?? null
  const selectedAttendance = selected ? findAttendanceForDuty(selected, board) : null
  const selectedLeave = selected
    ? findLeaveForPerson(runDriverName(selected), leave, selected.dutyDate)
    : null

  const dutyLabelForCover =
    selected?.route?.name ?? selected?.reference ?? selectedAttendance?.currentDutyLabel ?? 'Duty'

  const { data: coverCandidates = [] } = useQuery({
    queryKey: ['attendance-cover', dutyLabelForCover, coverOpen],
    queryFn: () => api.getAttendanceCoverCandidates(dutyLabelForCover),
    enabled: coverOpen,
  })

  const assignCover = useMutation({
    mutationFn: (candidate: CoverCandidate) => {
      const onDate = selected?.dutyDate ?? anchor
      const check = assertDriverAssignableOnDate({
        driverId: candidate.personId,
        driverName: candidate.personName,
        onDate,
        leaveRequests: leave,
      })
      if (!check.ok && !overrideReason.trim()) {
        throw new Error(`${check.message} Enter an override reason to force-assign.`)
      }
      return api.assignAttendanceCover({
        originalPersonName: runDriverName(selected!) ?? selectedAttendance?.personName ?? 'Unknown',
        coverPersonId: candidate.personId,
        coverPersonName: candidate.personName,
        dutyLabel: dutyLabelForCover,
        actorName,
        overrideReason:
          !candidate.selectable || !check.ok
            ? overrideReason.trim() || (!check.ok ? check.message : undefined)
            : undefined,
      })
    },
    onSuccess: (result) => {
      setCoverMessage(result.message)
      setCoverOpen(false)
      setOverrideReason('')
      queryClient.invalidateQueries({ queryKey: ['attendance-hub'] })
    },
    onError: (err) => {
      setCoverMessage(err instanceof Error ? err.message : 'Could not assign cover')
    },
  })

  const atRisk = useMemo(
    () =>
      dayDuties
        .map((d) => ({ duty: d, att: findAttendanceForDuty(d, board) }))
        .filter(
          ({ att }) =>
            att &&
            (att.status === 'late' || att.status === 'not_arrived') &&
            (att.schoolRoute || att.passengersAtRisk > 0),
        ),
    [dayDuties, board],
  )

  const scheduleDateLabel = new Date(anchor + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Schedule</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              Live control for who is expected, who has arrived, and whether the duty can depart.
            </p>
            <p className={cn('mt-1 text-xs', isFetching ? 'text-amber-800' : 'text-emerald-700')}>
              {isFetching
                ? 'Refreshing plan…'
                : `${weekDuties.length} duties this week · ${conflicts.length} planning conflicts`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Refresh
            </button>
            <Link
              to="/attendance"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Attendance board
            </Link>
            <Link
              to="/time-off"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Time off
            </Link>
            <button
              type="button"
              onClick={() => {
                if (!selectedId && dayDuties[0]) setSelectedId(dayDuties[0].id)
                setCoverOpen(true)
              }}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
            >
              Assign cover
            </button>
          </div>
        </div>

        {coverMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
            {coverMessage}
          </div>
        )}

        {summary && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Schedule — {scheduleDateLabel}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
              <SummaryCard
                label="Scheduled staff"
                value={summary.scheduled}
                active={attFilter === 'all'}
                onClick={() => setAttFilter('all')}
              />
              <SummaryCard
                label="On time"
                value={summary.onTime}
                active={attFilter === 'on_time'}
                onClick={() => setAttFilter('on_time')}
                tone="ready"
              />
              <SummaryCard
                label="Late"
                value={summary.late}
                active={attFilter === 'late'}
                onClick={() => setAttFilter('late')}
                tone="attention"
              />
              <SummaryCard
                label="Not arrived"
                value={summary.notArrived}
                active={attFilter === 'not_arrived'}
                onClick={() => setAttFilter('not_arrived')}
                tone="critical"
              />
              <SummaryCard
                label="On leave"
                value={summary.approvedLeave}
                active={attFilter === 'approved_leave'}
                onClick={() => setAttFilter('approved_leave')}
                tone="info"
              />
              <SummaryCard
                label="Sick"
                value={summary.sick}
                active={attFilter === 'sick'}
                onClick={() => setAttFilter('sick')}
                tone="sick"
              />
              <SummaryCard
                label="Uncovered duties"
                value={summary.uncoveredDuties}
                active={attFilter === 'cover_required'}
                onClick={() => setAttFilter('cover_required')}
                tone="critical"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1 w-fit">
            {(
              [
                { id: 'day' as const, label: 'Day' },
                { id: 'week' as const, label: 'Week' },
                { id: 'timeline' as const, label: 'Timeline' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium',
                  view === tab.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ATTENDANCE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAttFilter(f.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  attFilter === f.id
                    ? 'bg-command-600 text-white'
                    : 'border border-border bg-surface text-ink-soft hover:bg-surface-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {atRisk.length > 0 && view === 'day' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">Departure risk</p>
          {atRisk.map(({ duty, att }) =>
            att ? (
              <div key={duty.id} className="mt-2 text-sm text-amber-950">
                <p className="font-medium">
                  {att.personName} is {att.differenceLabel?.replace(' late', '') ?? 'late'} late.
                  Duty: {duty.route?.name ?? duty.reference}.
                </p>
                <p className="text-amber-900">
                  Vehicle {att.vehicleRegistration ?? duty.vehicle?.registrationNumber ?? '—'} ·{' '}
                  {att.passengersAtRisk} passengers
                  {att.schoolRoute ? ' · School contract' : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                  <Link to="/messages" className="text-command-700 hover:underline">
                    Contact driver
                  </Link>
                  <Link to="/dispatch" className="text-command-700 hover:underline">
                    Assign cover
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedId(duty.id)}
                    className="text-command-700 hover:underline"
                  >
                    Open duty
                  </button>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">Planning conflicts</p>
          <ul className="mt-2 space-y-1 text-xs text-red-900">
            {conflicts.slice(0, 6).map((c) => (
              <li key={c.id}>
                <span className="font-semibold">{c.title}</span> — {c.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_340px]">
        <SectionCard
          title={view === 'week' ? 'Week plan' : view === 'day' ? 'Day plan' : 'Operational timeline'}
          description={
            view === 'week'
              ? `${from} → ${to}`
              : view === 'day'
                ? `${filteredDayDuties.length} duties on ${anchor}`
                : 'Duty and attendance events in order'
          }
          className="min-h-0 overflow-hidden"
          flush
        >
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {isLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : view === 'week' ? (
              <WeekGrid
                days={days}
                duties={filteredWeekDuties}
                board={board}
                leave={leave}
                selectedId={selectedId}
                onSelect={setSelectedId}
                anchor={anchor}
              />
            ) : view === 'day' ? (
              <DayList
                duties={filteredDayDuties}
                board={board}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <TimelineView
                duties={filteredDayDuties}
                board={board}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </SectionCard>

        <ScheduleDetailPanel
          duty={selected}
          attendance={selectedAttendance}
          leave={selectedLeave}
          conflicts={conflicts.filter((c) => selected && c.dutyIds.includes(selected.id))}
          coverOpen={coverOpen}
          onOpenCover={() => setCoverOpen(true)}
          onCloseCover={() => setCoverOpen(false)}
          coverCandidates={coverCandidates}
          overrideReason={overrideReason}
          onOverrideReason={setOverrideReason}
          onAssign={(c) => assignCover.mutate(c)}
          assignPending={assignCover.isPending}
        />
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  active,
  onClick,
  tone,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: 'ready' | 'attention' | 'critical' | 'info' | 'sick'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-2 text-left transition',
        active ? 'border-command-500 ring-1 ring-command-500' : 'border-border bg-surface hover:border-border-strong',
        tone === 'attention' && 'bg-amber-50/50',
        tone === 'critical' && 'bg-red-50/50',
        tone === 'ready' && 'bg-emerald-50/40',
        tone === 'info' && 'bg-sky-50/40',
        tone === 'sick' && 'bg-violet-50/40',
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </button>
  )
}

function AttendanceBadge({ row }: { row: AttendanceBoardRow }) {
  const tone = ATTENDANCE_STATUS_TONE[row.status]
  const clock =
    row.clockedInAt &&
    new Date(row.clockedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const label =
    row.status === 'late' && row.differenceLabel
      ? `Late · ${row.differenceLabel.replace(' late', '')}`
      : row.status === 'on_time' && clock
        ? `On time · ${clock}`
        : ATTENDANCE_STATUS_LABEL[row.status]
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        ATTENDANCE_TONE_CLASS[tone],
      )}
    >
      {label}
    </span>
  )
}

function DayList({
  duties,
  board,
  selectedId,
  onSelect,
}: {
  duties: DutyRecord[]
  board: AttendanceBoardRow[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const sorted = [...duties].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  return (
    <ul className="space-y-2">
      {sorted.length === 0 && (
        <li className="text-sm text-muted">No duties match this attendance filter.</li>
      )}
      {sorted.map((d) => {
        const att = findAttendanceForDuty(d, board)
        const readiness = resolveDutyReadiness(d, att)
        const stripTone = att ? ATTENDANCE_STATUS_TONE[att.status] : 'muted'
        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onSelect(d.id)}
              className={cn(
                'flex w-full gap-3 rounded-xl border bg-surface py-2.5 pl-0 pr-3 text-left text-sm hover:border-command-400 border-l-4',
                ATTENDANCE_STRIP_CLASS[stripTone],
                selectedId === d.id
                  ? 'border-command-500 ring-1 ring-command-500'
                  : 'border-border',
              )}
            >
              <div className="min-w-0 flex-1 pl-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs tabular-nums text-muted">
                      {d.startTime}–{(d as { endTime?: string }).endTime ?? '—'}
                    </p>
                    <p className="font-semibold text-ink">
                      {d.route?.name ?? d.reference}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase',
                      readiness === 'at_risk' || readiness === 'cover_required'
                        ? 'bg-red-100 text-red-900'
                        : readiness === 'ready'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-surface-muted text-ink-soft',
                    )}
                  >
                    {DUTY_READINESS_LABEL[readiness]}
                  </span>
                </div>
                <p className="mt-1 font-medium text-ink">{runDriverName(d) ?? 'Unassigned'}</p>
                {att ? (
                  <div className="mt-1">
                    <AttendanceBadge row={att} />
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">Attendance not linked</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  Vehicle {d.vehicle?.registrationNumber ?? att?.vehicleRegistration ?? '—'}
                  {att?.passengersAtRisk
                    ? ` · Passengers ${att.passengersAtRisk}${att.schoolRoute ? ' · School' : ''}`
                    : ''}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function WeekGrid({
  days,
  duties,
  board,
  leave,
  selectedId,
  onSelect,
  anchor,
}: {
  days: string[]
  duties: DutyRecord[]
  board: AttendanceBoardRow[]
  leave: LeaveRequestRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  anchor: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="grid min-w-[900px] grid-cols-7 gap-2">
      {days.map((day) => {
        const dayItems = duties.filter((d) => d.dutyDate === day)
        const label = new Date(day + 'T12:00:00').toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        return (
          <div key={day} className="rounded-xl border border-border bg-surface-muted/60 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <ul className="mt-2 space-y-1.5">
              {dayItems.length === 0 && <li className="text-[11px] text-muted">No duties</li>}
              {dayItems.map((d) => {
                const att = findAttendanceForDuty(d, board)
                const leaveRow = findLeaveForPerson(runDriverName(d), leave, day)
                const cell = weekCellLabel(
                  att?.status ?? null,
                  leaveRow?.status ?? null,
                  day > today,
                )
                const tone = att ? ATTENDANCE_STATUS_TONE[att.status] : 'muted'
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(d.id)}
                      className={cn(
                        'w-full rounded-md border-l-4 bg-surface px-2 py-1.5 text-left text-[11px] font-medium ring-1 ring-border',
                        ATTENDANCE_STRIP_CLASS[tone],
                        selectedId === d.id && 'ring-2 ring-command-500',
                        day === anchor && 'bg-command-50/40',
                      )}
                    >
                      <p className="truncate">{d.reference}</p>
                      <p className="truncate opacity-80">
                        {d.startTime} · {runDriverName(d) ?? 'No driver'}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 truncate text-[10px] font-semibold uppercase',
                          ATTENDANCE_TONE_CLASS[tone].split(' ').find((c) => c.startsWith('text-')),
                        )}
                      >
                        {cell}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function TimelineView({
  duties,
  board,
  onSelect,
}: {
  duties: DutyRecord[]
  board: AttendanceBoardRow[]
  onSelect: (id: string) => void
}) {
  const events = useMemo(() => {
    const rows: { at: string; label: string; dutyId: string }[] = []
    for (const d of duties) {
      const att = findAttendanceForDuty(d, board)
      const start = d.startTime ?? '00:00'
      rows.push({ at: start, label: `Shift due — ${d.route?.name ?? d.reference}`, dutyId: d.id })
      if (att?.status === 'late') {
        rows.push({
          at: start,
          label: `${att.personName} marked late${att.differenceLabel ? ` (${att.differenceLabel})` : ''}`,
          dutyId: d.id,
        })
      }
      if (att?.clockedInAt) {
        const t = new Date(att.clockedInAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
        rows.push({ at: t, label: `${att.personName} clocked in`, dutyId: d.id })
      }
      if (att?.status === 'not_arrived') {
        rows.push({
          at: start,
          label: `${att.personName} not arrived — cover may be required`,
          dutyId: d.id,
        })
      }
      if (att?.status === 'approved_leave') {
        rows.push({
          at: start,
          label: `${att.personName} on approved leave — duty uncovered`,
          dutyId: d.id,
        })
      }
    }
    return rows.sort((a, b) => a.at.localeCompare(b.at))
  }, [duties, board])

  if (events.length === 0) {
    return <p className="text-sm text-muted">No timeline events for this filter.</p>
  }

  return (
    <ol className="space-y-2">
      {events.map((e, i) => (
        <li key={`${e.dutyId}-${e.at}-${i}`}>
          <button
            type="button"
            onClick={() => onSelect(e.dutyId)}
            className="flex w-full gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm hover:border-command-400"
          >
            <span className="w-14 shrink-0 font-mono text-xs font-semibold text-muted">
              {e.at}
            </span>
            <span className="text-ink">{e.label}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function ScheduleDetailPanel({
  duty,
  attendance,
  leave,
  conflicts,
  coverOpen,
  onOpenCover,
  onCloseCover,
  coverCandidates,
  overrideReason,
  onOverrideReason,
  onAssign,
  assignPending,
}: {
  duty: DutyRecord | null
  attendance: AttendanceBoardRow | null
  leave: LeaveRequestRecord | null
  conflicts: ReturnType<typeof detectScheduleConflicts>
  coverOpen: boolean
  onOpenCover: () => void
  onCloseCover: () => void
  coverCandidates: CoverCandidate[]
  overrideReason: string
  onOverrideReason: (v: string) => void
  onAssign: (c: CoverCandidate) => void
  assignPending: boolean
}) {
  if (!duty) {
    return (
      <SectionCard title="Selected person / duty" description="Attendance & readiness">
        <p className="text-sm text-muted">
          Select a duty to see attendance today, clock-in, score, leave and cover actions — without
          leaving the schedule.
        </p>
      </SectionCard>
    )
  }

  const readiness = resolveDutyReadiness(duty, attendance)
  const driverName = runDriverName(duty) ?? 'Unassigned'

  if (coverOpen) {
    return (
      <SectionCard
        title={`Cover ${duty.route?.name ?? duty.reference}`}
        description="Suggested replacements — unavailable people are blocked unless overridden"
        className="min-h-0 overflow-hidden"
        flush
      >
        <div className="max-h-[640px] space-y-3 overflow-y-auto p-4 text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
            <p className="font-semibold">Original driver</p>
            <p>
              {driverName}
              {attendance?.differenceLabel ? ` · ${attendance.differenceLabel}` : ''}
            </p>
            <p className="mt-1 text-xs">
              Required: MIDAS · Enhanced DBS · Wheelchair · Depot eligibility
            </p>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Available drivers
          </p>
          <ul className="space-y-2">
            {coverCandidates.map((c) => (
              <li
                key={c.personId}
                className={cn(
                  'rounded-xl border px-3 py-2',
                  c.selectable ? 'border-border bg-surface' : 'border-border bg-surface-muted opacity-80',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{c.personName}</p>
                    <p className="text-xs text-ink-soft">{c.availabilityLabel}</p>
                    <p className="mt-1 text-xs text-muted">
                      {c.training.join(' · ')} · Familiarity: {c.routeFamiliarity}
                    </p>
                    {c.blockReason && (
                      <p className="mt-1 text-xs text-red-700">{c.blockReason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={assignPending || (!c.selectable && !overrideReason.trim())}
                    onClick={() => onAssign(c)}
                    className="shrink-0 rounded-lg bg-command-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {c.selectable ? 'Assign' : 'Override'}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Override reason (required for unavailable)
            </p>
            <input
              value={overrideReason}
              onChange={(e) => onOverrideReason(e.target.value)}
              placeholder="Recorded in audit log"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={onCloseCover}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"
          >
            Back to duty
          </button>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={driverName}
      description={duty.route?.name ?? duty.reference}
      className="min-h-0 overflow-hidden"
      flush
    >
      <div className="max-h-[640px] space-y-3 overflow-y-auto p-4 text-sm">
        {attendance && (
          <div
            className={cn(
              'rounded-lg border border-l-4 px-3 py-2',
              ATTENDANCE_STRIP_CLASS[ATTENDANCE_STATUS_TONE[attendance.status]],
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Attendance today
            </p>
            <p className="mt-0.5 font-semibold text-ink">
              {ATTENDANCE_STATUS_LABEL[attendance.status]}
              {attendance.differenceLabel ? ` · ${attendance.differenceLabel}` : ''}
            </p>
          </div>
        )}

        <Row label="Scheduled" value={`${duty.startTime ?? '—'} – ${(duty as { endTime?: string }).endTime ?? '—'}`} />
        <Row
          label="Clock-in"
          value={
            attendance?.clockedInAt
              ? new Date(attendance.clockedInAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—'
          }
        />
        <Row label="Current duty" value={duty.route?.name ?? duty.reference} />
        <Row label="Vehicle" value={duty.vehicle?.registrationNumber ?? '—'} />
        <Row label="Duty readiness" value={DUTY_READINESS_LABEL[readiness]} />
        {attendance && (
          <Row
            label="Attendance score"
            value={`${attendance.attendanceScore} · ${SCORE_BAND_LABEL[attendance.scoreBand]}`}
          />
        )}
        {attendance?.reportedReason && (
          <Row label="Reported reason" value={attendance.reportedReason.replace(/_/g, ' ')} />
        )}
        {attendance?.managerClassification && (
          <Row
            label="Manager review"
            value={attendance.managerClassification.replace(/_/g, ' ')}
          />
        )}

        {leave && (
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-xs',
              leave.status === 'pending'
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-sky-200 bg-sky-50 text-sky-950',
            )}
          >
            <p className="font-semibold">
              {leave.status === 'pending' ? 'Pending leave request' : 'Approved leave'}
            </p>
            <p className="mt-1">
              {leave.startDate === leave.endDate
                ? leave.startDate
                : `${leave.startDate} → ${leave.endDate}`}
              {leave.partialDay ? ' · Partial day' : ''}
            </p>
            <p className="mt-1">
              {leave.impact.tripsAffected} future duties affected · readiness{' '}
              {leave.impact.readinessPercent}%
            </p>
            {leave.status === 'pending' && (
              <p className="mt-1">
                Pending leave does not remove the driver until approved — duties stay flagged.
              </p>
            )}
            {(leave.status === 'approved' || leave.status === 'moved') && (
              <p className="mt-1 font-medium">Not available for assignment</p>
            )}
            <Link to="/time-off" className="mt-2 inline-block font-medium text-command-700 hover:underline">
              Open in Time off
            </Link>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            <p className="font-semibold">Conflicts on this job</p>
            <ul className="mt-1 space-y-1">
              {conflicts.map((c) => (
                <li key={c.id}>{c.title}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 pt-1">
          <Link
            to="/messages"
            className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium hover:bg-surface-muted"
          >
            Contact
          </Link>
          <button
            type="button"
            onClick={onOpenCover}
            className="rounded-lg border border-command-200 bg-command-50 px-3 py-2 text-center text-xs font-medium text-command-800 hover:bg-command-100"
          >
            Assign cover
          </button>
          <Link
            to="/attendance"
            className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium hover:bg-surface-muted"
          >
            Open attendance history
          </Link>
          <Link
            to={`/runs/${duty.id}`}
            className="rounded-lg border border-border px-3 py-2 text-center text-xs font-medium hover:bg-surface-muted"
          >
            Open as run
          </Link>
        </div>

        <p className="text-[11px] text-muted">
          Leave move/cancel is recorded on Time Off with original dates, reason and manager — never
          silent.
        </p>
      </div>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium capitalize text-ink">{value}</span>
    </div>
  )
}
