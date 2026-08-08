import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'
import { buildExceptionsInbox } from '@/lib/exceptions/build-exceptions-inbox'
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
import { tKey } from '@/lib/tenant/tenant-query-scope'

function severityFromParam(value: string | null): ExceptionSmartFilter | null {
  if (value === 'critical' || value === 'high') return 'critical'
  if (value === 'medium' || value === 'low') return 'open'
  return null
}

function isDurableCase(ex: OperationalException | null | undefined): boolean {
  return Boolean(ex?.durableCase || ex?.source === 'Command')
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
  const [toast, setToast] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')

  const { data: dashboard, isLoading: dashboardLoading, isFetching: dashboardFetching } = useQuery({
    queryKey: tKey(['dashboard']),
    queryFn: () => api.getDashboard(),
  })

  const {
    data: durableExceptions = [],
    isLoading: durableLoading,
    isFetching: durableFetching,
  } = useQuery({
    queryKey: tKey(['exceptions', 'open']),
    queryFn: () => api.getExceptions(),
  })

  const { data: defects = [], isLoading: defectsLoading, isFetching: defectsFetching } = useQuery({
    queryKey: tKey(['defects', 'open']),
    queryFn: () => api.getDefects({ status: 'open' }),
  })

  const { data: incidents = [], isLoading: incidentsLoading, isFetching: incidentsFetching } = useQuery({
    queryKey: tKey(['incidents', 'open']),
    queryFn: () => api.getIncidents({ status: 'open' }),
  })

  const {
    data: driverEligibilityExceptions = [],
    isLoading: driverExceptionsLoading,
    isFetching: driverExceptionsFetching,
  } = useQuery({
    queryKey: tKey(['driver-eligibility-exceptions']),
    queryFn: () => api.getDriverEligibilityExceptions(),
  })

  const {
    data: vehicleReleaseExceptions = [],
    isLoading: vehicleExceptionsLoading,
    isFetching: vehicleExceptionsFetching,
  } = useQuery({
    queryKey: tKey(['vehicle-release-exceptions']),
    queryFn: () => api.getVehicleReleaseExceptions(),
  })

  const yardDepot = depotId === 'all' ? 'depot-wembley' : depotId
  const { data: yardHub, isLoading: yardLoading, isFetching: yardFetching } = useQuery({
    queryKey: tKey(['yard-hub', yardDepot]),
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
    return buildExceptionsInbox({
      alerts: dashboard?.alerts,
      defects,
      incidents,
      driverExceptions: driverEligibilityExceptions,
      vehicleExceptions: vehicleReleaseExceptions,
      yardExceptions: yardHub?.exceptions,
      apiExceptions: durableExceptions,
      includeCatalog: false,
    })
  }, [
    dashboard,
    defects,
    incidents,
    driverEligibilityExceptions,
    vehicleReleaseExceptions,
    yardHub,
    durableExceptions,
  ])

  const depotLabel =
    depotId === 'all' ? null : (depots.find((d) => d.id === depotId)?.name ?? depotId)

  const filtered = useMemo(() => {
    const smartFilter: ExceptionSmartFilter =
      listTab === 'resolved' ? 'resolved' : smart === 'resolved' ? 'open' : smart

    let rows = filterExceptions(composed, {
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
  }, [composed, smart, module, currentUserName, depotLabel, summaryFocus, search, listTab])

  const severityCounts = useMemo(() => countBySeverity(composed), [composed])
  const kpis = useMemo(() => buildExceptionKpis(composed), [composed])
  const openCount = useMemo(() => composed.filter(isOpenException).length, [composed])

  const selected =
    filtered.find((e) => e.id === selectedId) ??
    composed.find((e) => e.id === selectedId) ??
    null
  const selectedDurable = isDurableCase(selected)

  const isLoading =
    dashboardLoading ||
    durableLoading ||
    defectsLoading ||
    incidentsLoading ||
    driverExceptionsLoading ||
    vehicleExceptionsLoading ||
    yardLoading

  const isFetching =
    dashboardFetching ||
    durableFetching ||
    defectsFetching ||
    incidentsFetching ||
    driverExceptionsFetching ||
    vehicleExceptionsFetching ||
    yardFetching

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: tKey(['dashboard']) })
    void queryClient.invalidateQueries({ queryKey: tKey(['exceptions']) })
    void queryClient.invalidateQueries({ queryKey: tKey(['defects']) })
    void queryClient.invalidateQueries({ queryKey: tKey(['incidents']) })
    void queryClient.invalidateQueries({ queryKey: tKey(['driver-eligibility-exceptions']) })
    void queryClient.invalidateQueries({ queryKey: tKey(['vehicle-release-exceptions']) })
    void queryClient.invalidateQueries({ queryKey: tKey(['yard-hub']) })
  }

  const raiseMutation = useMutation({
    mutationFn: () => {
      const run = searchParams.get('run')
      return api.raiseException({
        title: createTitle.trim() || 'Manual exception',
        description: createTitle.trim() || 'Raised from Command',
        severity: 'high',
        category: 'dispatch',
        typeCode: 'manual_exception',
        relatedRecord: run ?? undefined,
        relatedHref: run ? `/live-operations?duty=${encodeURIComponent(run)}` : '/exceptions',
        depotId: depotId === 'all' ? null : depotId,
        actorName: currentUserName,
      })
    },
    onSuccess: (raised) => {
      setSelectedId(raised.id)
      setCreateOpen(false)
      setCreateTitle('')
      const next = new URLSearchParams(searchParams)
      next.delete('create')
      setSearchParams(next, { replace: true })
      setToast('Exception raised and saved to Command')
      refresh()
    },
    onError: (error) => {
      setToast(error instanceof Error ? error.message : 'Exception could not be raised')
    },
  })

  async function runCaseAction(
    label: string,
    action: () => Promise<OperationalException>,
  ) {
    if (!selected || !selectedDurable) {
      setToast('Open the related record for signals that are not Command exception cases.')
      return
    }
    try {
      const next = await action()
      setSelectedId(next.id)
      setToast(label)
      refresh()
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Exception update failed')
    }
  }

  if (isLoading && composed.length === 0) {
    return <p className="text-sm text-muted">Loading exceptions…</p>
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
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-soft">
          {toast}
          <button type="button" className="ml-3 text-xs font-medium text-command-700" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </p>
      )}

      {!selectedDurable && selected ? (
        <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          This inbox row is a linked signal (defect, incident, or yard alert). Use the related record to act. Case
          assign / escalate / close apply only to Command exception cases.
        </p>
      ) : null}

      <ExceptionSummaryStrip
        counts={severityCounts}
        kpis={kpis}
        active={summaryFocus}
        onSelect={(id) => setSummaryFocus((prev) => (prev === id ? null : id))}
      />

      <ExceptionBulkBar
        count={selectedIds.size}
        onExport={() => setToast('Export is not available yet')}
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
          onAssignMe={
            selectedDurable
              ? () =>
                  void runCaseAction('Assigned to you', () =>
                    api.assignException(selected!.id, {
                      assigneeName: currentUserName,
                      actorName: currentUserName,
                    }),
                  )
              : undefined
          }
          onInvestigate={
            selectedDurable
              ? () =>
                  void runCaseAction('Marked investigating', () =>
                    api.investigateException(selected!.id, { actorName: currentUserName }),
                  )
              : undefined
          }
          onEscalate={
            selectedDurable
              ? () =>
                  void runCaseAction('Escalated', () =>
                    api.escalateException(selected!.id, {
                      reason: 'Escalated from Exceptions inbox',
                      actorName: currentUserName,
                    }),
                  )
              : undefined
          }
          onClose={
            selectedDurable
              ? () =>
                  void runCaseAction('Exception closed', () =>
                    api.closeException(selected!.id, {
                      resolution: 'Resolved from Exceptions inbox',
                      actorName: currentUserName,
                    }),
                  )
              : undefined
          }
          onAddNote={
            selectedDurable
              ? (body) =>
                  void runCaseAction('Note saved', () =>
                    api.addExceptionNote(selected!.id, { body, actorName: currentUserName }),
                  )
              : undefined
          }
        />
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-midnight/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-ink">Raise exception</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Saves a Command exception case with audit history. This is the durable write path.
            </p>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-muted">
              Title
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-normal normal-case text-ink"
                placeholder="What needs intervention?"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={raiseMutation.isPending}
                onClick={() => raiseMutation.mutate()}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
              >
                {raiseMutation.isPending ? 'Saving…' : 'Raise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
