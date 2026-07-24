import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { SectionCard } from '@/components/ui'
import {
  ScheduleDayCalendar,
  ScheduleMonthCalendar,
  ScheduleWeekCalendar,
} from '@/features/schedule/ScheduleCalendarViews'
import { SchedulePlanningWorkspace } from '@/features/schedule/SchedulePlanningWorkspace'
import { shiftIsoDate } from '@/features/schedule/schedule-time-grid'
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  ATTENDANCE_STRIP_CLASS,
  SCORE_BAND_LABEL,
} from '@/lib/attendance/constants'
import {
  DUTY_READINESS_LABEL,
  dutyMatchesAttendanceFilter,
  findAttendanceForDuty,
  findLeaveForPerson,
  resolveDutyReadiness,
  type ScheduleAttendanceFilter,
} from '@/lib/attendance/schedule-layer'
import type { AttendanceBoardRow, CoverCandidate, LeaveRequestRecord } from '@/lib/attendance/types'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'
import { isOperationsDemoLayerActive, OPERATIONS_DEMO_BANNER } from '@/lib/operations/operations-data-source'
import {
  detectScheduleConflicts,
  normalizeDutyDate,
  runDriverName,
  weekDates,
} from '@/lib/ops/runs-trips-schedule'
import { assertDriverAssignableOnDate } from '@/lib/holiday/assignment-guard'
import { tKey } from '@/lib/tenant/tenant-query-scope'


type ScheduleView = 'day' | 'week' | 'month'
type ScheduleWorkspaceMode = 'planning' | 'attendance'

