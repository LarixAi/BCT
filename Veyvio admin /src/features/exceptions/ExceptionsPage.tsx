import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api/client'
import {
  mapAlertToException,
  mapDefectToException,
  mapIncidentToException,
} from '@/lib/api/mappers'
import { EXCEPTION_VIEWS } from '@/lib/mock-data'
import type { OperationalException } from '@/lib/types'

export function ExceptionsPage() {
  const [view, setView] = useState('critical')
  const [selected, setSelected] = useState<OperationalException | null>(null)

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  })

  const { data: defects = [], isLoading: defectsLoading } = useQuery({
    queryKey: ['defects', 'open'],
    queryFn: () => api.getDefects({ status: 'open' }),
  })

  const { data: incidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['incidents', 'open'],
    queryFn: () => api.getIncidents({ status: 'open' }),
  })

  const { data: driverEligibilityExceptions = [], isLoading: driverExceptionsLoading } = useQuery({
    queryKey: ['driver-eligibility-exceptions'],
    queryFn: () => api.getDriverEligibilityExceptions(),
  })

  const { data: vehicleReleaseExceptions = [], isLoading: vehicleExceptionsLoading } = useQuery({
    queryKey: ['vehicle-release-exceptions'],
    queryFn: () => api.getVehicleReleaseExceptions(),
  })

  const allExceptions = useMemo(() => {
    const fromAlerts = (dashboard?.alerts ?? []).map(mapAlertToException)
    const fromDefects = defects.map(mapDefectToException)
    const fromIncidents = incidents.map(mapIncidentToException)

    const combined = [...fromAlerts, ...fromDefects, ...fromIncidents, ...driverEligibilityExceptions, ...vehicleReleaseExceptions]
    const severityRank = { critical: 0, high: 1, medium: 2, low: 3 }
    return combined.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
  }, [dashboard, defects, incidents, driverEligibilityExceptions, vehicleReleaseExceptions])

  const filtered = useMemo(() => {
    switch (view) {
      case 'critical':
        return allExceptions.filter((e) => e.severity === 'critical' || e.severity === 'high')
      case 'unassigned':
        return allExceptions.filter((e) => !e.owner)
      case 'sla':
        return allExceptions.filter(
          (e) => e.slaMinutesRemaining !== null && e.slaMinutesRemaining <= 5,
        )
      case 'resolved':
        return allExceptions.filter((e) => e.status === 'resolved')
      default:
        return allExceptions
    }
  }, [allExceptions, view])

  const isLoading = dashboardLoading || defectsLoading || incidentsLoading || driverExceptionsLoading || vehicleExceptionsLoading

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Exceptions</h1>
        <p className="text-sm text-slate-600">
          Aggregated from dashboard alerts, open defects and incidents
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXCEPTION_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              view === v.id
                ? 'bg-command-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="text-sm text-slate-500">Loading exceptions…</p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="Exception queue" description={`${filtered.length} exceptions in this view`}>
          {filtered.length === 0 && !isLoading ? (
            <p className="text-sm text-slate-500">No exceptions in this view.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3 font-medium">Severity</th>
                    <th className="pb-2 pr-3 font-medium">Exception</th>
                    <th className="pb-2 pr-3 font-medium">Category</th>
                    <th className="pb-2 pr-3 font-medium">Related</th>
                    <th className="pb-2 pr-3 font-medium">Age</th>
                    <th className="pb-2 pr-3 font-medium">SLA</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ex) => (
                    <tr
                      key={ex.id}
                      onClick={() => setSelected(ex)}
                      className={cn(
                        'cursor-pointer border-b border-slate-50 transition hover:bg-slate-50',
                        selected?.id === ex.id && 'bg-command-50',
                      )}
                    >
                      <td className="py-2.5 pr-3">
                        <StatusBadge kind="severity" value={ex.severity} />
                      </td>
                      <td className="py-2.5 pr-3 font-medium text-slate-900">{ex.title}</td>
                      <td className="py-2.5 pr-3 capitalize text-slate-600">{ex.category}</td>
                      <td className="py-2.5 pr-3 text-command-600">{ex.relatedRecord}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-slate-600">{ex.ageMinutes}m</td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {ex.slaMinutesRemaining === null ? (
                          '—'
                        ) : ex.slaMinutesRemaining < 0 ? (
                          <span className="font-medium text-red-600">Overdue</span>
                        ) : (
                          <span className="text-amber-700">{ex.slaMinutesRemaining}m</span>
                        )}
                      </td>
                      <td className="py-2.5 capitalize text-slate-600">{ex.status.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <ExceptionDetail exception={selected} />
      </div>
    </div>
  )
}

function ExceptionDetail({ exception }: { exception: OperationalException | null }) {
  if (!exception) {
    return (
      <SectionCard title="Exception detail">
        <p className="text-sm text-slate-500">Select an exception to view details.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Exception detail" className="sticky top-4">
      <div className="space-y-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{exception.title}</h3>
          <StatusBadge kind="severity" value={exception.severity} />
        </div>

        <dl className="space-y-2">
          <DetailItem label="ID" value={exception.id} />
          <DetailItem label="Status" value={exception.status.replace(/_/g, ' ')} />
          <DetailItem label="Category" value={exception.category} />
          <DetailItem label="Related" value={exception.relatedRecord} />
          {exception.ageMinutes > 0 && (
            <DetailItem label="Age" value={`${exception.ageMinutes} minutes`} />
          )}
        </dl>

        {exception.recommendedAction && (
          <div className="rounded-lg bg-command-50 px-3 py-2 text-xs text-command-900">
            <p className="font-semibold">Recommended action</p>
            <p className="mt-1">{exception.recommendedAction}</p>
          </div>
        )}

        <a
          href={exception.relatedHref}
          className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-command-600 hover:bg-command-50"
        >
          Open related record →
        </a>
      </div>
    </SectionCard>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium capitalize text-slate-900">{value}</dd>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
