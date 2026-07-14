import { SectionCard } from '@/components/ui'
import { ValidationList } from '@/features/bookings/components/BookingWizardUi'
import type { BookingDraft, BookingValidationItem } from '@/lib/bookings/types'

export function ReviewStep({
  draft,
  validation,
}: {
  draft: BookingDraft
  validation: BookingValidationItem[]
}) {
  const trip = draft.trips[0]
  const pickup = trip?.stops.find((s) => s.type === 'pickup')
  const dropoff = trip?.stops.find((s) => s.type === 'dropoff')

  return (
    <div className="space-y-4">
      <SectionCard title="Review before confirmation">
        <dl className="space-y-3 text-sm">
          <Row label="Customer" value={draft.customerName ?? '—'} />
          <Row
            label="Passenger(s)"
            value={
              draft.passengers.length
                ? draft.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(', ')
                : '—'
            }
          />
          <Row label="Journey" value={trip ? `${trip.pickupDate} · ${trip.label}` : '—'} />
          <Row label="Pickup" value={`${trip?.calculatedPickupTime ?? trip?.requestedPickupTime ?? '—'} — ${pickup?.address || '—'}`} />
          <Row label="Drop-off" value={`${trip?.calculatedArrivalTime ?? trip?.requiredArrivalTime ?? '—'} — ${dropoff?.address || '—'}`} />
          <Row
            label="Requirements"
            value={[
              draft.requirements.wheelchairAccessible && 'Wheelchair vehicle',
              draft.requirements.passengerAssistant && 'Passenger assistant',
              draft.requirements.boosterSeat && 'Booster seat',
            ]
              .filter(Boolean)
              .join(' · ') || 'Standard'}
          />
          <Row
            label="Billing"
            value={
              draft.pricing.contractRef
                ? `Contract ${draft.pricing.contractRef}${draft.pricing.poNumber ? ` · PO ${draft.pricing.poNumber}` : ''}`
                : `£${draft.pricing.totalPrice.toFixed(2)}`
            }
          />
          <Row
            label="Dispatch"
            value={
              draft.dispatch.mode === 'send_to_dispatch'
                ? 'Send to Dispatch'
                : draft.dispatch.mode === 'assign_now'
                  ? 'Assign now'
                  : 'Auto-plan'
            }
          />
        </dl>
      </SectionCard>

      <SectionCard title="Validation">
        <ValidationList items={validation} />
      </SectionCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  )
}
