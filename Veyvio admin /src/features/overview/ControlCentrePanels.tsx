import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { OpsDashboardModel, OpsSavedView } from '@/lib/ops/ops-dashboard'
import type { OpsActionSeverity } from '@/lib/ops/canonical-states'

const SAVED_VIEWS: { id: OpsSavedView; label: string }[] = [
  { id: 'all', label: 'All operations' },
  { id: 'morning_release', label: 'Morning release' },
  { id: 'live_service', label: 'Live service' },
  { id: 'yard_control', label: 'Yard control' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'end_of_day', label: 'End of day' },
]

export function viewShows(
  view: OpsSavedView,
  section:
    | 'top'
    | 'pipeline'
    | 'live'
    | 'yard'
    | 'checks'
    | 'defects'
    | 'handover'
    | 'sync'
    | 'actions'
    | 'quick',
): boolean {
  if (view === 'all') return true
  const map: Record<OpsSavedView, Set<string>> = {
    all: new Set(),
    morning_release: new Set(['top', 'pipeline', 'checks', 'yard', 'actions', 'quick']),
    live_service: new Set(['top', 'live', 'actions', 'sync', 'quick']),
    yard_control: new Set(['top', 'yard', 'handover', 'checks', 'actions', 'quick']),
    compliance: new Set(['top', 'defects', 'checks', 'actions', 'quick']),
    end_of_day: new Set(['top', 'handover', 'yard', 'sync', 'actions', 'quick']),
  }
  return map[view].has(section)
}

