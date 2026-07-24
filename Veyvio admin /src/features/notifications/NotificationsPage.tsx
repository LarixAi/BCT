import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import {
  buildNotificationsInbox,
  filterNotifications,
  groupNotifications,
  notificationKpis,
  priorityLabel,
} from '@/lib/notifications/build-notifications'
import { NOTIFICATION_TABS, type NotificationTabId } from '@/lib/notifications/catalog'
import type { NotificationItem } from '@/lib/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


type SummaryFocus = 'unread' | 'action' | 'critical' | 'assigned' | null

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<NotificationTabId>('all')
  const [search, setSearch] = useState('')
  const [summaryFocus, setSummaryFocus] = useState<SummaryFocus>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [localRead, setLocalRead] = useState<Record<string, boolean>>({})

  const { data: apiNotifications = [], isLoading, error, isError, refetch, isFetching } = useQuery({
    queryKey: tKey(['notifications']),
    queryFn: () => api.getNotifications(),
    refetchInterval: 60_000,
  })

  const inbox = useMemo(() => {
    const built = buildNotificationsInbox(apiNotifications)
    return built.map((n) =>
      localRead[n.id] === undefined ? n : { ...n, read: localRead[n.id], acknowledged: localRead[n.id] ? n.acknowledged : n.acknowledged },
    )
  }, [apiNotifications, localRead])

  const filtered = useMemo(
    () => filterNotifications(inbox, { tab, search, summary: summaryFocus }),
    [inbox, tab, search, summaryFocus],
  )

  const groups = useMemo(() => groupNotifications(filtered), [filtered])
  const kpis = useMemo(() => notificationKpis(inbox), [inbox])
  const selected = filtered.find((n) => n.id === selectedId) ?? inbox.find((n) => n.id === selectedId) ?? null

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      setLocalRead((prev) => {
        const next = { ...prev }
        for (const n of inbox) next[n.id] = true
        return next
      })
      queryClient.invalidateQueries({ queryKey: tKey(['notifications']) })
    },
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: (_data, id) => {
      setLocalRead((prev) => ({ ...prev, [id]: true }))
      queryClient.invalidateQueries({ queryKey: tKey(['notifications']) })
    },
  })

  function openNotification(n: NotificationItem) {
    setSelectedId(n.id)
    if (!n.read) markRead.mutate(n.id)
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
            <p className="mt-0.5 text-sm text-ink-soft">
              Operational updates, alerts and items requiring your attention.
            </p>
            <p className={cn('mt-1 text-xs', isFetching ? 'text-amber-800' : 'text-emerald-700')}>
              {isFetching ? 'Refreshing alerts…' : `${kpis.unread} unread · system alerts, not conversations`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || kpis.unread === 0}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
            >
              Mark all as read
            </button>
            <Link
              to="/settings/notifications"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Preferences
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Refresh
            </button>
            <Link
              to="/messages"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Messages
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts, drivers, vehicles…"
            className="w-full max-w-xs rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {NOTIFICATION_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id)
                  setSummaryFocus(null)
                }}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                  tab === t.id ? 'bg-command-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-border',
                )}
              >
                {t.label}
                {t.id === 'unread' && kpis.unread > 0 ? ` (${kpis.unread})` : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load notifications'}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            { id: 'unread' as const, title: 'Unread', value: kpis.unread },
            { id: 'action' as const, title: 'Action required', value: kpis.actionRequired, tone: 'warning' as const },
            { id: 'critical' as const, title: 'Critical', value: kpis.critical, tone: 'danger' as const },
            { id: 'assigned' as const, title: 'Assigned to me', value: kpis.assignedToMe },
          ] as const
        ).map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setSummaryFocus((prev) => (prev === card.id ? null : card.id))}
            className={cn(
              'rounded-xl border bg-surface p-3 text-left transition hover:border-command-400',
              summaryFocus === card.id ? 'border-command-500 ring-1 ring-command-500' : 'border-border',
              'tone' in card && card.tone === 'danger' && summaryFocus !== card.id && 'border-red-200',
              'tone' in card && card.tone === 'warning' && summaryFocus !== card.id && 'border-amber-200',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{card.title}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-bold tabular-nums',
                'tone' in card && card.tone === 'danger'
                  ? 'text-red-800'
                  : 'tone' in card && card.tone === 'warning'
                    ? 'text-amber-800'
                    : 'text-ink',
              )}
            >
              {card.value}
            </p>
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_340px]">
        <SectionCard
          title="Alert feed"
          description="What has happened, and what needs your attention"
          className="flex min-h-0 flex-col overflow-hidden"
          flush
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3">
            {isLoading && <p className="text-sm text-muted">Loading notifications…</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted">
                {tab === 'unread'
                  ? 'You have read all current notifications.'
                  : search
                    ? 'No notifications match the selected filters.'
                    : 'You are all caught up. New operational updates will appear here.'}
              </p>
            )}
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {group.items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(n)}
                        className={cn(
                          'w-full rounded-xl border bg-surface p-3 text-left transition hover:border-command-400',
                          selectedId === n.id ? 'border-command-500 ring-1 ring-command-500' : 'border-border',
                          !n.read && 'border-l-4 border-l-command-500',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <PriorityChip priority={n.priority} />
                          <span className="text-xs text-muted">{n.receivedAt}</span>
                        </div>
                        <p className={cn('mt-1.5 text-sm', !n.read ? 'font-semibold text-ink' : 'font-medium text-ink')}>
                          {n.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{n.body}</p>
                        <p className="mt-2 text-[11px] text-muted">
                          {[n.relatedRecord, n.depot, n.driverName && `Driver ${n.driverName}`, n.vehicleRegistration]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {n.actions?.[0] && (
                          <span className="mt-2 inline-block text-xs font-medium text-command-700">
                            {n.actions[0].label}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>

        <NotificationDetailDrawer
          notification={selected}
          onMarkUnread={() => selected && setLocalRead((prev) => ({ ...prev, [selected.id]: false }))}
          onAcknowledge={() => selected && setLocalRead((prev) => ({ ...prev, [selected.id]: true }))}
        />
      </div>
    </div>
  )
}

function PriorityChip({ priority }: { priority: NotificationItem['priority'] }) {
  const label = priorityLabel(priority)
  const className =
    priority === 'urgent'
      ? 'bg-red-50 text-red-800'
      : priority === 'high'
        ? 'bg-amber-50 text-amber-900'
        : priority === 'normal'
          ? 'bg-amber-50/70 text-amber-800'
          : 'bg-command-50 text-command-800'
  return <span className={cn('rounded px-2 py-0.5 text-[11px] font-semibold', className)}>{label}</span>
}

function NotificationDetailDrawer({
  notification,
  onMarkUnread,
  onAcknowledge,
}: {
  notification: NotificationItem | null
  onMarkUnread: () => void
  onAcknowledge: () => void
}) {
  if (!notification) {
    return (
      <SectionCard title="Notification detail" description="Select an alert to review">
        <p className="text-sm text-muted">
          Clicking a notification opens the linked record. Reading it is not the same as resolving the underlying issue.
        </p>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title={notification.title}
      description={`${priorityLabel(notification.priority)} · ${notification.source ?? notification.category}`}
      className="min-h-0 overflow-hidden"
      flush
    >
      <div className="max-h-[560px] space-y-3 overflow-y-auto p-4 text-sm">
        <p className="text-ink-soft">{notification.body}</p>
        <DetailRow label="Priority" value={priorityLabel(notification.priority)} />
        <DetailRow label="Status" value={notification.read ? 'Read' : 'Unread'} />
        <DetailRow label="Received" value={notification.receivedAt} />
        <DetailRow label="Depot" value={notification.depot ?? '—'} />
        <DetailRow label="Driver" value={notification.driverName ?? '—'} />
        <DetailRow label="Vehicle" value={notification.vehicleRegistration ?? '—'} />
        <DetailRow label="Run / booking" value={notification.runRef ?? notification.bookingRef ?? '—'} />
        <DetailRow label="Source" value={notification.source ?? 'System'} />

        {notification.actionRequired && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Action required — opening this alert marks it read, but the underlying issue stays open until resolved.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {(notification.actions ?? []).map((action) =>
            action.href ? (
              <Link
                key={action.label}
                to={action.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium',
                  action.variant === 'primary'
                    ? 'border border-command-200 bg-command-50 text-command-800 hover:bg-command-100'
                    : 'border border-border hover:bg-surface-muted',
                )}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={onAcknowledge}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
              >
                {action.label}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={onMarkUnread}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
          >
            Mark unread
          </button>
          <Link
            to="/exceptions"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
          >
            Escalate to exception
          </Link>
        </div>
      </div>
    </SectionCard>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
}
