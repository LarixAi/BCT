import type { YardTaskStatus } from '@/lib/yard/types'
import { yardTaskProgressLabel, yardTaskProgressPercent } from '@/lib/yard/task-progress'

export function YardTaskProgress({ status }: { status: YardTaskStatus }) {
  const percent = yardTaskProgressPercent(status)
  const label = yardTaskProgressLabel(status)

  return (
    <div className="min-w-[120px] space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-ink-soft">{label}</span>
        <span className="tabular-nums text-muted">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-command-600 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
