import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import type { OperationalHealth, ExceptionSeverity, NotificationPriority, ConnectionStatus } from '@/lib/types'

const healthConfig: Record<OperationalHealth, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  attention: { label: 'Attention required', className: 'bg-amber-50 text-amber-900 border-amber-200' },
  risk: { label: 'Operational risk', className: 'bg-orange-50 text-orange-900 border-orange-200' },
  critical: { label: 'Critical disruption', className: 'bg-red-50 text-red-800 border-red-200' },
  unavailable: { label: 'Data unavailable', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const severityConfig: Record<ExceptionSeverity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-900' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-900' },
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700' },
}

const priorityConfig: Record<NotificationPriority, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-900' },
  normal: { label: 'Normal', className: 'bg-slate-100 text-slate-700' },
  low: { label: 'Low', className: 'bg-slate-50 text-slate-600' },
}

const connectionConfig: Record<ConnectionStatus, { label: string; className: string; dot: string }> = {
  live: { label: 'Live', className: 'text-emerald-700', dot: 'bg-emerald-500' },
  reconnecting: { label: 'Reconnecting', className: 'text-amber-700', dot: 'bg-amber-500 animate-pulse' },
  delayed: { label: 'Updates delayed', className: 'text-amber-700', dot: 'bg-amber-500' },
  offline: { label: 'Offline', className: 'text-red-700', dot: 'bg-red-500' },
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
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', cfg.className, className)}>
        {cfg.label}
      </span>
    )
  }
  if (kind === 'severity') {
    const cfg = severityConfig[value as ExceptionSeverity]
    return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', cfg.className, className)}>{cfg.label}</span>
  }
  if (kind === 'priority') {
    const cfg = priorityConfig[value as NotificationPriority]
    return <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide', cfg.className, className)}>{cfg.label}</span>
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
    default: 'border-slate-200 hover:border-command-500',
    warning: 'border-amber-200 bg-amber-50/40 hover:border-amber-400',
    danger: 'border-red-200 bg-red-50/40 hover:border-red-400',
    success: 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400',
  }

  return (
    <Link
      to={href}
      className={cn(
        'group block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md',
        toneClasses[tone],
      )}
    >
      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-500">{sublabel}</p>}
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
    <section className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? undefined : 'p-5'}>{children}</div>
    </section>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-500">
        This module will be built in a later phase.
      </p>
    </div>
  )
}
