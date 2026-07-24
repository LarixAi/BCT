import { SectionCard } from '@/components/ui'
import type { BookingDraft } from '@/lib/bookings/types'
import { calculateTripTimes } from '@/lib/bookings/validation'

export function ScheduleStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const isRecurring = draft.recurrence.enabled || draft.bookingType === 'recurring'
  const rec = draft.recurrence

  function updateTrip(index: number, patch: Partial<BookingDraft['trips'][0]>) {
    const trips = draft.trips.map((t, i) => {
      if (i !== index) return t
      const merged = { ...t, ...patch }
      return { ...merged, ...calculateTripTimes(merged) }
    })
    onChange({ trips })
  }

  function setRec(patch: Partial<typeof rec>) {
    onChange({ recurrence: { ...rec, ...patch, enabled: isRecurring } })
  }

  return (
    <div className="space-y-4">
      {draft.trips.map((trip, tripIndex) => (
        <SectionCard
          key={trip.id}
          title={`${trip.label} — date and time`}
          description="Step 5 — when the journey happens"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-ink-soft">Journey date</span>
              <input
                type="date"
                value={trip.pickupDate}
                onChange={(e) => updateTrip(tripIndex, { pickupDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-soft">Time basis</span>
              <select
                value={trip.schedulingMode}
                onChange={(e) =>
                  updateTrip(tripIndex, {
                    schedulingMode: e.target.value as 'pickup_led' | 'arrival_led',
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              >
                <option value="pickup_led">Pickup-led — customer specifies departure</option>
                <option value="arrival_led">Arrival-led — must arrive by time</option>
              </select>
            </label>
            {trip.schedulingMode === 'pickup_led' ? (
              <label className="text-sm">
                <span className="text-ink-soft">Requested pickup time</span>
                <input
                  type="time"
                  value={trip.requestedPickupTime ?? ''}
                  onChange={(e) => updateTrip(tripIndex, { requestedPickupTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
            ) : (
              <label className="text-sm">
                <span className="text-ink-soft">Required arrival time</span>
                <input
                  type="time"
                  value={trip.requiredArrivalTime ?? ''}
                  onChange={(e) => updateTrip(tripIndex, { requiredArrivalTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
            )}
            {trip.calculatedArrivalTime && (
              <p className="text-sm text-ink-soft sm:col-span-2">
                Calculated: pickup {trip.calculatedPickupTime} → arrive {trip.calculatedArrivalTime}
                <span className="text-muted"> (includes journey, boarding and traffic allowance)</span>
              </p>
            )}
          </div>
        </SectionCard>
      ))}

      {isRecurring && (
        <SectionCard
          title="Recurring journey times"
          description="Pattern dates are set on the Journey step — refine operating times here"
        >
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rec.termTimeOnly} onChange={(e) => setRec({ termTimeOnly: e.target.checked })} />
            Term-time only
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-ink">Morning</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TimeField label="Pickup" value={rec.morningPickupTime} onChange={(v) => setRec({ morningPickupTime: v })} />
                <TimeField label="Arrival" value={rec.morningArrivalTime} onChange={(v) => setRec({ morningArrivalTime: v })} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Afternoon</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <TimeField label="Pickup" value={rec.afternoonPickupTime} onChange={(v) => setRec({ afternoonPickupTime: v })} />
                <TimeField label="Drop-off" value={rec.afternoonDropoffTime} onChange={(v) => setRec({ afternoonDropoffTime: v })} />
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-xs">
      <span className="text-muted">{label}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-2 py-1" />
    </label>
  )
}
