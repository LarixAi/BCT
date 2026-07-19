import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { YARD_TASK_PRIORITY_LABELS, YARD_TASK_TYPE_LABELS } from '@/lib/yard/constants'
import { canCreateYardTask } from '@/lib/yard/permissions'
import type { YardHubData, YardTask } from '@/lib/yard/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function YardTasksTab({ hub }: { hub: YardHubData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canManage = canCreateYardTask(permissions)

  const openTasks = hub.tasks.filter((t) => !['completed', 'cancelled'].includes(t.status))
  const completedTasks = hub.tasks.filter((t) => t.status === 'completed')

  const start = useMutation({
    mutationFn: (taskId: string) => api.startYardTask(taskId, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['yard-hub', hub.depotId] }),
  })

  const complete = useMutation({
    mutationFn: (taskId: string) => api.completeYardTask({ taskId }, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['yard-hub', hub.depotId] }),
  })

  return (
    <div className="space-y-4">
      <SectionCard
        title="Yard task queue"
        description={`${openTasks.length} open tasks at ${hub.depotName}. Completing refuel, fluids or equipment tasks writes to Fleet Resources.`}
      >
        {openTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No open yard tasks.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                <th className="pb-2 pr-3 font-medium">Task</th>
                <th className="pb-2 pr-3 font-medium">Vehicle</th>
                <th className="pb-2 pr-3 font-medium">Priority</th>
                <th className="pb-2 pr-3 font-medium">Assigned</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Sync</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {openTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canManage={canManage}
                  onStart={() => start.mutate(task.id)}
                  onComplete={() => complete.mutate(task.id)}
                  busy={start.isPending || complete.isPending}
                />
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {completedTasks.length > 0 && (
        <SectionCard title="Recently completed" description="Last completed yard tasks">
          <ul className="space-y-2 text-sm">
            {completedTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="flex justify-between gap-2 text-slate-600">
                <span>
                  {t.registrationNumber} — {t.title}
                </span>
                <span className="text-xs text-slate-400">{t.completedAt ? new Date(t.completedAt).toLocaleString('en-GB') : ''}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function TaskRow({
  task,
  canManage,
  onStart,
  onComplete,
  busy,
}: {
  task: YardTask
  canManage: boolean
  onStart: () => void
  onComplete: () => void
  busy: boolean
}) {
  const priorityClass =
    task.priority === 'safety_critical'
      ? 'text-red-800 font-semibold'
      : task.priority === 'urgent'
        ? 'text-amber-800'
        : 'text-slate-700'

  return (
    <tr className={`border-b border-slate-50 ${task.priority === 'safety_critical' ? 'bg-red-50/50' : ''}`}>
      <td className="py-2.5 pr-3">
        <p className="font-medium text-slate-900">{task.title}</p>
        <p className="text-xs text-slate-500">{YARD_TASK_TYPE_LABELS[task.taskType]}</p>
        {task.blockingRelease && <p className="text-xs text-amber-700">Blocks release</p>}
      </td>
      <td className="py-2.5 pr-3">{task.registrationNumber}</td>
      <td className={`py-2.5 pr-3 text-xs ${priorityClass}`}>{YARD_TASK_PRIORITY_LABELS[task.priority]}</td>
      <td className="py-2.5 pr-3">{task.assignedStaffName ?? '—'}</td>
      <td className="py-2.5 pr-3">
        <StatusPill status={task.status} />
      </td>
      <td className="py-2.5 pr-3 text-xs capitalize text-slate-500">{task.syncStatus.replace(/_/g, ' ')}</td>
      <td className="py-2.5">
        {canManage && (
          <div className="flex flex-wrap gap-1">
            {['open', 'assigned'].includes(task.status) && (
              <button type="button" disabled={busy} onClick={onStart} className="rounded border border-slate-200 px-2 py-0.5 text-xs hover:bg-slate-50 disabled:opacity-50">
                Start
              </button>
            )}
            {task.status === 'in_progress' && (
              <button type="button" disabled={busy} onClick={onComplete} className="rounded bg-command-600 px-2 py-0.5 text-xs text-white hover:bg-command-700 disabled:opacity-50">
                Complete
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
