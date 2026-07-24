import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { BOOKING_TYPE_OPTIONS } from '@/lib/bookings/constants'
import type { BookingType } from '@/lib/bookings/types'

type Props = {
  selectedType: BookingType | null
  onSelect: (type: BookingType) => void
  onContinue: () => void
  continuing?: boolean
}

export function BookingTypeSelectPage({
  selectedType,
  onSelect,
  onContinue,
  continuing = false,
}: Props) {
  const selectedOption = BOOKING_TYPE_OPTIONS.find(opt => opt.id === selectedType)

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col pb-28">
      <div className="space-y-6">
        <div>
          <Link to="/bookings" className="text-sm font-medium text-command-600 hover:underline">
            ← Back to bookings
          </Link>
          <p className="mt-3 text-sm font-medium text-command-600">Step 1 of 8</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Create booking</h1>
          <p className="text-sm text-ink-soft">Choose the booking type, then continue to the wizard.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOOKING_TYPE_OPTIONS.map(opt => {
            const selected = selectedType === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(opt.id)}
                className={cn(
                  'rounded-xl border bg-surface p-4 text-left transition',
                  selected
                    ? 'border-command-500 ring-2 ring-command-500/30 shadow-sm'
                    : 'border-border hover:border-command-400 hover:shadow-sm',
                )}
              >
                <p className="font-semibold text-ink">{opt.label}</p>
                <p className="mt-1 text-sm text-ink-soft">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {selectedOption ? (
              <>
                <p className="font-semibold text-ink">{selectedOption.label} selected</p>
                <p className="mt-0.5 text-sm text-ink-soft">{selectedOption.description}</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-ink">Select a booking type</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Pick the option that best matches this journey before continuing.
                </p>
              </>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Link
              to="/bookings"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={!selectedType || continuing}
              onClick={onContinue}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {continuing ? 'Opening wizard…' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
