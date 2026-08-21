import type { ReactNode } from 'react'
import { formatMoney } from '../domain/money'
import type { CostLifecycleStatus } from '../domain/types'
import { statusLabel } from '../lib/labels'

export function MoneyText({
  amountMinor,
  status,
  className = '',
}: {
  amountMinor: number
  status?: CostLifecycleStatus
  className?: string
}) {
  return (
    <span className={`money ${className}`.trim()}>
      {formatMoney(amountMinor)}
      {status ? <span className="money-status"> · {statusLabel(status)}</span> : null}
    </span>
  )
}

export function StatusPill({
  tone,
  children,
}: {
  tone: 'healthy' | 'attention' | 'critical' | 'info' | 'neutral'
  children: ReactNode
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}
