import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_TONE,
  ATTENDANCE_TONE_CLASS,
  CALENDAR_MARK_LABEL,
  SCORE_BAND_LABEL,
} from '@/lib/attendance/constants'
import type { AttendancePersonProfile, CalendarDayMark } from '@/lib/attendance/types'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/cn'

const MARK_CELL: Record<CalendarDayMark, string> = {
  on_time: 'bg-emerald-100 text-emerald-900',
  late: 'bg-amber-100 text-amber-950',
  sick: 'bg-violet-100 text-violet-950',
  approved_leave: 'bg-sky-100 text-sky-950',
  unauthorised: 'bg-red-100 text-red-900',
  rest: 'bg-surface-muted text-muted',
  empty: 'bg-surface text-muted',
}

const MARK_GLYPH: Record<CalendarDayMark, string> = {
  on_time: '✓',
  late: 'L',
  sick: 'S',
  approved_leave: 'A',
  unauthorised: 'U',
  rest: '—',
  empty: '',
}

export function PersonAttendancePanel({
  personId,
  personName,
  profileHref,
}: {
  personId?: string | null
  personName: string
  profileHref?: string
}) {
  const [showScoreDetail, setShowScoreDetail] = useState(false)
  const [period, setPeriod] = useState<'30' | '90' | '365'>('90')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['attendance-profile', personId, personName],
    queryFn: (): Promise<AttendancePersonProfile | null> =>
      api.getAttendancePersonProfile({ personId, personName }),
  })

  if (isLoading) return <p className="text-sm text-muted">Loading attendance…</p>
  if (!profile?.score || typeof profile.score.score !== 'number') {
    return (
      <SectionCard title="Attendance">
        <p className="text-sm text-muted">No attendance profile for this person yet.</p>
      </SectionCard>
    )
  }

  const p: AttendancePersonProfile = profile
  const scoreContributors = Array.isArray(p.scoreContributors) ? p.scoreContributors : []
  const upcomingLeave = Array.isArray(p.upcomingLeave) ? p.upcomingLeave : []
  const recentEvents = Array.isArray(p.recentEvents) ? p.recentEvents : []
  const returnToWork = Array.isArray(p.returnToWork) ? p.returnToWork : []
  const managerNotes = Array.isArray(p.managerNotes) ? p.managerNotes : []
  const adjustments = Array.isArray(p.adjustments) ? p.adjustments : []
  const calendarMonth = p.calendarMonth ?? {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    days: [],
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="Attendance score"
        description={`Rolling ${period === '365' ? '12 months' : `${period} days`} · explainable · not a public ranking`}
        action={
          <div className="flex flex-wrap gap-1">
            {(
              [
                { id: '30' as const, label: '30d' },
                { id: '90' as const, label: '90d' },
                { id: '365' as const, label: '12m' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  period === opt.id
                    ? 'bg-command-600 text-white'
                    : 'border border-border bg-surface text-ink-soft',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      >
        <button
          type="button"
          onClick={() => setShowScoreDetail((v) => !v)}
          className="flex w-full flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3 text-left hover:border-command-400"
        >
          <div>
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {p.score.score}
              <span className="text-lg font-medium text-muted"> / 100</span>
            </p>
            <p className="text-sm font-medium text-ink-soft">
              {SCORE_BAND_LABEL[p.score.band] ?? 'Score'}
              {p.liveStatus ? ` · Today: ${ATTENDANCE_STATUS_LABEL[p.liveStatus]}` : ''}
            </p>
          </div>
          <p className="text-xs font-medium text-command-700">
            {showScoreDetail ? 'Hide what changed the score' : 'See what changed the score'}
          </p>
        </button>

        {showScoreDetail && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted">
              Weights: attendance 40% · punctuality 30% · unauthorised 15% · missed clock-ins 5% ·
              early departure 5% · evidence 5%. Approved leave and certified sickness do not reduce
              the score.
            </p>
            <ul className="space-y-1.5 text-sm">
              {scoreContributors.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-ink">{c.label}</p>
                    <p className="text-xs text-muted">
                      {c.date} · {c.category}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'tabular-nums font-semibold',
                      c.impact < 0 ? 'text-red-700' : c.impact > 0 ? 'text-emerald-700' : 'text-muted',
                    )}
                  >
                    {c.impact > 0 ? `+${c.impact}` : c.impact}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <Stat label="On-time shifts" value={`${p.onTimeShiftsPercent}%`} />
          <Stat label="Attendance rate" value={`${p.attendanceRatePercent}%`} />
          <Stat label="Late arrivals" value={String(p.lateArrivals)} />
          <Stat label="Unauthorised absences" value={String(p.unauthorisedAbsences)} />
          <Stat label="Approved sickness" value={String(p.approvedSickness)} />
          <Stat label="Early departures" value={String(p.earlyDepartures)} />
          <Stat label="Avg lateness" value={`${p.averageLatenessMinutes} min`} />
          <Stat label="Total minutes late" value={String(p.totalMinutesLate)} />
          <Stat label="Current absence" value={p.currentAbsence ?? 'None'} />
        </dl>
      </SectionCard>

      <SectionCard title="Attendance calendar" description={`${monthLabel(calendarMonth)}`}>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="py-1 font-semibold text-muted">
              {d}
            </div>
          ))}
          {padCalendar({ ...p, calendarMonth }).map((cell, i) =>
            cell ? (
              <div
                key={cell.date}
                title={`${cell.date} · ${CALENDAR_MARK_LABEL[cell.mark]}`}
                className={cn(
                  'rounded py-1.5 font-semibold tabular-nums',
                  MARK_CELL[cell.mark],
                )}
              >
                {MARK_GLYPH[cell.mark]}
              </div>
            ) : (
              <div key={`pad-${i}`} />
            ),
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          ✓ On time · L Late · S Sick · A Approved leave · U Unauthorised · — Rest
        </p>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Upcoming leave">
          {upcomingLeave.length === 0 ? (
            <p className="text-sm text-muted">None</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingLeave.map((l) => (
                <li key={l.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium text-ink">
                    {l.startDate === l.endDate ? l.startDate : `${l.startDate} → ${l.endDate}`}
                  </p>
                  <p className="text-xs text-muted">
                    {l.status.replace(/_/g, ' ')} · {l.leaveType.replace(/_/g, ' ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/time-off" className="mt-3 inline-block text-xs font-medium text-command-700 hover:underline">
            Open Time off
          </Link>
        </SectionCard>

        <SectionCard title="Return-to-work">
          {returnToWork.length === 0 ? (
            <p className="text-sm text-muted">No outstanding interviews</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {returnToWork.map((r) => (
                <li
                  key={r.id}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    r.completed ? 'border-border' : 'border-amber-200 bg-amber-50',
                  )}
                >
                  <p className="font-medium">{r.summary}</p>
                  <p className="text-xs text-muted">{r.date}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent attendance events">
        {recentEvents.length === 0 ? (
          <p className="text-sm text-muted">No recent events</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {recentEvents.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-border/60 pb-2">
                <span className="w-14 shrink-0 font-mono text-xs text-muted">
                  {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-ink">{e.label}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Manager notes">
          {managerNotes.length === 0 ? (
            <p className="text-sm text-muted">No notes</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {managerNotes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="text-ink">{n.note}</p>
                  <p className="mt-1 text-xs text-muted">
                    {n.author} · {new Date(n.at).toLocaleString('en-GB')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Adjustments and disputes">
          {adjustments.length === 0 ? (
            <p className="text-sm text-muted">No adjustments</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {adjustments.map((a) => (
                <li key={a.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium text-ink">
                    {a.original} → {a.corrected}
                  </p>
                  <p className="text-ink-soft">{a.reason}</p>
                  <p className="mt-1 text-xs text-muted">
                    {a.actor} · {new Date(a.at).toLocaleString('en-GB')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {profileHref && (
        <p className="text-xs text-muted">
          Linked profile:{' '}
          <Link to={profileHref} className="font-medium text-command-700 hover:underline">
            {personName}
          </Link>
        </p>
      )}

      {p.liveStatus && (
        <span
          className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
            ATTENDANCE_TONE_CLASS[ATTENDANCE_STATUS_TONE[p.liveStatus]],
          )}
        >
          Live: {ATTENDANCE_STATUS_LABEL[p.liveStatus]}
        </span>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}

function monthLabel(cal: AttendancePersonProfile['calendarMonth']) {
  return new Date(cal.year, cal.month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })
}

/** Pad so Monday is first column. */
function padCalendar(profile: AttendancePersonProfile) {
  const days = profile.calendarMonth.days
  if (!days.length) return []
  const first = new Date(days[0]!.date + 'T12:00:00')
  const mondayIndex = (first.getDay() + 6) % 7
  const padded: Array<{ date: string; mark: CalendarDayMark } | null> = []
  for (let i = 0; i < mondayIndex; i += 1) padded.push(null)
  for (const d of days) padded.push(d)
  return padded
}
