import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { ACTIVITY_LABELS } from '@/lib/yard/constants'
import { filterYardRows } from '@/lib/yard/aggregate'
import type { YardHubData, YardVehicleRow } from '@/lib/yard/types'
import { VehicleOperationsDrawer } from './components/VehicleOperationsDrawer'

export function YardLiveTab({
  hub,
  filter,
  search,
  selectedId,
  onSelect,
}: {
  hub: YardHubData
  filter: string
  search: string
  selectedId: string | null
  onSelect: (row: YardVehicleRow | null) => void
}) {
  const rows = filterYardRows(hub.vehicles, filter, search)
  const selectedRow = rows.find((r) => r.vehicleId === selectedId) ?? hub.vehicles.find((r) => r.vehicleId === selectedId) ?? null

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <SectionCard title="Live yard" description={`${rows.length} vehicles at ${hub.depotName}`}>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No vehicles match these filters.</p>
          ) : (
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Vehicle</th>
                  <th className="pb-2 pr-3 font-medium">Location</th>
                  <th className="pb-2 pr-3 font-medium">Presence</th>
                  <th className="pb-2 pr-3 font-medium">Readiness</th>
                  <th className="pb-2 pr-3 font-medium">Activity</th>
                  <th className="pb-2 pr-3 font-medium">Tasks</th>
                  <th className="pb-2 pr-3 font-medium">Departure</th>
                  <th className="pb-2 font-medium">Exceptions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.vehicleId}
                    className={`cursor-pointer border-b border-slate-50 hover:bg-slate-50 ${selectedId === row.vehicleId ? 'bg-command-50' : ''}`}
                    onClick={() => onSelect(row)}
                  >
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-slate-900">{row.registrationNumber}</p>
                      <p className="text-xs text-slate-500">
                        {row.fleetNumber ?? '—'} · {row.vehicleCategory}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <p>{row.bay ?? row.zone}</p>
                      <p className="text-xs capitalize text-slate-500">{row.locationConfidence}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={row.presenceState} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={row.readinessState} />
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{ACTIVITY_LABELS[row.activityState] ?? row.activityState}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{row.openTaskCount}</td>
                    <td className="py-2.5 pr-3">{row.nextDeparture ?? '—'}</td>
                    <td className="py-2.5 text-xs text-amber-800">
                      {row.exceptionLabels[0] ?? '—'}
                      {row.exceptionLabels.length > 1 && ` +${row.exceptionLabels.length - 1}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {selectedRow && <VehicleOperationsDrawer hub={hub} row={selectedRow} onClose={() => onSelect(null)} />}
    </div>
  )
}