const WORKSPACE_MODES: { id: ScheduleWorkspaceMode; label: string }[] = [
  { id: 'planning', label: 'Planning' },
  { id: 'attendance', label: 'Attendance' },
]

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
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceMode = (searchParams.get('mode') as ScheduleWorkspaceMode) || 'planning'
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

  const { from, to } = useMemo(() => {
    if (view === 'month') {
      const d = new Date(anchor + 'T12:00:00')
      d.setDate(1)
      const start = d.toISOString().slice(0, 10)
      const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return { from: start, to: endDate.toISOString().slice(0, 10) }
    }
    return { from: days[0], to: days[6] }
  }, [anchor, days, view])

  const { data: weekDuties = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: tKey(['duties-week', from, to]),
    queryFn: () => api.getDuties({ from, to }),
  })

  const { data: attendance } = useQuery({
    queryKey: tKey(['attendance-hub']),
    queryFn: () => api.getAttendanceHub(),
  })

  const board = attendance?.board ?? []
  const leave = attendance?.leaveRequests ?? []
  const summary = attendance?.summary

  const dayDuties = useMemo(
    () => weekDuties.filter((d) => normalizeDutyDate(d.dutyDate) === anchor),
    [weekDuties, anchor],
  )

  const dutiesForConflicts = useMemo(() => {
    if (workspaceMode === 'planning') return weekDuties
    if (view === 'day') return dayDuties
    if (view === 'week') return weekDuties
    return weekDuties
  }, [workspaceMode, view, dayDuties, weekDuties])

  const filteredDayDuties = useMemo(
    () => dayDuties.filter((d) => dutyMatchesAttendanceFilter(d, board, attFilter)),
    [dayDuties, board, attFilter],
  )

  const filteredWeekDuties = useMemo(
    () => weekDuties.filter((d) => dutyMatchesAttendanceFilter(d, board, attFilter)),
    [weekDuties, board, attFilter],
  )

  const conflicts = useMemo(() => detectScheduleConflicts(dutiesForConflicts), [dutiesForConflicts])
  const selected = weekDuties.find((d) => d.id === selectedId) ?? null
  const selectedAttendance = selected ? findAttendanceForDuty(selected, board) : null
  const selectedLeave = selected
    ? findLeaveForPerson(runDriverName(selected), leave, selected.dutyDate)
    : null

  const dutyLabelForCover =
    selected?.route?.name ?? selected?.reference ?? selectedAttendance?.currentDutyLabel ?? 'Duty'

  const { data: coverCandidates = [] } = useQuery({
    queryKey: tKey(['attendance-cover', dutyLabelForCover, coverOpen]),
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
      queryClient.invalidateQueries({ queryKey: tKey(['attendance-hub']) })
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

  const dutiesInScope = useMemo(() => {
    if (view === 'day') return filteredDayDuties
    if (view === 'week') return filteredWeekDuties
    const monthKey = anchor.slice(0, 7)
    return weekDuties.filter((d) => normalizeDutyDate(d.dutyDate)?.startsWith(monthKey))
  }, [view, filteredDayDuties, filteredWeekDuties, weekDuties, anchor])

  const attendanceStatusLine = useMemo(() => {
    if (isFetching) return 'Refreshing attendance…'
    const dutyCount = dutiesInScope.length
    const scopeLabel = view === 'day' ? 'today' : view === 'month' ? 'this month' : 'in view'
    const conflictLabel =
      conflicts.length > 0
        ? ` · ${conflicts.length} schedule conflict${conflicts.length === 1 ? '' : 's'}`
        : ''
    return `${dutyCount} duties ${scopeLabel}${conflictLabel}`
  }, [isFetching, view, dutiesInScope.length, conflicts.length])

  const scheduleDateLabel = new Date(anchor + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const periodLabel =
    view === 'month'
      ? new Date(anchor + 'T12:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : view === 'week'
        ? `${days[0]} → ${days[6]}`
        : scheduleDateLabel

  function shiftAnchor(delta: number) {
    if (view === 'month') {
      const d = new Date(anchor + 'T12:00:00')
      d.setMonth(d.getMonth() + delta)
      setAnchor(d.toISOString().slice(0, 10))
      return
    }
    setAnchor(shiftIsoDate(anchor, view === 'week' ? delta * 7 : delta))
  }

  function goToday() {
    setAnchor(operationalDateIso)
  }

  function setWorkspaceMode(mode: ScheduleWorkspaceMode) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (mode === 'planning') next.delete('mode')
      else next.set('mode', mode)
      return next
    })
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Schedule</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            {workspaceMode === 'planning'
              ? 'Plan jobs into trips and runs — assign crew, validate compatibility, then publish.'
              : 'Live control for who is expected, who has arrived, and whether the duty can depart.'}
          </p>
          <p className={cn('mt-1 text-xs font-medium', isFetching ? 'text-amber-800' : 'text-emerald-700')}>
            {workspaceMode === 'planning'
              ? `Planning for ${anchor}`
              : attendanceStatusLine}
          </p>
          <div className="mt-3 inline-flex rounded-xl border border-border bg-surface p-1">
            {WORKSPACE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setWorkspaceMode(mode.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                  workspaceMode === mode.id
                    ? 'bg-command-600 text-white'
                    : 'text-ink-soft hover:bg-surface-muted',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/attendance"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Attendance board
          </Link>
          <Link
            to="/time-off"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Time off
          </Link>
          <button
            type="button"
            onClick={() => {
              if (!selectedId && dayDuties[0]) setSelectedId(dayDuties[0].id)
              setCoverOpen(true)
            }}
            className="rounded-xl bg-command-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-command-700"
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

      {isOperationsDemoLayerActive() && (
        <div className="rounded-xl border border-command-200 bg-command-50 px-4 py-3 text-sm text-command-950">
          <p className="font-semibold">{OPERATIONS_DEMO_BANNER.title}</p>
          <p className="mt-1 text-command-900">{OPERATIONS_DEMO_BANNER.body}</p>
        </div>
      )}

      {workspaceMode === 'planning' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-border bg-surface-muted/50 p-0.5">
              <button
                type="button"
                onClick={() => shiftAnchor(-1)}
                className="rounded-lg p-2 text-ink-soft hover:bg-surface hover:text-ink"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftAnchor(1)}
                className="rounded-lg p-2 text-ink-soft hover:bg-surface hover:text-ink"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <input
              type="date"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
              aria-label="Planning date"
            />
          </div>
          <SchedulePlanningWorkspace serviceDate={anchor} />
        </>
      ) : (
        <>
      {summary && (
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
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
          <p className="text-sm font-semibold text-red-900">
            {workspaceMode === 'attendance' && view === 'day'
              ? "Today's schedule conflicts"
              : 'Planning conflicts'}
          </p>
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
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl border border-border bg-surface-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => shiftAnchor(-1)}
                  className="rounded-lg p-2 text-ink-soft hover:bg-surface hover:text-ink"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => shiftAnchor(1)}
                  className="rounded-lg p-2 text-ink-soft hover:bg-surface hover:text-ink"
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-ink">{periodLabel}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-ink p-1">
                {(
                  [
                    { id: 'day' as const, label: 'Day' },
                    { id: 'week' as const, label: 'Week' },
                    { id: 'month' as const, label: 'Month' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setView(tab.id)}
                    className={cn(
                      'rounded-lg px-4 py-1.5 text-xs font-semibold transition',
                      view === tab.id
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-white/80 hover:text-white',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
                aria-label="Jump to date"
              />
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
            {ATTENDANCE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAttFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  attFilter === f.id
                    ? 'bg-command-600 text-white shadow-sm'
                    : 'bg-surface-muted text-ink-soft hover:bg-command-50 hover:text-command-800',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-4">
            {isLoading ? (
              <p className="text-sm text-muted">Loading schedule…</p>
            ) : view === 'week' ? (
              <ScheduleWeekCalendar
                days={days}
                duties={filteredWeekDuties}
                board={board}
                selectedId={selectedId}
                onSelect={setSelectedId}
                anchor={anchor}
              />
            ) : view === 'day' ? (
              <ScheduleDayCalendar
                duties={filteredDayDuties}
                board={board}
                selectedId={selectedId}
                onSelect={setSelectedId}
                dateIso={anchor}
              />
            ) : (
              <ScheduleMonthCalendar
                anchor={anchor}
                duties={filteredWeekDuties}
                board={board}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </div>

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
        </>
      )}
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
        'min-w-[7.5rem] rounded-2xl border px-4 py-3 text-left shadow-sm transition',
        active
          ? 'border-command-500 bg-command-50/50 ring-1 ring-command-500'
          : 'border-border bg-surface hover:border-border-strong hover:shadow',
        tone === 'attention' && !active && 'bg-amber-50/40',
        tone === 'critical' && !active && 'bg-red-50/40',
        tone === 'ready' && !active && 'bg-emerald-50/30',
        tone === 'info' && !active && 'bg-sky-50/30',
        tone === 'sick' && !active && 'bg-violet-50/30',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
    </button>
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
      <section className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Selected person / duty</h2>
          <p className="mt-0.5 text-xs text-muted">Attendance & readiness</p>
        </div>
        <div className="space-y-3 p-4 text-sm text-muted">
          <p>Select a duty from the calendar to review attendance, clock-in, leave and cover actions.</p>
          <ul className="list-inside list-disc space-y-1 text-xs">
            <li>Week view lists duties by day — use Day view for a timeline.</li>
            <li>Late and not-arrived duties are highlighted on the card.</li>
          </ul>
        </div>
      </section>
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
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{driverName}</h2>
        <p className="mt-0.5 text-xs text-muted">{duty.route?.name ?? duty.reference}</p>
      </div>
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
    </section>
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
