import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function InspectionsPage() {
  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['inspections'],
    queryFn: () => api.getInspections(),
  })

  const overdue = inspections.filter((i) => i.status === 'overdue').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inspections</h1>
        <p className="text-sm text-slate-600">MOT and statutory inspection due dates</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:max-w-xs">
        <p className="text-2xl font-bold tabular-nums text-red-700">{overdue}</p>
        <p className="text-sm text-slate-600">Overdue inspections</p>
      </div>

      <SectionCard title="Inspection register">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Vehicle</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Due date</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((i) => (
                <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4">
                    <Link to={`/vehicles/${i.vehicleId}`} className="font-medium text-command-600 hover:underline">
                      {i.vehicleRegistration}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 uppercase text-slate-600">{i.inspectionType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {new Date(i.dueDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="py-2.5">
                    <StatusPill status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
