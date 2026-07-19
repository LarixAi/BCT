import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, MessageSquare, Phone } from 'lucide-react'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { buildLiveDrawer } from '@/lib/live/build-live-operations'
import type { LiveExceptionCard, LiveRunRow } from '@/lib/live/live-operations'

type DrawerTab = 'overview' | 'timeline' | 'exceptions' | 'actions'

export function RunDetailDrawer({
  run,
  vehicle,
  exceptions,
}: {
  run: LiveRunRow | null
  vehicle: LiveDispatchVehicle | null
  exceptions: LiveExceptionCard[]
}) {
  const [tab, setTab] = useState<DrawerTab>('overview')

  if (!run) {
    return (
      <SectionCard title="Run detail">
        <p className="text-sm text-slate-500">Select a run to open the live workspace drawer.</p>
      </SectionCard>
    )
  }

  const drawer = buildLiveDrawer(run, vehicle, exceptions)
  const messageHref = `/messages?compose=1&to=${encodeURIComponent(run.driverName)}&run=${encodeURIComponent(run.runReference)}`
  const yardHref = `/yard?message=1&vehicle=${encodeURIComponent(run.vehicleRegistration)}`
  const exceptionHref = `/exceptions?create=1&run=${encodeURIComponent(run.runReference)}`

  return (
    <SectionCard
      title={run.runReference}
      description={`${run.healthLabel} · ${run.driverName} · ${run.vehicleRegistration}`}
      className="min-h-0 overflow-hidden"
      flush
    >
      <div className="flex gap-1 border-b border-slate-200 bg-slate-50 p-2">
        {(['overview', 'timeline', 'exceptions', 'actions'] as DrawerTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto p-4 text-sm">
        {tab === 'overview' && (
          <>
            <Row label="Stage" value={run.stageLabel} />
            <Row label="Progress" value={run.progressLabel} />
            <Row label="Next stop" value={run.nextStop ?? '—'} />
            <Row label="Delay" value={run.delayMinutes > 0 ? `${run.delayMinutes} min` : 'None'} />
            <Row label="Last update" value={run.lastUpdateLabel} />
            <Row label="Location source" value={drawer.locationSource} />
            <Row label="Accuracy" value={drawer.locationAccuracyLabel} />
            <Row label="Driver state" value={drawer.driverState.replace(/_/g, ' ')} />
            <Row label="Vehicle state" value={drawer.vehicleState.replace(/_/g, ' ')} />
            {run.isStale && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {run.latitude == null || run.longitude == null
                  ? 'No live GPS yet. Keep the Driver app open while signed on so position can report.'
                  : `Location may be outdated. Last confirmed ${run.lastUpdateLabel}. Silence does not mean no activity.`}
              </p>
            )}
            {run.isMoving && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Driver appears to be in motion. Use urgent contact only when necessary.
              </p>
            )}
            {run.passengerOnboard && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Passenger onboard — safety-controlled actions required before cancel or transfer.
              </p>
            )}
          </>
        )}

        {tab === 'timeline' && (
          <ul className="space-y-2">
            {drawer.timeline.map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-2">
                <p className="text-[11px] text-slate-500">{item.timeLabel}</p>
                <p className="font-medium text-slate-900">{item.description}</p>
                <p className="text-xs text-slate-500">{item.actor}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'exceptions' && (
          <ul className="space-y-2">
            {drawer.openExceptions.length === 0 && (
              <li className="text-slate-500">No open exceptions for this run.</li>
            )}
            {drawer.openExceptions.map((e) => (
              <li key={e.id} className="rounded-lg border border-slate-200 p-2">
                <p className="text-[10px] uppercase text-slate-500">{e.severity}</p>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-slate-600">{e.recommendedAction}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'actions' && (
          <div className="flex flex-col gap-2">
            <ManageAssignmentButton
              dutyId={run.id}
              duty={{
                id: run.id,
                reference: run.runReference,
                dutyDate: new Date().toISOString().slice(0, 10),
                startTime: null,
                status: run.stage,
                route: { id: run.id, name: run.serviceType },
                driver: run.driverId
                  ? {
                      id: run.driverId,
                      firstName: run.driverName.split(' ')[0] ?? run.driverName,
                      lastName: run.driverName.split(' ').slice(1).join(' '),
                    }
                  : null,
                vehicle: run.vehicleRegistration
                  ? { id: `veh-${run.id}`, registrationNumber: run.vehicleRegistration }
                  : null,
              }}
              className="w-full rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white hover:bg-command-700"
            />
            <p className="text-[11px] text-slate-500">
              Manage assignment covers vehicle swap and trip transfer with the same eligibility checks as Dispatch.
            </p>
            <Link
              to={messageHref}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <MessageSquare className="h-4 w-4" />
              Message driver
            </Link>
            <Link
              to={yardHref}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <MessageSquare className="h-4 w-4" />
              Message Yard
            </Link>
            <span
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
                run.isMoving
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-slate-200 text-slate-700',
              )}
            >
              <Phone className="h-4 w-4" />
              {run.isMoving ? 'Urgent call only — driver in motion' : 'Call via duty contact record'}
            </span>
            <Link
              to={exceptionHref}
              className="flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              <AlertCircle className="h-4 w-4" />
              Create exception
            </Link>
            <Link to={`/runs/${run.id}`} className="text-center text-xs font-medium text-command-700 hover:underline">
              Open full run record
            </Link>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}
