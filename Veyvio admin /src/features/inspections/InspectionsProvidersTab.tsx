import { SectionCard } from '@/components/ui'
import type { InspectionProviderRow } from '@/lib/inspections/types'

export function InspectionsProvidersTab({ providers }: { providers: InspectionProviderRow[] }) {
  return (
    <SectionCard
      title="Inspection providers"
      description="Approved internal and external providers — full portal deferred"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3 font-medium">Provider</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 font-medium">Services</th>
              <th className="pb-2 pr-3 font-medium">SLA</th>
              <th className="pb-2 font-medium">Contact</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-b border-slate-50">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.approved ? 'Approved' : 'Pending approval'}</p>
                </td>
                <td className="py-2.5 pr-3 capitalize text-slate-600">{p.type}</td>
                <td className="py-2.5 pr-3 text-slate-600">{p.services.join(' · ')}</td>
                <td className="py-2.5 pr-3 tabular-nums text-slate-600">{p.slaHours}h</td>
                <td className="py-2.5 text-slate-600">{p.contactEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
