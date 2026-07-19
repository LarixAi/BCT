import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { DEPOT_STATUS_LABELS } from '@/lib/depots/constants'
import type { DepotOpsSnapshot, DepotProfile } from '@/lib/depots/types'
import { useOperationalContext } from '@/lib/context'

export function DepotsPage() {
  const { operationalDateIso } = useOperationalContext()
  const [search, setSearch] = useState('')

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['depot-profiles'],
    queryFn: () => api.getDepotProfiles(),
  })

  const snapshotQueries = useQueries({
    queries: profiles.map((p) => ({
      queryKey: ['depot-ops-snapshot', p.id, operationalDateIso],
      queryFn: () => api.getDepotOpsSnapshot(p.id, operationalDateIso),
      enabled: profiles.length > 0,
    })),
  })

  const cards = useMemo(() => {
    return profiles.map((profile, i) => ({
      profile,
      snapshot: snapshotQueries[i]?.data as DepotOpsSnapshot | undefined,
    }))
  }, [profiles, snapshotQueries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cards
    return cards.filter(
      ({ profile }) =>
        profile.name.toLowerCase().includes(q) ||
        profile.code.toLowerCase().includes(q) ||
        profile.address.toLowerCase().includes(q),
    )
  }, [cards, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Depots</h1>
          <p className="text-sm text-slate-600">
            Operational headquarters for each location — resources, readiness and site settings. Vehicles, Drivers, Yard
            and Maintenance stay in their own modules; open a depot to see what belongs here.
          </p>
        </div>
        <Link
          to="/depots/new"
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
        >
          Add depot
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search depots…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ profile, snapshot }) => (
            <DepotCard key={profile.id} profile={profile} snapshot={snapshot} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 sm:col-span-2">No depots match this search.</p>
          )}
        </div>
      )}
    </div>
  )
}

function DepotCard({
  profile,
  snapshot,
}: {
  profile: DepotProfile
  snapshot?: DepotOpsSnapshot
}) {
  const readiness = profile.readiness

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{profile.code}</p>
          <h2 className="text-lg font-semibold text-slate-900">{profile.name}</h2>
        </div>
        <StatusPill status={profile.status} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{DEPOT_STATUS_LABELS[profile.status]}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Vehicles" value={snapshot?.vehiclesAssigned ?? '—'} />
        <Stat label="Drivers" value={snapshot?.driversTotal ?? '—'} />
        <Stat label="Yard staff" value={snapshot?.yardStaffOnDuty ?? '—'} />
        <Stat label="Runs today" value={snapshot?.runsToday ?? '—'} />
      </dl>

      {readiness.level !== 'ready' && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-xs ${
            readiness.level === 'blocked' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'
          }`}
        >
          {readiness.reasons[0] ?? (readiness.level === 'blocked' ? 'Blocked' : 'Needs attention')}
        </div>
      )}

      <div className="mt-4 flex-1" />
      <Link
        to={`/depots/${profile.id}`}
        className="inline-flex items-center justify-center rounded-lg border border-command-200 bg-command-50 px-3 py-2 text-sm font-medium text-command-800 hover:bg-command-100"
      >
        Open
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  )
}
