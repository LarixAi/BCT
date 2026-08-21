import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { MoneyText } from './Money'
import { useCostStore } from '../data/CostStore'
import { formatDate } from '../lib/labels'
import { useAuth } from '../auth/AuthContext'
import { financeRoleCanAccessPage, type FinancePage } from '../auth/page-access'

type NavLeaf = {
  to: string
  label: string
  short: string
  icon: IconName
  end?: boolean
  badgeKey?: 'reviews'
  matchPrefixes: string[]
  page: FinancePage
}

type NavSection = { label: string; entries: NavLeaf[] }
type IconName =
  | 'overview'
  | 'costs'
  | 'budget'
  | 'bank'
  | 'reviews'
  | 'breakdown'
  | 'quarterly'
  | 'reports'
  | 'audit'
  | 'governance'
  | 'imports'
  | 'settings'

const SIDEBAR_COLLAPSE_KEY = 'veyvio-cc-sidebar-collapsed'

/**
 * Finance navigation aligned to the approved sidebar concept:
 * daily work first, then analysis, then assurance, with low-frequency admin at the bottom.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Daily work',
    entries: [
      {
        to: '/',
        label: 'Overview',
        short: 'Ov',
        icon: 'overview',
        end: true,
        matchPrefixes: ['/'],
        page: 'overview',
      },
      {
        to: '/costs',
        label: 'All costs',
        short: 'AC',
        icon: 'costs',
        matchPrefixes: [
          '/costs',
          '/fuel',
          '/maintenance',
          '/wages',
          '/operating',
          '/vehicles',
          '/suppliers',
          '/commitments',
        ],
        page: 'costs',
      },
      {
        to: '/budget-forecast',
        label: 'Budget & forecast',
        short: 'BF',
        icon: 'budget',
        matchPrefixes: ['/budget-forecast', '/budgets', '/forecast'],
        page: 'budgets',
      },
      {
        to: '/cash-bank',
        label: 'Cash & bank',
        short: 'CB',
        icon: 'bank',
        matchPrefixes: ['/cash-bank', '/cash-flow', '/bank'],
        page: 'bank',
      },
      {
        to: '/reviews',
        label: 'Reviews',
        short: 'Rv',
        icon: 'reviews',
        badgeKey: 'reviews',
        matchPrefixes: ['/reviews'],
        page: 'reviews',
      },
    ],
  },
  {
    label: 'Analyse',
    entries: [
      {
        to: '/cost-breakdown',
        label: 'Cost breakdown',
        short: 'Br',
        icon: 'breakdown',
        matchPrefixes: ['/cost-breakdown', '/management-accounts'],
        page: 'breakdown',
      },
      {
        to: '/quarterly-board',
        label: 'Quarterly & board',
        short: 'QB',
        icon: 'quarterly',
        matchPrefixes: ['/quarterly-board', '/budgets/quarterly', '/board-pack'],
        page: 'quarterly',
      },
      {
        to: '/reports',
        label: 'Reports',
        short: 'Rp',
        icon: 'reports',
        matchPrefixes: ['/reports'],
        page: 'reports',
      },
    ],
  },
  {
    label: 'Assurance',
    entries: [
      {
        to: '/audit-evidence',
        label: 'Audit & evidence',
        short: 'Au',
        icon: 'audit',
        matchPrefixes: ['/audit-evidence', '/audit'],
        page: 'audit',
      },
      {
        to: '/governance',
        label: 'CLG governance',
        short: 'Cg',
        icon: 'governance',
        matchPrefixes: ['/governance'],
        page: 'governance',
      },
    ],
  },
]

const FOOTER_LINKS: NavLeaf[] = [
  { to: '/imports', label: 'Imports', short: 'Im', icon: 'imports', matchPrefixes: ['/imports'], page: 'imports' },
  { to: '/settings', label: 'Settings', short: 'Se', icon: 'settings', matchPrefixes: ['/settings'], page: 'settings_general' },
]

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    return v === '1'
  } catch {
    return fallback
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function pathInPrefixes(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)),
  )
}

function NavIcon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'overview':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M3 4.5h6v5H3zM11 4.5h6v3H11zM11 9.5h6v6H11zM3 11.5h6v4H3z" /></svg>
    case 'costs':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M5 3.5h8l3 3v10H5z" /><path {...common} d="M13 3.5v3h3M7.5 10h5M7.5 13h5" /></svg>
    case 'budget':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M4 15.5V10M9 15.5V6.5M14 15.5V8.5M3 16.5h14" /></svg>
    case 'bank':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M3 7.5 10 3l7 4.5M4.5 8.5v6M8.5 8.5v6M11.5 8.5v6M15.5 8.5v6M3 16.5h14" /></svg>
    case 'reviews':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M4 10l3.2 3.2L16 4.5" /></svg>
    case 'breakdown':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M3.5 6.5h13M3.5 10h13M3.5 13.5h13" /><path {...common} d="M6 4v12M10 4v12" /></svg>
    case 'quarterly':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M4 5.5h12v9H4z" /><path {...common} d="M7 5.5V3.5M13 5.5V3.5M7 9h6M7 12h3" /></svg>
    case 'reports':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M5 16V8M10 16V4M15 16v-6M4 16.5h12" /></svg>
    case 'audit':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M10 3.5 15.5 5.5v4c0 3.2-2.1 5.4-5.5 7-3.4-1.6-5.5-3.8-5.5-7v-4z" /><path {...common} d="m7.8 10.1 1.5 1.5 3-3" /></svg>
    case 'governance':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M3 16.5h14M4.5 8.5v6M8.5 8.5v6M11.5 8.5v6M15.5 8.5v6M3 7.5 10 3l7 4.5" /></svg>
    case 'imports':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M10 3.5v9" /><path {...common} d="m6.8 9.3 3.2 3.2 3.2-3.2" /><path {...common} d="M4 16.5h12" /></svg>
    case 'settings':
      return <svg viewBox="0 0 20 20" aria-hidden><path {...common} d="M10 6.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z" /><path {...common} d="M10 3.5v1.5M10 15v1.5M4.7 5.2l1 1M14.3 13.8l1 1M3.5 10H5M15 10h1.5M4.7 14.8l1-1M14.3 6.2l1-1" /></svg>
  }
}

function NavLeafLink({
  item,
  collapsed,
  openReviews,
  onNavigate,
}: {
  item: NavLeaf
  collapsed: boolean
  openReviews: number
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const badge = item.badgeKey === 'reviews' && openReviews > 0 ? openReviews : null
  const active = item.end ? pathname === item.to : pathInPrefixes(pathname, item.matchPrefixes)
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={item.label}
      onClick={onNavigate}
      className={() => ['nav-link', active ? 'active' : ''].filter(Boolean).join(' ')}
    >
      {collapsed ? (
        <>
          <span className="nav-link-icon" aria-hidden>
            <NavIcon name={item.icon} />
          </span>
          <span className="nav-link-short" aria-hidden>
            {item.short}
          </span>
          <span className="sr-only">{item.label}</span>
        </>
      ) : (
        <>
          <span className="nav-link-icon" aria-hidden>
            <NavIcon name={item.icon} />
          </span>
          <span className="nav-link-label">{item.label}</span>
        </>
      )}
      {badge != null ? (
        <span className="nav-badge" aria-label={`${badge} open reviews`}>
          {collapsed ? '' : badge}
        </span>
      ) : null}
    </NavLink>
  )
}

function NavSections({
  openReviews,
  collapsed,
  role,
  onNavigate,
}: {
  openReviews: number
  collapsed: boolean
  role: NonNullable<ReturnType<typeof useAuth>['activeMembership']>['role']
  onNavigate?: () => void
}) {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    entries: section.entries.filter((entry) => financeRoleCanAccessPage(role, entry.page)),
  })).filter((section) => section.entries.length > 0)
  return (
    <>
      {sections.map((section) => (
        <div key={section.label} className="nav-section">
          {!collapsed ? <div className="nav-section-label">{section.label}</div> : null}
          <div className="nav-section-items">
            {section.entries.map((entry) => (
              <NavLeafLink
                key={entry.to}
                item={entry}
                collapsed={collapsed}
                openReviews={openReviews}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export function AppShell() {
  const auth = useAuth()
  const { organisation, budget, lastValidSnapshot, reviews } = useCostStore()
  const openReviews = reviews.filter((r) => r.state === 'open').length
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => readFlag(SIDEBAR_COLLAPSE_KEY, false))
  const navId = useId()

  useEffect(() => {
    setNavOpen(false)
    setAccountOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen && !accountOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNavOpen(false)
        setAccountOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen, accountOpen])

  useEffect(() => {
    writeFlag(SIDEBAR_COLLAPSE_KEY, collapsed)
  }, [collapsed])

  const snap = lastValidSnapshot
  const remainingTone =
    snap && snap.projectedRemainingMinor < 0 ? 'critical' : snap ? 'healthy' : 'neutral'
  const compact = collapsed && !navOpen

  const shellClass = [
    'app-shell',
    navOpen ? 'nav-open' : '',
    collapsed ? 'sidebar-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {navOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside className="sidebar" id={navId} aria-label="Cost Control navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            V
          </div>
          {!compact ? (
            <div className="brand-text">
              <div className="brand-name">Veyvio Finance</div>
              <div className="brand-sub">Cost control</div>
            </div>
          ) : null}
          <button
            type="button"
            className="sidebar-collapse"
            aria-pressed={collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="nav">
          <NavSections
            openReviews={openReviews}
            collapsed={compact}
            role={auth.activeMembership!.role}
            onNavigate={() => setNavOpen(false)}
          />
        </nav>

        <div className="sidebar-utils">
          {!compact ? <div className="nav-section-label">Workspace</div> : null}
          {FOOTER_LINKS.filter((item) =>
            financeRoleCanAccessPage(auth.activeMembership!.role, item.page),
          ).map((item) => (
            <NavLeafLink
              key={item.to}
              item={item}
              collapsed={compact}
              openReviews={openReviews}
              onNavigate={() => setNavOpen(false)}
            />
          ))}
        </div>

        <div className="sidebar-foot">
          {!compact ? (
            <div className="org-card">
              <div className="org-avatar" aria-hidden>
                {organisation.tradingName.slice(0, 1)}
              </div>
              <div className="org-card-body">
                <div className="org-name">{organisation.tradingName}</div>
                <div className="muted small">{budget.code}</div>
                <div className="muted small">
                  Snapshot {snap ? formatDate(snap.createdAt) : '—'}
                </div>
              </div>
            </div>
          ) : (
            <div className="org-name collapsed-only" title={organisation.tradingName}>
              {organisation.tradingName.slice(0, 1)}
            </div>
          )}
          {!compact ? (
            <div className="boundary-note">Finances only. No dispatch or booking in this app.</div>
          ) : null}
          {!compact ? (
            <button
              type="button"
              className="sidebar-signout"
              onClick={() => void auth.signOut()}
            >
              Sign out
            </button>
          ) : null}
        </div>
      </aside>

      <div className="workspace">
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={navOpen}
              aria-controls={navId}
              onClick={() => setNavOpen((v) => !v)}
            >
              <span className="nav-toggle-bars" aria-hidden />
              Menu
            </button>
            <div className="shell-context">
              <div className="shell-org">{organisation.tradingName}</div>
              <div className="shell-meta">
                {budget.code} · {budget.name} · FY {budget.financialYear}
              </div>
            </div>
          </div>

          <div className="shell-topbar-right">
            <div className={`shell-stat shell-budget-stat ${remainingTone}`}>
              <span className="shell-stat-label">Projected remaining</span>
              <span className="shell-stat-value">
                {snap ? <MoneyText amountMinor={snap.projectedRemainingMinor} /> : '—'}
              </span>
            </div>

            {openReviews > 0 ? (
              <Link className="shell-action attention" to="/reviews">
                {openReviews} review{openReviews === 1 ? '' : 's'}
              </Link>
            ) : (
              <span className="shell-action quiet">Reviews clear</span>
            )}

            {financeRoleCanAccessPage(auth.activeMembership!.role, 'imports') ? (
              <Link className="shell-action primary" to="/imports">
                Import costs
              </Link>
            ) : null}

            <div className="account-menu">
              <button
                type="button"
                className="account-trigger"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
              >
                <span className="account-avatar" aria-hidden>
                  {auth.identity?.displayName.slice(0, 1).toUpperCase() ?? 'U'}
                </span>
                <span className="account-trigger-text">
                  <strong>{auth.identity?.displayName ?? 'Finance user'}</strong>
                  <small>
                    {auth.activeMembership?.role.replaceAll('_', ' ') ?? 'No active role'}
                  </small>
                </span>
                <span className="account-chevron" aria-hidden>
                  {accountOpen ? '▴' : '▾'}
                </span>
              </button>

              {accountOpen ? (
                <>
                  <button
                    type="button"
                    className="account-menu-backdrop"
                    aria-label="Close account menu"
                    onClick={() => setAccountOpen(false)}
                  />
                  <div className="account-popover" role="menu">
                    <div className="account-popover-head">
                      <strong>{auth.identity?.displayName}</strong>
                      <span>{auth.identity?.email}</span>
                    </div>
                    <div className="account-popover-context">
                      <span>Active company</span>
                      <strong>{auth.activeMembership?.organisationName ?? 'None selected'}</strong>
                    </div>
                    <Link
                      className="account-menu-item"
                      role="menuitem"
                      to="/auth/company"
                      onClick={() => setAccountOpen(false)}
                    >
                      Switch company
                    </Link>
                    <button
                      type="button"
                      className="account-menu-item danger"
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false)
                        void auth.signOut()
                      }}
                    >
                      Sign out securely
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="main" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
