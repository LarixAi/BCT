import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react'
import { useState } from 'react'
import { CommandWordmark } from '@/components/brand/CommandWordmark'
import { COMMAND_NAV, isNavGroup } from '@/lib/navigation'
import { cn } from '@/lib/cn'

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation()

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-white/10 bg-midnight text-white transition-all duration-200',
        collapsed ? 'w-[4.5rem]' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-white/10 px-3">
        {!collapsed ? (
          <CommandWordmark inverted compact align="left" />
        ) : (
          <div
            className="grid h-8 w-8 place-items-center rounded-md bg-command-500 text-sm font-black text-white"
            title="Veyvio Command"
          >
            V
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {COMMAND_NAV.map((entry) => {
          if (isNavGroup(entry)) {
            return (
              <NavGroupSection
                key={entry.label}
                label={entry.label}
                collapsed={collapsed}
                currentPath={location.pathname}
                children={entry.children}
              />
            )
          }
          return null
        })}
      </nav>
    </aside>
  )
}

function NavGroupSection({
  label,
  children,
  collapsed,
  currentPath,
}: {
  label: string
  children: Array<{ label: string; href: string }>
  collapsed: boolean
  currentPath: string
}) {
  const hasActive = children.some((c) => c.href === currentPath || (c.href !== '/' && currentPath.startsWith(c.href)))
  const [open, setOpen] = useState(hasActive || label === 'Command')

  if (collapsed) {
    return (
      <div className="mb-2">
        {children.map((child) => (
          <NavItem key={child.href} {...child} active={isActive(child.href, currentPath)} collapsed />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55 hover:bg-white/5 hover:text-white/80"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((child) => (
            <NavItem key={child.href} {...child} active={isActive(child.href, currentPath)} />
          ))}
        </div>
      )}
    </div>
  )
}

function NavItem({
  href,
  label,
  active,
  collapsed,
}: {
  href: string
  label: string
  active: boolean
  collapsed?: boolean
}) {
  return (
    <Link
      to={href}
      title={collapsed ? label : undefined}
      className={cn(
        'block rounded-md text-sm transition',
        collapsed ? 'px-2 py-2 text-center text-[10px] leading-tight' : 'px-3 py-2',
        active
          ? 'bg-command-500 font-semibold text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white',
      )}
    >
      {collapsed ? label.split(' ')[0] : label}
    </Link>
  )
}

function isActive(href: string, currentPath: string) {
  if (href === '/') return currentPath === '/'
  return currentPath === href || currentPath.startsWith(`${href}/`)
}
