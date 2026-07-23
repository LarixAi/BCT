import type { ReactNode } from 'react'
import { CommandAuthHero } from '@/components/brand/CommandWordmark'
import { isMockApi } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Shared branded shell for public auth / setup flows. */
export function AuthLayout({
  title,
  subtitle,
  children,
  wide,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  wide?: boolean
  footer?: ReactNode
}) {
  return (
    <div
      data-theme="light"
      className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-10 text-ink sm:px-6"
    >
      <div className={cn('w-full', wide ? 'max-w-lg' : 'max-w-md')}>
        <CommandAuthHero className="mb-8" />

        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
          {isMockApi ? (
            <p className="mt-3 rounded-xl bg-ready/10 px-3 py-2 text-xs text-ready">
              Demo mode — no live backend required.
            </p>
          ) : null}
        </div>

        {children}

        {footer}

        {!isMockApi ? (
          <p className="mt-6 text-center text-[11px] text-muted/80">Connected to Command API</p>
        ) : null}
      </div>
    </div>
  )
}

export const authInputClass =
  'h-11 w-full rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3.5 text-sm text-ink shadow-none placeholder:text-[#9CA3AF] focus:border-command-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-command-500/15'

export const authPrimaryButtonClass =
  'h-12 w-full rounded-xl border border-transparent bg-command-600 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgb(47_107_255/0.22)] transition hover:bg-command-700 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:shadow-none'

export const authLinkClass = 'font-medium text-command-600 hover:text-command-700 hover:underline'
