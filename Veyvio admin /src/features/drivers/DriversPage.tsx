import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, expiryTone, formatDate } from '@/components/ui/status'
import {
  DRIVER_DIRECTORY_CARDS,
  EMPLOYMENT_TYPE_LABELS,
} from '@/lib/drivers/constants'
import { canCreateDriver } from '@/lib/drivers/permissions'
import type { DriverProfile } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

type ListFilter =
  | 'all'
  | 'eligible'
  | 'not_eligible'
  | 'expiring'
  | 'invite_pending'
  | 'on_duty'
  | 'on_trip'
  | 'restricted'
  | 'stale_sync'

export function DriversPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const filter = (searchParams.get('filter') as ListFilter) || 'all'

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['driver-profiles'],
    queryFn: () => api.getDriverProfiles(),
  })

  const { data: summary } = useQuery({
    queryKey: ['driver-directory-summary'],
    queryFn: () => api.getDriverDirectorySummary(),
  })

  const filtered = useMemo(() => filterDrivers(drivers, filter, search), [drivers, filter, search])
  const canCreate = canCreateDriver(user?.permissions ?? [])

  function setFilter(next: ListFilter) {
    if (next === 'all') {
      searchParams.delete('filter')
    } else {
      searchParams.set('filter', next)
    }
    setSearchParams(searchParams, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-600">
            Can this driver safely and compliantly complete their assigned work right now?
          </p>
        </div>
        {canCreate && (
          <Link
            to="/drivers/new"
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            Add driver
          </Link>
        )}
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {DRIVER_DIRECTORY_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setFilter((card.filterKey as ListFilter) ?? 'all')}
              className={`rounded-xl border p-4 text-left transition ${
                filter === (card.filterKey ?? 'all')
                  ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-2xl font-bold tabular-nums text-slate-900">{summary[card.id]}</p>
              <p className="text-sm text-slate-600">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search name, reference, email, phone, depot…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        {filter !== 'all' && (
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
          >
            Clear filter
          </button>
        )}
      </div>

      <SectionCard title="Driver directory" description={`${filtered.length} drivers`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Driver</th>
                  <th className="pb-2 pr-4 font-medium">Depot</th>
                  <th className="pb-2 pr-4 font-medium">Employment</th>
                  <th className="pb-2 pr-4 font-medium">Work permissions</th>
                  <th className="pb-2 pr-4 font-medium">Release status</th>
                  <th className="pb-2 pr-4 font-medium">Compliance</th>
                  <th className="pb-2 pr-4 font-medium">Current status</th>
                  <th className="pb-2 pr-4 font-medium">Next duty</th>
                  <th className="pb-2 pr-4 font-medium">App status</th>
                  <th className="pb-2 pr-4 font-medium">Last sync</th>
                  <th className="pb-2 font-medium">Expiry alert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((driver) => (
                  <DriverRow key={driver.id} driver={driver} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function DriverRow({ driver }: { driver: DriverProfile }) {
  const workLabels = driver.workPermissions.filter((p) => p.enabled).map((p) => p.label)
  const expiry = expiryTone(driver.nearestExpiryDate)

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
      <td className="py-2.5 pr-4">
        <Link to={`/drivers/${driver.id}`} className="font-medium text-command-600 hover:underline">
          {driver.firstName} {driver.lastName}
        </Link>
        <p className="text-xs text-slate-500">{driver.reference}</p>
      </td>
      <td className="py-2.5 pr-4 text-slate-600">
        {driver.depotName ?? '—'}
        {driver.secondaryDepotNames.length > 0 && (
          <p className="text-xs text-slate-400">+ {driver.secondaryDepotNames.join(', ')}</p>
        )}
      </td>
      <td className="py-2.5 pr-4 text-slate-600">{EMPLOYMENT_TYPE_LABELS[driver.employmentType]}</td>
      <td className="py-2.5 pr-4 text-xs text-slate-600">
        {workLabels.slice(0, 3).join(', ')}
        {workLabels.length > 3 ? ` +${workLabels.length - 3}` : ''}
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={driver.operationalEligibility} />
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={driver.complianceStatus} />
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={driver.dutyStatus} />
      </td>
      <td className="py-2.5 pr-4 text-slate-600">
        {driver.nextDutyReference ? (
          <>
            {driver.nextDutyReference}
            {driver.nextDutyTime && <span className="text-slate-400"> · {driver.nextDutyTime}</span>}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="py-2.5 pr-4">
        <StatusPill status={driver.account.accountStatus} />
      </td>
      <td className="py-2.5 pr-4 text-slate-600">
        {driver.account.lastAppSyncAt
          ? new Date(driver.account.lastAppSyncAt).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}
      </td>
      <td className="py-2.5">
        {driver.nearestExpiryDate ? (
          <span
            className={
              expiry === 'expired'
                ? 'text-red-700'
                : expiry === 'warning'
                  ? 'text-amber-700'
                  : 'text-slate-600'
            }
          >
            {driver.nearestExpiryLabel}: {formatDate(driver.nearestExpiryDate)}
          </span>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}

function filterDrivers(drivers: DriverProfile[], filter: ListFilter, search: string) {
  let list = drivers
  const staleMs = 24 * 60 * 60 * 1000

  switch (filter) {
    case 'eligible':
      list = list.filter((d) => d.eligibility.canAssign)
      break
    case 'not_eligible':
      list = list.filter((d) => d.operationalEligibility === 'not_eligible')
      break
    case 'expiring':
      list = list.filter(
        (d) =>
          d.complianceStatus === 'documents_expiring_soon' ||
          d.eligibility.warnings.some((w) => w.code.includes('expiring')),
      )
      break
    case 'invite_pending':
      list = list.filter((d) => d.account.accountStatus === 'invite_pending')
      break
    case 'on_duty':
      list = list.filter((d) =>
        ['assigned', 'on_trip', 'checking_in', 'finishing_duty'].includes(d.dutyStatus),
      )
      break
    case 'on_trip':
      list = list.filter((d) => d.dutyStatus === 'on_trip')
      break
    case 'restricted':
      list = list.filter(
        (d) =>
          d.operationalEligibility === 'restricted' ||
          d.employmentStatus === 'suspended' ||
          d.account.accountStatus === 'suspended',
      )
      break
    case 'stale_sync':
      list = list.filter((d) => {
        if (!d.account.lastAppSyncAt) return d.account.accountStatus === 'active'
        return Date.now() - new Date(d.account.lastAppSyncAt).getTime() > staleMs
      })
      break
  }

  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (d) =>
        `${d.firstName} ${d.lastName}`.toLowerCase().includes(q) ||
        d.reference.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.phone?.includes(q) ||
        d.depotName?.toLowerCase().includes(q) ||
        d.employeeNumber?.toLowerCase().includes(q),
    )
  }

  return list
}
