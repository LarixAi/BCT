import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api/client'
import { mapApiNotification } from '@/lib/api/mappers'
import { NOTIFICATION_TABS } from '@/lib/mock-data'
import type { NotificationItem } from '@/lib/types'

export function NotificationsPage() {
  const [tab, setTab] = useState('all')
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading, error, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    refetchInterval: 60_000,
  })

  const mapped = useMemo(() => notifications.map(mapApiNotification), [notifications])

  const filtered = useMemo(() => {
    switch (tab) {
      case 'unread':
        return mapped.filter((n) => !n.read)
      case 'action':
        return mapped.filter((n) => n.actionRequired)
      case 'safety':
        return mapped.filter((n) => n.category === 'safety' || n.priority === 'urgent')
      case 'system':
        return mapped.filter((n) => n.category === 'system')
      case 'archived':
        return mapped.filter((n) => n.read && !n.actionRequired)
      default:
        return mapped
    }
  }, [mapped, tab])

  const unreadCount = mapped.filter((n) => !n.read).length

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-600">Live notifications from the veymo platform</p>
        </div>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || unreadCount === 0}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Mark all as read
        </button>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load notifications'}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {NOTIFICATION_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              tab === t.id
                ? 'bg-command-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {t.label}
            {t.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-slate-500">Loading notifications…</p>}

          {!isLoading && filtered.length === 0 ? (
            <SectionCard title="No notifications">
              <p className="text-sm text-slate-500">Nothing in this view right now.</p>
            </SectionCard>
          ) : (
            filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={() => markRead.mutate(notification.id)}
              />
            ))
          )}
        </div>

        <SectionCard title="Preferences" description="Configure how you receive alerts">
          <div className="space-y-3 text-sm">
            <PreferenceRow label="Operational alerts" inApp email />
            <PreferenceRow label="Safety alerts" inApp email push mandatory />
            <PreferenceRow label="Assignment updates" inApp />
            <PreferenceRow label="Daily summary" email />
            <p className="pt-2 text-xs text-slate-500">
              Mandatory safety alerts cannot be disabled per company policy.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: NotificationItem
  onMarkRead: () => void
}) {
  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm transition',
        !notification.read && 'border-l-4 border-l-command-500',
        notification.read ? 'border-slate-200' : 'border-slate-200 bg-command-50/30',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusBadge kind="priority" value={notification.priority} />
          <span className="text-xs capitalize text-slate-500">{notification.category}</span>
        </div>
        <span className="text-xs text-slate-500">{notification.receivedAt}</span>
      </div>

      <h3 className="mt-2 font-semibold text-slate-900">{notification.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{notification.body}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ReadState read={notification.read} />
        <AckState
          acknowledged={notification.acknowledged}
          actionRequired={notification.actionRequired}
        />
        {!notification.read && (
          <button
            type="button"
            onClick={onMarkRead}
            className="text-xs font-medium text-command-600 hover:underline"
          >
            Mark read
          </button>
        )}
      </div>

      {notification.relatedHref && (
        <div className="mt-3">
          <Link
            to={notification.relatedHref}
            className="text-xs font-medium text-command-600 hover:underline"
          >
            Open related record →
          </Link>
        </div>
      )}
    </article>
  )
}

function ReadState({ read }: { read: boolean }) {
  return (
    <span className={cn('text-xs', read ? 'text-slate-400' : 'font-medium text-command-700')}>
      {read ? 'Read' : 'Unread'}
    </span>
  )
}

function AckState({
  acknowledged,
  actionRequired,
}: {
  acknowledged: boolean
  actionRequired: boolean
}) {
  if (actionRequired && !acknowledged) {
    return <span className="text-xs font-medium text-amber-700">Action required</span>
  }
  if (acknowledged) {
    return <span className="text-xs text-emerald-700">Read</span>
  }
  return null
}

function PreferenceRow({
  label,
  inApp,
  email,
  push,
  mandatory,
}: {
  label: string
  inApp?: boolean
  email?: boolean
  push?: boolean
  mandatory?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-700">{label}</span>
      <div className="flex gap-2 text-[10px] text-slate-500">
        {inApp && <span className="rounded bg-slate-100 px-1.5 py-0.5">In-app</span>}
        {email && <span className="rounded bg-slate-100 px-1.5 py-0.5">Email</span>}
        {push && <span className="rounded bg-slate-100 px-1.5 py-0.5">Push</span>}
        {mandatory && <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">Required</span>}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
