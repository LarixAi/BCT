import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MAINTENANCE_TABS } from '@/lib/maintenance/constants'
import { canCreateWorkOrder } from '@/lib/maintenance/permissions'
import type { MaintenanceTab } from '@/lib/maintenance/types'
import { MaintenanceOverviewTab } from './MaintenanceOverviewTab'
import { MaintenanceWorkOrdersTab } from './MaintenanceWorkOrdersTab'
import { MaintenanceScheduleTab } from './MaintenanceScheduleTab'
import { MaintenanceDefectsTab } from './MaintenanceDefectsTab'
import { MaintenanceCalendarTab } from './MaintenanceCalendarTab'
import { MaintenanceDowntimeTab } from './MaintenanceDowntimeTab'
import { MaintenanceSuppliersTab } from './MaintenanceSuppliersTab'
import { MaintenanceCostsTab } from './MaintenanceCostsTab'
import { CreateWorkOrderPanel } from './CreateWorkOrderPanel'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function MaintenancePage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as MaintenanceTab) || 'overview'
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCreateWo, setShowCreateWo] = useState(false)

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: ['maintenance-hub'],
    queryFn: () => api.getMaintenanceHub(),
  })

  const canCreate = canCreateWorkOrder(user?.permissions ?? [])

  function setTab(next: MaintenanceTab) {
    if (next === 'overview') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', next)
    }
    setSearchParams(searchParams, { replace: true })
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading maintenance…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load maintenance'}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
          <p className="text-sm text-slate-600">
            Monitor vehicle condition, scheduled servicing, open defects, workshop activity and return-to-service decisions.
          </p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCreateWo((v) => !v)}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
            >
              Create work order
            </button>
          </div>
        )}
      </div>

      {showCreateWo && <CreateWorkOrderPanel onClose={() => setShowCreateWo(false)} />}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {MAINTENANCE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-white text-command-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <MaintenanceOverviewTab
          hub={hub}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
        />
      )}
      {tab === 'work-orders' && <MaintenanceWorkOrdersTab workOrders={hub.workOrders} />}
      {tab === 'schedule' && <MaintenanceScheduleTab schedule={hub.schedule} />}
      {tab === 'defects' && <MaintenanceDefectsTab defects={hub.defects} />}
      {tab === 'calendar' && <MaintenanceCalendarTab events={hub.calendar} />}
      {tab === 'downtime' && <MaintenanceDowntimeTab downtime={hub.downtime} />}
      {tab === 'suppliers' && <MaintenanceSuppliersTab suppliers={hub.suppliers} parts={hub.parts} />}
      {tab === 'costs' && <MaintenanceCostsTab intelligence={hub.intelligence} />}
    </div>
  )
}
