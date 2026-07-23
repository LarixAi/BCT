export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  platformRole: string | null
  activeTenantId: string | null
  tenantName: string | null
  tenantStatus?: string | null
  planCode?: string | null
  subscriptionStatus?: string | null
  enabledModules?: string[]
  usageLimits?: Record<string, number | null>
  mfaEnabled?: boolean
  role: string | null
  permissions: string[]
  supportSessionId?: string | null
}

export type PlatformCompanyRow = {
  id: string
  legalName: string | null
  tradingName: string | null
  tenantStatus: string | null
  subscriptionStatus: string | null
  planCode: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  timezone: string | null
  createdAt: string | null
  activatedAt: string | null
}

export type PlatformModuleOverride = {
  moduleKey: string
  enabled: boolean
  reason: string | null
  createdAt: string | null
}

export type PlatformSupportGrant = {
  id: string
  companyId?: string
  tradingName?: string | null
  legalName?: string | null
  granteeUserId: string
  grantedBy: string | null
  reason: string
  ticketReference: string | null
  accessLevel: string
  startsAt: string | null
  expiresAt: string | null
  revokedAt: string | null
}

export type PlatformSubscriptionEvent = {
  id: string
  eventType: string
  source: string
  fromStatus: string | null
  toStatus: string | null
  fromPlanCode: string | null
  toPlanCode: string | null
  fromTenantStatus: string | null
  toTenantStatus: string | null
  actorUserId: string | null
  createdAt: string | null
}

export type PlatformSubscriptionRow = {
  companyId: string
  tradingName: string | null
  legalName: string | null
  tenantStatus: string | null
  subscriptionStatus: string
  planCode: string
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  gracePeriodEndsAt: string | null
  providerCustomerRef: string | null
  updatedAt: string | null
}

export type PlatformFeatureFlag = {
  key: string
  description: string
  enabled: boolean
  updatedAt: string | null
  updatedBy?: string | null
}

export type PlatformHealth = {
  status: string
  surface: string
  checkedAt: string
  billingMode: string
  database: string
  counts: {
    companies: number
    activeSubscriptions: number
    featureFlags: number
  }
}

export type PlatformCompanyDetail = PlatformCompanyRow & {
  gracePeriodEndsAt?: string | null
  providerCustomerRef?: string | null
  stripeSubscriptionId?: string | null
  entitlements?: {
    planCode: string
    subscriptionStatus: string
    tenantStatus: string
    enabledModules: string[]
    usageLimits: Record<string, number | null>
  }
  subscriptionEvents?: PlatformSubscriptionEvent[]
  moduleOverrides: PlatformModuleOverride[]
  supportGrants: PlatformSupportGrant[]
}

export type PlatformPlanRow = {
  code: string
  name: string
  description: string | null
  modules: string[]
}

export type PlatformAuditRow = {
  id: string
  actor_user_id: string
  action: string
  target_company_id: string | null
  detail: Record<string, unknown>
  created_at: string
}

export interface TenantMembershipOption {
  tenantId: string
  tenantName: string
  role: string
}

export interface LoginResponse {
  accessToken?: string
  refreshToken?: string
  requiresTenantSelection?: boolean
  requiresMfaChallenge?: boolean
  mfaChallengeId?: string
  devMfaCode?: string
  pendingCompanyId?: string | null
  memberships?: TenantMembershipOption[]
  user?: AuthUser
}

export interface AuthTokensResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export type DashboardAlertSeverity = 'info' | 'warning' | 'danger'
export type DashboardAlertCategory = 'compliance' | 'operations' | 'fleet' | 'safety'

export interface DashboardAlert {
  severity: DashboardAlertSeverity
  title: string
  href: string
  category: DashboardAlertCategory
  details?: string[]
}

export interface DashboardTimelineItem {
  id: string
  time: string | null
  title: string
  status: string
  href: string
}

export interface DashboardSummary {
  todaysActiveDuties: number
  vehiclesInService: number
  vehiclesOffRoad: number
  driversOnDuty: number
  openDefects: number
  openIncidents: number
  expiringDocuments: number
  alerts: DashboardAlert[]
  navBadges: { defects: number; compliance: number }
  timeline: DashboardTimelineItem[]
}

export interface LiveDispatchNextStop {
  routeStopId: string
  name: string
  stopOrder: number
  distanceM: number
  etaMinutes: number
  pickupTime: string | null
}

