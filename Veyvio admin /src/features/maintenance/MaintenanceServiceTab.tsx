import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import type { ServiceScheduleItem } from '@/lib/maintenance/types'
import type { VehicleProfile } from '@/lib/vehicles/types'

export function MaintenanceServiceTab({
  vehicles,
  schedule,
}: {
  vehicles: VehicleProfile[]
  schedule: ServiceScheduleItem[]
}) {
  const statutory = vehicles
    .filter((v) => v.motExpiry || v.tachographCalibrationExpiry || v.taxExpiry)
    .map((v) => ({
      v,
      items: [
        v.motExpiry && { label: 'MOT / annual test', date: v.motExpiry },
        v.tachographCalibrationExpiry && { label: 'Tachograph calibration', date: v.tachographCalibrationExpiry },
        v.taxExpiry && { label: 'Vehicle tax', date: v.taxExpiry },
        v.wheelRetorqueDueAt && { label: 'Wheel re-torque', date: v.wheelRetorqueDueAt.slice(0, 10) },
      ].filter(Boolean) as { label: string; date: string }[],
    }))

  return (
    <div className="space-y-4">
      <SectionCard title="Service & statutory due" description="MOT, tacho, tax, retorque — Inspections holds formal certificates">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3">Vehicle</th>
                <th className="pb-2 pr-3">Requirement</th>
                <th className="pb-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {statutory.flatMap(({ v, items }) =>
                items.map((item) => (
                  <tr key={`${v.id}-${item.label}`} className="border-b border-slate-50">
                    <td className="py-2 pr-3">
                      <Link to={`/vehicles/${v.id}`} className="font-medium text-command-600 hover:underline">
                        {v.registrationNumber}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{item.label}</td>
                    <td className="py-2 text-xs tabular-nums">{formatDate(item.date)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <Link to="/inspections" className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
          Open Inspections register →
        </Link>
      </SectionCard>

      <SectionCard title="Scheduled maintenance" description="From vehicle profiles and work orders">
        <ul className="space-y-2 text-sm">
          {schedule.slice(0, 30).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 py-2">
              <Link to={`/vehicles/${s.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                {s.registrationNumber}
              </Link>
              <span className="text-slate-600">{s.serviceType}</span>
              <span className="text-xs text-slate-500">{s.dueDate?.slice(0, 10) ?? '—'}</span>
              <StatusPill status={s.status} />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
