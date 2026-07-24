import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import type { BodyConditionDamageCaseRow, BodyConditionInspectionRow } from '@/lib/body-condition/types'

const SUMMARY_CARDS = [
  { id: 'openDamageCases', label: 'Open damage cases' },
  { id: 'criticalDamage', label: 'Critical damage' },
  { id: 'awaitingReview', label: 'Awaiting review' },
  { id: 'vehiclesVor', label: 'Vehicles VOR' },
  { id: 'repeatZoneAlerts', label: 'Repeat zone alerts' },
  { id: 'inspectionsThisMonth', label: 'Inspections this month' },
  { id: 'pendingAcknowledgements', label: 'Pending acknowledgements' },
] as const

function severityTone(severity: string) {
  if (severity.includes('critical') || severity.includes('safety')) return 'critical'
  if (severity.includes('operational') || severity.includes('major')) return 'warning'
  return 'neutral'
}

export function BodyConditionPage() {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: hub, isLoading, error } = useQuery({
    queryKey: tKey(['body-condition-hub']),
    queryFn: () => api.getBodyConditionHub(),
  })

  const damageRows = useMemo(() => {
    let list = hub?.damageCases ?? []
    if (severityFilter !== 'all') {
      list = list.filter((r) => r.severity === severityFilter)
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status.replace(/-/g, '_') === statusFilter.replace(/-/g, '_'))
    }
    return list
  }, [hub, severityFilter, statusFilter])

  if (isLoading) return <p className="text-sm text-muted">Loading body condition records…</p>
  if (error || !hub) {
    return (
      <p className="text-sm text-red-800">
        {error instanceof Error ? error.message : 'Could not load body condition data'}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Body Condition Management</h1>
        <p className="text-sm text-ink-soft">
          Inspection history, damage cases, repair progress and investigation timeline — company and depot scoped.
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

      {hub.trendAlerts.length > 0 && (
        <SectionCard title="Risk alerts" description="Pattern warnings for prevention — not individual attribution">
          <ul className="space-y-2">
            {hub.trendAlerts.map((alert) => (
              <li key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <span className="font-medium">{alert.title}</span>
                <p className="text-xs mt-0.5">{alert.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Damage cases" description="Long-term damage records linked across inspections">
        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
            aria-label="Filter by severity"
          >
            <option value="all">All severities</option>
            <option value="cosmetic">Cosmetic</option>
            <option value="operational">Operational</option>
            <option value="safety_critical">Safety critical</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="provisional">Provisional</option>
            <option value="under_review">Under review</option>
            <option value="approved_for_repair">Approved for repair</option>
            <option value="repair_in_progress">Repair in progress</option>
          </select>
        </div>
        {damageRows.length === 0 ? (
          <p className="text-sm text-muted">No damage cases match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Vehicle</th>
                  <th className="py-2 pr-3">Zone</th>
                  <th className="py-2 pr-3">Severity</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {damageRows.map((row: BodyConditionDamageCaseRow) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-xs">{row.referenceNumber ?? row.id}</td>
                    <td className="py-2 pr-3">
                      <Link to={`/vehicles/${row.vehicleId}?tab=condition`} className="text-primary hover:underline">
                        {row.vehicleId}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{row.zoneId.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={severityTone(row.severity)} label={row.severity.replace(/_/g, ' ')} />
                    </td>
                    <td className="py-2 pr-3">{row.status.replace(/_/g, ' ')}</td>
                    <td className="py-2">
                      {row.repairWorkOrderId ? (
                        <Link
                          to={`/maintenance?tab=work-orders&wo=${row.repairWorkOrderId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Work order
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent inspections" description="Append-only inspection history — never replaces previous records">
        {hub.inspections.length === 0 ? (
          <p className="text-sm text-muted">No body inspections recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {hub.inspections.map((row: BodyConditionInspectionRow) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-ink">
                    {row.referenceNumber ?? row.id}
                    <span className="text-muted font-normal"> · {row.inspectionType.replace(/-/g, ' ')}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Vehicle {row.vehicleId} · {new Date(row.startedAt).toLocaleString('en-GB')}
                  </p>
                </div>
                <StatusPill status={row.status.includes('review') ? 'warning' : row.status === 'approved' ? 'success' : 'neutral'} label={row.status.replace(/_/g, ' ')} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
