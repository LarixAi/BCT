import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'
import {
  applyExceptionOverlays,
  buildExceptionsInbox,
  type ExceptionOverlay,
} from '@/lib/exceptions/build-exceptions-inbox'
import {
  countBySeverity,
  filterExceptions,
  isOpenException,
  type ExceptionSmartFilter,
} from '@/lib/exceptions/exception-filters'
import { buildExceptionKpis } from '@/lib/exceptions/exception-kpis'
import type { ExceptionCategory, ExceptionSeverity, OperationalException } from '@/lib/types'
import { ExceptionBulkBar } from './ExceptionBulkBar'
import { ExceptionInvestigationPanel } from './ExceptionInvestigationPanel'
import { ExceptionQueue } from './ExceptionQueue'
import { ExceptionControlBar, ExceptionSummaryStrip } from './ExceptionWorkspacePanels'

function severityFromParam(value: string | null): ExceptionSmartFilter | null {
  if (value === 'critical' || value === 'high') return 'critical'
  if (value === 'medium' || value === 'low') return 'open'
  return null
}

type SummaryFocus = ExceptionSeverity | 'awaiting' | 'escalated' | 'sla' | null

export function ExceptionsPage() {
  const { user } = useAuth()
  const { operationalDate, depotId, depots } = useOperationalContext()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUserName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'You'

  const [listTab, setListTab] = useState<'open' | 'resolved'>('open')
  const [smart, setSmart] = useState<ExceptionSmartFilter>(
    () => severityFromParam(searchParams.get('severity')) ?? 'open',
  )
  const [module, setModule] = useState<ExceptionCategory | 'all'>('all')
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocus>(
    searchParams.get('severity') === 'critical' ? 'critical' : null,
  )
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [overlays, setOverlays] = useState<Record<string, ExceptionOverlay>>({})
  const [localRaised, setLocalRaised] = useState<OperationalException[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')

  const { data: dashboard, isLoading: dashboardLoading, isFetching: dashboardFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  })

  const { data: defects = [], isLoading: defectsLoading, isFetching: defectsFetching } = useQuery({
    queryKey: ['defects', 'open'],
    queryFn: () => api.getDefects({ status: 'open' }),
  })

  const { data: incidents = [], isLoading: incidentsLoading, isFetching: incidentsFetching } = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => api.getIncidents({ status: 'open' }),
  })

  const {
    data: driverEligibilityExceptions = [],
    isLoading: driverExceptionsLoading,
    isFetching: driverExceptionsFetching,
  } = useQuery({
    queryKey: ['driver-eligibility-exceptions'],
    queryFn: () => api.getDriverEligibilityExceptions(),
  })

  const {
    data: vehicleReleaseExceptions = [],
    isLoading: vehicleExceptionsLoading,
    isFetching: vehicleExceptionsFetching,
  } = useQuery({
    queryKey: ['vehicle-release-exceptions'],
    queryFn: () => api.getVehicleReleaseExceptions(),
  })

  const yardDepot = depotId === 'all' ? 'depot-wembley' : depotId
  const { data: yardHub, isLoading: yardLoading, isFetching: yardFetching } = useQuery({
    queryKey: ['yard-hub', yardDepot],
    queryFn: () => api.getYardHub(yardDepot),
  })

  useEffect(() => {
    const fromSeverity = severityFromParam(searchParams.get('severity'))
    if (fromSeverity) setSmart(fromSeverity)
    if (searchParams.get('severity') === 'critical') setSummaryFocus('critical')
    if (searchParams.get('create') === '1') {
      setCreateOpen(true)
      const run = searchParams.get('run')
      if (run) setCreateTitle(`Exception for run ${run}`)
    }
  }, [searchParams])

  const composed = useMemo(() => {
    const inbox = buildExceptionsInbox({
      alerts: dashboard?.alerts,
      defects,
      incidents,
      driverExceptions: driverEligibilityExceptions,
      vehicleExceptions: vehicleReleaseExceptions,
      yardExceptions: yardHub?.exceptions,
      includeCatalog: true,
    })
    return [...localRaised, ...inbox]
  }, [
    dashboard,
    defects,
    incidents,
    driverEligibilityExceptions,
    vehicleReleaseExceptions,
    yardHub,
    localRaised,
  ])

  const withOverlays = useMemo(() => applyExceptionOverlays(composed, overlays), [composed, overlays])

  const depotLabel =
    depotId === 'all' ? null : (depots.find((d) => d.id === depotId)?.name ?? depotId)

  const filtered = useMemo(() => {
    const smartFilter: ExceptionSmartFilter =
      listTab === 'resolved' ? 'resolved' : smart === 'resolved' ? 'open' : smart

    let rows = filterExceptions(withOverlays, {
      smart: smartFilter,
      module,
      currentUserName,
      currentDepot: depotLabel,
    })

    if (listTab === 'open') {
      rows = rows.filter(isOpenException)
    }

    if (summaryFocus === 'critical' || summaryFocus === 'high' || summaryFocus === 'medium' || summaryFocus === 'low') {
      rows = rows.filter((ex) =>
        summaryFocus === 'medium' ? ex.severity === 'medium' || ex.severity === 'low' : ex.severity === summaryFocus,
      )
    } else if (summaryFocus === 'awaiting') {
      rows = rows.filter((ex) => !ex.owner && isOpenException(ex))
    } else if (summaryFocus === 'escalated') {
      rows = rows.filter((ex) => Boolean(ex.escalated))
    } else if (summaryFocus === 'sla') {
      rows = rows.filter((ex) => ex.slaMinutesRemaining != null && ex.slaMinutesRemaining < 0)
    }

    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter((ex) =>
        [ex.title, ex.description, ex.relatedRecord, ex.driverName, ex.vehicleRegistration, ex.runRef, ex.bookingRef]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
      )
    }

    return rows
  }, [withOverlays, smart, module, currentUserName, depotLabel, summaryFocus, search, listTab])

  const severityCounts = useMemo(() => countBySeverity(withOverlays), [withOverlays])
  const kpis = useMemo(() => buildExceptionKpis(withOverlays), [withOverlays])
  const openCount = useMemo(() => withOverlays.filter(isOpenException).length, [withOverlays])

  const selected =
    filtered.find((e) => e.id === selectedId) ??
    withOverlays.find((e) => e.id === selectedId) ??
    null

  const isLoading =
    dashboardLoading ||
    defectsLoading ||
    incidentsLoading ||
    driverExceptionsLoading ||
    vehicleExceptionsLoading ||
    yardLoading

  const isFetching =
    dashboardFetching ||
    defectsFetching ||
    incidentsFetching ||
    driverExceptionsFetching ||
    vehicleExceptionsFetching ||
    yardFetching

  function patchOverlay(id: string, patch: ExceptionOverlay) {
    setOverlays((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }))
  }

  function bulkPatch(patch: ExceptionOverlay) {
    setOverlays((prev) => {
      const next = { ...prev }
      for (const id of selectedIds) {
        next[id] = { ...next[id], ...patch }
      }
      return next
    })
    setToast(`Updated ${selectedIds.size} exception${selectedIds.size === 1 ? '' : 's'}`)
  }

  function raiseException() {
    const run = searchParams.get('run')
    const id = `LOCAL-${Date.now()}`
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const raised: OperationalException = {
      id,
      severity: 'high',
      title: createTitle.trim() || 'Manual exception',
      typeCode: 'manual_exception',
      category: 'dispatch',
      description: createTitle.trim() || 'Raised from Command',
      relatedRecord: run ?? id,
      relatedHref: run ? `/live-operations?duty=${encodeURIComponent(run)}` : '/exceptions',
      depot: depotLabel ?? 'Wembley',
      raisedAt: now,
      ageMinutes: 0,
      slaMinutesRemaining: 30,
      owner: currentUserName,
      status: 'new',
      lastUpdate: now,
      source: 'Command',
      runRef: run,
      timeline: [{ at: now, label: 'Exception raised manually' }],
      audit: [{ id: `audit-${id}`, at: now, actor: currentUserName, action: 'Exception raised' }],
    }
    setLocalRaised((prev) => [raised, ...prev])
    setSelectedId(id)
    setCreateOpen(false)
    setCreateTitle('')
    const next = new URLSearchParams(searchParams)
    next.delete('create')
    setSearchParams(next, { replace: true })
    setToast('Exception raised')
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['defects'] })
    void queryClient.invalidateQueries({ queryKey: ['incidents'] })
    void queryClient.invalidateQueries({ queryKey: ['driver-eligibility-exceptions'] })
    void queryClient.invalidateQueries({ queryKey: ['vehicle-release-exceptions'] })
    void queryClient.invalidateQueries({ queryKey: ['yard-hub'] })
  }

  if (isLoading && withOverlays.length === 0) {
    return <p className="text-sm text-slate-500">Loading exceptions…</p>
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <ExceptionControlBar
        dateLabel={operationalDate}
        openCount={openCount}
        search={search}
        onSearch={setSearch}
        listTab={listTab}
        onListTab={(tab) => {
          setListTab(tab)
          if (tab === 'resolved') setSmart('resolved')
          else if (smart === 'resolved') setSmart('open')
        }}
        smart={smart}
        onSmart={(v) => {
          setSmart(v)
          setSummaryFocus(null)
          if (v === 'resolved') setListTab('resolved')
          else setListTab('open')
        }}
        onRaise={() => setCreateOpen(true)}
        onRefresh={refresh}
        isLoading={isFetching}
      />

      {toast && (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {toast}
          <button type="button" className="ml-3 text-xs font-medium text-command-700" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </p>
      )}

      <ExceptionSummaryStrip
        counts={severityCounts}
        kpis={kpis}
        active={summaryFocus}
        onSelect={(id) => setSummaryFocus((prev) => (prev === id ? null : id))}
      />

      <ExceptionBulkBar
        count={selectedIds.size}
        onAssignDispatch={() => bulkPatch({ owner: 'Dispatch', status: 'assigned' })}
        onAssignFleet={() => bulkPatch({ owner: 'Fleet', status: 'assigned' })}
        onEscalate={() => bulkPatch({ escalated: true, status: 'action_in_progress' })}
        onInvestigating={() => bulkPatch({ status: 'investigating' })}
        onClose={() => bulkPatch({ status: 'resolved' })}
        onExport={() => setToast('Export queued (mock)')}
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_340px]">
        <ExceptionQueue
          rows={filtered}
          selectedId={selectedId}
          selectedIds={selectedIds}
          module={module}
          onModule={setModule}
          onSelect={(ex) => setSelectedId(ex.id)}
          onToggleSelect={(id) => {
            setSelectedIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }}
          onToggleAll={(checked) => {
            setSelectedIds(checked ? new Set(filtered.map((r) => r.id)) : new Set())
          }}
        />

        <ExceptionInvestigationPanel
          exception={selected}
          onAssignMe={() => selected && patchOverlay(selected.id, { owner: currentUserName, status: 'assigned' })}
          onInvestigate={() => selected && patchOverlay(selected.id, { status: 'investigating' })}
          onEscalate={() =>
            selected && patchOverlay(selected.id, { escalated: true, status: 'action_in_progress' })
          }
          onClose={() => selected && patchOverlay(selected.id, { status: 'resolved' })}
          onAddNote={(body) => {
            if (!selected) return
            const entry = {
              id: `note-${Date.now()}`,
              at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              author: currentUserName,
              body,
            }
            const existing = overlays[selected.id]?.notes ?? selected.notes ?? []
            patchOverlay(selected.id, { notes: [...existing, entry] })
          }}
        />
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Raise exception</h2>
            <p className="mt-1 text-sm text-slate-600">
              Creates a local inbox item until the exceptions API accepts writes.
            </p>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Title
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case text-slate-900"
                placeholder="What needs intervention?"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={raiseException}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
              >
                Raise
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
