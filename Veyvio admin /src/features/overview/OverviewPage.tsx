import { useEffect, useState } from 'react'
import type { OpsActionSeverity } from '@/lib/ops/canonical-states'
import type { OpsSavedView } from '@/lib/ops/ops-dashboard'
import { useOperationalContext } from '@/lib/context'
import {
  ActionQueuePanel,
  ChecksSnapshotPanel,
  DefectsVorPanel,
  DriverReadinessPanel,
  HandoverExceptionsPanel,
  LiveTripsPanel,
  QuickActionsPanel,
  ReadinessPipelinePanel,
  SavedViewChips,
  SyncHealthPanel,
  TopLineCards,
  VehicleReadinessPanel,
  YardSnapshotPanel,
  viewShows,
} from './ControlCentrePanels'
import { useOpsDashboard } from './useOpsDashboard'

export function OverviewPage() {
  const { depotId, operationalDate, setConnectionStatus } = useOperationalContext()
  const { model, isLoading, isError, error, connectionStatus } = useOpsDashboard(depotId)
  const [view, setView] = useState<OpsSavedView>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | OpsActionSeverity>('all')

  useEffect(() => {
    setConnectionStatus(connectionStatus)
  }, [connectionStatus, setConnectionStatus])

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading operational position…</p>
  }

  if (isError || !model) {
    return (
      <p className="text-sm text-red-800">
        {error instanceof Error ? error.message : 'Could not load control centre'}
      </p>
    )
  }

  const headline =
    model.topLine.criticalExceptions > 0
      ? `${model.topLine.criticalExceptions} critical exception${model.topLine.criticalExceptions === 1 ? '' : 's'} need action now`
      : model.topLine.runsBlocked > 0
        ? `${model.topLine.runsBlocked} run${model.topLine.runsBlocked === 1 ? '' : 's'} blocked before release`
        : model.drivers.notSignedOn > 0
          ? `${model.drivers.notSignedOn} scheduled driver${model.drivers.notSignedOn === 1 ? '' : 's'} not signed on`
          : 'Operations are clear for release'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Control centre</h1>
          <p className="mt-1 text-sm font-medium text-slate-800">{headline}</p>
          <p className="text-xs text-slate-500">
            {operationalDate} · Operational picture from Driver, Yard, Dispatch and compliance
          </p>
        </div>
        <SavedViewChips view={view} onChange={setView} />
      </header>

      {viewShows(view, 'top') && (
        <>
          <TopLineCards model={model} />
          <div className="grid gap-4 lg:grid-cols-2">
            <DriverReadinessPanel model={model} />
            <VehicleReadinessPanel model={model} />
          </div>
        </>
      )}

      {viewShows(view, 'pipeline') && <ReadinessPipelinePanel model={model} />}

      <div className="grid gap-4 xl:grid-cols-2">
        {viewShows(view, 'live') && <LiveTripsPanel model={model} />}
        {viewShows(view, 'yard') && <YardSnapshotPanel model={model} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {viewShows(view, 'checks') && <ChecksSnapshotPanel model={model} />}
        {viewShows(view, 'defects') && <DefectsVorPanel model={model} />}
        {viewShows(view, 'sync') && <SyncHealthPanel model={model} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {viewShows(view, 'handover') && <HandoverExceptionsPanel model={model} />}
        {viewShows(view, 'actions') && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'critical', 'urgent', 'warning'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverityFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    severityFilter === s
                      ? 'bg-command-600 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <ActionQueuePanel model={model} severityFilter={severityFilter} />
          </div>
        )}
      </div>

      {viewShows(view, 'quick') && <QuickActionsPanel />}
    </div>
  )
}
