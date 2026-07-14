import { SectionCard } from '@/components/ui'
import type { BookingDraft } from '@/lib/bookings/types'
import { calculateTripTimes } from '@/lib/bookings/validation'

export function JourneyStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  function updateTrip(index: number, patch: Partial<BookingDraft['trips'][0]>) {
    const trips = draft.trips.map((t, i) => {
      if (i !== index) return t
      const merged = { ...t, ...patch }
      const times = calculateTripTimes(merged)
      return { ...merged, ...times }
    })
    onChange({ trips })
  }

  function updateStop(tripIndex: number, stopIndex: number, address: string, name?: string) {
    const trips = [...draft.trips]
    const trip = { ...trips[tripIndex]! }
    trip.stops = trip.stops.map((s, i) =>
      i === stopIndex ? { ...s, address, name: name ?? s.name } : s,
    )
    trips[tripIndex] = { ...trip, ...calculateTripTimes(trip) }
    onChange({ trips })
  }

  return (
    <div className="space-y-4">
      {draft.trips.map((trip, tripIndex) => (
        <SectionCard key={trip.id} title={trip.label} description="Booking → Trip → Stops">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-slate-600">Pickup date</span>
              <input
                type="date"
                value={trip.pickupDate}
                onChange={(e) => updateTrip(tripIndex, { pickupDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Scheduling</span>
              <select
                value={trip.schedulingMode}
                onChange={(e) =>
                  updateTrip(tripIndex, {
                    schedulingMode: e.target.value as 'pickup_led' | 'arrival_led',
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              >
                <option value="pickup_led">Pickup-led — customer specifies departure</option>
                <option value="arrival_led">Arrival-led — must arrive by time (schools, healthcare)</option>
              </select>
            </label>
            {trip.schedulingMode === 'pickup_led' ? (
              <label className="text-sm">
                <span className="text-slate-600">Requested pickup time</span>
                <input
                  type="time"
                  value={trip.requestedPickupTime ?? ''}
                  onChange={(e) => updateTrip(tripIndex, { requestedPickupTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </label>
            ) : (
              <label className="text-sm">
                <span className="text-slate-600">Required arrival time</span>
                <input
                  type="time"
                  value={trip.requiredArrivalTime ?? ''}
                  onChange={(e) => updateTrip(tripIndex, { requiredArrivalTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </label>
            )}
            {trip.calculatedArrivalTime && (
              <p className="text-sm text-slate-600 sm:col-span-2">
                Calculated: pickup {trip.calculatedPickupTime} → arrive {trip.calculatedArrivalTime}
                <span className="text-slate-400"> (includes journey, boarding & traffic allowance)</span>
              </p>
            )}
          </div>

          <div className="space-y-3">
            {trip.stops.map((stop, stopIndex) => (
              <label key={stop.id} className="block text-sm">
                <span className="capitalize text-slate-600">{stop.type} — {stop.name}</span>
                <input
                  type="text"
                  value={stop.address}
                  onChange={(e) => updateStop(tripIndex, stopIndex, e.target.value)}
                  placeholder="Full address"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </label>
            ))}
          </div>
        </SectionCard>
      ))}

      <SectionCard title="Instructions">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Journey purpose" value={draft.journeyPurpose} onChange={(v) => onChange({ journeyPurpose: v })} />
          <Field label="Pickup contact" value={draft.pickupContact} onChange={(v) => onChange({ pickupContact: v })} />
          <Field label="Pickup instructions" value={draft.pickupInstructions} onChange={(v) => onChange({ pickupInstructions: v })} multiline />
          <Field label="Drop-off instructions" value={draft.dropoffInstructions} onChange={(v) => onChange({ dropoffInstructions: v })} multiline />
        </div>
      </SectionCard>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <label className="text-sm">
      <span className="text-slate-600">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
        />
      )}
    </label>
  )
}
