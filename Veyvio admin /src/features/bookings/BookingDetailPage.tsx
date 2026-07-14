import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { ValidationList } from '@/features/bookings/components/BookingWizardUi'
import { CancelBookingDialog } from '@/features/bookings/CancelBookingDialog'
import { VEYVIO_TERMS } from '@/lib/terminology'
import { api } from '@/lib/api/client'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCancel, setShowCancel] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const { data: booking, isLoading, error, isError } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  })

  const { data: validation = [] } = useQuery({
    queryKey: ['booking-validation', booking],
    queryFn: () => api.validateBookingDraft(booking!),
    enabled: !!booking,
  })

  const { data: opsTrips = [] } = useQuery({
    queryKey: ['operational-trips-by-booking', id],
    queryFn: () => api.getOperationalTripsByBooking(id!),
    enabled: !!id,
  })

  const duplicate = useMutation({
    mutationFn: () => api.duplicateBooking(id!),
    onSuccess: (draft) => navigate(`/bookings/new?draft=${draft.id}`),
  })

  const createReturn = useMutation({
    mutationFn: () => api.createReturnBooking(id!, booking!.trips[0]?.id ?? ''),
    onSuccess: (draft) => navigate(`/bookings/new?draft=${draft.id}`),
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>
  if (isError || !booking) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Booking not found'}</p>
  }

  const canEdit = booking.status !== 'cancelled' && booking.status !== 'closed'
  const canCancel = !['cancelled', 'closed', 'completed'].includes(booking.status)
  const outboundTrip = booking.trips.find((t) => t.direction !== 'return') ?? booking.trips[0]

  return (
    <div className="space-y-6">
      <div>
        <Link to="/bookings" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{booking.reference}</h1>
          <StatusPill status={booking.status} />
          {booking.priority === 'urgent' && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">URGENT</span>
          )}
        </div>
        <p className="text-sm text-slate-600">{booking.customerName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Trips" value={String(booking.trips.length)} />
        <Stat label="Scheduling" value={booking.schedulingStatus} />
        <Stat label="Billing" value={booking.billingStatus} />
        <Stat label="Depot" value={booking.depotName ?? '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Hierarchy" description="Booking → Trips → Stops">
          {booking.trips.map((trip) => (
            <div key={trip.id} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{trip.label}</p>
                <StatusPill status={trip.status} />
              </div>
              <p className="text-xs text-slate-500">{trip.pickupDate}</p>
              <ol className="mt-2 space-y-1 border-l-2 border-slate-200 pl-4">
                {trip.stops.map((stop) => (
                  <li key={stop.id} className="text-sm">
                    <span className="capitalize text-slate-500">{stop.type}</span>
                    <span className="mx-1 text-slate-300">·</span>
                    <span className="text-slate-800">{stop.address || stop.name}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </SectionCard>

        <SectionCard title="Passengers">
          <ul className="space-y-3">
            {booking.passengers.map((p) => (
              <li key={p.passengerId} className="text-sm">
                <p className="font-medium">{p.firstName} {p.lastName}</p>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  {p.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {validation.length > 0 && (
        <SectionCard title="Validation">
          <ValidationList items={validation} />
        </SectionCard>
      )}

      {opsTrips.length > 0 && (
        <SectionCard
          title="Operational execution"
          description={`${VEYVIO_TERMS.booking.term} → ${VEYVIO_TERMS.journey.term} → ${VEYVIO_TERMS.job.term} → ${VEYVIO_TERMS.trip.term}`}
        >
          <ul className="space-y-2 text-sm">
            {opsTrips.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="font-medium text-slate-900">{t.reference}</p>
                  <p className="text-xs text-slate-500">
                    {t.totalJobCount} jobs · Run {t.runReference ?? '—'}
                  </p>
                </div>
                <Link to={`/ops-trips/${t.id}`} className="text-sm font-medium text-command-600 hover:underline">
                  View trip →
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {confirmationSent && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Booking confirmation sent to {booking.customerName}.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/dispatch" className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700">
          Open dispatch
        </Link>
        {canEdit && (
          <Link to={`/bookings/${booking.id}/edit`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Edit booking
          </Link>
        )}
        <button
          type="button"
          onClick={() => duplicate.mutate()}
          disabled={duplicate.isPending}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Duplicate
        </button>
        {outboundTrip && booking.bookingType !== 'return' && (
          <button
            type="button"
            onClick={() => createReturn.mutate()}
            disabled={createReturn.isPending}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Create return
          </button>
        )}
        <button
          type="button"
          onClick={() => setConfirmationSent(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Send confirmation
        </button>
        {canCancel && (
          <button
            type="button"
            onClick={() => setShowCancel(true)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Cancel booking
          </button>
        )}
      </div>

      {showCancel && (
        <CancelBookingDialog
          booking={booking}
          onClose={() => {
            setShowCancel(false)
            queryClient.invalidateQueries({ queryKey: ['booking', id] })
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold capitalize text-slate-900">{value}</p>
    </div>
  )
}
