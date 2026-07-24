import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const SUMMARY_CARDS = [
  { id: 'openReports', label: 'Open reports' },
  { id: 'criticalReports', label: 'Critical' },
  { id: 'vehiclesVor', label: 'Vehicles VOR' },
  { id: 'awaitingReview', label: 'Awaiting review' },
  { id: 'awaitingVerification', label: 'Awaiting verification' },
  { id: 'overdueActions', label: 'Overdue' },
  { id: 'repeatDefects', label: 'Repeat defects' },
  { id: 'submittedToday', label: 'Submitted today' },
] as const

export function VehicleReportsPage() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const { data: hub, isLoading, error } = useQuery({
    queryKey: tKey(['vehicle-reports-hub']),
    queryFn: () => api.getVehicleReportsHub(),
  })

  const rows = useMemo(() => {
    let list = hub?.reports ?? []
    if (typeFilter !== 'all') list = list.filter((r) => r.reportType === typeFilter)
    if (severityFilter !== 'all') list = list.filter((r) => r.severity === severityFilter)
    return list
  }, [hub, typeFilter, severityFilter])

  if (isLoading) return <p className="text-sm text-muted">Loading vehicle reports…</p>
  if (error || !hub) {
    return (
      <p className="text-sm text-red-800">
        {error instanceof Error ? error.message : 'Could not load vehicle reports'}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Vehicle Reports</h1>
        <p className="text-sm text-ink-soft">
          Shared operational record for damage, defects, equipment and cleanliness — review once, follow through to
          resolution.
        </p>
        <p className="text-xs text-muted">{hub.operationalDate}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.id} className="rounded-xl border border-border bg-surface p-3">
            <p className="text-xl font-bold tabular-nums text-ink">{hub.summary[card.id]}</p>
            <p className="text-xs text-ink-soft">{card.label}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Report register" description={`${rows.length} reports`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            <option value="all">All types</option>
            <option value="damage">Damage</option>
            <option value="defect">Defect</option>
            <option value="equipment">Equipment</option>
            <option value="cleanliness">Cleanliness</option>
            <option value="inspection_observation">Inspection</option>
            <option value="adblue">AdBlue</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="moderate">Moderate</option>
            <option value="minor">Minor</option>
            <option value="observation">Observation</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted">No reports match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3 font-medium">Reference</th>
                  <th className="pb-2 pr-3 font-medium">Vehicle</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 pr-3 font-medium">Issue</th>
                  <th className="pb-2 pr-3 font-medium">Severity</th>
                  <th className="pb-2 pr-3 font-medium">Stage</th>
                  <th className="pb-2 pr-3 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Next action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">
                      <Link to={`/vehicle-reports/${row.id}`} className="font-medium text-command-700 hover:underline">
                        {row.reference}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link to={`/vehicles/${row.vehicleId}`} className="hover:underline">
                        {row.registrationNumber}
                      </Link>
                      <span className="block text-xs text-muted">{row.depotName ?? '—'}</span>
                    </td>
                    <td className="py-2.5 pr-3 capitalize">{row.reportType.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 pr-3 max-w-xs truncate">{row.title}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={row.severity === 'critical' ? 'vor' : row.severity === 'major' ? 'warning' : 'compliant'} />
                    </td>
                    <td className="py-2.5 pr-3 capitalize">{row.stage.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 pr-3">{row.assignedOwner ?? '—'}</td>
                    <td className="py-2.5 text-ink-soft">{row.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
