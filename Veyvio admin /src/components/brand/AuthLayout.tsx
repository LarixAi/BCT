import type { ReactNode } from 'react'
import { CommandWordmark } from '@/components/brand/CommandWordmark'
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
    <div className="flex min-h-screen bg-page">
      <aside className="relative hidden w-[42%] shrink-0 flex-col justify-between bg-midnight px-10 py-12 text-white lg:flex">
        <CommandWordmark inverted />
        <div className="max-w-sm">
          <p className="text-2xl font-semibold tracking-tight text-white">
            Operational confidence for every shift
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Plan, dispatch, and monitor transport operations from one Command centre — clear status, one primary action, trustworthy records.
          </p>
        </div>
        <p className="text-xs text-white/40">Veyvio Command · Connected transport operations</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className={cn('w-full', wide ? 'max-w-lg' : 'max-w-md')}>
          <div className="mb-8 lg:hidden">
            <CommandWordmark />
          </div>
          <div className="rounded-2xl border border-border bg-white p-8">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-ink">{title}</h1>
              {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
              {isMockApi && (
                <p className="mt-3 rounded-lg bg-ready/10 px-3 py-2 text-xs text-ready">
                  Demo mode — no live backend required.
                </p>
              )}
            </div>
            {children}
          </div>
          {footer}
          {!isMockApi && (
            <p className="mt-4 text-center text-[11px] text-muted/80">
              Connected to Command API
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export const authInputClass =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink shadow-none placeholder:text-muted focus:border-command-500 focus:outline-none focus:ring-2 focus:ring-command-500/20'

export const authPrimaryButtonClass =
  'w-full rounded-lg bg-midnight px-4 py-2.5 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60'
