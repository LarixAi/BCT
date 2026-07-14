import { cn } from '@/lib/cn'
import { BOOKING_STEPS } from '@/lib/bookings/constants'
import type { BookingDraft, BookingValidationItem } from '@/lib/bookings/types'

export function BookingStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number
  onStepClick?: (step: number) => void
}) {
  return (
    <nav aria-label="Booking progress" className="overflow-x-auto">
      <ol className="flex min-w-max gap-1">
        {BOOKING_STEPS.map((step) => {
          const done = step.id < currentStep
          const active = step.id === currentStep
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!onStepClick || step.id > currentStep}
                onClick={() => onStepClick?.(step.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition',
                  active && 'bg-command-600 text-white',
                  done && !active && 'bg-command-50 text-command-800',
                  !active && !done && 'text-slate-500',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    active && 'bg-white/20',
                    done && !active && 'bg-command-200 text-command-900',
                    !active && !done && 'bg-slate-100',
                  )}
                >
                  {done ? '✓' : step.id}
                </span>
                <span className="hidden font-medium sm:inline">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function BookingSummaryPanel({
  draft,
  validation = [],
}: {
  draft: BookingDraft
  validation?: BookingValidationItem[]
}) {
  const warnings = validation.filter((v) => v.level === 'warning').length
  const errors = validation.filter((v) => v.level === 'error').length

  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Booking summary</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <SummaryRow label="Type" value={draft.bookingType.replace(/_/g, ' ')} />
        <SummaryRow label="Customer" value={draft.customerName ?? '—'} />
        <SummaryRow
          label="Passengers"
          value={draft.passengers.length ? String(draft.passengers.length) : '—'}
        />
        <SummaryRow label="Trips" value={String(draft.trips.length)} />
        <SummaryRow
          label="Vehicle"
          value={
            draft.requirements.wheelchairAccessible
              ? 'Accessible minibus'
              : draft.requirements.vehicleType.replace(/_/g, ' ')
          }
        />
        <SummaryRow
          label="Assistant"
          value={draft.requirements.passengerAssistant ? 'Required' : 'Not required'}
        />
        <SummaryRow
          label="Estimated value"
          value={
            draft.pricing.contractRef
              ? `Contract ${draft.pricing.contractRef}`
              : draft.pricing.totalPrice > 0
                ? `£${draft.pricing.totalPrice.toFixed(2)}`
                : '—'
          }
        />
        {(errors > 0 || warnings > 0) && (
          <SummaryRow
            label="Warnings"
            value={`${errors} blocking · ${warnings} warning`}
            highlight={errors > 0}
          />
        )}
      </dl>
      {draft.reference && (
        <p className="mt-3 text-xs text-slate-500">Ref: {draft.reference}</p>
      )}
    </aside>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('font-medium capitalize text-slate-900', highlight && 'text-red-700')}>
        {value}
      </dd>
    </div>
  )
}

export function ValidationList({ items }: { items: BookingValidationItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-emerald-700">All checks passed.</p>
  }

  const groups = {
    error: items.filter((i) => i.level === 'error'),
    warning: items.filter((i) => i.level === 'warning'),
    info: items.filter((i) => i.level === 'info'),
  }

  return (
    <div className="space-y-3">
      {(['error', 'warning', 'info'] as const).map((level) =>
        groups[level].length > 0 ? (
          <div key={level}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {level === 'error' ? 'Blocking errors' : level === 'warning' ? 'Warnings' : 'Information'}
            </p>
            <ul className="space-y-1">
              {groups[level].map((item) => (
                <li
                  key={item.code}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    level === 'error' && 'bg-red-50 text-red-900',
                    level === 'warning' && 'bg-amber-50 text-amber-900',
                    level === 'info' && 'bg-blue-50 text-blue-900',
                  )}
                >
                  {item.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  )
}
