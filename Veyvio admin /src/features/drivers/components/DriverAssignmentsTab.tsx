import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import type { DriverProfile } from '@/lib/drivers/types'
import { useOperationalContext } from '@/lib/context'

export function DriverAssignmentsTab({ driver }: { driver: DriverProfile }) {
  const { operationalDateIso } = useOperationalContext()
  const from = operationalDateIso
  const toDate = new Date(operationalDateIso + 'T12:00:00')
  toDate.setDate(toDate.getDate() + 14)
  const to = toDate.toISOString().slice(0, 10)

  const { data: duties = [], isLoading } = useQuery({
    queryKey: ['driver-assignments', driver.id, from, to],
    queryFn: () => api.getDuties({ from, to }),
  })

  const mine = useMemo(
    () =>
      duties
        .filter((d) => d.driver?.id === driver.id)
        .sort((a, b) => `${a.dutyDate}${a.startTime ?? ''}`.localeCompare(`${b.dutyDate}${b.startTime ?? ''}`)),
    [duties, driver.id],
  )

  const today = mine.filter((d) => d.dutyDate === operationalDateIso)
  const upcoming = mine.filter((d) => d.dutyDate > operationalDateIso)

  return (
    <div className="space-y-4">
      <SectionCard title="Today's assignments">
        {isLoading ? (
          <p className="text-sm text-muted">Loading assignments…</p>
        ) : today.length === 0 ? (
          <p className="text-sm text-muted">No duties assigned today.</p>
        ) : (
          <ul className="space-y-2">
            {today.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div>
                  <Link to={`/runs/${d.id}`} className="font-medium text-command-600 hover:underline">
                    {d.reference}
                  </Link>
                  <p className="text-xs text-muted">
                    {d.startTime ?? '—'} · {d.route?.name ?? 'No route'} ·{' '}
                    {d.vehicle?.registrationNumber ?? 'No vehicle'}
                  </p>
                </div>
                <StatusPill status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Upcoming (next 14 days)">
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming duties in the next two weeks.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-2">Date</th>
                <th className="pb-2 pr-2">Duty</th>
                <th className="pb-2 pr-2">Route / vehicle</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((d) => (
                <tr key={d.id} className="border-b border-border/60">
                  <td className="py-2 pr-2 text-ink-soft">
                    {formatDate(d.dutyDate)}
                    {d.startTime ? ` · ${d.startTime}` : ''}
                  </td>
                  <td className="py-2 pr-2">
                    <Link to={`/runs/${d.id}`} className="font-medium text-command-600 hover:underline">
                      {d.reference}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-ink-soft">
                    {d.route?.name ?? '—'} · {d.vehicle?.registrationNumber ?? '—'}
                  </td>
                  <td className="py-2">
                    <StatusPill status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
