import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import type { DriverRecord, DutyRecord, VehicleRecord, VehicleSwapRequestRecord } from '@/lib/api/types'

type Props = {
  duties: DutyRecord[]
  drivers: DriverRecord[]
  vehicles: VehicleRecord[]
}

function resolveRegistration(vehicleId: string, vehicles: VehicleRecord[]) {
  return vehicles.find((vehicle) => vehicle.id === vehicleId)?.registrationNumber ?? vehicleId.slice(0, 8)
}

function resolveDriverName(driverId: string, drivers: DriverRecord[]) {
  const driver = drivers.find((row) => row.id === driverId)
  if (!driver) return 'Driver'
  return [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Driver'
}

function resolveDutyLabel(dutyId: string, duties: DutyRecord[]) {
  const duty = duties.find((row) => row.id === dutyId)
  if (!duty) return dutyId.slice(0, 8)
  return duty.reference ?? duty.route?.name ?? duty.id.slice(0, 8)
}

export function VehicleSwapApprovalPanel({ duties, drivers, vehicles }: Props) {
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: tKey(['vehicle-swap-requests', 'pending']),
    queryFn: () => api.listVehicleSwapRequests('pending'),
    refetchInterval: 30_000,
  })

  const resolveMutation = useMutation({
    mutationFn: async ({
      request,
      approve,
      notes,
    }: {
      request: VehicleSwapRequestRecord
      approve: boolean
      notes?: string
    }) => {
      if (approve) return api.approveVehicleSwapRequest(request.id, notes)
      return api.rejectVehicleSwapRequest(request.id, notes)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tKey(['vehicle-swap-requests']) }),
        queryClient.invalidateQueries({ queryKey: tKey(['duties']) }),
        queryClient.invalidateQueries({ queryKey: tKey(['dispatch']) }),
      ])
    },
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading vehicle swap requests…
      </div>
    )
  }

  if (requests.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-950">Vehicle swap requests</p>
        <p className="text-xs text-amber-900 mt-0.5">
          Drivers signed on mid-duty need dispatch approval before changing vehicle.
        </p>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const busy = resolveMutation.isPending && resolveMutation.variables?.request.id === request.id
          return (
            <div key={request.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">
                    {resolveDriverName(request.driverId, drivers)} · duty{' '}
                    {resolveDutyLabel(request.dutyId, duties)}
                  </p>
                  <p className="text-ink-soft mt-1">
                    {resolveRegistration(request.currentVehicleId, vehicles)} →{' '}
                    <span className="font-semibold text-ink">
                      {resolveRegistration(request.requestedVehicleId, vehicles)}
                    </span>
                  </p>
                  <p className="text-ink-soft mt-2">{request.reason}</p>
                </div>
                <p className="text-xs text-muted whitespace-nowrap">
                  {new Date(request.requestedAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    resolveMutation.mutate({
                      request,
                      approve: true,
                    })
                  }
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Approve swap'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    resolveMutation.mutate({
                      request,
                      approve: false,
                      notes: 'Not approved — keep assigned vehicle',
                    })
                  }
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {resolveMutation.isError ? (
        <p className="text-xs text-red-700">
          {resolveMutation.error instanceof Error
            ? resolveMutation.error.message
            : 'Could not resolve swap request.'}
        </p>
      ) : null}
    </div>
  )
}
