import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  ABSENCE_REASON_LABEL,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  ATTENDANCE_TONE_CLASS,
  MANAGER_CLASSIFICATION_LABEL,
  SCORE_BAND_LABEL,
} from '@/lib/attendance/constants'
import type {
  AbsenceReasonCode,
  AttendanceBoardFilter,
  AttendanceBoardRow,
  AttendanceHubData,
  AttendanceLiveStatus,
  ManagerClassification,
} from '@/lib/attendance/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/cn'
import { PersonAttendancePanel } from './PersonAttendancePanel'

const FILTERS: { id: AttendanceBoardFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'on_time', label: 'On time' },
  { id: 'late', label: 'Late' },
  { id: 'not_arrived', label: 'Not arrived' },
  { id: 'approved_leave', label: 'Approved leave' },
  { id: 'sick', label: 'Sick' },
  { id: 'attendance_concern', label: 'Attendance concern' },
]

const CLASSIFICATIONS: ManagerClassification[] = [
  'authorised',
  'unauthorised',
  'operational_issue',
  'recording_error',
  'under_review',
]

export function AttendancePage() {
  const { user } = useAuth()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Operations'
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<AttendanceBoardFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scorePerson, setScorePerson] = useState<{ id: string; name: string } | null>(null)
  const [classifyNote, setClassifyNote] = useState('')
  const [classifyAs, setClassifyAs] = useState<ManagerClassification>('under_review')

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-hub'],
    queryFn: () => api.getAttendanceHub(),
  })

  const classify = useMutation({
    mutationFn: (input: {
      rowId: string
      classification: ManagerClassification
      reason?: AbsenceReasonCode | null
      note?: string
    }) =>
      api.classifyAttendanceRow({
        ...input,
        actorName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-hub'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-profile'] })
      setClassifyNote('')
    },
  })

  const rows = useMemo(() => {
    const board = data?.board ?? []
    if (filter === 'all') return board
    if (filter === 'attendance_concern') {
      return board.filter((r) => r.attendanceScore < 85)
    }
    return board.filter((r) => r.status === filter)
  }, [data, filter])

  const selected = rows.find((r) => r.id === selectedId) ?? data?.board.find((r) => r.id === selectedId) ?? null

  if (isLoading || !data) {
    return <p className="text-sm text-muted">Loading attendance…</p>
  }

  const s = data.summary
  const lateAtRisk = data.board.filter((r) => r.status === 'late' && r.schoolRoute)
  const notArrived = data.board.filter((r) => r.status === 'not_arrived')
  const t = data.trends

  if (scorePerson) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setScorePerson(null)}
          className="text-sm font-medium text-command-700 hover:underline"
        >
          ← Back to attendance board
        </button>
        <h1 className="text-2xl font-semibold text-ink">{scorePerson.name}</h1>
        <PersonAttendancePanel personId={scorePerson.id} personName={scorePerson.name} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Attendance & availability</h1>
          <p className="text-sm text-ink-soft">
            Who is working, who is late, who has not arrived, and who is on approved leave — linked to
            Schedule, Trips and Time Off.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/time-off"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Time off requests
          </Link>
          <Link
            to="/schedule"
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
          >
            Open schedule
          </Link>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Attendance —{' '}
          {new Date(s.operationalDate + 'T12:00:00').toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          <SummaryCard label="Scheduled" value={s.scheduled} active={filter === 'all'} onClick={() => setFilter('all')} />
          <SummaryCard label="On time" value={s.onTime} active={filter === 'on_time'} onClick={() => setFilter('on_time')} tone="ready" />
          <SummaryCard label="Late" value={s.late} active={filter === 'late'} onClick={() => setFilter('late')} tone="attention" />
          <SummaryCard label="Not arrived" value={s.notArrived} active={filter === 'not_arrived'} onClick={() => setFilter('not_arrived')} tone="critical" />
          <SummaryCard label="Approved leave" value={s.approvedLeave} active={filter === 'approved_leave'} onClick={() => setFilter('approved_leave')} tone="info" />
          <SummaryCard label="Sick" value={s.sick} active={filter === 'sick'} onClick={() => setFilter('sick')} tone="sick" />
          <SummaryCard label="Attendance rate" value={`${s.attendanceRatePercent}%`} active={false} onClick={() => undefined} />
        </div>
      </div>

      {(lateAtRisk.length > 0 || notArrived.length > 0) && (
        <div className="space-y-3">
          {lateAtRisk.map((r) => (
            <EscalationBanner key={r.id} row={r} hub={data} onSelect={() => setSelectedId(r.id)} />
          ))}
          {notArrived.map((r) => (
            <div key={r.id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
              <p className="font-semibold">
                {r.personName} has not arrived
                {r.scheduledStart ? ` (scheduled ${r.scheduledStart})` : ''}
              </p>
              <p className="mt-1">
                Duty: {r.currentDutyLabel ?? '—'} · Escalation after {data.operationsEscalationMinutes}{' '}
                min past start (grace {data.graceMinutes} min).
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                <Link to="/messages" className="text-command-700 hover:underline">
                  Contact
                </Link>
                <Link to="/schedule" className="text-command-700 hover:underline">
                  Assign cover on schedule
                </Link>
                <button type="button" onClick={() => setSelectedId(r.id)} className="text-command-700 hover:underline">
                  Record reason
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <SectionCard
          title="Live attendance board"
          description="Combined from Driver clock-in, Yard arrival, vehicle check and trip start — geofence supports, never sole evidence"
          action={
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    filter === f.id
                      ? 'bg-command-600 text-white'
                      : 'border border-border bg-surface text-ink-soft hover:bg-surface-muted',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Person</th>
                  <th className="pb-2 pr-3 font-medium">Role</th>
                  <th className="pb-2 pr-3 font-medium">Depot</th>
                  <th className="pb-2 pr-3 font-medium">Scheduled</th>
                  <th className="pb-2 pr-3 font-medium">Clocked in</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Difference</th>
                  <th className="pb-2 pr-3 font-medium">Current duty</th>
                  <th className="pb-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-b border-border/60 cursor-pointer hover:bg-surface-muted/80',
                      selectedId === r.id && 'bg-command-50/50',
                    )}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <td className="py-2.5 pr-3 font-medium">
                      <Link
                        to={r.role === 'yard_manager' || r.role === 'staff' ? `/staff` : `/drivers`}
                        className="text-command-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.personName}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{r.roleLabel}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{r.depotName}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{r.scheduledStart ?? '—'}</td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {r.clockedInAt
                        ? new Date(r.clockedInAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{r.differenceLabel ?? '—'}</td>
                    <td className="py-2.5 pr-3">
                      {r.currentDutyLabel ?? '—'}
                      {r.vehicleRegistration ? (
                        <span className="block text-xs text-muted">{r.vehicleRegistration}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setScorePerson({ id: r.personId, name: r.personName })
                        }}
                      >
                        <span className="font-semibold">{r.attendanceScore}</span>
                        <span className="block text-xs text-muted">
                          {SCORE_BAND_LABEL[r.scoreBand]}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title={selected ? selected.personName : 'Selected person'}
          description={selected ? 'Reason, classification and history' : 'Select a row'}
        >
          {!selected ? (
            <p className="text-sm text-muted">
              Select someone to classify lateness/absence, review evidence and open their attendance
              profile.
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <StatusBadge status={selected.status} />
              <p>
                {selected.differenceLabel ?? ATTENDANCE_STATUS_LABEL[selected.status]}
                {selected.currentDutyLabel ? ` · ${selected.currentDutyLabel}` : ''}
              </p>
              <p className="text-xs text-muted">
                Reported:{' '}
                {selected.reportedReason
                  ? ABSENCE_REASON_LABEL[selected.reportedReason]
                  : 'None yet'}
                {' · '}
                Manager:{' '}
                {selected.managerClassification
                  ? MANAGER_CLASSIFICATION_LABEL[selected.managerClassification]
                  : 'Not reviewed'}
              </p>

              <div className="space-y-2 rounded-lg border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Manager classification
                </p>
                <select
                  value={classifyAs}
                  onChange={(e) => setClassifyAs(e.target.value as ManagerClassification)}
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                >
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>
                      {MANAGER_CLASSIFICATION_LABEL[c]}
                    </option>
                  ))}
                </select>
                <input
                  value={classifyNote}
                  onChange={(e) => setClassifyNote(e.target.value)}
                  placeholder="Note (optional) — e.g. wrong depot assigned"
                  className="w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={classify.isPending}
                  onClick={() =>
                    classify.mutate({
                      rowId: selected.id,
                      classification: classifyAs,
                      reason: selected.reportedReason,
                      note: classifyNote,
                    })
                  }
                  className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  Save classification
                </button>
                <p className="text-[11px] text-muted">
                  Operational issues and recording errors must not be treated like unauthorised
                  absence. No automatic disciplinary action.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setScorePerson({ id: selected.personId, name: selected.personName })
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface-muted"
              >
                Open attendance history & score detail
              </button>
              <Link
                to="/schedule"
                className="block w-full rounded-lg border border-border px-3 py-2 text-center text-xs font-medium hover:bg-surface-muted"
              >
                View on schedule
              </Link>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Reports and trends"
        description="Patterns for manager review — not automatic proof of misconduct"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <TrendStat label="Minutes lost to lateness" value={String(t.minutesLostToLateness)} />
          <TrendStat label="Unauthorised absences" value={String(t.unauthorisedAbsences)} />
          <TrendStat label="Sickness frequency (90d)" value={String(t.sicknessFrequency)} />
          <TrendStat label="RTW interviews outstanding" value={String(t.returnToWorkOutstanding)} />
          <TrendStat
            label="Operational delays (attendance)"
            value={String(t.operationalDelaysFromAttendance)}
          />
          <TrendStat label="Standby / overtime (est.)" value={t.standbyOvertimeCostEstimate} />
          <TrendStat label="Strongest team" value={t.strongestTeam} />
          <TrendStat label="Score movements" value={t.scoreChangesNote} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Punctuality by depot
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {t.punctualityByDepot.map((d) => (
              <li key={d.depot} className="flex justify-between rounded-lg border border-border px-3 py-2">
                <span>{d.depot}</span>
                <span className="font-semibold tabular-nums">{d.percent}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {t.mondayFridayPatternNote}
          </p>
        </div>
      </SectionCard>

      <SectionCard title="How attendance is recorded" description="Multiple evidence sources — GPS never alone">
        <ul className="grid gap-2 text-sm text-ink-soft sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Driver App clock-in',
            'Yard arrival confirmation',
            'Scheduled shift start',
            'First vehicle check',
            'Vehicle collection / QR scan',
            'Trip start',
            'Admin manual adjustment',
            'Depot geofence (supporting only)',
          ].map((item) => (
            <li key={item} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Grace {data.graceMinutes} min · Late from {data.lateMarkMinutes} min · Driver reminder{' '}
          {data.driverReminderMinutes} min · Dispatcher {data.dispatcherWarningMinutes} min · Ops
          escalation {data.operationsEscalationMinutes} min (school routes may escalate sooner).
        </p>
      </SectionCard>
    </div>
  )
}

function EscalationBanner({
  row,
  hub,
  onSelect,
}: {
  row: AttendanceBoardRow
  hub: AttendanceHubData
  onSelect: () => void
}) {
  const minutes = Number(row.differenceLabel?.replace(/\D/g, '') || 0)
  let stage = 'Late'
  if (minutes >= hub.operationsEscalationMinutes) stage = 'Operations escalation'
  else if (minutes >= hub.dispatcherWarningMinutes) stage = 'Dispatcher warning'
  else if (minutes >= hub.driverReminderMinutes) stage = 'Driver reminder'
  else if (minutes >= hub.lateMarkMinutes) stage = 'Marked late'

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{stage}</p>
      <p className="mt-1 font-semibold">
        {row.personName} is {row.differenceLabel?.replace(' late', '') ?? 'late'} late
      </p>
      <p className="mt-1 text-amber-900">
        Duty: {row.currentDutyLabel} · Vehicle: {row.vehicleRegistration ?? '—'} · Passengers:{' '}
        {row.passengersAtRisk}
        {row.schoolRoute ? ' · School contract' : ''} · Risk: Departure may be delayed
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
        <Link to="/messages" className="text-command-700 hover:underline">
          Contact driver
        </Link>
        <Link to="/schedule" className="text-command-700 hover:underline">
          Assign standby driver
        </Link>
        <button type="button" onClick={onSelect} className="text-command-700 hover:underline">
          Record reason
        </button>
        <Link to="/schedule" className="text-command-700 hover:underline">
          View duty
        </Link>
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
  value: number | string
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

function TrendStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: AttendanceLiveStatus }) {
  const tone = ATTENDANCE_STATUS_TONE[status]
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ATTENDANCE_TONE_CLASS[tone],
      )}
    >
      {ATTENDANCE_STATUS_LABEL[status]}
    </span>
  )
}
