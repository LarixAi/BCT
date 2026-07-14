import { SectionCard } from '@/components/ui'
import type { MaintenanceHubData } from '@/lib/maintenance/types'

export function MaintenanceSuppliersTab({ suppliers, parts }: Pick<MaintenanceHubData, 'suppliers' | 'parts'>) {
  return (
    <div className="space-y-4">
      <SectionCard title="Approved suppliers" description="Internal workshops, franchise dealers and parts vendors">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Supplier</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 font-medium">Services</th>
              <th className="pb-2 pr-3 font-medium">Labour rate</th>
              <th className="pb-2 pr-3 font-medium">SLA (h)</th>
              <th className="pb-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-slate-50">
                <td className="py-2.5 pr-3">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.contactEmail}</p>
                </td>
                <td className="py-2.5 pr-3 capitalize text-slate-600">{s.type}</td>
                <td className="py-2.5 pr-3 text-slate-600">{s.services.join(', ')}</td>
                <td className="py-2.5 pr-3 text-slate-600">{s.labourRate != null ? `£${s.labourRate}/hr` : '—'}</td>
                <td className="py-2.5 pr-3 text-slate-600">{s.slaHours}</td>
                <td className="py-2.5 font-medium text-slate-900">{s.performanceScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Parts catalogue" description="Common parts linked to suppliers for work order costing">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Part</th>
              <th className="pb-2 pr-3 font-medium">Number</th>
              <th className="pb-2 pr-3 font-medium">Supplier</th>
              <th className="pb-2 pr-3 font-medium">Unit cost</th>
              <th className="pb-2 font-medium">Reorder at</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const supplier = suppliers.find((s) => s.id === p.supplierId)
              return (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{p.partNumber}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{supplier?.name ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-slate-600">£{p.unitCost.toFixed(2)}</td>
                  <td className="py-2.5 text-slate-600">{p.reorderLevel}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}
