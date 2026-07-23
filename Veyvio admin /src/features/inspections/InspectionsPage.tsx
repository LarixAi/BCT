import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { INSPECTION_TABS } from '@/lib/inspections/constants'
import { resolveInspectionsHub } from '@/lib/inspections/resolve-hub'
import type { InspectionTab } from '@/lib/inspections/types'
import { api } from '@/lib/api/client'
import { InspectionsAwaitingRepairTab } from './InspectionsAwaitingRepairTab'
import { InspectionsCalendarTab } from './InspectionsCalendarTab'
import { InspectionsProvidersTab } from './InspectionsProvidersTab'
import { InspectionsRegisterTab } from './InspectionsRegisterTab'
import { ScheduleInspectionPanel } from './ScheduleInspectionPanel'

function resolveTab(raw: string | null): InspectionTab {
  if (raw && INSPECTION_TABS.some((t) => t.id === raw)) return raw as InspectionTab
  return 'register'
}

export function InspectionsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))
  const [filter, setFilter] = useState(searchParams.get('filter') ?? 'all')
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [showSchedule, setShowSchedule] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['inspections-hub'],
    queryFn: () =>
      resolveInspectionsHub({
        fetchLiveHub: () => api.getInspectionsHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })

  const hub = data?.hub
  const source = data?.source

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })

  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) setFilter(f)
  }, [searchParams])

  function setTab(next: InspectionTab) {
    const params = new URLSearchParams(searchParams)
    if (next === 'register') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  function onFilter(next: string) {
    setFilter(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('filter')
    else params.set('filter', next)
    if (tab !== 'register') params.delete('tab')
    setSearchParams(params, { replace: true })
  }

  const importMutation = useMutation({
    mutationFn: (vehicleId: string) =>
      api.importInspection({
        vehicleId,
        inspectionType: 'safety_pmi',
        dueDate: new Date().toISOString().slice(0, 10),
        fileName: 'imported-inspection.pdf',
        outcome: 'incomplete',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections-hub'] })
      setShowImport(false)
    },
  })

  if (isLoading || !hub) return <p className="text-sm text-muted">Loading inspections…</p>

  return (
    <div className="space-y-6">
      {(source === 'demo' || source === 'projected') && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {source === 'demo'
            ? 'Live inspections hub is unavailable — showing demo inspection register so you can keep working.'
            : 'Live inspections hub is unavailable — showing inspection stubs from vehicle compliance dates.'}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Inspections</h1>
          <p className="text-sm text-ink-soft">
            Formal inspection schedule, checklist outcomes and sign-off — not daily vehicle checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            Schedule inspection
          </button>
          <Link
            to="/inspections?tab=calendar"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Calendar
          </Link>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Import inspection
          </button>
          <Link
            to="/maintenance?tab=pmi"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Manage schedules
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {INSPECTION_TABS.map((t) => (
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

      {tab === 'register' && (
        <InspectionsRegisterTab
          hub={hub}
          filter={filter}
          onFilter={onFilter}
          search={search}
          onSearch={setSearch}
        />
      )}
      {tab === 'calendar' && <InspectionsCalendarTab events={hub.calendar} />}
      {tab === 'awaiting-repair' && <InspectionsAwaitingRepairTab register={hub.register} />}
      {tab === 'providers' && <InspectionsProvidersTab providers={hub.providers} />}

      {showSchedule && <ScheduleInspectionPanel onClose={() => setShowSchedule(false)} />}

      {showImport && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-midnight/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-ink">Import inspection (PDF metadata)</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Phase 1 stub — records PDF file name and queues the inspection for sign-off review.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium text-ink-soft">Vehicle</span>
              <select
                id="import-vehicle"
                className="w-full rounded-lg border border-border px-3 py-2"
                defaultValue=""
              >
                <option value="">Select…</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importMutation.isPending}
                onClick={() => {
                  const el = document.getElementById('import-vehicle') as HTMLSelectElement | null
                  if (el?.value) importMutation.mutate(el.value)
                }}
                className="rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Import stub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
