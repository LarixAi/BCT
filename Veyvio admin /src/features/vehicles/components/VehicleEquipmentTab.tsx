import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleEquipmentTab({
  vehicle,
  editable = false,
  actorName,
}: {
  vehicle: VehicleProfile
  editable?: boolean
  actorName?: string
}) {
  const queryClient = useQueryClient()

  const update = useMutation({
    mutationFn: ({ equipmentId, assigned }: { equipmentId: string; assigned: boolean }) =>
      api.updateVehicleEquipment(vehicle.id, { equipmentId, assigned }, actorName ?? 'System'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
    },
  })

  return (
    <SectionCard
      title="Onboard equipment"
      description={
        editable
          ? 'Assign required equipment before completing the equipment inventory onboarding stage'
          : 'Fixed and removable equipment — integrates with Yard inventory'
      }
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
            <th className="pb-2 pr-4">Item</th>
            <th className="pb-2 pr-4">Type</th>
            <th className="pb-2 pr-4">Assigned</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicle.equipment.map((e) => (
            <tr key={e.id} className="border-b border-slate-50">
              <td className="py-2 pr-4 font-medium">{e.name}</td>
              <td className="py-2 pr-4 capitalize text-slate-600">{e.category}</td>
              <td className="py-2 pr-4">
                {editable ? (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={e.assigned}
                      disabled={update.isPending}
                      onChange={(ev) => update.mutate({ equipmentId: e.id, assigned: ev.target.checked })}
                    />
                    <span>{e.assigned ? 'Yes' : 'No'}</span>
                  </label>
                ) : (
                  e.assigned ? 'Yes' : 'No'
                )}
              </td>
              <td className="py-2">
                <StatusPill status={e.assigned && e.serviceable && e.inDate ? 'compliant' : 'warning'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
