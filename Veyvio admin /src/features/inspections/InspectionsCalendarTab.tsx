import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { InspectionCalendarEvent } from '@/lib/inspections/types'

export function InspectionsCalendarTab({ events }: { events: InspectionCalendarEvent[] }) {
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
    const map = new Map<number, InspectionCalendarEvent[]>()
    for (const e of events) {
      const d = new Date(e.date)
      if (d.getFullYear() !== anchor.getFullYear() || d.getMonth() !== anchor.getMonth()) continue
      const day = d.getDate()
      map.set(day, [...(map.get(day) ?? []), e])
    }
    return map
  }, [events, anchor])

  return (
    <SectionCard
      title="Inspection calendar"
      description="Booked and due formal inspections — drag-drop scheduling deferred"
    >
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m - 1)}
          className="rounded-lg border border-border px-3 py-1 text-sm"
        >
          ← Previous
        </button>
        <h3 className="font-medium text-ink">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-lg border border-border px-3 py-1 text-sm"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-surface-muted text-xs">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="bg-surface-muted px-2 py-1 font-medium text-ink-soft">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[88px] bg-surface" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayEvents = byDay.get(day) ?? []
          return (
            <div key={day} className="min-h-[88px] bg-surface p-1">
              <p className="mb-1 font-medium text-ink-soft">{day}</p>
              <ul className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/inspections/${e.inspectionId}`}
                      className="block truncate rounded bg-command-50 px-1 text-[10px] text-command-800 hover:bg-command-100"
                      title={e.title}
                    >
                      {e.registrationNumber}
                    </Link>
                  </li>
                ))}
                {dayEvents.length > 3 && (
                  <li className="text-[10px] text-muted">+{dayEvents.length - 3} more</li>
                )}
              </ul>
            </div>
          )
        })}
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        {events.slice(0, 16).map((e) => (
          <li key={e.id} className="flex justify-between gap-4 border-b border-border/60 pb-2">
            <span>
              <span className="font-medium">{new Date(e.date).toLocaleDateString('en-GB')}</span>
              {' · '}
              <Link to={`/inspections/${e.inspectionId}`} className="text-command-600 hover:underline">
                {e.registrationNumber}
              </Link>
              <span className="text-ink-soft"> — {e.title}</span>
            </span>
            <span className="shrink-0 text-xs text-muted">{e.status}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
