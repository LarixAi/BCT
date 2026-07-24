import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ManageAssignmentDrawer } from './ManageAssignmentDrawer'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { synthesizeOperationalTripFromDuty } from '@/lib/transfers/operational-trip'
import type { OperationalTrip } from '@/lib/transfers/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function ManageAssignmentButton({
  dutyId,
  duty,
  className,
}: {
  dutyId: string
  duty?: DutyRecord | null
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { data: apiTrip, isLoading } = useQuery({
    queryKey: tKey(['operational-trip-by-duty', dutyId]),
    queryFn: () => api.getOperationalTripByDuty(dutyId),
    retry: false,
  })

  const trip = useMemo<OperationalTrip | null>(() => {
    if (apiTrip && !Array.isArray(apiTrip) && apiTrip.id) return apiTrip
    if (duty) return synthesizeOperationalTripFromDuty(duty)
    return null
  }, [apiTrip, duty])

  if (isLoading && !duty) return null
  if (!trip) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-command-700 hover:bg-surface-muted'
        }
      >
        Manage assignment
      </button>
      {open && (
        <ManageAssignmentDrawer
          tripId={trip.id}
          initialTrip={trip}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
