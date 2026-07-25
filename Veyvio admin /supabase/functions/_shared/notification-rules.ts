/**
 * Gate 2 notification rules — in-app templates by audience (push stays Gate 3).
 */
export type NotificationAudience = 'driver' | 'yard' | 'command'

export type NotificationTemplate = {
  code: string
  audience: NotificationAudience
  title: string
  body: string
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    code: 'duty.changed',
    audience: 'driver',
    title: 'Duty updated',
    body: 'Your duty details changed. Open My Duty to review before sign-on.',
  },
  {
    code: 'document.expiring',
    audience: 'driver',
    title: 'Document expiring',
    body: 'A compliance document is due soon. Update it before your next shift.',
  },
  {
    code: 'vehicle.vor',
    audience: 'yard',
    title: 'Vehicle marked VOR',
    body: 'A vehicle cannot enter service until the VOR is cleared.',
  },
  {
    code: 'damage.reported',
    audience: 'yard',
    title: 'New damage report',
    body: 'Driver reported vehicle damage. Review evidence and create follow-up.',
  },
  {
    code: 'incident.raised',
    audience: 'command',
    title: 'Incident raised',
    body: 'An operational incident needs Command attention.',
  },
  {
    code: 'missed.inspection',
    audience: 'command',
    title: 'Missed inspection',
    body: 'A required vehicle check was not completed on time.',
  },
]

export function templatesForAudience(audience: NotificationAudience): NotificationTemplate[] {
  return NOTIFICATION_TEMPLATES.filter((t) => t.audience === audience)
}

export function resolveNotificationTemplate(code: string): NotificationTemplate | null {
  return NOTIFICATION_TEMPLATES.find((t) => t.code === code) ?? null
}
