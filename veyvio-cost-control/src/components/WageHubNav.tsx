import { Link, useLocation } from 'react-router-dom'

const HUB = [
  { to: '/wages', label: 'Overview', end: true },
  { to: '/wages/organisation', label: 'Organisation' },
  { to: '/wages/hours', label: 'Driver hours' },
  { to: '/wages/approval', label: 'Approval' },
  { to: '/wages/periods', label: 'Pay periods' },
  { to: '/wages/ledger', label: 'Ledger' },
  { to: '/imports', label: 'Imports' },
]

export function WageHubNav() {
  const { pathname } = useLocation()
  return (
    <div className="page-subnav" role="navigation" aria-label="Wage costs hub">
      {HUB.map((item) => {
        const active = item.end
          ? pathname === item.to
          : pathname === item.to || pathname.startsWith(`${item.to}/`)
        return (
          <Link key={item.to} to={item.to} className={active ? 'page-chip active' : 'page-chip'}>
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