export interface LiveDispatchVehicle {
  dutyId: string
  reference: string
  status: string
  routeName: string | null
  driverId: string | null
  driverName: string | null
  vehicleRegistration: string | null
  lastLatitude: number | null
  lastLongitude: number | null
  lastPositionAt: string | null
  staleMinutes: number | null
  isStale: boolean
  /** True only when a real driver GPS ping exists for this duty. */
  hasLiveGps?: boolean
  /** Minutes behind plan (schedule), not GPS age. */
  delayMinutes?: number | null
  plannedStartAt?: string | null
  plannedEndAt?: string | null
  staleThresholdMinutes: number
  nextStop: LiveDispatchNextStop | null
  routeTotalStops: number
  routeCompletedStops: number
  routeProgressPercent: number | null
}

export interface LiveDispatchResponse {
  date: string
  generatedAt: string
  trackingEnabled: boolean
  vehicles: LiveDispatchVehicle[]
}

export interface ApiNotification {
  id: string
  tenantId: string
  userId: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export interface DefectRecord {
  id: string
  severity: string
  category: string
  status: string
  description?: string | null
  vehicle?: { id: string; registrationNumber: string; status?: string }
  createdAt: string
}

export interface IncidentRecord {
  id: string
  title?: string
  incidentType?: string
  description?: string
  status: string
  severity?: string
  isSafeguarding?: boolean
  occurredAt?: string
  createdAt: string
  driver?: { id: string; firstName: string; lastName: string } | null
  assignedTo?: { firstName: string; lastName: string } | null
  location?: string | null
  notes?: string | null
}

export interface VehicleCheckRecord {
  id: string
  checkDate: string
  checkType?: string
  result: string
  notes?: string | null
  vehicle?: { id: string; registrationNumber: string }
  depot?: { id: string; name: string } | null
  driver?: { id: string; firstName: string; lastName: string } | null
}

export interface ComplianceItemRecord {
  id: string
  entityType: 'vehicle' | 'driver'
  entityId: string
  entityLabel: string
  documentType: string
  expiryDate: string | null
  status: 'expired' | 'expiring_soon' | 'valid' | 'unknown' | 'action_required'
  daysUntilExpiry: number | null
}

export interface ComplianceAutomationSettings {
  warnDaysBeforeExpiry: number
  blockAssignmentOnExpired: boolean
  autoUnassignOnExpired: boolean
  notifyRoles: string[]
}

export interface MessageRecord {
  id: string
  subject: string | null
  body: string
  readAt: string | null
  createdAt: string
  conversationId?: string | null
  driverId?: string | null
  audience?: 'dispatch' | 'yard' | 'both' | string | null
  sourceApp?: string | null
  sender: { id: string; firstName: string; lastName: string }
  recipient: { id: string; firstName: string; lastName: string }
}

export interface CreateMessageInput {
  driverId: string
  subject?: string
  body: string
  conversationId?: string
  requiresAck?: boolean
}

export interface ReportsSummary {
  fleet: { vehicles: number; drivers: number }
  customers: number
  safety: { openDefects: number; openIncidents: number }
  operations: { dutiesInPeriod: number }
  period: { from: string; to: string }
  generatedAt: string
}

export interface AnnouncementRecord {
  id: string
  title: string
  body: string
  publishedAt: string
  depotName?: string | null
  priority?: string
}

export interface CompanyRecord {
  id: string
  name: string
  tradingName?: string | null
  settings?: {
    mainContactName?: string | null
    mainContactEmail?: string | null
    telephone?: string | null
    operatorLicenceNumber?: string | null
  }
}

export interface UserMembershipRecord {
  id: string
  roleKey: string
  status: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    status: string
    lastLoginAt?: string | null
  }
}

export interface StaffRecord {
  id: string
  firstName: string
  lastName: string
  status?: string
  email?: string | null
  phone?: string | null
  depotName?: string | null
  role?: string
}

export interface PassengerRecord {
  id: string
  firstName: string
  lastName: string
  status?: string
  customerName?: string | null
  routeName?: string | null
  needsWheelchair?: boolean
  safeguardingFlag?: boolean
}

export interface ContractRecord {
  id: string
  name: string
  contractType: string
  startDate: string
  endDate?: string | null
  status: string
  customer: { organisationName: string }
}

