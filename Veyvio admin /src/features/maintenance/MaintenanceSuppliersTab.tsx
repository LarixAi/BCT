import { SectionCard } from '@/components/ui'
import { isLowStock } from '@/lib/maintenance/suppliers'
import type { MaintenanceHubData } from '@/lib/maintenance/types'

export function MaintenanceSuppliersTab({ suppliers, parts }: Pick<MaintenanceHubData, 'suppliers' | 'parts'>) {
  const lowStock = parts.filter(isLowStock)

  return (
    <div className="space-y-4">
      <SectionCard title="Approved suppliers" description="Internal workshops, franchise dealers and parts vendors">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
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
              <tr key={s.id} className="border-b border-border/60">
                <td className="py-2.5 pr-3">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted">{s.contactEmail}</p>
                </td>
                <td className="py-2.5 pr-3 capitalize text-ink-soft">{s.type}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{s.services.join(', ')}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{s.labourRate != null ? `£${s.labourRate}/hr` : '—'}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{s.slaHours}</td>
                <td className="py-2.5 font-medium text-ink">{s.performanceScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard
        title="Parts warehouse"
        description={`${lowStock.length} item(s) at or below reorder level — approve estimates before raising purchase orders`}
      >
        {lowStock.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Low stock: {lowStock.map((p) => p.name).join(', ')}
          </div>
        )}
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="pb-2 pr-3 font-medium">Part</th>
              <th className="pb-2 pr-3 font-medium">Number</th>
              <th className="pb-2 pr-3 font-medium">Supplier</th>
              <th className="pb-2 pr-3 font-medium">Unit cost</th>
              <th className="pb-2 pr-3 font-medium">On hand</th>
              <th className="pb-2 pr-3 font-medium">Reorder at</th>
              <th className="pb-2 font-medium">Location / bin</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const supplier = suppliers.find((s) => s.id === p.supplierId)
              const low = isLowStock(p)
              return (
                <tr key={p.id} className={`border-b border-border/60 ${low ? 'bg-amber-50/60' : ''}`}>
                  <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted">{p.partNumber}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">{supplier?.name ?? '—'}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">£{p.unitCost.toFixed(2)}</td>
                  <td className={`py-2.5 pr-3 tabular-nums font-medium ${low ? 'text-amber-900' : 'text-ink'}`}>
                    {p.stockOnHand}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{p.reorderLevel}</td>
                  <td className="py-2.5 text-xs text-ink-soft">
                    {p.location ?? '—'}
                    {p.bin ? ` · ${p.bin}` : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Parts catalogue" description="Common parts linked to suppliers for work order costing">
        <p className="text-sm text-ink-soft">
          Catalogue lines feed work-order estimates. Stock movements and purchase orders deepen in later Phase 2 passes.
        </p>
      </SectionCard>
    </div>
  )
}
