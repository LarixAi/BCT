import { SectionCard } from '@/components/ui'
import { filterDefectRows } from '@/lib/defects/aggregate'
import type { DefectsHubData, DefectsTab } from '@/lib/defects/types'
import { DefectsRegisterTable } from './components/DefectsRegisterTable'
import { DefectsRulesTab } from './components/DefectsRulesTab'
import { RecurringDefectsPanel } from './components/RecurringDefectsPanel'
import { DefectsAnalyticsPanel } from './components/DefectsAnalyticsPanel'

function tabTitle(tab: DefectsTab): string {
  const titles: Record<DefectsTab, string> = {
    overview: 'Defect register',
    critical: 'Critical defects',
    awaiting_triage: 'Awaiting triage',
    vor: 'VOR vehicles',
    overdue: 'Overdue repairs',
    verification: 'Awaiting verification',
    recurring: 'Recurring defects',
    history: 'Recently closed',
    rules: 'Rules & SLA',
  }
  return titles[tab]
}

function tabDescription(tab: DefectsTab, count: number): string {
  const descriptions: Record<DefectsTab, string> = {
    overview: 'All open vehicle defects across the operation',
    critical: 'Safety-critical defects requiring immediate action',
    awaiting_triage: 'Submitted defects not yet reviewed',
    vor: 'Defects affecting vehicles currently off road',
    overdue: 'Defects past their target repair date',
    verification: 'Repairs reported complete — awaiting sign-off',
    recurring: 'Repeated component failures flagged for investigation',
    history: 'Closed defects retained in vehicle history',
    rules: 'Company SLA targets and automation rules',
  }
  if (tab === 'rules') return descriptions[tab]
  return `${count} defects — ${descriptions[tab]}`
}

export function DefectsTabContent({
  hub,
  tab,
  filter,
  search,
  depotId,
  selected,
  onToggleSelect,
  onToggleAll,
}: {
  hub: DefectsHubData
  tab: DefectsTab
  filter: string
  search: string
  depotId: string
  selected: string[]
  onToggleSelect: (id: string) => void
  onToggleAll: (ids: string[]) => void
}) {
  if (tab === 'rules') {
    return <DefectsRulesTab hub={hub} />
  }

  const rows =
    tab === 'recurring'
      ? filterDefectRows(hub.recurring, filter, search, depotId, tab)
      : filterDefectRows(hub.register, filter, search, depotId, tab)

  return (
    <div className="space-y-4">
      {tab === 'overview' && <DefectsAnalyticsPanel analytics={hub.analytics} />}
      {tab === 'recurring' && <RecurringDefectsPanel insights={hub.recurringInsights} />}
      <SectionCard title={tabTitle(tab)} description={tabDescription(tab, rows.length)}>
        <DefectsRegisterTable
          rows={rows}
          selectable={tab !== 'history'}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onToggleAll={onToggleAll}
        />
      </SectionCard>
    </div>
  )
}
