import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { MaintenanceCalendarEvent } from '@/lib/maintenance/types'

export function MaintenanceCalendarTab({ events }: { events: MaintenanceCalendarEvent[] }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const anchor = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])

  const monthLabel = anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  const startPad = (anchor.getDay() + 6) % 7

  const byDay = useMemo(() => {
    const map = new Map<number, MaintenanceCalendarEvent[]>()
    for (const e of events) {
      const d = new Date(e.date)
      if (d.getFullYear() !== anchor.getFullYear() || d.getMonth() !== anchor.getMonth()) continue
      const day = d.getDate()
      map.set(day, [...(map.get(day) ?? []), e])
    }
    return map
  }, [events, anchor])

  return (
    <SectionCard title="Maintenance calendar" description="Services, MOT, calibrations, workshop bookings and retorque dates">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg border border-slate-200 px-3 py-1 text-sm">
          ← Previous
        </button>
        <h3 className="font-medium text-slate-900">{monthLabel}</h3>
        <button type="button" onClick={() => setMonthOffset((m) => m + 1)} className="rounded-lg border border-slate-200 px-3 py-1 text-sm">
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="bg-slate-50 px-2 py-1 font-medium text-slate-600">{d}</div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[88px] bg-white" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = byDay.get(day) ?? []
          return (
            <div key={day} className="min-h-[88px] bg-white p-1">
              <p className="mb-1 font-medium text-slate-700">{day}</p>
              <ul className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/vehicles/${e.vehicleId}?tab=Maintenance`}
                      className="block truncate rounded bg-command-50 px-1 text-[10px] text-command-800 hover:bg-command-100"
                      title={e.title}
                    >
                      {e.registrationNumber}
                    </Link>
                  </li>
                ))}
                {dayEvents.length > 3 && (
                  <li className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {events.slice(0, 12).map((e) => (
          <li key={e.id} className="flex justify-between gap-4 border-b border-slate-50 pb-2">
            <span>
              <span className="font-medium">{new Date(e.date).toLocaleDateString('en-GB')}</span>
              {' · '}
              <Link to={`/vehicles/${e.vehicleId}?tab=Maintenance`} className="text-command-600 hover:underline">
                {e.registrationNumber}
              </Link>
              {' — '}
              {e.title}
            </span>
            <span className="shrink-0 capitalize text-slate-500">{e.eventType.replace(/_/g, ' ')}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
