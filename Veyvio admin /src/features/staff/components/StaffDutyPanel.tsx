import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { DUTY_STATUS_LABELS } from '@/lib/staff/constants'
import { canTransitionDuty } from '@/lib/staff/duty'
import { canManageStaffDuty } from '@/lib/staff/permissions'
import { canStartDutyWithTraining } from '@/lib/staff/training'
import type { StaffDutyStatus, StaffProfile } from '@/lib/staff/types'
import { api } from '@/lib/api/client'

const DUTY_ACTIONS: { status: StaffDutyStatus; label: string }[] = [
  { status: 'on_duty', label: 'Start duty' },
  { status: 'on_break', label: 'Start break' },
  { status: 'on_duty', label: 'End break' },
  { status: 'off_duty', label: 'End duty' },
  { status: 'unavailable', label: 'Mark unavailable' },
]

export function StaffDutyPanel({ staff, actorName, permissions }: { staff: StaffProfile; actorName: string; permissions: string[] }) {
  const queryClient = useQueryClient()
  const canManage = canManageStaffDuty(permissions)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-profile', staff.id] })
    queryClient.invalidateQueries({ queryKey: ['staff-hub'] })
  }

  const setDuty = useMutation({
    mutationFn: (status: StaffDutyStatus) => api.setStaffDutyStatus(staff.id, status, actorName, { depotId: staff.primaryDepotId }),
    onSuccess: invalidate,
  })

  const activeSession = staff.dutySessions.find((s) => s.id === staff.currentDutySessionId)
  const dutyTrainingWarnings = canStartDutyWithTraining(staff)

  const actions = DUTY_ACTIONS.filter((a) => {
    if (a.label === 'End break') return staff.dutyStatus === 'on_break' && canTransitionDuty('on_break', 'on_duty')
    if (a.label === 'Start break') return staff.dutyStatus === 'on_duty'
    if (a.label === 'Start duty') return staff.dutyStatus !== 'on_duty' && staff.dutyStatus !== 'on_break' && canTransitionDuty(staff.dutyStatus, 'on_duty')
    if (a.label === 'End duty') return staff.dutyStatus === 'on_duty' || staff.dutyStatus === 'on_break'
    return canTransitionDuty(staff.dutyStatus, a.status)
  })

  return (
    <SectionCard title="Duty status" description="Operational duty controls — separate from employment and account status">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusPill status={staff.dutyStatus} />
        <span className="text-slate-600">{DUTY_STATUS_LABELS[staff.dutyStatus]}</span>
        {staff.onCall && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">On-call</span>}
        {staff.overtimeAvailable && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Overtime available</span>}
      </div>
      {activeSession && (
        <p className="mt-2 text-xs text-slate-500">
          Active since {new Date(activeSession.startedAt).toLocaleString('en-GB')} · {activeSession.depotName}
        </p>
      )}
      {dutyTrainingWarnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">Training warnings before duty</p>
          <ul className="mt-1 list-inside list-disc">
            {dutyTrainingWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={`${a.status}-${a.label}`}
              type="button"
              disabled={setDuty.isPending}
              onClick={() => setDuty.mutate(a.label === 'End break' ? 'on_duty' : a.status)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
