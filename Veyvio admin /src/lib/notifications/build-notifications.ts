import type { ApiNotification } from '@/lib/api/types'
import { mapApiNotification } from '@/lib/api/mappers'
import type { NotificationItem } from '@/lib/types'
import { NOTIFICATION_CATALOG, type NotificationTabId } from './catalog'

export function buildNotificationsInbox(apiRows: ApiNotification[] = []): NotificationItem[] {
  const fromApi = apiRows.map((row) => {
    const mapped = mapApiNotification(row)
    return {
      ...mapped,
      receivedAtIso: row.createdAt,
      ageMinutes: Math.max(0, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 60_000)),
      area: mapped.category === 'vehicle' ? ('vehicles' as const) : mapped.category === 'system' ? ('system' as const) : ('operations' as const),
      source: 'API',
    }
  })

  const byId = new Map<string, NotificationItem>()
  for (const row of [...NOTIFICATION_CATALOG, ...fromApi]) {
    byId.set(row.id, row)
  }

  return [...byId.values()].sort((a, b) => {
    const aTime = a.receivedAtIso ? new Date(a.receivedAtIso).getTime() : 0
    const bTime = b.receivedAtIso ? new Date(b.receivedAtIso).getTime() : 0
    return bTime - aTime
  })
}

export function filterNotifications(
  rows: NotificationItem[],
  opts: { tab: NotificationTabId; search: string; summary?: 'unread' | 'action' | 'critical' | 'assigned' | null },
): NotificationItem[] {
  const q = opts.search.trim().toLowerCase()

  return rows.filter((n) => {
    if (opts.summary === 'unread' && n.read) return false
    if (opts.summary === 'action' && !n.actionRequired) return false
    if (opts.summary === 'critical' && n.priority !== 'urgent') return false
    if (opts.summary === 'assigned' && !n.assignedToMe) return false

    switch (opts.tab) {
      case 'unread':
        if (n.read) return false
        break
      case 'action':
        if (!n.actionRequired) return false
        break
      case 'mentions':
        if (!n.mention && !n.assignedToMe) return false
        break
      case 'system':
        if (n.category !== 'system' && n.area !== 'system') return false
        break
      default:
        break
    }

    if (!q) return true
    return [n.title, n.body, n.relatedRecord, n.driverName, n.vehicleRegistration, n.runRef, n.depot]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })
}

export function notificationKpis(rows: NotificationItem[]) {
  return {
    unread: rows.filter((n) => !n.read).length,
    actionRequired: rows.filter((n) => n.actionRequired && !n.acknowledged).length,
    critical: rows.filter((n) => n.priority === 'urgent' && !n.read).length,
    assignedToMe: rows.filter((n) => n.assignedToMe && !n.read).length,
  }
}

export type NotificationTimeGroup = 'New' | 'Today' | 'Yesterday' | 'Earlier'

export function groupNotifications(rows: NotificationItem[]): { label: NotificationTimeGroup; items: NotificationItem[] }[] {
  const groups: Record<NotificationTimeGroup, NotificationItem[]> = {
    New: [],
    Today: [],
    Yesterday: [],
    Earlier: [],
  }

  for (const row of rows) {
    const mins = row.ageMinutes ?? 9999
    if (mins <= 30) groups.New.push(row)
    else if (mins < 24 * 60) groups.Today.push(row)
    else if (mins < 48 * 60) groups.Yesterday.push(row)
    else groups.Earlier.push(row)
  }

  return (Object.keys(groups) as NotificationTimeGroup[])
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, items: groups[label] }))
}

export function priorityLabel(priority: NotificationItem['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'Critical'
    case 'high':
      return 'Action required'
    case 'normal':
      return 'Warning'
    case 'low':
      return 'Information'
  }
}
