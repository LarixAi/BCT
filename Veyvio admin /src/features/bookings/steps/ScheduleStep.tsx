import { SectionCard } from '@/components/ui'
import type { BookingDraft } from '@/lib/bookings/types'

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

export function ScheduleStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const rec = draft.recurrence
  const showRecurrence = ['recurring', 'school', 'contract'].includes(draft.bookingType)

  function setRec(patch: Partial<typeof rec>) {
    onChange({ recurrence: { ...rec, ...patch, enabled: showRecurrence } })
  }

  function toggleDay(day: string) {
    const days = rec.daysOfWeek.includes(day)
      ? rec.daysOfWeek.filter((d) => d !== day)
      : [...rec.daysOfWeek, day]
    setRec({ daysOfWeek: days })
  }

  if (!showRecurrence) {
    return (
      <SectionCard title="Schedule" description="One-off journey — no recurrence pattern needed">
        <p className="text-sm text-slate-600">
          Trip dates are set on the Journey step. Recurring transport uses a pattern with trips generated 4–8 weeks ahead.
        </p>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Recurrence pattern" description="Trips generated 4–8 weeks ahead — not years of fixed records">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-600">Start date</span>
            <input type="date" value={rec.startDate} onChange={(e) => setRec({ startDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">End date</span>
            <input type="date" value={rec.endDate} onChange={(e) => setRec({ endDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5" />
          </label>
        </div>

        <div className="mt-4">
          <p className="text-sm text-slate-600">Days of the week</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  rec.daysOfWeek.includes(d.id) ? 'bg-command-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rec.termTimeOnly} onChange={(e) => setRec({ termTimeOnly: e.target.checked })} />
          Term-time only
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-900">Morning</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TimeField label="Pickup" value={rec.morningPickupTime} onChange={(v) => setRec({ morningPickupTime: v })} />
              <TimeField label="Arrival" value={rec.morningArrivalTime} onChange={(v) => setRec({ morningArrivalTime: v })} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">Afternoon</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <TimeField label="Pickup" value={rec.afternoonPickupTime} onChange={(v) => setRec({ afternoonPickupTime: v })} />
              <TimeField label="Drop-off" value={rec.afternoonDropoffTime} onChange={(v) => setRec({ afternoonDropoffTime: v })} />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-xs">
      <span className="text-slate-500">{label}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1" />
    </label>
  )
}
