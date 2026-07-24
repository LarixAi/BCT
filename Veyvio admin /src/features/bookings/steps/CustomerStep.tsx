import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { CUSTOMER_TYPE_LABELS } from '@/lib/bookings/constants'
import { FUNDING_TYPE_OPTIONS } from '@/lib/bookings/booking-journey-utils'
import type { BookingDraft, CustomerBookingContext, FundingType } from '@/lib/bookings/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function CustomerStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: customers = [] } = useQuery({
    queryKey: tKey(['customers']),
    queryFn: () => api.getCustomers(),
  })

  const { data: context } = useQuery({
    queryKey: tKey(['customer-booking-context', draft.customerId]),
    queryFn: () => api.getCustomerBookingContext(draft.customerId!),
    enabled: !!draft.customerId,
  })

  function selectCustomer(customerId: string, name: string) {
    onChange({ customerId, customerName: name })
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Funding" description="Step 2 — who pays for this journey">
        <div className="grid gap-3 sm:grid-cols-2">
          {FUNDING_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-sm ${
                draft.fundingType === opt.id ? 'border-command-500 bg-command-50' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="funding-type"
                checked={(draft.fundingType ?? 'customer_account') === opt.id}
                onChange={() => onChange({ fundingType: opt.id as FundingType })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Select customer" description="Search existing customers or link a new account">
        <input
          type="search"
          placeholder="Search customers…"
          className="mb-3 w-full rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <ul className="divide-y divide-border rounded-lg border border-border">
          {customers.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectCustomer(c.id, c.name)}
                className={`w-full px-4 py-3 text-left transition hover:bg-surface-muted ${
                  draft.customerId === c.id ? 'bg-command-50 ring-2 ring-inset ring-command-500' : ''
                }`}
              >
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs capitalize text-muted">{c.status ?? 'active'}</p>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      {context && <CustomerContextPanel context={context} />}
    </div>
  )
}

function CustomerContextPanel({ context }: { context: CustomerBookingContext }) {
  return (
    <SectionCard title="Customer account" description="Contract rules load automatically — do not re-enter on every booking">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Type</dt>
          <dd className="font-medium capitalize">{CUSTOMER_TYPE_LABELS[context.customerType] ?? context.customerType}</dd>
        </div>
        <div>
          <dt className="text-muted">Account</dt>
          <dd className="font-medium capitalize">{context.accountStatus}</dd>
        </div>
        <div>
          <dt className="text-muted">Billing</dt>
          <dd className="font-medium">{context.billingArrangement}</dd>
        </div>
        <div>
          <dt className="text-muted">Credit</dt>
          <dd className="font-medium capitalize">{context.creditStatus}</dd>
        </div>
      </dl>

      {context.activeContracts.length > 0 && (
        <div className="mt-4 rounded-lg bg-command-50 p-3 text-sm">
          <p className="font-semibold text-command-900">{context.activeContracts[0]!.name}</p>
          <p className="text-command-800">Ref: {context.activeContracts[0]!.ref}</p>
          {context.contractRules && (
            <ul className="mt-2 list-inside list-disc text-command-800">
              <li>Wheelchair journeys {context.contractRules.wheelchairAllowed ? 'allowed' : 'not included'}</li>
              <li>{context.contractRules.invoiceTerms} invoice terms</li>
              <li>PA {context.contractRules.passengerAssistantIncluded ? 'included when required' : 'extra charge'}</li>
              <li>Cancellation: {context.contractRules.cancellationRules}</li>
            </ul>
          )}
        </div>
      )}

      {context.outstandingIssues.length > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {context.outstandingIssues.join(' · ')}
        </p>
      )}
    </SectionCard>
  )
}
