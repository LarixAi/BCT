import { Link, useLocation } from 'react-router-dom'
import { FINANCIAL_VIEWS } from '../domain/financial-views'

/** Shared IA for the four ledger-derived financial views. */
export function FinancialViewsNav() {
  const location = useLocation()
  return (
    <div className="page-subnav" role="navigation" aria-label="Financial views">
      {FINANCIAL_VIEWS.map((view) => {
        const active =
          location.pathname === view.route ||
          (view.route === '/budgets' && location.pathname.startsWith('/budgets'))
        return (
          <Link
            key={view.id}
            to={view.route}
            className={active ? 'page-chip active' : 'page-chip'}
            title={`${view.question} — ${view.basis}`}
          >
            {view.label}
          </Link>
        )
      })}
      <span className="page-subnav-sep" aria-hidden />
      <Link
        to="/budgets/quarterly"
        className={
          location.pathname.startsWith('/budgets/quarterly') ? 'page-chip active' : 'page-chip quiet'
        }
      >
        Quarterly review
      </Link>
      <Link
        to="/board-pack"
        className={location.pathname === '/board-pack' ? 'page-chip active' : 'page-chip quiet'}
      >
        Board pack
      </Link>
    </div>
  )
}
