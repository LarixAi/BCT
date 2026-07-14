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

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low'
export type ConnectionStatus = 'live' | 'reconnecting' | 'delayed' | 'offline'

export interface KpiCard {
  id: string
  label: string
  value: number
  sublabel?: string
  href: string
  tone?: 'default' | 'warning' | 'danger' | 'success'
}

export interface OperationalException {
  id: string
  severity: ExceptionSeverity
  title: string
  category: 'trip' | 'vehicle' | 'driver' | 'compliance' | 'passenger'
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
}

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
  priority: NotificationPriority
  read: boolean
  acknowledged: boolean
  actionRequired: boolean
  actions?: Array<{ label: string; href?: string; variant?: 'primary' | 'secondary' }>
  groupedCount?: number
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
