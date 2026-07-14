import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'

export function VehicleWheelsTab({ vehicle, actorName }: { vehicle: VehicleProfile; actorName: string }) {
  const queryClient = useQueryClient()

  const completeRetorque = useMutation({
    mutationFn: (taskId: string) => api.completeVehicleRetorque(vehicle.id, taskId, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-profile', vehicle.id] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
    },
  })

  return (
    <div className="space-y-4">
      <SectionCard title="Wheel positions" description="Digital wheel layout with tread, pressure and re-torque tracking">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-4">Position</th>
              <th className="pb-2 pr-4">Tread</th>
              <th className="pb-2 pr-4">Pressure</th>
              <th className="pb-2">Condition</th>
            </tr>
          </thead>
          <tbody>
            {vehicle.wheelLayout.map((w) => (
              <tr key={w.position} className="border-b border-slate-50">
                <td className="py-2 pr-4 font-medium">{w.label}</td>
                <td className="py-2 pr-4">{w.treadDepthMm?.toFixed(1) ?? '—'} mm</td>
                <td className="py-2 pr-4">{w.pressurePsi ?? '—'} psi</td>
                <td className="py-2">
                  <StatusPill status={w.condition === 'good' ? 'compliant' : w.condition === 'warning' ? 'warning' : 'non_compliant'} />
                  {w.retorqueOverdue && <span className="ml-2 text-xs text-red-600">Re-torque overdue</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Re-torque tasks">
        {vehicle.retorqueTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No pending re-torque tasks.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {vehicle.retorqueTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="font-medium">{t.positions.join(', ')} — due {new Date(t.dueAt).toLocaleDateString('en-GB')}</p>
                  <p className="text-xs text-slate-500">Technician: {t.technician}</p>
                </div>
                {t.status !== 'completed' && (
                  <button type="button" onClick={() => completeRetorque.mutate(t.id)} className="text-xs font-medium text-command-600 hover:underline">
                    Sign off re-torque
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
