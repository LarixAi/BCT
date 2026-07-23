import { Link } from 'react-router-dom'
import { StatusPill } from '@/components/ui/status'
import { AVAILABILITY_LABELS, SEVERITY_DISPLAY, WORKFLOW_STATUS_LABELS } from '@/lib/defects/constants'
import { formatSlaRemaining } from '@/lib/defects/sla'
import type { DefectRegisterRow } from '@/lib/defects/types'

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr`
  return `${Math.round(minutes / 1440)} d`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DefectsRegisterTable({
  rows,
  selectable = false,
  selected = [],
  onToggleSelect,
  onToggleAll,
}: {
  rows: DefectRegisterRow[]
  selectable?: boolean
  selected?: string[]
  onToggleSelect?: (id: string) => void
  onToggleAll?: (ids: string[]) => void
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No defects match this view.</p>
  }

  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.includes(r.id))

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm" data-testid="defects-register-table">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              {selectable && (
                <th className="pb-2 pr-2 font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleAll?.(allSelected ? [] : rows.map((r) => r.id))}
                    aria-label="Select all defects"
                  />
                </th>
              )}
              <th className="pb-2 pr-3 font-medium">Defect ID</th>
              <th className="pb-2 pr-3 font-medium">Severity</th>
              <th className="pb-2 pr-3 font-medium">Vehicle</th>
              <th className="pb-2 pr-3 font-medium">Defect</th>
              <th className="pb-2 pr-3 font-medium">Category</th>
              <th className="pb-2 pr-3 font-medium">Availability</th>
              <th className="pb-2 pr-3 font-medium">Source</th>
              <th className="pb-2 pr-3 font-medium">Reported</th>
              <th className="pb-2 pr-3 font-medium">Location</th>
              <th className="pb-2 pr-3 font-medium">Assigned to</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">SLA</th>
              <th className="pb-2 pr-3 font-medium">Age</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 hover:bg-surface-muted">
                {selectable && (
                  <td className="py-2.5 pr-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => onToggleSelect?.(row.id)}
                      aria-label={`Select ${row.defectRef}`}
                    />
                  </td>
                )}
                <td className="py-2.5 pr-3 font-mono text-xs">{row.defectRef}</td>
                <td className="py-2.5 pr-3">
                  <SeverityBadge severity={row.severity} />
                </td>
                <td className="py-2.5 pr-3">
                  <Link to={`/defects/${row.id}`} className="font-medium text-command-600 hover:underline">
                    {row.registrationNumber}
                  </Link>
                  {row.fleetNumber && <span className="block text-xs text-muted">{row.fleetNumber}</span>}
                </td>
                <td className="py-2.5 pr-3 max-w-[200px]">
                  <p className="truncate font-medium">{row.title}</p>
                  {row.isRecurring && <span className="text-xs text-amber-700">Recurring</span>}
                </td>
                <td className="py-2.5 pr-3 capitalize">{row.category}</td>
                <td className="py-2.5 pr-3">
                  <AvailabilityBadge availability={row.vehicleAvailability} />
                </td>
                <td className="py-2.5 pr-3 capitalize text-ink-soft">{row.source}</td>
                <td className="py-2.5 pr-3 text-xs text-ink-soft">{formatDateTime(row.reportedAt)}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{row.location ?? row.depotName}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{row.assignee ?? '—'}</td>
                <td className="py-2.5 pr-3">
                  <span className="text-xs text-ink-soft">{WORKFLOW_STATUS_LABELS[row.workflowStatus] ?? row.workflowStatus}</span>
                  {row.isOverdue && <span className="ml-1 text-xs text-red-700">Overdue</span>}
                </td>
                <td className="py-2.5 pr-3 text-xs">
                  <span className={row.isSlaBreached ? 'font-medium text-red-700' : 'text-ink-soft'}>
                    {formatSlaRemaining(row.slaMinutesRemaining)}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-xs text-muted">{formatAge(row.ageMinutes)}</td>
                <td className="py-2.5">
                  <Link to={`/defects/${row.id}`} className="text-xs font-medium text-command-600 hover:underline">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Link
            key={row.id}
            to={`/defects/${row.id}`}
            className="block rounded-xl border border-border bg-surface p-4 hover:border-border-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted">{row.defectRef}</p>
                <p className="font-semibold text-ink">{row.registrationNumber}</p>
              </div>
              <SeverityBadge severity={row.severity} />
            </div>
            <p className="mt-2 text-sm text-ink">{row.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AvailabilityBadge availability={row.vehicleAvailability} />
              <StatusPill status={row.workflowStatus} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {row.location ?? row.depotName} · {formatAge(row.ageMinutes)} open
            </p>
          </Link>
        ))}
      </div>
    </>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const label = SEVERITY_DISPLAY[severity] ?? severity
  const styles: Record<string, string> = {
    dangerous: 'bg-red-100 text-red-800',
    major: 'bg-orange-100 text-orange-900',
    minor: 'bg-amber-100 text-amber-900',
    advisory: 'bg-surface-muted text-ink-soft',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[severity] ?? 'bg-surface-muted text-ink-soft'}`}>
      {label}
    </span>
  )
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const label = AVAILABILITY_LABELS[availability] ?? availability
  const styles: Record<string, string> = {
    vor: 'bg-red-100 text-red-800',
    pending_safety_assessment: 'bg-orange-100 text-orange-900',
    available_with_restriction: 'bg-amber-100 text-amber-900',
    available: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[availability] ?? 'bg-surface-muted text-ink-soft'}`}>
      {label}
    </span>
  )
}
