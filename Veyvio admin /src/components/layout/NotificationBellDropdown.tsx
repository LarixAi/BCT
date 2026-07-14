import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api/client'
import { mapApiNotification } from '@/lib/api/mappers'
import { cn } from '@/lib/cn'
import type { NotificationItem } from '@/lib/types'

const PREVIEW_LIMIT = 6

export function NotificationBellDropdown() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.getNotificationUnreadCount(),
    refetchInterval: 60_000,
  })

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: open,
    refetchInterval: open ? 60_000 : false,
  })

  const items = useMemo(() => notifications.map(mapApiNotification), [notifications])
  const preview = items.slice(0, PREVIEW_LIMIT)
  const unreadCount = unread?.count ?? 0

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.read) {
      markRead.mutate(notification.id)
    }
    setOpen(false)
    if (notification.relatedHref) {
      navigate(notification.relatedHref)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-medium text-command-600 hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            ) : preview.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {preview.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition hover:bg-slate-50',
                        !notification.read && 'bg-command-50/40',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm text-slate-900',
                            !notification.read && 'font-semibold',
                          )}
                        >
                          {notification.title}
                        </p>
                        <time className="shrink-0 text-[10px] text-slate-400">
                          {notification.receivedAt}
                        </time>
                      </div>
                      {notification.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                          {notification.body}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-command-600 hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
