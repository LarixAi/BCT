import { SectionCard } from '@/components/ui'
import { ValidationList } from '@/features/bookings/components/BookingWizardUi'
import { DispatchStep } from '@/features/bookings/steps/DispatchStep'
import { buildJobPreview, countJobsToGenerate, FUNDING_TYPE_OPTIONS } from '@/lib/bookings/booking-journey-utils'
import type { BookingDraft, BookingValidationItem } from '@/lib/bookings/types'

export function ReviewStep({
  draft,
  validation,
  onChange,
}: {
  draft: BookingDraft
  validation: BookingValidationItem[]
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const trip = draft.trips[0]
  const pickup = trip?.stops.find((s) => s.type === 'pickup')
  const dropoff = trip?.stops.find((s) => s.type === 'dropoff')
  const jobs = buildJobPreview(draft)
  const fundingLabel =
    FUNDING_TYPE_OPTIONS.find((f) => f.id === draft.fundingType)?.label ?? draft.fundingType

  return (
    <div className="space-y-4">
      <SectionCard title="Jobs to generate" description={`${countJobsToGenerate(draft)} job(s) will be created on confirmation`}>
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
              <p className="font-semibold text-ink">{job.label}</p>
              <p className="text-ink-soft">{job.passenger}</p>
              <p className="text-ink-soft">{job.route}</p>
              <p className="text-ink-soft">{job.time}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Review before confirmation">
        <dl className="space-y-3 text-sm">
          <Row label="Funding" value={fundingLabel} />
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
        </dl>
      </SectionCard>

      <DispatchStep draft={draft} onChange={onChange} />

      <SectionCard title="Validation">
        <ValidationList items={validation} />
      </SectionCard>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  )
}
