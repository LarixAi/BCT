import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { STAFF_DIRECTORY_CARDS, STAFF_TABS } from '@/lib/staff/constants'
import { canCreateStaff } from '@/lib/staff/permissions'
import type { StaffTab } from '@/lib/staff/types'
import { StaffAllTab } from './StaffAllTab'
import { StaffInvitationsTab } from './StaffInvitationsTab'
import { StaffAccessTab } from './StaffAccessTab'
import { StaffTeamsTab } from './StaffTeamsTab'
import { StaffTrainingTab } from './StaffTrainingTab'
import { StaffAvailabilityTab } from './StaffAvailabilityTab'
import { StaffFormerTab } from './StaffFormerTab'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function StaffPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as StaffTab) || 'all'
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: ['staff-hub'],
    queryFn: () => api.getStaffHub(),
  })

  const canCreate = canCreateStaff(user?.permissions ?? [])

  function setTab(next: StaffTab) {
    if (next === 'all') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading staff…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load staff'}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-600">
            Manage internal staff, depot access, roles, training and user accounts.
          </p>
        </div>
        {canCreate && (
          <Link to="/staff/new" className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700">
            Add staff member
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {STAFF_DIRECTORY_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              setFilter(card.filterKey)
              setTab('all')
            }}
            className={`rounded-xl border p-3 text-left transition ${
              filter === card.filterKey && tab === 'all'
                ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-xl font-bold tabular-nums text-slate-900">{hub.summary[card.id]}</p>
            <p className="text-xs text-slate-600">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {STAFF_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-white text-command-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <StaffAllTab hub={hub} filter={filter} onFilter={setFilter} search={search} onSearch={setSearch} />
      )}
      {tab === 'invitations' && <StaffInvitationsTab invitations={hub.invitations} />}
      {tab === 'access' && <StaffAccessTab hub={hub} />}
      {tab === 'teams' && <StaffTeamsTab hub={hub} />}
      {tab === 'training' && <StaffTrainingTab hub={hub} />}
      {tab === 'availability' && <StaffAvailabilityTab hub={hub} />}
      {tab === 'former' && <StaffFormerTab former={hub.former} />}
    </div>
  )
}
