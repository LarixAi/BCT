import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FLEET_RESOURCES_TABS } from '@/lib/fleet-resources/constants'
import { resolveFleetResourcesHub } from '@/lib/fleet-resources/resolve-hub'
import type { FleetResourcesTab } from '@/lib/fleet-resources/types'
import { api } from '@/lib/api/client'
import { OverviewTab } from './OverviewTab'
import { FuelEnergyTab } from './FuelEnergyTab'
import { FluidsTab } from './FluidsTab'
import { TyresTab } from './TyresTab'
import { EquipmentTab } from './EquipmentTab'
import { StockTab } from './StockTab'
import { CardsTab } from './CardsTab'
import { PurchasingTab } from './PurchasingTab'
import { CostsTab } from './CostsTab'
import { AnalyticsTab } from './AnalyticsTab'
import { IntegrationsTab } from './IntegrationsTab'
import { FinanceTab } from './FinanceTab'
import { SettingsTab } from './SettingsTab'
import { RecordTransactionPanel } from './RecordTransactionPanel'

function resolveTab(raw: string | null): FleetResourcesTab {
  if (raw && FLEET_RESOURCES_TABS.some((t) => t.id === raw)) return raw as FleetResourcesTab
  return 'overview'
}

export function FleetResourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))
  const [filter, setFilter] = useState(searchParams.get('filter') ?? 'all')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [showRecord, setShowRecord] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['fleet-resources-hub'],
    queryFn: () =>
      resolveFleetResourcesHub({
        fetchLiveHub: () => api.getFleetResourcesHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })

  const hub = data?.hub
  const source = data?.source

  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) setFilter(f)
  }, [searchParams])

  function setTab(next: FleetResourcesTab) {
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  function onOpenFilter(nextTab: string, nextFilter?: string) {
    const params = new URLSearchParams(searchParams)
    if (nextTab === 'overview') params.delete('tab')
    else params.set('tab', nextTab)
    if (nextFilter) {
      params.set('filter', nextFilter)
      setFilter(nextFilter)
    } else {
      params.delete('filter')
      setFilter('all')
    }
    setSearchParams(params, { replace: true })
  }

  function onFilter(next: string) {
    setFilter(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  if (isLoading || !hub) {
    return <p className="text-sm text-muted">Loading fleet resources…</p>
  }

  return (
    <div className="space-y-6">
      {source === 'demo' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Live fleet resources hub is unavailable — showing demo ledger so you can keep working.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Fleet Resources</h1>
          <p className="text-sm text-ink-soft">
            Fuel, tyres, equipment, stock and operating costs — one ledger for what the fleet consumes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRecord(true)}
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
        >
          Record transaction
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {FLEET_RESOURCES_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? 'border-command-600 text-command-700'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab hub={hub} onOpenFilter={onOpenFilter} />}
      {tab === 'fuel' && (
        <FuelEnergyTab
          hub={hub}
          filter={filter}
          onFilter={onFilter}
          search={search}
          onSearch={setSearch}
        />
      )}
      {tab === 'fluids' && <FluidsTab hub={hub} />}
      {tab === 'tyres' && <TyresTab hub={hub} />}
      {tab === 'equipment' && <EquipmentTab hub={hub} />}
      {tab === 'stock' && <StockTab hub={hub} />}
      {tab === 'cards' && <CardsTab hub={hub} />}
      {tab === 'purchasing' && <PurchasingTab hub={hub} />}
      {tab === 'costs' && <CostsTab hub={hub} />}
      {tab === 'analytics' && <AnalyticsTab hub={hub} />}
      {tab === 'integrations' && <IntegrationsTab hub={hub} />}
      {tab === 'finance' && <FinanceTab hub={hub} />}
      {tab === 'settings' && <SettingsTab hub={hub} />}

      {showRecord && <RecordTransactionPanel onClose={() => setShowRecord(false)} />}
    </div>
  )
}
