import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { filterCheckRows } from '@/lib/checks/aggregate'
import type { ChecksHubData } from '@/lib/checks/types'
import { ChecksTable } from './components/ChecksTable'

export function ChecksOverviewTab({
  hub,
  filter,
  search,
  depotId,
}: {
  hub: ChecksHubData
  filter: string
  search: string
  depotId: string
}) {
  const rows = filterCheckRows(hub.overview, filter, search, depotId)

  return (
    <SectionCard title="Operational overview" description={`${rows.length} vehicles across depots`}>
      <ChecksTable rows={rows} />
    </SectionCard>
  )
}

export function ChecksSubmittedTab({ hub, search, depotId }: { hub: ChecksHubData; search: string; depotId: string }) {
  const rows = filterCheckRows(hub.submitted, 'all', search, depotId)
  return (
    <SectionCard title="Submitted checks" description="Completed checks awaiting or following review">
      <ChecksTable rows={rows} />
    </SectionCard>
  )
}

export function ChecksActionTab({ hub, search, depotId }: { hub: ChecksHubData; search: string; depotId: string }) {
  const rows = filterCheckRows(hub.actionQueue, 'all', search, depotId).sort((a, b) => b.urgencyScore - a.urgencyScore)
  return (
    <SectionCard title="Action required" description="Failed checks, safety defects and operational conflicts">
      <ChecksTable rows={rows} />
    </SectionCard>
  )
}

export function ChecksOverdueTab({ hub, search, depotId }: { hub: ChecksHubData; search: string; depotId: string }) {
  const rows = filterCheckRows(hub.overdue, 'all', search, depotId)
  return (
    <SectionCard title="Missed and overdue" description="Vehicles expected to have a valid check">
      <ChecksTable rows={rows} />
    </SectionCard>
  )
}

export function ChecksHistoryTab({ hub, search, depotId }: { hub: ChecksHubData; search: string; depotId: string }) {
  const rows = filterCheckRows(hub.history, 'all', search, depotId)
  return (
    <SectionCard title="Check history" description="Searchable archive of submitted checks">
      <ChecksTable rows={rows} showActions={false} />
    </SectionCard>
  )
}

export function ChecksLiveTab({ hub }: { hub: ChecksHubData }) {
  return (
    <SectionCard title="Live checks" description={`${hub.liveChecks.length} checks currently in progress`}>
      {hub.liveChecks.length === 0 ? (
        <p className="text-sm text-slate-500">No checks in progress.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
              <th className="pb-2 pr-3 font-medium">Vehicle</th>
              <th className="pb-2 pr-3 font-medium">Checker</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 font-medium">Section</th>
              <th className="pb-2 pr-3 font-medium">Progress</th>
              <th className="pb-2 pr-3 font-medium">Sync</th>
              <th className="pb-2 font-medium">Departure</th>
            </tr>
          </thead>
          <tbody>
            {hub.liveChecks.map((c) => (
              <tr key={c.checkId} className="border-b border-slate-50">
                <td className="py-2.5 pr-3 font-medium">{c.registrationNumber}</td>
                <td className="py-2.5 pr-3 text-slate-600">{c.performedBy}</td>
                <td className="py-2.5 pr-3 text-slate-600">{c.checkTypeLabel}</td>
                <td className="py-2.5 pr-3 text-slate-600">{c.currentSection}</td>
                <td className="py-2.5 pr-3 tabular-nums">{c.completionPercent}%</td>
                <td className="py-2.5 pr-3">
                  <StatusPill status={c.syncStatus} />
                </td>
                <td className="py-2.5">{c.nextDepartureTime ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}
