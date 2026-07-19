export type OperationalHealth =
  | 'healthy'
  | 'attention'
  | 'risk'
  | 'critical'
  | 'unavailable'

export type ExceptionSeverity = 'critical' | 'high' | 'medium' | 'low'
export type ExceptionStatus =
  | 'new'
  | 'acknowledged'
  | 'assigned'
  | 'investigating'
  | 'action_in_progress'
  | 'awaiting_external'
  | 'monitoring'
  | 'resolved'
  | 'dismissed'
  | 'reopened'

/** Module source for the Command exceptions inbox. */
export type ExceptionCategory =
  | 'driver'
  | 'vehicle'
  | 'journey'
  | 'customer'
  | 'dispatch'
  | 'compliance'
  | 'yard'

export type ExceptionTimelineEvent = {
  at: string
  label: string
}

export type ExceptionSuggestedAction = {
  id: string
  title: string
  detail: string
  href?: string
}

export type ExceptionNote = {
  id: string
  at: string
  author: string
  body: string
}

export type ExceptionAttachment = {
  id: string
  name: string
  kind: string
}

export type ExceptionAuditEntry = {
  id: string
  at: string
  actor: string
  action: string
}

export interface OperationalException {
  id: string
  severity: ExceptionSeverity
  title: string
  category: ExceptionCategory
  relatedRecord: string
  relatedHref: string
  depot: string
  raisedAt: string
  ageMinutes: number
  slaMinutesRemaining: number | null
  owner: string | null
  status: ExceptionStatus
  lastUpdate: string
  recommendedAction?: string
  occurrenceCount?: number
  /** Stable type code e.g. driver_licence_expired, passenger_not_collected */
  typeCode?: string
  source?: string
  description?: string
  driverName?: string | null
  vehicleRegistration?: string | null
  passengerName?: string | null
  bookingRef?: string | null
  runRef?: string | null
  timeline?: ExceptionTimelineEvent[]
  suggestedActions?: ExceptionSuggestedAction[]
  notes?: ExceptionNote[]
  attachments?: ExceptionAttachment[]
  audit?: ExceptionAuditEntry[]
  escalated?: boolean
  assignedToUserId?: string | null
}

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low'
export type ConnectionStatus = 'live' | 'reconnecting' | 'delayed' | 'offline'

export type NotificationArea =
  | 'operations'
  | 'bookings'
  | 'dispatch'
  | 'drivers'
  | 'vehicles'
  | 'yard'
  | 'maintenance'
  | 'checks'
  | 'defects'
  | 'incidents'
  | 'compliance'
  | 'customers'
  | 'messages'
  | 'system'

export interface NotificationItem {
  id: string
  category:
    | 'operational'
    | 'safety'
    | 'compliance'
    | 'assignment'
    | 'messages'
    | 'passenger'
    | 'vehicle'
    | 'driver'
    | 'maintenance'
    | 'finance'
    | 'system'
    | 'mentions'
    | 'approvals'
  title: string
  body: string
  relatedRecord?: string
  relatedHref?: string
  receivedAt: string
  /** ISO timestamp for grouping / sorting when available */
  receivedAtIso?: string
  priority: NotificationPriority
  read: boolean
  acknowledged: boolean
  actionRequired: boolean
  actions?: Array<{ label: string; href?: string; variant?: 'primary' | 'secondary' }>
  groupedCount?: number
  area?: NotificationArea
  depot?: string | null
  driverName?: string | null
  vehicleRegistration?: string | null
  runRef?: string | null
  bookingRef?: string | null
  assignedToMe?: boolean
  mention?: boolean
  source?: string
  ageMinutes?: number
}

export interface KpiCard {
  id: string
  label: string
  value: number
  sublabel?: string
  href: string
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

export interface ActiveOperation {
  id: string
  type: 'run' | 'trip' | 'vehicle'
  reference: string
  driver: string
  vehicle: string
  progress?: string
  currentState: string
  eta?: string
  delayMinutes: number
  gpsFreshnessSeconds: number | null
  operationalState: string
  passengerOnboard: boolean
  wheelchair: boolean
  escortRequired: boolean
  hasException: boolean
}

export interface ScheduleBlock {
  period: string
  label: string
  trips: number
  assigned: number
  health: OperationalHealth
}

export interface OperationalChange {
  id: string
  time: string
  description: string
  actor: string
}

export interface ReadinessSummary {
  label: string
  count: number
  tone?: 'default' | 'warning' | 'danger'
  href: string
}
