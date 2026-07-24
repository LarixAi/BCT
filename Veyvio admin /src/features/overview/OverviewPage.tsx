import { useEffect, useState } from 'react'
import type { OpsActionSeverity } from '@/lib/ops/canonical-states'
import type { OpsSavedView } from '@/lib/ops/ops-dashboard'
import { useOperationalContext } from '@/lib/context'
import { useAuth } from '@/lib/auth-context'
import { ControlCentreDashboard } from './ControlCentreDashboard'
import { useOpsDashboard } from './useOpsDashboard'

export function OverviewPage() {
  const { user } = useAuth()
  const { depotId, operationalDate, setConnectionStatus } = useOperationalContext()
  const { model, isLoading, isError, error, connectionStatus } = useOpsDashboard(depotId)
  const [view, setView] = useState<OpsSavedView>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | OpsActionSeverity>('all')

  useEffect(() => {
    setConnectionStatus(connectionStatus)
  }, [connectionStatus, setConnectionStatus])

  if (isLoading) {
    return <p className="text-sm text-muted">Loading operational position…</p>
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
    <ControlCentreDashboard
      model={model}
      view={view}
      onViewChange={setView}
      userFirstName={user?.firstName ?? 'there'}
      operationalDate={operationalDate}
      headline={headline}
      severityFilter={severityFilter}
      onSeverityFilterChange={setSeverityFilter}
    />
  )
}
