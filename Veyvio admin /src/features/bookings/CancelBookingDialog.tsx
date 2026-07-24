import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { BookingRecord, CancelScope } from '@/lib/bookings/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function CancelBookingDialog({
  booking,
  onClose,
}: {
  booking: BookingRecord
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [scope, setScope] = useState<CancelScope>('entire_booking')
  const [tripId, setTripId] = useState(booking.trips[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [chargeable, setChargeable] = useState(false)
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [notifyDriver, setNotifyDriver] = useState(true)
  const [replacementNeeded, setReplacementNeeded] = useState(false)

  const cancel = useMutation({
    mutationFn: () =>
      api.cancelBooking(booking.id, {
        scope,
        tripId: scope === 'single_trip' ? tripId : undefined,
        reason,
        requestedBy,
        receivedAt: new Date().toISOString(),
        chargeable,
        notifyCustomer,
        notifyDriver,
        replacementNeeded,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['booking', booking.id]) })
      queryClient.invalidateQueries({ queryKey: tKey(['bookings']) })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Cancel booking</h2>
        <p className="text-sm text-ink-soft">{booking.reference}</p>

        <div className="mt-4 space-y-4">
          <SectionCard title="What to cancel">
            <div className="space-y-2 text-sm">
              {(
                [
                  ['entire_booking', 'Entire booking'],
                  ['single_trip', 'One trip'],
                  ['single_passenger', 'One passenger from shared run'],
                  ['all_future', 'All future occurrences'],
                ] as const
              ).map(([s, label]) => (
                <label key={s} className="flex items-center gap-2">
                  <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} />
                  {label}
                </label>
              ))}
            </div>
            {scope === 'single_trip' && booking.trips.length > 1 && (
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm"
              >
                {booking.trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            )}
          </SectionCard>

          <label className="block text-sm">
            <span className="text-ink-soft">Reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>

          <label className="block text-sm">
            <span className="text-ink-soft">Requested by</span>
            <input
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={chargeable} onChange={(e) => setChargeable(e.target.checked)} />
              Chargeable cancellation
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
              Notify customer
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyDriver} onChange={(e) => setNotifyDriver(e.target.checked)} />
              Notify driver
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={replacementNeeded} onChange={(e) => setReplacementNeeded(e.target.checked)} />
              Replacement transport needed
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">
            Close
          </button>
          <button
            type="button"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending || !reason.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirm cancellation
          </button>
        </div>
      </div>
    </div>
  )
}
