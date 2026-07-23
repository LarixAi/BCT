import { SectionCard } from '@/components/ui'
import { filterIncidentRows } from '@/lib/incidents/aggregate'
import type { IncidentsHubData, IncidentsTab, IncidentRegisterRow } from '@/lib/incidents/types'
import { IncidentsAnalyticsPanel } from './IncidentsAnalyticsPanel'
import { IncidentsRegisterTable } from './IncidentsRegisterTable'

function tabTitle(tab: IncidentsTab): string {
  const titles: Record<IncidentsTab, string> = {
    active: 'Active incidents',
    all: 'All incidents',
    regulatory: 'Regulatory assessments',
    actions: 'Corrective actions',
    analytics: 'Analytics',
  }
  return titles[tab]
}

export function IncidentsTabContent({
  hub,
  tab,
  filter,
  search,
  depotId,
  onQuickView,
}: {
  hub: IncidentsHubData
  tab: IncidentsTab
  filter: string
  search: string
  depotId: string
  onQuickView?: (row: IncidentRegisterRow) => void
}) {
  if (tab === 'analytics') {
    return <IncidentsAnalyticsPanel analytics={hub.analytics} recurringAlerts={hub.recurringAlerts} />
  }

  if (tab === 'actions') {
    return (
      <SectionCard title="Corrective actions" description="Cross-incident action tracker">
        {hub.correctiveActions.length === 0 ? (
          <p className="text-sm text-muted">No open corrective actions.</p>
        ) : (
          <ul className="divide-y divide-border" data-testid="corrective-actions-list">
            {hub.correctiveActions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="text-sm text-ink-soft">{a.description}</p>
                  <p className="text-xs text-muted">Owner: {a.ownerName} · Due {new Date(a.dueDate).toLocaleDateString('en-GB')}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>
                  {a.status.replace(/_/g, ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    )
  }

  const rows =
    tab === 'regulatory'
      ? filterIncidentRows(hub.regulatory, filter, search, depotId, tab)
      : filterIncidentRows(hub.register, filter, search, depotId, tab)

  return (
    <SectionCard title={tabTitle(tab)} description={`${rows.length} incidents`}>
      <IncidentsRegisterTable rows={rows} onQuickView={onQuickView} />
    </SectionCard>
  )
}
