import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Non-blocking banner so empty live companies keep the full page chrome
 * (KPIs, tables, nav) instead of replacing the screen with a dead-end card.
 */
export function WorkspaceReadyBanner({
  organisationName,
  workspaceError,
  children,
}: {
  organisationName: string
  workspaceError?: string | null
  children?: ReactNode
}) {
  if (workspaceError) {
    return (
      <p className="callout critical">
        Finance API error for <strong>{organisationName}</strong>: {workspaceError}. The layout
        below stays available with empty figures — Demo CEC data is not used.
        {children}
      </p>
    )
  }

  return (
    <p className="callout info">
      No ledger or budget lines are stored for <strong>{organisationName}</strong> yet. Figures
      below are zeros until you import costs, approve a budget, or connect the bank feed.
      {' '}
      <Link to="/imports">Imports</Link>
      {' · '}
      <Link to="/settings/integrations">Integrations</Link>
      {children}
    </p>
  )
}