export function SavedViewChips({
  view,
  onChange,
}: {
  view: OpsSavedView
  onChange: (v: OpsSavedView) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SAVED_VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onChange(v.id)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            view === v.id ? 'bg-command-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

function StatLine({ label, value, tone }: { label: string; value: number | string; tone?: 'danger' | 'warning' | 'ok' }) {
  const toneClass =
    tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : tone === 'ok' ? 'text-emerald-700' : 'text-slate-900'
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  )
}

export function TopLineCards({ model }: { model: OpsDashboardModel }) {
  const cards = [
    {
      title: 'Drivers ready',
      value: model.drivers.signedOn,
      sub: model.topLine.driversReadyLabel,
      href: '/drivers',
      tone: model.drivers.blocked > 0 ? 'warning' : 'ok',
    },
    {
      title: 'Vehicles ready',
      value: model.vehicles.ready,
      sub: model.topLine.vehiclesReadyLabel,
      href: '/vehicles',
      tone: model.vehicles.vor > 0 ? 'danger' : 'ok',
    },
    {
      title: 'Runs ready',
      value: model.topLine.runsReady,
      sub: `${model.topLine.runsBlocked} blocked`,
      href: '/dispatch',
      tone: model.topLine.runsBlocked > 0 ? 'warning' : 'ok',
    },
    {
      title: 'Active trips',
      value: model.topLine.activeTrips,
      sub: 'Live from Driver app',
      href: '/live-operations',
      tone: 'ok' as const,
    },
    {
      title: 'Critical exceptions',
      value: model.topLine.criticalExceptions,
      sub: 'Needs admin action now',
      href: '/exceptions',
      tone: model.topLine.criticalExceptions > 0 ? 'danger' : 'ok',
    },
  ] as const

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((c) => (
        <Link
          key={c.title}
          to={c.href}
          className={`rounded-xl border bg-white p-4 transition hover:border-command-400 ${
            c.tone === 'danger'
              ? 'border-red-200'
              : c.tone === 'warning'
                ? 'border-amber-200'
                : 'border-slate-200'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.title}</p>
          <p
            className={`mt-1 text-3xl font-bold tabular-nums ${
              c.tone === 'danger' ? 'text-red-800' : c.tone === 'warning' ? 'text-amber-800' : 'text-slate-900'
            }`}
          >
            {c.value}
          </p>
          <p className="mt-1 text-xs text-slate-600">{c.sub}</p>
        </Link>
      ))}
    </div>
  )
}

export function DriverReadinessPanel({ model }: { model: OpsDashboardModel }) {
  const d = model.drivers
  return (
    <SectionCard
      title="Drivers"
      description="Today’s duty and eligibility position"
      action={
        <Link to="/drivers" className="text-xs font-medium text-command-700 hover:underline">
          Open drivers
        </Link>
      }
    >
      <div className="space-y-2">
        <StatLine label="Scheduled today" value={d.scheduled} />
        <StatLine label="Signed on" value={d.signedOn} tone="ok" />
        <StatLine label="Not signed on" value={d.notSignedOn} tone={d.notSignedOn > 0 ? 'warning' : undefined} />
        <StatLine label="Eligible" value={d.eligible} />
        <StatLine label="Blocked" value={d.blocked} tone={d.blocked > 0 ? 'danger' : undefined} />
        {d.currentlyDriving != null && <StatLine label="Currently driving" value={d.currentlyDriving} />}
        {d.withoutAssignments != null && d.withoutAssignments > 0 && (
          <StatLine label="Without assignments" value={d.withoutAssignments} tone="warning" />
        )}
      </div>
      {d.blockedReasons.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked reasons</p>
          <ul className="space-y-1.5">
            {d.blockedReasons.map((r) => (
              <li key={r.reason}>
                <Link to={r.href} className="flex justify-between gap-2 text-sm text-red-800 hover:underline">
                  <span>{r.reason}</span>
                  <span className="tabular-nums font-semibold">{r.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}

export function VehicleReadinessPanel({ model }: { model: OpsDashboardModel }) {
  const v = model.vehicles
  return (
    <SectionCard
      title="Vehicles"
      description="Yard ready · driver checked · operationally released"
      action={
        <Link to="/vehicles" className="text-xs font-medium text-command-700 hover:underline">
          Open vehicles
        </Link>
      }
    >
      <div className="space-y-2">
        <StatLine label="Required today" value={v.required} />
        <StatLine label="Ready" value={v.ready} tone="ok" />
        <StatLine label="Preparing" value={v.preparing} tone={v.preparing > 0 ? 'warning' : undefined} />
        <StatLine label="Awaiting check" value={v.awaitingCheck} tone={v.awaitingCheck > 0 ? 'warning' : undefined} />
        <StatLine label="In service" value={v.inService} />
        <StatLine label="Unavailable / VOR" value={v.unavailable} tone={v.vor > 0 ? 'danger' : undefined} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums text-slate-900">{v.stages.yardReady}</p>
          <p className="text-[11px] text-slate-500">Yard ready</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-slate-900">{v.stages.driverChecked}</p>
          <p className="text-[11px] text-slate-500">Driver checked</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-slate-900">{v.stages.operationallyReleased}</p>
          <p className="text-[11px] text-slate-500">Released</p>
        </div>
      </div>
    </SectionCard>
  )
}

export function ReadinessPipelinePanel({ model }: { model: OpsDashboardModel }) {
  return (
    <SectionCard
      title="Readiness pipeline"
      description="Where each run sits in start-of-duty — blockers shown in plain language"
      action={
        <Link to="/dispatch" className="text-xs font-medium text-command-700 hover:underline">
          View all
        </Link>
      }
      flush
    >
      {model.pipeline.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">No runs scheduled for today.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Run</th>
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Yard</th>
                <th className="px-4 py-2 font-medium">Driver check</th>
                <th className="px-4 py-2 font-medium">Release</th>
              </tr>
            </thead>
            <tbody>
              {model.pipeline.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-2.5">
                    <Link to={row.href} className="font-medium text-command-700 hover:underline">
                      {row.runReference}
                    </Link>
                    {row.blocker && (
                      <p className="mt-1 max-w-xs text-xs text-red-700">{row.blocker}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{row.driverName}</td>
                  <td className="px-4 py-2.5 font-medium tabular-nums text-slate-900">{row.vehicleRegistration}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.yardLabel}</td>
                  <td className="px-4 py-2.5 text-slate-700">{row.driverCheckLabel}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        row.releaseLabel === 'Blocked'
                          ? 'font-medium text-red-700'
                          : row.releaseLabel === 'Released'
                            ? 'font-medium text-emerald-700'
                            : 'text-slate-700'
                      }
                    >
                      {row.releaseLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}

export function LiveTripsPanel({ model }: { model: OpsDashboardModel }) {
  return (
    <SectionCard
      title="Live trips"
      description="What Driver app users are doing now"
      action={
        <Link to="/live-operations" className="text-xs font-medium text-command-700 hover:underline">
          Live operations
        </Link>
      }
    >
      {model.liveTrips.length === 0 ? (
        <p className="text-sm text-slate-500">No active live trips right now.</p>
      ) : (
        <ul className="space-y-3">
          {model.liveTrips.map((t) => (
            <li key={t.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to={t.href} className="font-semibold text-slate-900 hover:text-command-700">
                    {t.tripReference}
                  </Link>
                  <p className="text-xs text-slate-500">{t.runReference}</p>
                </div>
                <span className={`text-xs font-medium ${t.hasException ? 'text-amber-700' : 'text-slate-500'}`}>
                  {t.lastUpdateLabel}
                  {t.isStale ? ' · stale' : ''}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                Driver: {t.driverName} · Vehicle: <span className="font-medium tabular-nums">{t.vehicleRegistration}</span>
              </p>
              <p className="text-sm text-slate-600">Status: {t.stage}</p>
              {t.delayMinutes > 0 && (
                <p className="text-sm text-amber-800">Delay signal: {t.delayMinutes} min (stale tracking)</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export function YardSnapshotPanel({ model }: { model: OpsDashboardModel }) {
  const y = model.yard
  return (
    <SectionCard
      title="Yard operations"
      description="Physical fleet position and preparation"
      action={
        <Link to="/yard" className="text-xs font-medium text-command-700 hover:underline">
          Open yard
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <StatLine label="In yard" value={y.onSite} />
          <StatLine label="Outside yard" value={y.offSite} />
          <StatLine label="Not located" value={y.locationUnknown} tone={y.locationUnknown > 0 ? 'danger' : undefined} />
          <StatLine label="Preparing" value={y.preparing} />
          <StatLine label="Ready for collection" value={y.readyForCollection} tone="ok" />
        </div>
        <div className="space-y-2">
          <StatLine label="Awaiting cleaning" value={y.awaitingCleaning} />
          <StatLine label="Awaiting fuel / charge" value={y.awaitingFuel + y.awaitingCharge} />
          <StatLine label="Awaiting equipment" value={y.awaitingEquipment} />
          <StatLine label="In inspection" value={y.inInspection} />
          <StatLine label="In maintenance" value={y.inMaintenance} />
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yard tasks</p>
        <p className="mt-1 text-sm text-slate-800">
          <span className="font-bold tabular-nums">{y.openTasks}</span> open ·{' '}
          <span className={`font-bold tabular-nums ${y.overdueTasks > 0 ? 'text-amber-800' : ''}`}>{y.overdueTasks}</span> overdue ·{' '}
          <span className={`font-bold tabular-nums ${y.safetyCriticalTasks > 0 ? 'text-red-800' : ''}`}>
            {y.safetyCriticalTasks}
          </span>{' '}
          safety critical
        </p>
      </div>
    </SectionCard>
  )
}

export function ChecksSnapshotPanel({ model }: { model: OpsDashboardModel }) {
  const c = model.checks
  return (
    <SectionCard
      title="Vehicle checks"
      description="Completion and quality, not only counts"
      action={
        <Link to="/vehicle-checks" className="text-xs font-medium text-command-700 hover:underline">
          Open checks
        </Link>
      }
    >
      <div className="space-y-2">
        <StatLine label="Required" value={c.required} />
        <StatLine label="Passed" value={c.passed} tone="ok" />
        <StatLine label="Failed" value={c.failed} tone={c.failed > 0 ? 'danger' : undefined} />
        <StatLine label="Incomplete" value={c.incomplete} tone={c.incomplete > 0 ? 'warning' : undefined} />
        <StatLine label="Not synced" value={c.notSynced} tone={c.notSynced > 0 ? 'warning' : undefined} />
      </div>
      {c.failedRows.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {c.failedRows.map((r) => (
            <li key={r.id}>
              <Link to={r.href} className="block rounded-lg border border-red-100 bg-red-50/50 p-2 text-sm hover:border-red-300">
                <span className="font-medium tabular-nums text-slate-900">{r.registration}</span>
                <span className="text-slate-600"> · {r.failure}</span>
                {r.runReference && <span className="block text-xs text-slate-500">Run {r.runReference}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export function DefectsVorPanel({ model }: { model: OpsDashboardModel }) {
  const d = model.defectsVor
  return (
    <SectionCard
      title="Defects and VOR"
      description="Driver and Yard reports in one place"
      action={
        <div className="flex gap-3">
          <Link to="/defects" className="text-xs font-medium text-command-700 hover:underline">
            Defects
          </Link>
          <Link to="/vehicles?filter=vor" className="text-xs font-medium text-command-700 hover:underline">
            VOR board
          </Link>
        </div>
      }
    >
      <div className="space-y-2">
        <StatLine label="New defects today" value={d.newToday} />
        <StatLine label="Critical" value={d.critical} tone={d.critical > 0 ? 'danger' : undefined} />
        <StatLine label="Awaiting assessment" value={d.awaitingAssessment} tone={d.awaitingAssessment > 0 ? 'warning' : undefined} />
        <StatLine label="Affecting active runs" value={d.affectingActiveRuns} tone={d.affectingActiveRuns > 0 ? 'danger' : undefined} />
        <StatLine label="Vehicles VOR" value={d.vorVehicles} tone={d.vorVehicles > 0 ? 'danger' : undefined} />
        <StatLine label="Awaiting repair" value={d.awaitingRepair} />
        <StatLine label="Awaiting verification" value={d.awaitingVerification} />
      </div>
    </SectionCard>
  )
}

export function HandoverExceptionsPanel({ model }: { model: OpsDashboardModel }) {
  return (
    <SectionCard
      title="Vehicle handover exceptions"
      description="Discrepancies between Driver and Yard custody"
      action={
        <Link to="/yard?tab=handover" className="text-xs font-medium text-command-700 hover:underline">
          Yard handover
        </Link>
      }
    >
      {model.handoverExceptions.length === 0 ? (
        <p className="text-sm text-slate-500">No open handover discrepancies.</p>
      ) : (
        <ul className="space-y-3">
          {model.handoverExceptions.map((h) => (
            <li key={h.id} className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <Link to={h.href} className="font-medium text-slate-900 hover:text-command-700">
                {h.title}
              </Link>
              {h.registration && (
                <p className="text-xs font-medium tabular-nums text-slate-600">{h.registration}</p>
              )}
              <p className="mt-1 text-sm text-slate-700">{h.detail}</p>
              <p className="mt-1 text-xs text-amber-900">Next: {h.recommendedAction}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export function SyncHealthPanel({ model }: { model: OpsDashboardModel }) {
  const s = model.syncHealth
  return (
    <SectionCard title="App sync health" description="Silence is not confirmation that everything is normal">
      <div className="space-y-2">
        <StatLine label="Drivers online (proxy)" value={s.driversOnlineProxy} />
        <StatLine label="Drivers not recently synced" value={s.driversStale} tone={s.driversStale > 0 ? 'warning' : undefined} />
        <StatLine label="Checks pending sync" value={s.checksPendingSync} tone={s.checksPendingSync > 0 ? 'warning' : undefined} />
        <StatLine label="Yard tasks pending sync" value={s.yardTasksPendingSync} tone={s.yardTasksPendingSync > 0 ? 'warning' : undefined} />
        <StatLine label="Live vehicles stale" value={s.liveVehiclesStale} tone={s.liveVehiclesStale > 0 ? 'danger' : undefined} />
      </div>
      {s.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-600">
          {s.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Connection: <span className="font-medium capitalize text-slate-800">{s.connectionStatus}</span>
      </p>
    </SectionCard>
  )
}

const SEVERITY_STYLES: Record<OpsActionSeverity, string> = {
  critical: 'border-red-300 bg-red-50',
  urgent: 'border-amber-300 bg-amber-50',
  warning: 'border-slate-200 bg-white',
}

export function ActionQueuePanel({
  model,
  severityFilter,
}: {
  model: OpsDashboardModel
  severityFilter: 'all' | OpsActionSeverity
}) {
  const items =
    severityFilter === 'all'
      ? model.actionQueue
      : model.actionQueue.filter((a) => a.severity === severityFilter)

  return (
    <SectionCard
      title="Alerts and exceptions"
      description="One prioritised queue — critical first"
      action={
        <Link to="/exceptions" className="text-xs font-medium text-command-700 hover:underline">
          Full exceptions
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No open exceptions for this filter.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className={`rounded-lg border p-3 ${SEVERITY_STYLES[a.severity]}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{a.severity}</p>
                  <Link to={a.href} className="font-medium text-slate-900 hover:text-command-700">
                    {a.title}
                  </Link>
                </div>
                <span className="text-[10px] uppercase text-slate-500">{a.source}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{a.detail}</p>
              <p className="mt-1 text-xs text-slate-600">Next: {a.recommendedAction}</p>
              {a.owner && <p className="text-xs text-slate-500">Owner: {a.owner}</p>}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

const QUICK_ACTIONS = [
  { label: 'Assign driver', href: '/dispatch' },
  { label: 'Assign vehicle', href: '/dispatch' },
  { label: 'Create yard task', href: '/yard?tab=tasks' },
  { label: 'Review failed check', href: '/vehicle-checks?tab=action' },
  { label: 'Assess defect', href: '/defects?tab=awaiting_triage' },
  { label: 'VOR board', href: '/vehicles?filter=vor' },
  { label: 'Message drivers', href: '/messages' },
  { label: 'Open live trip', href: '/live-operations' },
]

export function QuickActionsPanel() {
  return (
    <SectionCard title="Quick actions" description="Same validations as the full module pages">
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.href}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-command-400 hover:text-command-800"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </SectionCard>
  )
}
