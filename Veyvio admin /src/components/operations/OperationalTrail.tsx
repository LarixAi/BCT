import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { OperationalTrailStep } from '@/lib/operations/operational-trail'

type OperationalTrailProps = {
  steps: OperationalTrailStep[]
  className?: string
}

const statusClasses: Record<OperationalTrailStep['status'], string> = {
  complete: 'border-border bg-surface text-ink-soft',
  current: 'border-command-400 bg-command-50 text-ink',
  pending: 'border-dashed border-border bg-surface-muted/60 text-muted',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
}

export function OperationalTrail({ steps, className }: OperationalTrailProps) {
  return (
    <nav aria-label="Operational trail" className={cn('overflow-x-auto', className)}>
      <ol className="flex min-w-max items-stretch gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2">
            <TrailStep step={step} />
            {index < steps.length - 1 ? (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function TrailStep({ step }: { step: OperationalTrailStep }) {
  const content = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{step.label}</p>
      <p className="mt-0.5 text-sm font-semibold">{step.value}</p>
    </>
  )

  const className = cn(
    'min-w-[120px] rounded-xl border px-3 py-2 transition',
    statusClasses[step.status],
    step.href && 'hover:border-command-300',
  )

  if (step.href) {
    return (
      <Link to={step.href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
