import type { Conversation } from './types'

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString()

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-david',
    title: 'David Cole',
    participantName: 'David Cole',
    participantRole: 'driver',
    preview: 'I have a warning light showing on the dashboard…',
    updatedAt: ago(2),
    unreadCount: 2,
    status: 'awaiting_admin',
    priority: 'urgent',
    assignedTo: null,
    depot: 'Wembley',
    runRef: 'TR-2048',
    vehicleRegistration: 'LX22 ABC',
    channel: 'app',
    category: 'Vehicle issue',
    messages: [
      {
        id: 'm1',
        conversationId: 'conv-david',
        kind: 'user',
        senderName: 'David Cole',
        senderRole: 'Driver',
        body: 'I have a warning light showing on the dashboard for LX22 ABC on Trip TR-2048.',
        createdAt: ago(12),
      },
      {
        id: 'm2',
        conversationId: 'conv-david',
        kind: 'system',
        senderName: 'System',
        senderRole: 'System',
        body: 'Defect draft linked from this conversation is available on the vehicle record.',
        createdAt: ago(11),
      },
      {
        id: 'm3',
        conversationId: 'conv-david',
        kind: 'user',
        senderName: 'David Cole',
        senderRole: 'Driver',
        body: 'I am delayed near Brixton due to traffic. ETA +10 minutes.',
        createdAt: ago(2),
      },
    ],
    context: {
      lines: [
        { label: 'Driver', value: 'David Cole' },
        { label: 'Status', value: 'On duty' },
        { label: 'Depot', value: 'Wembley' },
        { label: 'Trip', value: 'TR-2048' },
        { label: 'Vehicle', value: 'LX22 ABC' },
        { label: 'Eligibility', value: 'Eligible' },
      ],
      hrefs: [
        { label: 'Open driver', href: '/drivers' },
        { label: 'Open live operations', href: '/live-operations' },
        { label: 'Open vehicle', href: '/vehicles' },
      ],
    },
  },
  {
    id: 'conv-james',
    title: 'James Carter',
    participantName: 'James Carter',
    participantRole: 'driver',
    preview: 'I am delayed near Brixton due to…',
    updatedAt: ago(8),
    unreadCount: 1,
    status: 'awaiting_admin',
    priority: 'high',
    assignedTo: 'Sarah Jones',
    depot: 'Croydon',
    runRef: 'TR-2048',
    vehicleRegistration: 'YX21 ABC',
    channel: 'app',
    category: 'Delay',
    messages: [
      {
        id: 'j1',
        conversationId: 'conv-james',
        kind: 'user',
        senderName: 'James Carter',
        senderRole: 'Driver',
        body: 'Running about 10 minutes late for the school pickup — heavy traffic on the A23.',
        createdAt: ago(8),
      },
      {
        id: 'j2',
        conversationId: 'conv-james',
        kind: 'internal_note',
        senderName: 'Sarah Jones',
        senderRole: 'Operations',
        body: 'Internal note: school contact has been pre-warned. Waiting for updated ETA.',
        createdAt: ago(6),
        mine: true,
      },
    ],
    context: {
      lines: [
        { label: 'Driver', value: 'James Carter' },
        { label: 'Depot', value: 'Croydon' },
        { label: 'Trip', value: 'TR-2048' },
        { label: 'Vehicle', value: 'YX21 ABC' },
        { label: 'Assigned admin', value: 'Sarah Jones' },
      ],
      hrefs: [
        { label: 'Open driver', href: '/drivers' },
        { label: 'Open exception', href: '/exceptions' },
      ],
    },
  },
  {
    id: 'conv-school',
    title: 'Oakfield School Transport',
    participantName: 'Oakfield School Transport',
    participantRole: 'school',
    preview: "Please confirm tomorrow's pickup…",
    updatedAt: ago(20),
    unreadCount: 0,
    status: 'awaiting_external',
    priority: 'normal',
    assignedTo: 'Customer Support',
    depot: 'Wembley',
    bookingRef: 'BK-8821',
    channel: 'email',
    category: 'Booking query',
    messages: [
      {
        id: 's1',
        conversationId: 'conv-school',
        kind: 'user',
        senderName: 'Oakfield School',
        senderRole: 'School contact',
        body: "Please confirm tomorrow's AM pickup window for Route 4. We have a staff inset day.",
        createdAt: ago(40),
      },
      {
        id: 's2',
        conversationId: 'conv-school',
        kind: 'user',
        senderName: 'You',
        senderRole: 'Admin',
        body: 'Thanks — we will confirm the revised window by 16:00 today.',
        createdAt: ago(20),
        mine: true,
      },
    ],
    context: {
      lines: [
        { label: 'Organisation', value: 'Oakfield School' },
        { label: 'Booking', value: 'BK-8821' },
        { label: 'Depot', value: 'Wembley' },
        { label: 'Owner', value: 'Customer Support' },
      ],
      hrefs: [
        { label: 'Open booking', href: '/bookings' },
        { label: 'Open customers', href: '/customers' },
      ],
    },
  },
  {
    id: 'conv-dispatch',
    title: 'Dispatch team',
    participantName: 'Dispatch team',
    participantRole: 'team',
    preview: 'PM-205 still has no driver — who can cover?',
    updatedAt: ago(55),
    unreadCount: 3,
    status: 'open',
    priority: 'urgent',
    assignedTo: 'Dispatch',
    depot: 'Wembley',
    runRef: 'PM-205',
    channel: 'app',
    category: 'Operations',
    messages: [
      {
        id: 'd1',
        conversationId: 'conv-dispatch',
        kind: 'user',
        senderName: 'Karen Mitchell',
        senderRole: 'Operations',
        body: 'PM-205 still has no driver — who can cover before 14:30?',
        createdAt: ago(55),
      },
    ],
    context: {
      lines: [
        { label: 'Group', value: 'Dispatch team' },
        { label: 'Run', value: 'PM-205' },
        { label: 'Depot', value: 'Wembley' },
      ],
      hrefs: [
        { label: 'Open dispatch', href: '/dispatch' },
        { label: 'Open exception', href: '/exceptions' },
      ],
    },
  },
  {
    id: 'conv-yard',
    title: 'Yard — Wembley',
    participantName: 'Yard — Wembley',
    participantRole: 'team',
    preview: 'Keys for AB12 CDE still missing from cabinet B12.',
    updatedAt: ago(180),
    unreadCount: 0,
    status: 'resolved',
    priority: 'normal',
    assignedTo: 'Yard',
    depot: 'Wembley',
    vehicleRegistration: 'AB12 CDE',
    channel: 'app',
    category: 'Yard',
    archived: false,
    messages: [
      {
        id: 'y1',
        conversationId: 'conv-yard',
        kind: 'user',
        senderName: 'Yard desk',
        senderRole: 'Yard',
        body: 'Keys for AB12 CDE still missing from cabinet B12.',
        createdAt: ago(200),
      },
      {
        id: 'y2',
        conversationId: 'conv-yard',
        kind: 'user',
        senderName: 'You',
        senderRole: 'Admin',
        body: 'Found — spare set issued. Closing this thread.',
        createdAt: ago(180),
        mine: true,
      },
    ],
    context: {
      lines: [
        { label: 'Team', value: 'Yard — Wembley' },
        { label: 'Vehicle', value: 'AB12 CDE' },
        { label: 'Status', value: 'Resolved' },
      ],
      hrefs: [{ label: 'Open yard', href: '/yard' }],
    },
  },
]

export function filterConversations(
  rows: Conversation[],
  tab: import('./types').MessageInboxTab,
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

export function conversationKpis(rows: Conversation[]) {
  return {
    unread: rows.filter((c) => c.unreadCount > 0).length,
    awaiting: rows.filter((c) => c.status === 'awaiting_admin').length,
    assignedToMe: rows.filter((c) => c.assignedTo === 'You' || c.assignedTo === 'Sarah Jones').length,
    urgent: rows.filter((c) => c.priority === 'urgent' && c.status !== 'resolved').length,
  }
}
