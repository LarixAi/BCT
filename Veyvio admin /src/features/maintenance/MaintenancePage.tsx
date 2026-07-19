import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MAINTENANCE_TAB_ALIASES, MAINTENANCE_TABS } from '@/lib/maintenance/constants'
import { canCreateWorkOrder } from '@/lib/maintenance/permissions'
import type { MaintenanceTab } from '@/lib/maintenance/types'
import { MaintenanceOverviewTab } from './MaintenanceOverviewTab'
import { MaintenanceWorkOrdersTab } from './MaintenanceWorkOrdersTab'
import { MaintenancePlannerTab } from './MaintenancePlannerTab'
import { MaintenancePmiTab } from './MaintenancePmiTab'
import { MaintenanceServiceTab } from './MaintenanceServiceTab'
import { MaintenanceVorTab } from './MaintenanceVorTab'
import { MaintenanceSuppliersTab } from './MaintenanceSuppliersTab'
import { MaintenanceCostsTab } from './MaintenanceCostsTab'
import { MaintenanceDowntimeTab } from './MaintenanceDowntimeTab'
import { MaintenanceComplianceTab } from './MaintenanceComplianceTab'
import { MaintenanceDefectsTab } from './MaintenanceDefectsTab'
import { MaintenanceTechnicianTab } from './MaintenanceTechnicianTab'
import { CreateWorkOrderPanel, type CreateWorkOrderPrefill } from './CreateWorkOrderPanel'
import { api } from '@/lib/api/client'
import { safeMaintenanceHub } from '@/lib/api/safe-hubs'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'

function resolveTab(raw: string | null): MaintenanceTab {
  if (!raw) return 'overview'
  const aliased = MAINTENANCE_TAB_ALIASES[raw] ?? raw
  if (MAINTENANCE_TABS.some((t) => t.id === aliased)) return aliased as MaintenanceTab
  if (aliased === 'defects') return 'defects'
  return 'overview'
}

export function MaintenancePage() {
  const { user } = useAuth()
  const { operationalDateIso } = useOperationalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))
  const vehicleFilter = searchParams.get('vehicle') ?? ''
  const woHighlight = searchParams.get('wo') ?? ''
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState(vehicleFilter)
  const [showCreateWo, setShowCreateWo] = useState(false)
  const [createWoPrefill, setCreateWoPrefill] = useState<CreateWorkOrderPrefill | null>(null)
  const [showDefects, setShowDefects] = useState(Boolean(searchParams.get('tab') === 'defects'))

  function openCreateWorkOrder(prefill?: CreateWorkOrderPrefill | null) {
    setCreateWoPrefill(prefill ?? null)
    setShowCreateWo(true)
  }

  useEffect(() => {
    if (vehicleFilter) setSearch(vehicleFilter)
  }, [vehicleFilter])

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: ['maintenance-hub'],
    queryFn: () => api.getMaintenanceHub(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', operationalDateIso],
    queryFn: () => api.getDuties({ date: operationalDateIso }),
  })

  const dutyConflicts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of duties) {
      const vid = d.vehicle?.id
      if (!vid) continue
      map[vid] = (map[vid] ?? 0) + 1
    }
    return map
  }, [duties])

  const canCreate = canCreateWorkOrder(user?.permissions ?? [])

  function setTab(next: MaintenanceTab) {
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading maintenance…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load maintenance'}</p>
  }

  const safeHub = safeMaintenanceHub(hub)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Maintenance</h1>
          <p className="text-sm text-slate-600">
            Plan inspections, control repairs and keep every vehicle roadworthy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => openCreateWorkOrder()}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
            >
              Create work order
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('planner')}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Schedule maintenance
          </button>
          <button
            type="button"
            onClick={() => openCreateWorkOrder({ type: 'external', title: 'External workshop work' })}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Record external work
          </button>
        </div>
      </div>

      {showCreateWo && (
        <CreateWorkOrderPanel
          key={`${createWoPrefill?.vehicleId ?? ''}-${createWoPrefill?.title ?? ''}-${createWoPrefill?.type ?? ''}`}
          prefill={createWoPrefill}
          onClose={() => {
            setShowCreateWo(false)
            setCreateWoPrefill(null)
          }}
        />
      )}

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
          hub={safeHub}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          onOpenTab={(t) => setTab(t as MaintenanceTab)}
        />
      )}
      {tab === 'planner' && (
        <MaintenancePlannerTab
          schedule={safeHub.schedule}
          calendar={safeHub.calendar}
          dutyConflicts={dutyConflicts}
          onCreateWorkOrder={(prefill) => openCreateWorkOrder(prefill)}
        />
      )}
      {tab === 'work-orders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowDefects((v) => !v)}
              className="text-sm font-medium text-command-600 hover:underline"
            >
              {showDefects ? 'Hide defect register' : 'Show defect register'}
            </button>
          </div>
          <MaintenanceWorkOrdersTab
            workOrders={safeHub.workOrders}
            vehicleFilter={vehicleFilter}
            highlightWorkOrderId={woHighlight}
          />
          {showDefects && <MaintenanceDefectsTab defects={safeHub.defects} />}
        </div>
      )}
      {tab === 'technician' && (
        <MaintenanceTechnicianTab workOrders={safeHub.workOrders} vehicles={vehicles} />
      )}
      {tab === 'defects' && <MaintenanceDefectsTab defects={safeHub.defects} />}
      {tab === 'pmi' && (
        <MaintenancePmiTab vehicles={vehicles} workOrders={safeHub.workOrders} schedule={safeHub.schedule} />
      )}
      {tab === 'service' && <MaintenanceServiceTab vehicles={vehicles} schedule={safeHub.schedule} />}
      {tab === 'vor' && <MaintenanceVorTab vehicles={vehicles} workOrders={safeHub.workOrders} />}
      {tab === 'parts' && <MaintenanceSuppliersTab suppliers={safeHub.suppliers} parts={safeHub.parts} />}
      {tab === 'costs' && (
        <div className="space-y-6">
          <MaintenanceCostsTab intelligence={safeHub.intelligence} />
          <MaintenanceDowntimeTab downtime={safeHub.downtime} />
        </div>
      )}
      {tab === 'compliance' && <MaintenanceComplianceTab hub={safeHub} vehicles={vehicles} />}
    </div>
  )
}

/** Redirect legacy standalone work-order routes into the hub. */
export function MaintenanceWorkOrdersRedirect() {
  const { workOrderId } = useParams()
  const [params] = useSearchParams()
  const wo = workOrderId ?? params.get('wo')
  const to = wo ? `/maintenance?tab=work-orders&wo=${encodeURIComponent(wo)}` : '/maintenance?tab=work-orders'
  return <Navigate to={to} replace />
}
