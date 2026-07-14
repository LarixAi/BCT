import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { LiveVehicleMap } from '@/components/map/LiveVehicleMap'
import { KpiCardView, SectionCard, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api/client'
import {
  buildHealthSummary,
  buildOverviewKpis,
  countUnassignedFromAlerts,
  deriveOperationalHealth,
  mapAlertToException,
  mapCommandHref,
} from '@/lib/api/mappers'
import { useOperationalContext } from '@/lib/context'
import type { KpiCard } from '@/lib/types'

const QUICK_ACTIONS = [
  { label: 'Open dispatch', href: '/dispatch' },
  { label: 'Open live operations', href: '/live-operations' },
  { label: 'View exceptions', href: '/exceptions' },
  { label: 'Report incident', href: '/incidents?report=1' },
  { label: 'Open defects', href: '/defects' },
]

export function OverviewPage() {
  const { userName, operationalDate } = useOperationalContext()
  const greeting = getGreeting()

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return <LoadingState />
  }

  if (isError || !data) {
    return (
      <ErrorState message={error instanceof Error ? error.message : 'Could not load dashboard'} />
    )
  }

  const unassigned = countUnassignedFromAlerts(data.alerts)
  const health = deriveOperationalHealth(data.alerts)
  const kpis = buildOverviewKpis(data, unassigned)
  const priorityExceptions = data.alerts.slice(0, 8).map(mapAlertToException)
  const criticalCount = data.alerts.filter((a) => a.severity === 'danger').length

  return (
    <div className="space-y-6">
      <PageHeader
        greeting={`${greeting}, ${userName}`}
        subtitle={`Here is the operational position for ${operationalDate}.`}
        criticalCount={criticalCount}
      />

      <SectionCard title="Operational health" description="Live data from your veymo operations platform">
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge kind="health" value={health} />
          <div className="text-sm text-slate-600">{buildHealthSummary(data, unassigned)}</div>
        </div>
      </SectionCard>

      <KpiSection title="Operations (duties)" cards={kpis.operations} />
      <KpiSection title="Drivers" cards={kpis.drivers} />
      <KpiSection title="Vehicles" cards={kpis.vehicles} />
      <KpiSection title="Safety & compliance" cards={kpis.safety} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Today's timeline" description="Scheduled duties from the API">
          {data.timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No duties scheduled for today.</p>
          ) : (
            <ul className="space-y-2">
              {data.timeline.map((item) => (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 tabular-nums text-slate-500">{item.time ?? '—'}</span>
                  <Link
                    to={mapCommandHref(item.href)}
                    className="flex-1 font-medium text-slate-800 hover:text-command-600"
                  >
                    {item.title}
                  </Link>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Live operations preview"
          description="Active duties with GPS tracking"
          action={
            <Link to="/live-operations" className="text-xs font-medium text-command-600 hover:underline">
              Open Live Operations →
            </Link>
          }
        >
          <LivePreview />
        </SectionCard>
      </div>

      <SectionCard
        title="Priority exceptions"
        description="From dashboard alerts — full queue on Exceptions"
        action={
          <Link to="/exceptions" className="text-xs font-medium text-command-600 hover:underline">
            View all exceptions →
          </Link>
        }
      >
        {priorityExceptions.length === 0 ? (
          <p className="text-sm text-slate-500">No active alerts right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Severity</th>
                  <th className="pb-2 pr-4 font-medium">Issue</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {priorityExceptions.map((ex) => (
                  <tr key={ex.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4">
                      <StatusBadge kind="severity" value={ex.severity} />
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{ex.title}</td>
                    <td className="py-2.5 pr-4 capitalize text-slate-600">{ex.category}</td>
                    <td className="py-2.5">
                      <Link to={ex.relatedHref} className="text-command-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Quick actions" description="Operational shortcuts">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-command-500 hover:bg-command-50"
            >
              {action.label}
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function LivePreview() {
  const { operationalDateIso } = useOperationalContext()
  const { data } = useQuery({
    queryKey: ['live-dispatch-preview', operationalDateIso],
    queryFn: () => api.getLiveDispatch(operationalDateIso, 'active'),
    refetchInterval: 30_000,
  })

  const vehicles = data?.vehicles ?? []

  return (
    <div>
      <LiveVehicleMap
        vehicles={vehicles}
        className="h-48"
        edgeToEdge
        resultsLabel={
          data?.trackingEnabled
            ? `${vehicles.length} active · ${vehicles.filter((v) => v.isStale).length} stale GPS`
            : 'Tracking disabled'
        }
      />
      <p className="mt-3 text-xs text-slate-500">
        {data?.trackingEnabled
          ? `${vehicles.filter((v) => v.lastLatitude != null).length} duties reporting GPS`
          : 'Enable GPS tracking in company settings to see live positions'}
      </p>
    </div>
  )
}

function PageHeader({
  greeting,
  subtitle,
  criticalCount,
}: {
  greeting: string
  subtitle: string
  criticalCount: number
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{greeting}</h1>
        <p className="mt-1 text-slate-600">{subtitle}</p>
      </div>
      {criticalCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {criticalCount} critical {criticalCount === 1 ? 'alert' : 'alerts'} require attention
          </span>
        </div>
      )}
    </div>
  )
}

function KpiSection({ title, cards }: { title: string; cards: KpiCard[] }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCardView key={card.id} {...card} href={card.href} />
        ))}
      </div>
    </section>
  )
}


function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <p className="font-medium text-red-900">Could not load operational data</p>
      <p className="mt-1 text-sm text-red-800">{message}</p>
      <p className="mt-3 text-sm text-red-700">
        Ensure the veymo API is running at {import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}
      </p>
    </div>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
