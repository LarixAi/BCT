import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { normalizeAdBlueRecords } from '@/lib/adblue/normalize'
import {
  TIMELINE_FILTERS,
  buildVehicleTimeline,
  type VehicleTimelineCategory,
  type VehicleTimelineEvent,
} from '@/lib/vehicles/vehicle-timeline'
import type { VehicleProfile } from '@/lib/vehicles/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function VehicleTimelineTab({ vehicle }: { vehicle: VehicleProfile }) {
  const [filter, setFilter] = useState<VehicleTimelineCategory>('all')
  const { data: adblueRaw = [] } = useQuery({
    queryKey: tKey(['vehicle-adblue', vehicle.id]),
    queryFn: () => api.getVehicleAdBlueRecords(vehicle.id),
  })
  const { data: reports = [] } = useQuery({
    queryKey: tKey(['vehicle-reports', vehicle.id]),
    queryFn: () => api.getVehicleReports({ vehicleId: vehicle.id }),
  })

  const events = useMemo(() => {
    const base = buildVehicleTimeline(vehicle)
    const extra: VehicleTimelineEvent[] = []
    for (const row of normalizeAdBlueRecords(adblueRaw)) {
      const litres =
        row.amountLitres != null && Number.isFinite(row.amountLitres) ? `${row.amountLitres} L` : 'amount not set'
      extra.push({
        id: `adblue-${row.id}`,
        occurredAt: row.occurredAt,
        category: 'adblue',
        title: `AdBlue top-up — ${litres}`,
        detail: `${row.sourceType.replace(/_/g, ' ')}${row.cost != null ? ` · £${row.cost}` : ''}`,
        actorName: row.recordedByName,
        source: row.recordedByRole,
        href: `/vehicles/${vehicle.id}?tab=adblue`,
      })
    }
    for (const report of Array.isArray(reports) ? reports : []) {
      extra.push({
        id: `vrep-${report.id}`,
        occurredAt: report.reportedAt,
        category: 'report',
        title: `${report.reference} — ${report.title}`,
        detail: `${report.reportType} · ${report.stage.replace(/_/g, ' ')}`,
        actorName: report.reportedBy,
        source: report.reportedByRole,
        href: `/vehicle-reports/${report.id}`,
      })
    }
    return [...base, ...extra].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
  }, [vehicle, adblueRaw, reports])

  const filtered = filter === 'all' ? events : events.filter((e) => e.category === filter)

  return (
    <div className="space-y-4">
      <SectionCard
        title="Service history timeline"
        description="One chronological feed — Driver, Yard, Maintenance and Command"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {TIMELINE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === f.id
                  ? 'bg-command-600 text-white'
                  : 'border border-border bg-surface text-ink-soft hover:bg-surface-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No events match this filter.</p>
        ) : (
          <ol className="relative space-y-0 border-l border-border pl-4">
            {filtered.map((event) => (
              <li key={event.id} className="relative pb-4 last:pb-0">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-white bg-command-500" />
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">
                        {new Date(event.occurredAt).toLocaleString('en-GB')} · {event.category}
                      </p>
                      <p className="font-medium text-ink">{event.title}</p>
                      {event.detail && <p className="text-sm text-ink-soft">{event.detail}</p>}
                      <p className="mt-1 text-xs text-muted">
                        {[event.actorName, event.source].filter(Boolean).join(' · ') || 'System'}
                      </p>
                    </div>
                    {event.href && (
                      <Link to={event.href} className="text-xs font-medium text-command-700 hover:underline">
                        Open →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  )
}
