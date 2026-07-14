import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { useOperationalContext } from '@/lib/context'
import type { DutyRecord } from '@/lib/api/types'

const DAY_START = 5 * 60 // 05:00 in minutes
const DAY_END = 22 * 60 // 22:00

function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

export function SchedulePage() {
  const { operationalDateIso } = useOperationalContext()
  const [date, setDate] = useState(operationalDateIso)

  const { data: duties = [], isLoading } = useQuery({
    queryKey: ['duties', date],
    queryFn: () => api.getDuties({ date }),
  })

  const sorted = useMemo(
    () =>
      [...duties].sort((a, b) => {
        const ta = parseTimeToMinutes(a.startTime) ?? 0
        const tb = parseTimeToMinutes(b.startTime) ?? 0
        return ta - tb
      }),
    [duties],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
          <p className="text-sm text-slate-600">Day timeline of runs — capacity and coverage at a glance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/bookings/new"
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            + Create booking
          </Link>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      <SectionCard title="Day timeline" description={`${sorted.length} runs on ${formatDateLabel(date)}`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-500">No runs scheduled for this date.</p>
        ) : (
          <div className="space-y-2">
            <div className="relative h-8 rounded-lg bg-slate-50">
              <TimeAxis />
            </div>
            <ul className="space-y-2">
              {sorted.map((duty) => (
                <TimelineRow key={duty.id} duty={duty} />
              ))}
            </ul>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function TimeAxis() {
  const hours = [6, 9, 12, 15, 18, 21]
  return (
    <>
      {hours.map((h) => {
        const pct = ((h * 60 - DAY_START) / (DAY_END - DAY_START)) * 100
        return (
          <span
            key={h}
            className="absolute top-1/2 -translate-y-1/2 text-[10px] text-slate-400"
            style={{ left: `${pct}%` }}
          >
            {String(h).padStart(2, '0')}:00
          </span>
        )
      })}
    </>
  )
}

function TimelineRow({ duty }: { duty: DutyRecord }) {
  const start = parseTimeToMinutes(duty.startTime) ?? DAY_START
  const end = parseTimeToMinutes((duty as { endTime?: string }).endTime) ?? start + 90
  const left = Math.max(0, ((start - DAY_START) / (DAY_END - DAY_START)) * 100)
  const width = Math.min(100 - left, ((end - start) / (DAY_END - DAY_START)) * 100)

  return (
    <li className="grid grid-cols-[140px_1fr] items-center gap-3 text-sm">
      <div>
        <Link to={`/runs/${duty.id}`} className="font-medium text-command-600 hover:underline">
          {duty.reference}
        </Link>
        <p className="truncate text-xs text-slate-500">{duty.route?.name ?? '—'}</p>
      </div>
      <div className="relative h-10 rounded-lg bg-slate-50">
        <div
          className="absolute top-1 bottom-1 flex items-center gap-2 overflow-hidden rounded-md bg-command-100 px-2 text-xs font-medium text-command-900 ring-1 ring-command-200"
          style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
          title={`${duty.startTime ?? '—'} – ${(duty as { endTime?: string }).endTime ?? '—'}`}
        >
          <span className="truncate">{duty.startTime}</span>
        </div>
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">
            {duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : 'Unassigned'}
          </span>
          <StatusPill status={duty.status} />
        </div>
      </div>
    </li>
  )
}

function formatDateLabel(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
