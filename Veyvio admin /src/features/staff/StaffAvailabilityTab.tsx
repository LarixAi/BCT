import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { DUTY_STATUS_LABELS } from '@/lib/staff/constants'
import { canManageStaffDuty } from '@/lib/staff/permissions'
import type { StaffHubData } from '@/lib/staff/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function StaffAvailabilityTab({ hub }: { hub: StaffHubData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const permissions = user?.permissions ?? []
  const [handoverTo, setHandoverTo] = useState('')

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: () => api.getStaffProfiles(),
  })

  const completeHandover = useMutation({
    mutationFn: ({ handoverId, toStaffId }: { handoverId: string; toStaffId: string }) =>
      api.completeStaffHandover(handoverId, toStaffId, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-hub'] })
      queryClient.invalidateQueries({ queryKey: ['staff-profiles'] })
      setHandoverTo('')
    },
  })

  const onDuty = hub.rows.filter((r) => r.dutyStatus === 'on_duty')
  const scheduled = hub.rows.filter((r) => r.dutyStatus === 'scheduled')

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="On duty now" value={onDuty.length} />
        <MetricCard label="Scheduled today" value={hub.shiftsToday.length} />
        <MetricCard label="Controllers on duty" value={hub.controllersOnDuty.length} />
      </div>

      <SectionCard title="Today's shifts" description="Shift assignments across depots">
        {hub.shiftsToday.length === 0 ? (
          <p className="text-sm text-slate-500">No shifts scheduled today.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3 font-medium">Staff</th>
                <th className="pb-2 pr-3 font-medium">Depot</th>
                <th className="pb-2 pr-3 font-medium">Time</th>
                <th className="pb-2 pr-3 font-medium">Shift</th>
                <th className="pb-2 font-medium">Duty</th>
              </tr>
            </thead>
            <tbody>
              {hub.shiftsToday.map((s) => (
                <tr key={s.shiftId} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    <Link to={`/staff/${s.staffId}?tab=Schedule`} className="font-medium text-command-600 hover:underline">
                      {s.staffName}
                    </Link>
                    <p className="text-xs text-slate-500">{s.jobTitle}</p>
                  </td>
                  <td className="py-2 pr-3">{s.depotName}</td>
                  <td className="py-2 pr-3">{s.startTime} – {s.endTime}</td>
                  <td className="py-2 pr-3 capitalize">{s.status.replace(/_/g, ' ')}</td>
                  <td className="py-2"><StatusPill status={s.dutyStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Currently on duty">
          <ul className="space-y-2 text-sm">
            {onDuty.map((row) => (
              <li key={row.staffId} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                <Link to={`/staff/${row.staffId}`} className="font-medium text-command-600 hover:underline">
                  {row.firstName} {row.lastName}
                </Link>
                <span className="text-slate-600">{row.primaryDepotName}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Scheduled (not yet on duty)">
          <ul className="space-y-2 text-sm">
            {scheduled.length === 0 ? (
              <li className="text-slate-500">No scheduled staff awaiting start.</li>
            ) : (
              scheduled.map((row) => (
                <li key={row.staffId} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <Link to={`/staff/${row.staffId}?tab=Schedule`} className="font-medium text-command-600 hover:underline">
                    {row.firstName} {row.lastName}
                  </Link>
                  <span className="text-xs text-slate-500">{DUTY_STATUS_LABELS[row.dutyStatus]}</span>
                </li>
              ))
            )}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Pending shift handovers" description="Duty controllers ending shift must hand over unresolved exceptions">
        {hub.pendingHandovers.length === 0 ? (
          <p className="text-sm text-slate-500">No pending handovers.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {hub.pendingHandovers.map((h) => (
              <li key={h.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="font-medium text-slate-900">{h.responsibility}</p>
                <p className="text-slate-600">{h.fromStaffName} · {h.depotName} · {h.openExceptionCount} open exception(s)</p>
                {h.notes && <p className="text-xs text-slate-500">{h.notes}</p>}
                {canManageStaffDuty(permissions) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} className="rounded border border-slate-200 px-2 py-1 text-xs">
                      <option value="">Accepting staff…</option>
                      {staffList
                        .filter((s) => s.id !== h.fromStaffId && s.employmentStatus === 'active')
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!handoverTo || completeHandover.isPending}
                      onClick={() => completeHandover.mutate({ handoverId: h.id, toStaffId: handoverTo })}
                      className="rounded bg-command-600 px-3 py-1 text-xs font-medium text-white"
                    >
                      Complete handover
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Open tasks" description="Operational work assigned to staff">
        {hub.openTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No open tasks.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3 font-medium">Task</th>
                <th className="pb-2 pr-3 font-medium">Owner</th>
                <th className="pb-2 pr-3 font-medium">Category</th>
                <th className="pb-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {hub.openTasks.map((t) => (
                <tr key={t.taskId} className="border-b border-slate-50">
                  <td className="py-2 pr-3">
                    {t.relatedHref ? (
                      <Link to={t.relatedHref} className="text-command-600 hover:underline">{t.title}</Link>
                    ) : (
                      t.title
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <Link to={`/staff/${t.staffId}?tab=Tasks`} className="hover:underline">{t.staffName}</Link>
                  </td>
                  <td className="py-2 pr-3 capitalize">{t.category}</td>
                  <td className="py-2">
                    <StatusPill status={t.status} />
                    {t.dueDate && <span className="ml-2 text-xs text-slate-500">{t.dueDate}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  )
}
