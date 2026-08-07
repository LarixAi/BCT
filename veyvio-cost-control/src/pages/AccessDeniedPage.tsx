import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AccessDeniedPage() {
  const { activeMembership } = useAuth()
  const [params] = useSearchParams()
  const requestedPath = params.get('from')
  return (
    <div className="page access-denied-page">
      <section className="access-denied-card">
        <div className="access-denied-mark" aria-hidden>!</div>
        <p className="eyebrow">Access restricted</p>
        <h1>You do not have permission to open this page</h1>
        <p className="muted">
          Your current role is{' '}
          <strong>{activeMembership?.role.replaceAll('_', ' ') ?? 'not assigned'}</strong>.
          {requestedPath ? ` Access to ${requestedPath} is not included in that role.` : ''}
        </p>
        <p>
          If you need access, ask a finance administrator to review your company membership and
          role. Permission changes must be authorised and recorded.
        </p>
        <div className="row-actions">
          <Link className="btn-primary" to="/">Return to overview</Link>
          <Link className="btn-secondary" to="/auth/company">Switch company</Link>
        </div>
      </section>
    </div>
  )
}
