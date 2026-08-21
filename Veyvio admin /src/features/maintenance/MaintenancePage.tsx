import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Plus } from 'lucide-react'
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
import { tKey } from '@/lib/tenant/tenant-query-scope'

const PRIMARY_TAB_IDS: MaintenanceTab[] = [
  'overview',
  'work-orders',
  'planner',
  'compliance',
  'costs',
]

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
    queryKey: tKey(['maintenance-hub']),
    queryFn: () => api.getMaintenanceHub(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: duties = [] } = useQuery({
    queryKey: tKey(['duties', operationalDateIso]),
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

  const primaryTabs = PRIMARY_TAB_IDS.map((id) =>
    MAINTENANCE_TABS.find((item) => item.id === id),
  ).filter((item): item is (typeof MAINTENANCE_TABS)[number] => Boolean(item))
  const moreTabs = MAINTENANCE_TABS.filter(
    (item) => !PRIMARY_TAB_IDS.includes(item.id),
  )
  const moreIsActive = moreTabs.some((item) => item.id === tab)

  function setTab(next: MaintenanceTab) {
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    )
  }

  if (isError || !hub) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error instanceof Error ? error.message : 'Could not load maintenance'}
      </div>
    )
  }

  const safeHub = safeMaintenanceHub(hub)

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Maintenance</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Plan inspections, control repairs and keep every vehicle roadworthy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => openCreateWorkOrder()}
              className="inline-flex items-center gap-2 rounded-xl bg-command-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-command-700"
            >
              <Plus className="h-4 w-4" />
              New work order
            </button>
          )}

          <button
            type="button"
            onClick={() => setTab('planner')}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-sm hover:bg-surface-muted"
          >
            Schedule maintenance
          </button>

          <button
            type="button"
            onClick={() =>
              openCreateWorkOrder({ type: 'external', title: 'External workshop work' })
            }
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-sm hover:bg-surface-muted"
          >
            Record external work
          </button>
        </div>
      </header>

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

      <nav className="flex flex-wrap items-end gap-1 border-b border-border">
        {primaryTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`relative px-4 py-3 text-sm font-semibold transition ${
              tab === item.id
                ? 'text-command-700'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {item.label}
            {tab === item.id && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-command-600" />
            )}
          </button>
        ))}

        <details className="group relative">
          <summary
            className={`flex cursor-pointer list-none items-center gap-1 px-4 py-3 text-sm font-semibold ${
              moreIsActive
                ? 'text-command-700'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            More
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>

          <div className="absolute left-0 top-full z-40 mt-2 min-w-56 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
            {moreTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  tab === item.id
                    ? 'bg-command-50 text-command-700'
                    : 'text-ink-soft hover:bg-surface-muted hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {moreIsActive && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-command-600" />
          )}
        </details>
      </nav>

      {tab === 'overview' && (
        <MaintenanceOverviewTab
          hub={safeHub}
          filter={filter}
          onFilter={setFilter}
          search={search}
          onSearch={setSearch}
          onOpenTab={(next) => setTab(next as MaintenanceTab)}
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
        <div className="space-y-5">
          <MaintenanceWorkOrdersTab
            workOrders={safeHub.workOrders}
            summary={safeHub.summary}
            vehicleFilter={vehicleFilter}
            highlightWorkOrderId={woHighlight}
            defectsOpen={showDefects}
            onToggleDefects={() => setShowDefects((value) => !value)}
          />

          {showDefects && <MaintenanceDefectsTab defects={safeHub.defects} />}
        </div>
      )}

      {tab === 'technician' && (
        <MaintenanceTechnicianTab
          workOrders={safeHub.workOrders}
          vehicles={vehicles}
        />
      )}

      {tab === 'defects' && <MaintenanceDefectsTab defects={safeHub.defects} />}

      {tab === 'pmi' && (
        <MaintenancePmiTab
          vehicles={vehicles}
          workOrders={safeHub.workOrders}
          schedule={safeHub.schedule}
        />
      )}

      {tab === 'service' && (
        <MaintenanceServiceTab vehicles={vehicles} schedule={safeHub.schedule} />
      )}

      {tab === 'vor' && (
        <MaintenanceVorTab vehicles={vehicles} workOrders={safeHub.workOrders} />
      )}

      {tab === 'parts' && (
        <MaintenanceSuppliersTab suppliers={safeHub.suppliers} parts={safeHub.parts} />
      )}

      {tab === 'costs' && (
        <div className="space-y-6">
          <MaintenanceCostsTab intelligence={safeHub.intelligence} />
          <MaintenanceDowntimeTab downtime={safeHub.downtime} />
        </div>
      )}

      {tab === 'compliance' && (
        <MaintenanceComplianceTab hub={safeHub} vehicles={vehicles} />
      )}
    </div>
  )
}

/** Redirect legacy standalone work-order routes into the hub. */
export function MaintenanceWorkOrdersRedirect() {
  const { workOrderId } = useParams()
  const [params] = useSearchParams()
  const wo = workOrderId ?? params.get('wo')
  const to = wo
    ? `/maintenance?tab=work-orders&wo=${encodeURIComponent(wo)}`
    : '/maintenance?tab=work-orders'
  return <Navigate to={to} replace />
}
