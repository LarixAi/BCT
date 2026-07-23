import { Link, useLocation } from 'react-router-dom'

const NAV = [
  { href: '/platform/companies', label: 'Customers' },
  { href: '/platform/subscriptions', label: 'Subscriptions' },
  { href: '/platform/plans', label: 'Plans' },
  { href: '/platform/support', label: 'Support' },
  { href: '/platform/feature-flags', label: 'Flags' },
  { href: '/platform/audit', label: 'Audit' },
  { href: '/platform/health', label: 'Health' },
]

export function PlatformShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-command-950 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-command-300">VEYVIO PLATFORM</p>
            <h1 className="mt-1 text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-command-100/80">{description}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {NAV.map((item) => {
              const active =
                location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={
                    active
                      ? 'rounded-md bg-white/15 px-3 py-1.5 font-semibold text-white'
                      : 'rounded-md px-3 py-1.5 text-command-100 hover:bg-white/10 hover:text-white'
                  }
                >
                  {item.label}
                </Link>
              )
            })}
            <Link className="rounded-md px-3 py-1.5 text-command-100 hover:text-white" to="/">
              Back to Command
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
