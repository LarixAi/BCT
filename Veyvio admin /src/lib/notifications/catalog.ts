import type { NotificationItem } from '@/lib/types'

const minutesAgo = (mins: number) => {
  const d = new Date(Date.now() - mins * 60_000)
  return {
    iso: d.toISOString(),
    label:
      mins < 60
        ? `${mins} minutes ago`
        : mins < 24 * 60
          ? `${Math.round(mins / 60)} hours ago`
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    ageMinutes: mins,
  }
}

/** Rich operational notification catalog — system alerts, not chat. */
export const NOTIFICATION_CATALOG: NotificationItem[] = [
  (() => {
    const t = minutesAgo(4)
    return {
      id: 'N-CAT-ELIG',
      category: 'compliance' as const,
      area: 'compliance' as const,
      title: 'Driver eligibility blocked',
      body: 'James Carter cannot be assigned because his driving licence check has expired before Trip TR-2048.',
      relatedRecord: 'James Carter',
      relatedHref: '/drivers',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'urgent' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      assignedToMe: true,
      driverName: 'James Carter',
      runRef: 'TR-2048',
      depot: 'Croydon',
      source: 'Compliance',
      actions: [
        { label: 'Review driver', href: '/drivers', variant: 'primary' as const },
        { label: 'Open exception', href: '/exceptions?severity=critical', variant: 'secondary' as const },
      ],
    }
  })(),
  (() => {
    const t = minutesAgo(8)
    return {
      id: 'N-CAT-DEFECT',
      category: 'vehicle' as const,
      area: 'defects' as const,
      title: 'Vehicle defect submitted',
      body: 'Driver Michael Brown reported damaged nearside mirror on vehicle LX22 ABC during the pre-use check.',
      relatedRecord: 'LX22 ABC',
      relatedHref: '/defects',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'high' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      driverName: 'Michael Brown',
      vehicleRegistration: 'LX22 ABC',
      depot: 'Croydon',
      source: 'Driver App',
      actions: [
        { label: 'Review defect', href: '/defects', variant: 'primary' as const },
        { label: 'Message driver', href: '/messages?compose=1&to=Michael%20Brown', variant: 'secondary' as const },
      ],
    }
  })(),
  (() => {
    const t = minutesAgo(12)
    return {
      id: 'N-CAT-MSG',
      category: 'messages' as const,
      area: 'messages' as const,
      title: 'New driver message',
      body: 'David Cole sent a message regarding Trip TR-2048.',
      relatedRecord: 'TR-2048',
      relatedHref: '/messages?conversation=conv-david',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'high' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      mention: true,
      driverName: 'David Cole',
      runRef: 'TR-2048',
      depot: 'Wembley',
      source: 'Messages',
      actions: [
        { label: 'Open conversation', href: '/messages?conversation=conv-david', variant: 'primary' as const },
      ],
    }
  })(),
  (() => {
    const t = minutesAgo(18)
    return {
      id: 'N-CAT-LATE',
      category: 'operational' as const,
      area: 'operations' as const,
      title: 'Trip started late',
      body: 'Run AM-104 started 12 minutes late. Four school trips are now at risk.',
      relatedRecord: 'AM-104',
      relatedHref: '/live-operations',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'high' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      assignedToMe: true,
      runRef: 'AM-104',
      depot: 'Wembley',
      source: 'Live Operations',
      actions: [
        { label: 'Open live operations', href: '/live-operations', variant: 'primary' as const },
        { label: 'Open exception', href: '/exceptions', variant: 'secondary' as const },
      ],
    }
  })(),
  (() => {
    const t = minutesAgo(45)
    return {
      id: 'N-CAT-VOR',
      category: 'vehicle' as const,
      area: 'vehicles' as const,
      title: 'Vehicle marked VOR',
      body: 'YX21 ABC was marked VOR following a safety-critical defect. Affected runs need replacement.',
      relatedRecord: 'YX21 ABC',
      relatedHref: '/vehicles',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'urgent' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      vehicleRegistration: 'YX21 ABC',
      depot: 'Wembley',
      source: 'Yard',
      actions: [
        { label: 'Open vehicle', href: '/vehicles', variant: 'primary' as const },
        { label: 'Open exception', href: '/exceptions', variant: 'secondary' as const },
      ],
    }
  })(),
  (() => {
    const t = minutesAgo(90)
    return {
      id: 'N-CAT-LICENCE',
      category: 'compliance' as const,
      area: 'compliance' as const,
      title: 'Driver document expiring',
      body: "Sarah Lewis's driving licence check expires in seven days.",
      relatedRecord: 'Sarah Lewis',
      relatedHref: '/drivers',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'normal' as const,
      read: true,
      acknowledged: false,
      actionRequired: true,
      driverName: 'Sarah Lewis',
      depot: 'Croydon',
      source: 'Compliance',
      actions: [
        { label: 'Review driver', href: '/drivers', variant: 'primary' as const },
        { label: 'Message driver', href: '/messages?compose=1&to=Sarah%20Lewis', variant: 'secondary' as const },
      ],
    }
  })(),
  (() => {
    const t = minutesAgo(120)
    return {
      id: 'N-CAT-MOT',
      category: 'vehicle' as const,
      area: 'vehicles' as const,
      title: 'MOT expires in 14 days',
      body: 'Vehicle YY71 XYZ MOT expires on 31 July 2026.',
      relatedRecord: 'YY71 XYZ',
      relatedHref: '/vehicles',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'normal' as const,
      read: true,
      acknowledged: true,
      actionRequired: false,
      vehicleRegistration: 'YY71 XYZ',
      depot: 'Wembley',
      source: 'Compliance',
      actions: [{ label: 'View vehicle', href: '/vehicles', variant: 'primary' as const }],
    }
  })(),
  (() => {
    const t = minutesAgo(180)
    return {
      id: 'N-CAT-DONE',
      category: 'operational' as const,
      area: 'operations' as const,
      title: 'Trip TR-1982 completed',
      body: 'All passengers delivered successfully.',
      relatedRecord: 'TR-1982',
      relatedHref: '/live-operations',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'low' as const,
      read: true,
      acknowledged: true,
      actionRequired: false,
      runRef: 'TR-1982',
      depot: 'Wembley',
      source: 'Live Operations',
      actions: [{ label: 'View trip', href: '/live-operations', variant: 'primary' as const }],
    }
  })(),
  (() => {
    const t = minutesAgo(240)
    return {
      id: 'N-CAT-SYS',
      category: 'system' as const,
      area: 'system' as const,
      title: 'GPS feed unavailable',
      body: 'Live vehicle positions temporarily unavailable. Trip and driver status updates are still received.',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'high' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      source: 'Integrations',
      actions: [{ label: 'Open live operations', href: '/live-operations', variant: 'primary' as const }],
    }
  })(),
  (() => {
    const t = minutesAgo(400)
    return {
      id: 'N-CAT-MENTION',
      category: 'mentions' as const,
      area: 'operations' as const,
      title: 'You were assigned an exception',
      body: 'Passenger not collected on BK-21831 was assigned to you.',
      relatedRecord: 'BK-21831',
      relatedHref: '/exceptions',
      receivedAt: t.label,
      receivedAtIso: t.iso,
      ageMinutes: t.ageMinutes,
      priority: 'high' as const,
      read: false,
      acknowledged: false,
      actionRequired: true,
      assignedToMe: true,
      mention: true,
      bookingRef: 'BK-21831',
      depot: 'Wembley',
      source: 'Exceptions',
      actions: [{ label: 'Open exception', href: '/exceptions', variant: 'primary' as const }],
    }
  })(),
]

export const NOTIFICATION_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'action', label: 'Action required' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'system', label: 'System' },
] as const

export type NotificationTabId = (typeof NOTIFICATION_TABS)[number]['id']
