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
        <SectionCard key={trip.id} title={trip.label} description="Step 4 — pickup, stops and drop-off">
          <div className="space-y-3">
            {trip.stops.map((stop, stopIndex) => (
              <label key={stop.id} className="block text-sm">
                <span className="capitalize text-ink-soft">
                  {stop.type} — {stop.name}
                </span>
                <input
                  type="text"
                  value={stop.address}
                  onChange={(e) => updateStop(tripIndex, stopIndex, e.target.value)}
                  placeholder="Full address"
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
            ))}
          </div>
        </SectionCard>
      ))}

      <SectionCard title="Location contacts and instructions">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pickup contact" value={draft.pickupContact} onChange={(v) => onChange({ pickupContact: v })} />
          <Field label="Drop-off contact" value={draft.dropoffContact} onChange={(v) => onChange({ dropoffContact: v })} />
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
      <span className="text-ink-soft">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
        />
      )}
    </label>
  )
}
