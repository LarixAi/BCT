import { cn } from '@/lib/cn'
import { SCHOOL_ROUTE_STEPS } from '@/lib/school-routes/constants'

export function SchoolRouteStepper({
  currentStep,
  onStepClick,
}: {
  currentStep: number
  onStepClick?: (step: number) => void
}) {
  return (
    <nav aria-label="School route progress" className="overflow-x-auto">
      <ol className="flex min-w-max gap-1">
        {SCHOOL_ROUTE_STEPS.map((step) => {
          const done = step.id < currentStep
          const active = step.id === currentStep
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!onStepClick || step.id > currentStep}
                onClick={() => onStepClick?.(step.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition',
                  active && 'bg-command-600 text-white',
                  done && !active && 'bg-command-50 text-command-800',
                  !active && !done && 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    active && 'bg-surface/20',
                    done && !active && 'bg-command-200 text-command-900',
                    !active && !done && 'bg-surface-muted',
                  )}
                >
                  {done ? '✓' : step.id}
                </span>
                <span className="hidden font-medium sm:inline">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
