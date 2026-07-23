import type { ReactNode } from 'react'
import { ONBOARDING_STEPS } from '@/lib/drivers/constants'
import type { OnboardingStepId } from '@/lib/drivers/types'
import { cn } from '@/lib/cn'
import { DriverBackLink } from '../components/DriverProfileHeader'
import { STEP_INDEX } from './driver-onboarding.constants'

export function DriverOnboardingLayout({
  title,
  subtitle,
  statusLine,
  currentStep,
  error,
  children,
  footer,
}: {
  title: string
  subtitle: string
  statusLine?: string | null
  currentStep: OnboardingStepId
  error?: string | null
  children: ReactNode
  footer: ReactNode
}) {
  const stepIdx = STEP_INDEX[currentStep]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DriverBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        {statusLine ? <p className="mt-2 text-xs text-muted">{statusLine}</p> : null}
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ONBOARDING_STEPS.map((s, i) => {
          const active = s.id === currentStep
          const done = i < stepIdx
          return (
            <li
              key={s.id}
              className={cn(
                'rounded-lg border px-2 py-2 text-center',
                active
                  ? 'border-command-500 bg-command-50'
                  : done
                    ? 'border-ready/40 bg-ready/5'
                    : 'border-border bg-surface',
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{i + 1}</p>
              <p className={cn('text-xs font-semibold', active ? 'text-command-700' : 'text-ink')}>
                {s.label}
              </p>
            </li>
          )
        })}
      </ol>

      {error ? <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p> : null}

      {children}
      {footer}
    </div>
  )
}
