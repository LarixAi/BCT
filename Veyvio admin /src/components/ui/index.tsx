import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { OperationalHealth, ExceptionSeverity, NotificationPriority, ConnectionStatus } from '@/lib/types'

const healthConfig: Record<OperationalHealth, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'bg-ready/10 text-ready border-ready/25' },
  attention: { label: 'Attention required', className: 'bg-attention/10 text-attention border-attention/25' },
  risk: { label: 'Operational risk', className: 'bg-attention/15 text-attention border-attention/30' },
  critical: { label: 'Critical disruption', className: 'bg-critical/10 text-critical border-critical/25' },
  unavailable: { label: 'Data unavailable', className: 'bg-page text-muted border-border' },
}

const severityConfig: Record<ExceptionSeverity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-critical/15 text-critical' },
  high: { label: 'High', className: 'bg-vor/15 text-vor' },
  medium: { label: 'Medium', className: 'bg-attention/15 text-attention' },
  low: { label: 'Information', className: 'bg-command-50 text-command-700' },
}

const priorityConfig: Record<NotificationPriority, { label: string; className: string }> = {
  urgent: { label: 'Critical', className: 'bg-critical/15 text-critical' },
  high: { label: 'Action required', className: 'bg-attention/15 text-attention' },
  normal: { label: 'Warning', className: 'bg-attention/10 text-attention' },
  low: { label: 'Information', className: 'bg-command-50 text-command-700' },
}

const connectionConfig: Record<ConnectionStatus, { label: string; className: string; dot: string }> = {
  live: { label: 'Live', className: 'text-ready', dot: 'bg-ready' },
  reconnecting: { label: 'Reconnecting', className: 'text-attention', dot: 'bg-attention animate-pulse' },
  delayed: { label: 'Updates delayed', className: 'text-attention', dot: 'bg-attention' },
  offline: { label: 'Offline', className: 'text-critical', dot: 'bg-critical' },
}

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: 'health' | 'severity' | 'priority' | 'connection'
  value: OperationalHealth | ExceptionSeverity | NotificationPriority | ConnectionStatus
  className?: string
}) {
  if (kind === 'health') {
    const cfg = healthConfig[value as OperationalHealth]
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium', cfg.className, className)}>
        {cfg.label}
      </span>
    )
  }
  if (kind === 'severity') {
    const cfg = severityConfig[value as ExceptionSeverity]
    return <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', cfg.className, className)}>{cfg.label}</span>
  }
  if (kind === 'priority') {
    const cfg = priorityConfig[value as NotificationPriority]
    return <span className={cn('rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide', cfg.className, className)}>{cfg.label}</span>
  }
  const cfg = connectionConfig[value as ConnectionStatus]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', cfg.className, className)}>
      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} aria-hidden />
      {cfg.label}
    </span>
  )
}

export function KpiCardView({
  label,
  value,
  sublabel,
  tone = 'default',
  href,
}: {
  label: string
  value: number
  sublabel?: string
  tone?: 'default' | 'warning' | 'danger' | 'success'
  href: string
}) {
  const toneClasses = {
    default: 'border-border hover:border-command-500',
    warning: 'border-attention/30 bg-attention/5 hover:border-attention',
    danger: 'border-critical/30 bg-critical/5 hover:border-critical',
    success: 'border-ready/30 bg-ready/5 hover:border-ready',
  }

  return (
    <Link
      to={href}
      className={cn(
        'group block rounded-lg border bg-white p-4 transition',
        toneClasses[tone],
      )}
    >
      <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{label}</p>
      {sublabel && <p className="mt-1 text-xs text-muted">{sublabel}</p>}
      <p className="mt-2 text-xs font-medium text-command-600 opacity-0 transition group-hover:opacity-100">
        View details →
      </p>
    </Link>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  flush?: boolean
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-white', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-page px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  )
}

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <p className="mt-6 rounded-lg border border-dashed border-border-strong bg-white px-4 py-8 text-sm text-muted">
        This module will be built in a later phase.
      </p>
    </div>
  )
}
