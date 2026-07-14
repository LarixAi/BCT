import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import type { ServiceScheduleItem } from '@/lib/maintenance/types'

export function MaintenanceScheduleTab({ schedule }: { schedule: ServiceScheduleItem[] }) {
  return (
    <SectionCard title="Service schedule" description="Date and mileage-based maintenance from vehicle profiles and work orders">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
            <th className="pb-2 pr-3 font-medium">Vehicle</th>
            <th className="pb-2 pr-3 font-medium">Service</th>
            <th className="pb-2 pr-3 font-medium">Due date</th>
            <th className="pb-2 pr-3 font-medium">Due mileage</th>
            <th className="pb-2 pr-3 font-medium">Miles remaining</th>
            <th className="pb-2 pr-3 font-medium">Workshop</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((s) => (
            <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
              <td className="py-2.5 pr-3">
                <Link to={`/vehicles/${s.vehicleId}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                  {s.registrationNumber}
                </Link>
                <p className="text-xs text-slate-500">{s.depot}</p>
              </td>
              <td className="py-2.5 pr-3">{s.serviceType}</td>
              <td className="py-2.5 pr-3 text-slate-600">
                {s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-GB') : '—'}
              </td>
              <td className="py-2.5 pr-3 text-slate-600">{s.dueMileage?.toLocaleString() ?? '—'}</td>
              <td className="py-2.5 pr-3 text-slate-600">{s.milesRemaining?.toLocaleString() ?? '—'}</td>
              <td className="py-2.5 pr-3 text-slate-600">{s.workshop ?? '—'}</td>
              <td className="py-2.5">
                <StatusPill status={s.status === 'overdue' ? 'non_compliant' : s.status === 'due_soon' ? 'warning' : 'info'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}
