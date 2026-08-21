import type { Conversation, MessageInboxTab } from './types'

export function filterConversations(
  rows: Conversation[],
  tab: MessageInboxTab,
  search: string,
): Conversation[] {
  const q = search.trim().toLowerCase()
  return rows.filter((c) => {
    if (tab === 'unread' && c.unreadCount === 0) return false
    if (tab === 'awaiting' && c.status !== 'awaiting_admin') return false
    if (tab === 'assigned' && !c.assignedTo) return false
    if (tab === 'groups' && c.participantRole !== 'team') return false
    if (tab === 'archived' && !c.archived && c.status !== 'resolved') return false
    if (tab !== 'archived' && c.archived) return false
    if (!q) return true
    return [c.title, c.preview, c.runRef, c.vehicleRegistration, c.bookingRef, c.participantName]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })
}

export function conversationKpis(rows: Conversation[], currentUserLabel = 'You') {
  return {
    unread: rows.filter((c) => c.unreadCount > 0).length,
    awaiting: rows.filter((c) => c.status === 'awaiting_admin').length,
    assignedToMe: rows.filter((c) => c.assignedTo === currentUserLabel).length,
    urgent: rows.filter((c) => c.priority === 'urgent' && c.status !== 'resolved').length,
  }
}
