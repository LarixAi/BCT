import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { ValidationList } from '@/features/bookings/components/BookingWizardUi'
import { JourneyStep } from '@/features/bookings/steps/JourneyStep'
import { api } from '@/lib/api/client'
import type { BookingDraft } from '@/lib/bookings/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


type ApplyScope = 'trip_only' | 'all_future' | 'recurring_pattern' | 'exception'

export function EditBookingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<BookingDraft | null>(null)
  const [applyScope, setApplyScope] = useState<ApplyScope>('trip_only')
  const [showImpact, setShowImpact] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: tKey(['booking', id]),
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  })

  const { data: impact } = useQuery({
    queryKey: tKey(['booking-edit-impact', id, draft]),
    queryFn: () =>
      api.calculateBookingEditImpact(id!, draft!, {
        driverName: 'Jane Smith',
        vehicleReg: 'AB12 CDE',
        runRef: 'SCH-AM-014',
      }),
    enabled: !!draft && showImpact,
  })

  const { data: validation = [] } = useQuery({
    queryKey: tKey(['booking-validation', draft]),
    queryFn: () => api.validateBookingDraft(draft!),
    enabled: !!draft,
  })

  const save = useMutation({
    mutationFn: () => api.updateBooking(id!, draft!, { applyScope }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['booking', id]) })
      queryClient.invalidateQueries({ queryKey: tKey(['bookings']) })
      navigate(`/bookings/${id}`)
    },
  })

  if (isLoading || !booking) {
    return <p className="text-sm text-muted">Loading…</p>
  }

  const working = draft ?? (booking as BookingDraft)

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/bookings/${id}`} className="text-sm font-medium text-command-600 hover:underline">
          ← Back to booking
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Edit {booking.reference}</h1>
        <p className="text-sm text-ink-soft">Changes are not applied silently — review impact first</p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Confirmed bookings require an impact review. Choose how widely changes apply.
      </div>

      <JourneyStep draft={working} onChange={(p) => setDraft({ ...working, ...p })} />

      <SectionCard title="Apply changes to">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['trip_only', 'This trip only'],
              ['all_future', 'All future trips'],
              ['recurring_pattern', 'Recurring pattern'],
              ['exception', 'Temporary exception'],
            ] as const
          ).map(([scope, label]) => (
            <button
              key={scope}
              type="button"
              onClick={() => setApplyScope(scope)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                applyScope === scope ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      <button
        type="button"
        onClick={() => {
          setDraft({ ...working })
          setShowImpact(true)
        }}
        className="text-sm font-medium text-command-600 hover:underline"
      >
        Preview impact analysis
      </button>

      {showImpact && impact && (
        <SectionCard title="This change will affect">
          <ul className="list-inside list-disc space-y-1 text-sm text-ink-soft">
            {impact.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {impact.timeShiftMinutes !== 0 && (
            <p className="mt-2 text-sm text-amber-800">
              Time shift: {impact.timeShiftMinutes > 0 ? '+' : ''}
              {impact.timeShiftMinutes} minutes
            </p>
          )}
        </SectionCard>
      )}

      {validation.length > 0 && (
        <SectionCard title="Validation">
          <ValidationList items={validation} />
        </SectionCard>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
        >
          Save changes
        </button>
        <Link to={`/bookings/${id}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Cancel
        </Link>
      </div>
    </div>
  )
}
