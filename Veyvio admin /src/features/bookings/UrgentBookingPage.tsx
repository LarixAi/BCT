import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { BookingDraft } from '@/lib/bookings/types'
import { enrichPassenger } from '@/lib/bookings/passenger'

export function UrgentBookingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<BookingDraft | null>(null)
  const [error, setError] = useState('')

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => api.getCustomers() })
  const { data: passengers = [] } = useQuery({ queryKey: ['passengers'], queryFn: () => api.getPassengers() })

  useEffect(() => {
    api.createBookingDraft('replacement', { urgent: true }).then(setDraft).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not create urgent draft')
    })
  }, [])

  const confirm = useMutation({
    mutationFn: () => api.confirmBookingDraft(draft!),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['duties'] })
      navigate(`/bookings/${record.id}`)
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not confirm'),
  })

  if (!draft) {
    return <p className="p-6 text-sm text-slate-500">Preparing urgent booking…</p>
  }

  const trip = draft.trips[0]!

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/bookings" className="text-sm font-medium text-command-600 hover:underline">
          ← Back to bookings
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">Create urgent booking</h1>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">URGENT</span>
        </div>
        <p className="text-sm text-slate-600">Shortened workflow — safety checks still apply</p>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        Appears as high-priority exception in Dispatch. Senior override may be required when notice periods are not met.
      </div>

      <SectionCard title="Urgent details">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Customer</span>
            <select
              value={draft.customerId ?? ''}
              onChange={(e) => {
                const c = customers.find((x) => x.id === e.target.value)
                setDraft({ ...draft, customerId: c?.id ?? null, customerName: c?.name ?? null })
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            >
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Passenger</span>
            <select
              value={draft.passengers[0]?.passengerId ?? ''}
              onChange={(e) => {
                const p = passengers.find((x) => x.id === e.target.value)
                setDraft({ ...draft, passengers: p ? [enrichPassenger(p)] : [] })
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            >
              <option value="">Select passenger…</option>
              {passengers.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Pickup address</span>
            <input
              value={trip.stops[0]?.address ?? ''}
              onChange={(e) => {
                const trips = [...draft.trips]
                trips[0] = {
                  ...trip,
                  stops: trip.stops.map((s, i) => (i === 0 ? { ...s, address: e.target.value } : s)),
                }
                setDraft({ ...draft, trips })
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Destination</span>
            <input
              value={trip.stops[1]?.address ?? ''}
              onChange={(e) => {
                const trips = [...draft.trips]
                trips[0] = {
                  ...trip,
                  stops: trip.stops.map((s, i) => (i === 1 ? { ...s, address: e.target.value } : s)),
                }
                setDraft({ ...draft, trips })
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-slate-600">Required pickup time</span>
              <input
                type="time"
                value={trip.requestedPickupTime ?? ''}
                onChange={(e) => {
                  const trips = [{ ...trip, requestedPickupTime: e.target.value }]
                  setDraft({ ...draft, trips })
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Pickup date</span>
              <input
                type="date"
                value={trip.pickupDate}
                onChange={(e) => {
                  setDraft({ ...draft, trips: [{ ...trip, pickupDate: e.target.value }] })
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.requirements.wheelchairAccessible}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  requirements: { ...draft.requirements, wheelchairAccessible: e.target.checked },
                })
              }
            />
            Wheelchair vehicle required
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Reason for urgency</span>
            <textarea
              value={draft.urgencyReason ?? ''}
              onChange={(e) => setDraft({ ...draft, urgencyReason: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Authorisation confirmed by</span>
            <input
              value={draft.authorisedBy ?? ''}
              onChange={(e) => setDraft({ ...draft, authorisedBy: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
            />
          </label>
        </div>
      </SectionCard>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => confirm.mutate()}
          disabled={confirm.isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Confirm urgent booking
        </button>
        <Link to="/bookings/new" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">
          Use full wizard
        </Link>
      </div>
    </div>
  )
}
