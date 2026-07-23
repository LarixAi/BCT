import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { filterStaffRows } from '@/lib/staff/aggregate'
import { ACCOUNT_STATUS_LABELS, DUTY_STATUS_LABELS, TRAINING_STATUS_LABELS } from '@/lib/staff/constants'
import type { StaffDirectoryRow, StaffHubData } from '@/lib/staff/types'

export function StaffAllTab({
  hub,
  filter,
  onFilter,
  search,
  onSearch,
}: {
  hub: StaffHubData
  filter: string
  onFilter: (f: string) => void
  search: string
  onSearch: (s: string) => void
}) {
  const [preview, setPreview] = useState<StaffDirectoryRow | null>(null)
  const rows = useMemo(() => filterStaffRows(hub.rows, filter, search), [hub.rows, filter, search])

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search name, employee number, email, job title, depot…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="min-w-[240px] flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          {filter !== 'all' && (
            <button type="button" onClick={() => onFilter('all')} className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-soft">
              Clear filter
            </button>
          )}
        </div>

        <SectionCard title="Staff directory" description={`${rows.length} staff members`}>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">No staff match these filters.</p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-3 font-medium">Staff member</th>
                  <th className="pb-2 pr-3 font-medium">Job title</th>
                  <th className="pb-2 pr-3 font-medium">Department</th>
                  <th className="pb-2 pr-3 font-medium">Depot</th>
                  <th className="pb-2 pr-3 font-medium">Role</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">On duty</th>
                  <th className="pb-2 pr-3 font-medium">Training</th>
                  <th className="pb-2 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.staffId}
                    className={`cursor-pointer border-b border-border/60 hover:bg-surface-muted ${preview?.staffId === row.staffId ? 'bg-command-50' : ''}`}
                    onClick={() => setPreview(row)}
                  >
                    <td className="py-2.5 pr-3">
                      <Link to={`/staff/${row.staffId}`} className="font-medium text-command-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                        {row.firstName} {row.lastName}
                      </Link>
                      <p className="text-xs text-muted">{row.employeeNumber ?? row.reference}</p>
                    </td>
                    <td className="py-2.5 pr-3">{row.jobTitle}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{row.department}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">
                      {row.primaryDepotName}
                      {row.additionalDepotCount > 0 && <p className="text-xs text-muted">+{row.additionalDepotCount} more</p>}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{row.roleLabel}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={row.employmentStatus} />
                      <p className="text-xs text-muted">{ACCOUNT_STATUS_LABELS[row.accountStatus]}</p>
                    </td>
                    <td className="py-2.5 pr-3"><StatusPill status={row.dutyStatus} /></td>
                    <td className="py-2.5 pr-3 text-ink-soft">{TRAINING_STATUS_LABELS[row.trainingStatus]}</td>
                    <td className="py-2.5 text-ink-soft">
                      {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      {preview && (
        <SectionCard title="Quick preview">
          <div className="space-y-3 text-sm">
            <p className="font-medium text-ink">{preview.firstName} {preview.lastName}</p>
            <p className="text-ink-soft">{preview.jobTitle}</p>
            <p className="text-ink-soft">{preview.primaryDepotName}</p>
            <div className="flex flex-wrap gap-2">
              <StatusPill status={preview.employmentStatus} />
              <StatusPill status={preview.accountStatus} />
            </div>
            <p className="text-ink-soft">Role: {preview.roleLabel}</p>
            <p className="text-ink-soft">Duty: {DUTY_STATUS_LABELS[preview.dutyStatus]}</p>
            <p className="text-ink-soft">Training: {TRAINING_STATUS_LABELS[preview.trainingStatus]}</p>
            {preview.hasDriverProfile && <p className="text-amber-700 text-xs">Linked driver profile</p>}
            <div className="flex flex-col gap-2 pt-2">
              <Link to={`/staff/${preview.staffId}`} className="text-command-600 hover:underline">View full profile →</Link>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
