import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { BookingDraft } from '@/lib/bookings/types'
import { estimatePricing } from '@/lib/bookings/validation'
import { api } from '@/lib/api/client'

export function PricingStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: context } = useQuery({
    queryKey: ['customer-booking-context', draft.customerId],
    queryFn: () => api.getCustomerBookingContext(draft.customerId!),
    enabled: !!draft.customerId,
  })

  const contractRef = context?.activeContracts[0]?.ref ?? null

  useEffect(() => {
    const pricing = estimatePricing(
      { ...draft, pricing: { ...draft.pricing, poRequired: context?.poRequired ?? false } },
      contractRef,
    )
    onChange({ pricing: { ...draft.pricing, ...pricing } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.customerId, draft.trips.length, draft.requirements.wheelchairAccessible, draft.requirements.passengerAssistant, contractRef])

  const p = draft.pricing

  return (
    <div className="space-y-4">
      <SectionCard title="Pricing" description={contractRef ? `Contract ${contractRef}` : 'Standard rate card'}>
        {contractRef ? (
          <div className="rounded-lg bg-command-50 p-4 text-sm text-command-900">
            <p className="font-semibold">Price: Covered by {contractRef}</p>
            <p>Billing: {context?.billingArrangement}</p>
            <p>PO required: {context?.poRequired ? 'Yes' : 'No'}</p>
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <PriceRow label="Base fare" value={p.baseFare} />
            <PriceRow label="Distance charge" value={p.distanceCharge} />
            <PriceRow label="Supplements" value={p.supplements} />
            <PriceRow label="Customer price" value={p.totalPrice} bold />
            <PriceRow label="Estimated operating cost" value={p.estimatedCost} />
            <PriceRow label="Estimated margin" value={p.margin} />
            <div className="flex justify-between font-medium">
              <dt className="text-muted">Margin %</dt>
              <dd className={p.marginPct < 10 ? 'text-amber-700' : 'text-emerald-700'}>{p.marginPct.toFixed(1)}%</dd>
            </div>
          </dl>
        )}

        {context?.poRequired && (
          <label className="mt-4 block text-sm">
            <span className="text-ink-soft">Purchase order number</span>
            <input
              value={p.poNumber ?? ''}
              onChange={(e) => onChange({ pricing: { ...p, poNumber: e.target.value } })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
        )}

        {!contractRef && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase text-muted">Price override (authorised users)</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-ink-soft">Override price (£)</span>
                <input
                  type="number"
                  step="0.01"
                  value={p.priceOverride ?? ''}
                  onChange={(e) =>
                    onChange({
                      pricing: {
                        ...p,
                        priceOverride: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-soft">Reason (audit log)</span>
                <input
                  value={p.overrideReason ?? ''}
                  onChange={(e) => onChange({ pricing: { ...p, overrideReason: e.target.value } })}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function PriceRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={bold ? 'font-bold text-ink' : 'text-ink'}>£{value.toFixed(2)}</dd>
    </div>
  )
}
