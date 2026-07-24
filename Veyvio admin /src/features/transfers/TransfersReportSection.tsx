import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function TransfersReportSection({ from, to }: { from: string; to: string }) {
  const { data: report, isLoading } = useQuery({
    queryKey: tKey(['transfer-report', from, to]),
    queryFn: () => api.getTransferReport(from, to),
  })

  if (isLoading) return <p className="text-sm text-muted">Loading transfer report…</p>
  if (!report) return null

  return (
    <SectionCard title="Transfer operations" description={`${report.totalTransfers} transfers in period`}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Total transfers" value={String(report.totalTransfers)} />
        <Stat label="Driver-caused" value={String(report.driverCaused)} />
        <Stat label="Vehicle-caused" value={String(report.vehicleCaused)} />
        <Stat label="Late recovery" value={String(report.lateRecovery)} />
        <Stat label="Manager overrides" value={String(report.managerOverrides)} />
        <Stat label="Passengers affected" value={String(report.passengersAffected)} />
        <Stat label="Avg recovery time" value={`${report.avgRecoveryMinutes} min`} />
      </div>

      {report.byReason.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase text-muted">By reason</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {report.byReason.map((r) => (
              <li key={r.reason} className="flex justify-between">
                <span className="capitalize text-ink-soft">{r.reason}</span>
                <span className="font-medium tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.recentTransfers.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <h3 className="text-xs font-semibold uppercase text-muted">Recent transfers</h3>
          <table className="mt-2 w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">ID</th>
                <th className="pb-2 pr-3 font-medium">Scope</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Trip</th>
              </tr>
            </thead>
            <tbody>
              {report.recentTransfers.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs">{t.id}</td>
                  <td className="py-2 pr-3 capitalize">{t.scope.replace(/_/g, ' ')}</td>
                  <td className="py-2 pr-3 capitalize">{t.status.replace(/_/g, ' ')}</td>
                  <td className="py-2">
                    <Link to={`/live-operations/trips/${t.sourceTripId}`} className="text-command-600 hover:underline">
                      View trip
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}
