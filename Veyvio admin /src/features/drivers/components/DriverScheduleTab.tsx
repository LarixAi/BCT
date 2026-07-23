import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { formatDate } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import type { DriverProfile } from '@/lib/drivers/types'
import { weekDates } from '@/lib/ops/runs-trips-schedule'
import { useOperationalContext } from '@/lib/context'

export function DriverScheduleTab({ driver }: { driver: DriverProfile }) {
  const { operationalDateIso } = useOperationalContext()
  const [anchor, setAnchor] = useState(operationalDateIso)
  const days = useMemo(() => weekDates(anchor), [anchor])
  const from = days[0]!
  const to = days[6]!

  const { data: duties = [], isLoading } = useQuery({
    queryKey: ['driver-schedule', driver.id, from, to],
    queryFn: () => api.getDuties({ from, to }),
  })

  const mine = useMemo(
    () => duties.filter((d) => d.driver?.id === driver.id).sort((a, b) => a.dutyDate.localeCompare(b.dutyDate)),
    [duties, driver.id],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, typeof mine>()
    for (const day of days) map.set(day, [])
    for (const d of mine) {
      const list = map.get(d.dutyDate) ?? []
      list.push(d)
      map.set(d.dutyDate, list)
    }
    return map
  }, [days, mine])

  const shiftWeek = (delta: number) => {
    const d = new Date(anchor + 'T12:00:00')
    d.setDate(d.getDate() + delta * 7)
    setAnchor(d.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Schedule and availability">
        <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Availability</dt>
            <dd className="font-medium text-ink">{driver.availabilityStatus.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt className="text-muted">Duty status</dt>
            <dd className="font-medium text-ink">{driver.dutyStatus.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt className="text-muted">Next duty</dt>
            <dd className="font-medium text-ink">
              {driver.nextDutyReference
                ? `${driver.nextDutyReference}${driver.nextDutyTime ? ` · ${driver.nextDutyTime}` : ''}`
                : '—'}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted">
          Availability does not mean eligible for assignment. Check the Eligibility tab before dispatch.
        </p>
      </SectionCard>

      <SectionCard
        title="This week"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setAnchor(operationalDateIso)}
              className="rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-surface-muted"
            >
              Next
            </button>
            <Link to="/schedule" className="text-xs font-medium text-command-600 hover:underline">
              Full schedule
            </Link>
          </div>
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted">Loading duties…</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-7">
            {days.map((day) => {
              const dayDuties = byDay.get(day) ?? []
              const isToday = day === operationalDateIso
              return (
                <div
                  key={day}
                  className={`min-h-[5.5rem] rounded-lg border px-2 py-2 ${
                    isToday ? 'border-command-300 bg-command-50/40' : 'border-border bg-surface'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' })}
                  </p>
                  <p className="text-xs font-medium text-ink">{formatDate(day)}</p>
                  <ul className="mt-2 space-y-1">
                    {dayDuties.length === 0 ? (
                      <li className="text-[11px] text-muted">—</li>
                    ) : (
                      dayDuties.map((d) => (
                        <li key={d.id}>
                          <Link
                            to={`/runs/${d.id}`}
                            className="block truncate text-[11px] font-medium text-command-700 hover:underline"
                          >
                            {d.startTime ?? '—'} {d.reference}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
        {!isLoading && mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No duties assigned to this driver in this week.</p>
        ) : null}
      </SectionCard>
    </div>
  )
}
