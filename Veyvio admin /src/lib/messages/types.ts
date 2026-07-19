export type MessageParticipantRole = 'driver' | 'staff' | 'customer' | 'school' | 'team'

export type ConversationStatus =
  | 'new'
  | 'open'
  | 'awaiting_admin'
  | 'awaiting_external'
  | 'resolved'
  | 'archived'

export type ConversationPriority = 'urgent' | 'high' | 'normal' | 'low'

export type ConversationMessageKind = 'user' | 'internal_note' | 'system'

export interface ConversationMessage {
  id: string
  conversationId: string
  kind: ConversationMessageKind
  senderName: string
  senderRole: string
  body: string
  createdAt: string
  mine?: boolean
}

export interface Conversation {
  id: string
  title: string
  participantName: string
  participantRole: MessageParticipantRole
  preview: string
  updatedAt: string
  unreadCount: number
  status: ConversationStatus
  priority: ConversationPriority
  assignedTo: string | null
  depot: string | null
  runRef?: string | null
  vehicleRegistration?: string | null
  bookingRef?: string | null
  driverId?: string | null
  channel: 'app' | 'email' | 'sms'
  category: string
  archived?: boolean
  messages: ConversationMessage[]
  context: {
    lines: { label: string; value: string }[]
    hrefs: { label: string; href: string }[]
  }
}

export type MessageInboxTab = 'all' | 'unread' | 'awaiting' | 'assigned' | 'groups' | 'archived'
