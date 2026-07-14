import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ManageAssignmentDrawer } from './ManageAssignmentDrawer'
import { api } from '@/lib/api/client'

export function ManageAssignmentButton({
  dutyId,
  className,
}: {
  dutyId: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { data: trip, isLoading } = useQuery({
    queryKey: ['operational-trip-by-duty', dutyId],
    queryFn: () => api.getOperationalTripByDuty(dutyId),
  })

  if (isLoading || !trip) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-command-700 hover:bg-slate-50'
        }
      >
        Manage assignment
      </button>
      {open && (
        <ManageAssignmentDrawer tripId={trip.id} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
