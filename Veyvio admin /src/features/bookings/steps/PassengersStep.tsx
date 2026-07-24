import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { CUSTOMER_TYPE_LABELS } from '@/lib/bookings/constants'
import { FUNDING_TYPE_OPTIONS } from '@/lib/bookings/booking-journey-utils'
import type { BookingDraft, CustomerBookingContext, FundingType } from '@/lib/bookings/types'
import { inferBookingCustomer } from '@/lib/bookings/resolve-booking-customer'
import { api } from '@/lib/api/client'
import { enrichPassenger } from '@/lib/bookings/passenger'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function PassengersStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: passengers = [] } = useQuery({
    queryKey: tKey(['passengers']),
    queryFn: () => api.getPassengers(),
  })

  const { data: customers = [] } = useQuery({
    queryKey: tKey(['customers']),
    queryFn: () => api.getCustomers(),
  })

  function applyPassengerChange(nextPassengers: BookingDraft['passengers']) {
    const inferred = inferBookingCustomer(
      { customerId: draft.customerId, passengers: nextPassengers },
      passengers,
      customers,
    )
    onChange(inferred ? { passengers: nextPassengers, ...inferred } : { passengers: nextPassengers })
  }

  function togglePassenger(id: string) {
    const exists = draft.passengers.find((p) => p.passengerId === id)
    if (exists) {
      applyPassengerChange(draft.passengers.filter((p) => p.passengerId !== id))
      return
    }
    const record = passengers.find((p) => p.id === id)
    if (!record) return
    applyPassengerChange([...draft.passengers, enrichPassenger(record)])
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Add passengers" description="Operational summaries only — full profiles stay restricted">
        <ul className="divide-y divide-border">
          {passengers.map((p) => {
            const selected = draft.passengers.find((x) => x.passengerId === p.id)
            return (
              <li key={p.id} className="py-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => togglePassenger(p.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {p.firstName} {p.lastName}
                    </p>
                    {selected ? (
                      <div className="mt-2 rounded-lg bg-surface-muted p-3 text-sm">
                        <p className="text-xs font-semibold uppercase text-muted">Requirements</p>
                        <ul className="mt-1 list-inside list-disc text-ink-soft">
                          {selected.requirements.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">{p.routeName ?? p.customerName}</p>
                    )}
                  </div>
                </label>
              </li>
            )
          })}
        </ul>
      </SectionCard>
    </div>
  )
}