export interface RecurringTransportRecord {
  id: string
  name: string
  pattern: string
  routeName: string
  customerName: string
  status: string
  daysOfWeek: string[]
}

export interface SchoolRecord {
  id: string
  name: string
  address?: string | null
  customerId: string
  routeCount: number
  pupilCount: number
}

export interface MaintenanceRecord {
  id: string
  vehicleRegistration: string
  vehicleId: string
  type: string
  scheduledDate: string
  status: string
  provider?: string | null
}

export interface InspectionRecord {
  id: string
  vehicleRegistration: string
  vehicleId: string
  inspectionType: string
  dueDate: string
  status: string
}

export interface MessageTemplateRecord {
  id: string
  name: string
  category: string
  subject: string
  body: string
}

export interface IntegrationRecord {
  id: string
  name: string
  provider: string
  status: string
  lastSyncAt?: string | null
}

export interface AuditLogRecord {
  id: string
  entityType: string
  entityId: string
  action: string
  createdAt: string
  user?: { firstName: string; lastName: string; email: string } | null
}

export interface PerformanceMetrics {
  onTimePct: number
  completedRuns: number
  avgDelayMinutes: number
  defectRate: number
  period: { from: string; to: string }
}

export interface YardSummary {
  vehiclesOnSite: number
  checksToday: number
  openDefects: number
  adviceWaiting: number
  vehicles: Array<{
    id: string
    registrationNumber: string
    yardCheckToday: string | null
    status: string
  }>
}

export interface PricingRuleRecord {
  id: string
  name: string
  rateType: string
  amount: number
  currency: string
  status: string
}

export interface DepotRecord {
  id: string
  name: string
}

export type DutyPublicationStatus = 'draft' | 'ready_to_publish' | 'published' | 'cancelled'

export interface DutyEligibilityResult {
  status: 'eligible' | 'eligible_with_warnings' | 'blocked'
  blockers: string[]
  warnings: string[]
}

export interface DutyRecord {
  id: string
  reference: string
  dutyDate: string
  startTime: string | null
  endTime?: string | null
  status: string
  publicationStatus?: DutyPublicationStatus | string
  publishedAt?: string | null
  acknowledgementRequired?: boolean
  acknowledgementDeadline?: string | null
  driverLifecycleStatus?: string | null
  specialInstructions?: string | null
  version?: number
  route?: { id: string; name: string } | null
  driver?: { id: string; firstName: string; lastName: string; status?: string } | null
  vehicle?: { id: string; registrationNumber: string; status?: string } | null
  passengerAssistant?: { id: string; firstName: string; lastName: string } | null
}

export interface DriverRecord {
  id: string
  firstName: string
  lastName: string
  status?: string
  email?: string | null
  phone?: string | null
  depotId?: string | null
  depotName?: string | null
  licenceNumber?: string | null
  licenceExpiry?: string | null
  cpcExpiry?: string | null
  dbsExpiry?: string | null
  medicalExpiry?: string | null
}

export interface VehicleRecord {
  id: string
  registrationNumber: string
  fleetNumber?: string | null
  status?: string
  make?: string | null
  model?: string | null
  vehicleType?: string | null
  seatingCapacity?: number | null
  wheelchairCapacity?: number | null
  depotId?: string | null
  depotName?: string | null
  motExpiry?: string | null
  insuranceExpiry?: string | null
  mileage?: number | null
}

export interface RouteRecord {
  id: string
  name: string
  status?: string
  customer?: { id: string; name: string } | null
}

export interface CustomerRecord {
  id: string
  name: string
  status?: string
}

export interface RouteStopRecord {
  id: string
  stopOrder: number
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  pickupTime?: string | null
  dropoffTime?: string | null
}

export interface DutyDetailRecord extends DutyRecord {
  endTime?: string | null
  notes?: string | null
  lastLatitude?: number | null
  lastLongitude?: number | null
  lastPositionAt?: string | null
  route?: {
    id: string
    name: string
    stops?: RouteStopRecord[]
  } | null
}

export interface DutyTrackResponse {
  duty: DutyDetailRecord
  pings: Array<{
    id: string
    latitude: number
    longitude: number
    recordedAt: string
    speedKph?: number | null
  }>
  checkpoints: Array<{
    routeStopId: string
    name: string
    stopOrder: number
    arrivedAt: string | null
  }>
}
