import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'
import { DEPOT_STATUS_LABELS, DEPOT_WORKSPACE_TABS, type DepotWorkspaceTab } from '@/lib/depots/constants'
import type { UpdateDepotInput } from '@/lib/depots/types'
import { DEPOT_ZONES } from '@/lib/yard/constants'
import { VEHICLE_CATEGORY_LABELS } from '@/lib/vehicles/constants'
import { DepotBackLink, DepotProfileHeader } from './components/DepotProfileHeader'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const TAB_QUERY: Record<string, DepotWorkspaceTab> = {
  overview: 'Overview',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  yard: 'Yard',
  maintenance: 'Maintenance',
  equipment: 'Equipment',
  security: 'Security',
  fuel: 'Fuel',
  documents: 'Documents',
  settings: 'Settings',
}

export function DepotDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { operationalDateIso } = useOperationalContext()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [stubNotice, setStubNotice] = useState<string | null>(null)

  const tabParam = searchParams.get('tab')
  const initialTab = tabParam && TAB_QUERY[tabParam] ? TAB_QUERY[tabParam] : 'Overview'
  const [tab, setTab] = useState<DepotWorkspaceTab>(initialTab)

  useEffect(() => {
    if (tabParam && TAB_QUERY[tabParam]) setTab(TAB_QUERY[tabParam]!)
  }, [tabParam])

  function selectTab(next: DepotWorkspaceTab) {
    setTab(next)
    const key = Object.entries(TAB_QUERY).find(([, v]) => v === next)?.[0] ?? 'overview'
    const params = new URLSearchParams(searchParams)
    params.set('tab', key)
    setSearchParams(params, { replace: true })
  }

  const { data: depot, isLoading, isError, error } = useQuery({
    queryKey: tKey(['depot-profile', id]),
    queryFn: () => api.getDepotProfile(id!),
    enabled: Boolean(id),
  })

  const { data: snapshot } = useQuery({
    queryKey: tKey(['depot-ops-snapshot', id, operationalDateIso]),
    queryFn: () => api.getDepotOpsSnapshot(id!, operationalDateIso),
    enabled: Boolean(id),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const { data: drivers = [] } = useQuery({
    queryKey: tKey(['driver-profiles']),
    queryFn: () => api.getDriverProfiles(),
  })

  const depotVehicles = useMemo(
    () => vehicles.filter((v) => v.homeDepotId === id || v.currentDepotId === id),
    [vehicles, id],
  )
  const homeVehicles = useMemo(() => vehicles.filter((v) => v.homeDepotId === id), [vehicles, id])
  const onSiteVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) => v.currentDepotId === id && !['checked_out', 'unknown_location'].includes(v.yardStatus),
      ),
    [vehicles, id],
  )
  const depotDrivers = useMemo(() => drivers.filter((d) => d.depotId === id), [drivers, id])

  const zones = DEPOT_ZONES[id ?? ''] ?? []

  if (isLoading) return <p className="text-sm text-muted">Loading depot…</p>
  if (isError || !depot) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Depot not found'}</p>
  }

  return (
    <div className="space-y-6">
      <DepotBackLink />
      <DepotProfileHeader
        depot={depot}
        snapshot={snapshot}
        actions={
          <>
            <Link
              to={`/yard?depot=${depot.id}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
            >
              Open Yard
            </Link>
            <Link
              to={`/vehicles?filter=all`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
            >
              Open Vehicles
            </Link>
          </>
        }
      />

      {stubNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{stubNotice}</div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {DEPOT_WORKSPACE_TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTab(t)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t ? 'bg-surface text-command-700 ring-1 ring-border' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <OverviewTab
          depot={depot}
          snapshot={snapshot}
          zones={zones}
          onSiteVehicles={onSiteVehicles}
        />
      )}

      {tab === 'Vehicles' && (
        <SectionCard title="Vehicles at this depot" description="Home assignment and on-site presence — open a vehicle for full profile">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-surface-muted px-2 py-1">Assigned {homeVehicles.length}</span>
            <span className="rounded-full bg-surface-muted px-2 py-1">On site {onSiteVehicles.length}</span>
            <span className="rounded-full bg-surface-muted px-2 py-1">
              VOR {homeVehicles.filter((v) => v.operationalStatus === 'vor').length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3">Vehicle</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Operational</th>
                  <th className="pb-2 pr-3">Yard</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {depotVehicles.map((v) => (
                  <tr key={v.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      <Link to={`/vehicles/${v.id}`} className="font-medium text-command-600 hover:underline">
                        {v.registrationNumber}
                      </Link>
                      <p className="text-xs text-muted">{v.homeDepotId === id ? 'Home' : 'Visiting'}</p>
                    </td>
                    <td className="py-2 pr-3 text-ink-soft">{VEHICLE_CATEGORY_LABELS[v.vehicleCategory]}</td>
                    <td className="py-2 pr-3">
                      <StatusPill status={v.operationalStatus} />
                    </td>
                    <td className="py-2 pr-3 text-xs text-ink-soft">{v.yardStatus.replace(/_/g, ' ')}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-command-600 hover:underline"
                        onClick={() => {
                          setStubNotice('Transfer vehicle will land in a later release.')
                          window.setTimeout(() => setStubNotice(null), 3000)
                        }}
                      >
                        Transfer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === 'Drivers' && (
        <SectionCard title="Drivers based here" description="Primary depot assignment">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3">Name</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Licence</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {depotDrivers.map((d) => (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      <Link to={`/drivers/${d.id}`} className="font-medium text-command-600 hover:underline">
                        {d.firstName} {d.lastName}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <StatusPill status={d.operationalStatus} />
                    </td>
                    <td className="py-2 pr-3 text-xs text-ink-soft">{d.licenceExpiry ? formatDate(d.licenceExpiry) : '—'}</td>
                    <td className="py-2">
                      <Link to="/messages" className="text-xs font-medium text-command-600 hover:underline">
                        Message
                      </Link>
                    </td>
                  </tr>
                ))}
                {depotDrivers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-sm text-muted">
                      No drivers with this primary depot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === 'Yard' && (
        <SectionCard title="Yard at this depot" description="Live yard operations stay in the Yard module">
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <Meta label="On site" value={String(snapshot?.vehiclesOnSite ?? onSiteVehicles.length)} />
            <Meta label="Available (assigned)" value={String(snapshot?.vehiclesAvailable ?? '—')} />
            <Meta label="VOR" value={String(snapshot?.vehiclesVor ?? '—')} />
          </dl>
          <Link
            to={`/yard?depot=${depot.id}`}
            className="mt-4 inline-flex rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            Open full Yard map
          </Link>
        </SectionCard>
      )}

      {tab === 'Maintenance' && (
        <SectionCard title="Maintenance due" description="Home-fleet due dates — book work in Maintenance">
          <ul className="space-y-2 text-sm">
            {homeVehicles
              .filter((v) => v.nextMaintenanceDate || v.motExpiry || v.tachographCalibrationExpiry)
              .slice(0, 12)
              .map((v) => (
                <li key={v.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2">
                  <Link to={`/vehicles/${v.id}`} className="font-medium text-command-600 hover:underline">
                    {v.registrationNumber}
                  </Link>
                  <span className="text-ink-soft">
                    {[
                      v.nextMaintenanceDate && `Service ${formatDate(v.nextMaintenanceDate)}`,
                      v.motExpiry && `MOT ${formatDate(v.motExpiry)}`,
                      v.tachographCalibrationExpiry && `Tacho ${formatDate(v.tachographCalibrationExpiry)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
          </ul>
          <Link to="/maintenance" className="mt-4 inline-block text-sm font-medium text-command-600 hover:underline">
            Open Maintenance →
          </Link>
        </SectionCard>
      )}

      {tab === 'Equipment' && (
        <SectionCard title="Depot equipment" description="Site inventory — not vehicle-mounted kit">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2">Item</th>
                <th className="pb-2">Available</th>
                <th className="pb-2">Assigned</th>
                <th className="pb-2">Broken</th>
              </tr>
            </thead>
            <tbody>
              {depot.equipment.map((e) => (
                <tr key={e.id} className="border-b border-border/60">
                  <td className="py-2 font-medium text-ink">{e.name}</td>
                  <td className="py-2 tabular-nums">{e.available}</td>
                  <td className="py-2 tabular-nums">{e.assigned}</td>
                  <td className="py-2 tabular-nums text-red-700">{e.broken || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {tab === 'Security' && (
        <SectionCard title="Security" description="Phase 1 contact sheet — live CCTV later">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Meta label="Gate access" value={depot.security.gateAccess} />
            <Meta label="CCTV" value={depot.security.cctv} />
            <Meta label="Alarm" value={depot.security.alarm} />
            <Meta label="Visitor log" value={depot.security.visitorLogNote} />
            <Meta label="Key holders" value={depot.security.keyHolders.join(', ') || '—'} />
            <Meta label="Emergency contacts" value={depot.security.emergencyContacts.join(', ') || '—'} />
          </dl>
        </SectionCard>
      )}

      {tab === 'Fuel' && (
        <SectionCard title="Fuel" description="Tank levels are seeded for Phase 1 — pump telemetry later">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <Meta
              label="Diesel"
              value={depot.fuel.dieselPercent != null ? `${depot.fuel.dieselPercent}%` : 'Not available'}
            />
            <Meta
              label="AdBlue"
              value={depot.fuel.adBluePercent != null ? `${depot.fuel.adBluePercent}%` : 'Not available'}
            />
            <Meta
              label="Petrol"
              value={depot.fuel.petrolPercent != null ? `${depot.fuel.petrolPercent}%` : 'Not available'}
            />
            <Meta
              label="Last delivery"
              value={depot.fuel.lastDeliveryAt ? formatDate(depot.fuel.lastDeliveryAt) : '—'}
            />
            <Meta
              label="Usage today"
              value={depot.fuel.usageTodayLitres != null ? `${depot.fuel.usageTodayLitres} L` : '—'}
            />
            <Meta
              label="Average daily"
              value={depot.fuel.averageDailyLitres != null ? `${depot.fuel.averageDailyLitres} L` : '—'}
            />
          </dl>
          {depot.fuel.dieselPercent != null && depot.fuel.dieselPercent < 20 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Diesel below 20% — order fuel.
            </p>
          )}
        </SectionCard>
      )}

      {tab === 'Documents' && (
        <SectionCard title="Depot documents" description="Site certificates and plans">
          <ul className="space-y-2 text-sm">
            {depot.documents.map((d) => (
              <li key={d.id} className="flex justify-between gap-2 border-b border-border/60 py-2">
                <span className="font-medium text-ink">{d.label}</span>
                <span className="text-ink-soft">
                  <StatusPill status={d.status} />
                  {d.expiryDate ? ` · ${formatDate(d.expiryDate)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {tab === 'Settings' && (
        <DepotSettingsForm
          depot={depot}
          actorName={actorName}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: tKey(['depot-profile', id]) })
            queryClient.invalidateQueries({ queryKey: tKey(['depot-profiles']) })
            queryClient.invalidateQueries({ queryKey: tKey(['depots']) })
          }}
        />
      )}
    </div>
  )
}

function OverviewTab({
  depot,
  snapshot,
  zones,
  onSiteVehicles,
}: {
  depot: NonNullable<Awaited<ReturnType<typeof api.getDepotProfile>>>
  snapshot?: Awaited<ReturnType<typeof api.getDepotOpsSnapshot>>
  zones: { id: string; label: string; kind: string }[]
  onSiteVehicles: Awaited<ReturnType<typeof api.getVehicleProfiles>>
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Depot status">
        <dl className="space-y-2 text-sm">
          <Meta label="Status" value={DEPOT_STATUS_LABELS[depot.status]} />
          <Meta label="Address" value={depot.address} />
          <Meta label="Phone" value={depot.phone ?? '—'} />
          <Meta label="Hours (weekday)" value={depot.openingHours.weekday} />
          <Meta label="Readiness" value={depot.readiness.level.replace(/_/g, ' ')} />
        </dl>
        {depot.readiness.reasons.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-800">
            {depot.readiness.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Today's activity">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Meta label="Vehicles on site" value={String(snapshot?.vehiclesOnSite ?? '—')} />
          <Meta label="Vehicles out" value={String(snapshot?.vehiclesOut ?? '—')} />
          <Meta label="Drivers (active)" value={String(snapshot?.driversActive ?? '—')} />
          <Meta label="Trips running" value={String(snapshot?.runsRunning ?? '—')} />
          <Meta label="Defects today" value={String(snapshot?.defectsToday ?? '—')} />
          <Meta label="Checks outstanding" value={String(snapshot?.checksOutstanding ?? '—')} />
        </dl>
      </SectionCard>

      <SectionCard title="Vehicles" description="Home fleet">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Meta label="Total" value={String(snapshot?.vehiclesAssigned ?? '—')} />
          <Meta label="Available" value={String(snapshot?.vehiclesAvailable ?? '—')} />
          <Meta label="Out" value={String(snapshot?.vehiclesOut ?? '—')} />
          <Meta label="Workshop" value={String(snapshot?.vehiclesWorkshop ?? '—')} />
        </dl>
      </SectionCard>

      <SectionCard title="Drivers & runs">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Meta label="Drivers" value={String(snapshot?.driversTotal ?? '—')} />
          <Meta label="Sick / leave" value={`${snapshot?.driversSick ?? 0} / ${snapshot?.driversLeave ?? 0}`} />
          <Meta label="Runs today" value={String(snapshot?.runsToday ?? '—')} />
          <Meta
            label="Completed / running / pending"
            value={`${snapshot?.runsCompleted ?? 0} / ${snapshot?.runsRunning ?? 0} / ${snapshot?.runsPending ?? 0}`}
          />
        </dl>
      </SectionCard>

      <SectionCard
        title="Depot map"
        description="Zone layout — open Yard for the live map"
        className="lg:col-span-2"
        action={
          <Link to={`/yard?depot=${depot.id}`} className="text-sm font-medium text-command-600 hover:underline">
            Open full Yard map
          </Link>
        }
      >
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(zones.length ? zones : [{ id: 'gate', label: 'Gate', kind: 'bay' }]).map((z) => {
            const inZone = onSiteVehicles.filter((v) =>
              (v.currentLocationLabel ?? v.parkingBay ?? '').toLowerCase().includes(z.label.split(' ')[0]!.toLowerCase()),
            )
            return (
              <div key={z.id} className="rounded-lg border border-border bg-surface-muted p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{z.kind}</p>
                <p className="font-medium text-ink">{z.label}</p>
                <p className="mt-1 text-xs text-ink-soft">{inZone.length} vehicles</p>
                <ul className="mt-2 space-y-1">
                  {inZone.slice(0, 3).map((v) => (
                    <li key={v.id}>
                      <Link to={`/vehicles/${v.id}`} className="text-xs font-medium text-command-600 hover:underline">
                        {v.registrationNumber}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}

function DepotSettingsForm({
  depot,
  actorName,
  onSaved,
}: {
  depot: NonNullable<Awaited<ReturnType<typeof api.getDepotProfile>>>
  actorName: string
  onSaved: () => void
}) {
  const [name, setName] = useState(depot.name)
  const [code, setCode] = useState(depot.code)
  const [address, setAddress] = useState(depot.address)
  const [phone, setPhone] = useState(depot.phone ?? '')
  const [email, setEmail] = useState(depot.email ?? '')
  const [managerName, setManagerName] = useState(depot.contacts.managerName ?? '')
  const [vehicleCapacity, setVehicleCapacity] = useState(String(depot.capacity.vehicleCapacity))
  const [status, setStatus] = useState(depot.status)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => {
      const input: UpdateDepotInput = {
        name,
        code,
        address,
        phone: phone || null,
        email: email || null,
        status,
        capacity: { vehicleCapacity: Number(vehicleCapacity) || depot.capacity.vehicleCapacity },
        contacts: { managerName: managerName || null },
      }
      return api.updateDepot(depot.id, input, actorName)
    },
    onSuccess: () => {
      setError('')
      onSaved()
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not save'),
  })

  return (
    <SectionCard title="Depot settings" description="Identity, capacity and primary contacts">
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Depot name" value={name} onChange={setName} />
        <Field label="Depot code" value={code} onChange={setCode} />
        <Field label="Address" value={address} onChange={setAddress} className="sm:col-span-2" />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="Email" value={email} onChange={setEmail} />
        <Field label="Depot manager" value={managerName} onChange={setManagerName} />
        <Field label="Vehicle capacity" value={vehicleCapacity} onChange={setVehicleCapacity} />
        <label className="block text-sm">
          <span className="text-ink-soft">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
          >
            {Object.entries(DEPOT_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="mt-4 rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
      >
        Save settings
      </button>
    </SectionCard>
  )
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <label className={`block text-sm ${className ?? ''}`}>
      <span className="text-ink-soft">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
      />
    </label>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
