import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

export function FleetIntelligencePage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['fleet-intelligence'],
    queryFn: () => api.getFleetIntelligence(),
  })

  return (
    <div className="space-y-6">
      <div>
        <Link to="/vehicles" className="text-sm font-medium text-command-600 hover:underline">← Back to vehicles</Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Fleet intelligence</h1>
        <p className="text-sm text-ink-soft">Downtime, maintenance cost, reliability and replacement planning</p>
      </div>

      {isLoading || !summary ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Fleet size" value={String(summary.totalVehicles)} />
          <StatCard label="VOR count" value={String(summary.vorCount)} />
          <StatCard label="Open defects" value={String(summary.openDefects)} />
          <StatCard label="Avg downtime (days)" value={summary.averageDowntimeDays.toFixed(1)} />
          <StatCard label="Maintenance spend MTD" value={`£${summary.maintenanceSpendMtd.toLocaleString()}`} />
          <StatCard label="Checks pass rate" value={`${summary.checksPassRate}%`} />
          <StatCard label="First-time fix rate" value={`${summary.firstTimeFixRate}%`} />
          <StatCard label="Cost per mile" value={`£${summary.costPerMile}`} />
          <StatCard label="Replacement candidates" value={String(summary.vehiclesNeedingReplacement)} />
        </div>
      )}

      <SectionCard title="Insights" description="Phase 6 analytics — expands with live maintenance and telematics data">
        <ul className="list-inside list-disc text-sm text-ink-soft">
          <li>Recurring defect patterns surface from defect register history</li>
          <li>High-mileage vehicles flagged for replacement planning</li>
          <li>Maintenance spend tracked per vehicle via work orders</li>
        </ul>
      </SectionCard>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}
