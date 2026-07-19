import type {
  AuthTokensResponse,
  AuthUser,
  DashboardSummary,
  DefectRecord,
  IncidentRecord,
  LiveDispatchResponse,
  LoginResponse,
  ApiNotification,
  TenantMembershipOption,
  DepotRecord,
  DutyRecord,
  DutyDetailRecord,
  DutyTrackResponse,
  DriverRecord,
  VehicleRecord,
  RouteRecord,
  CustomerRecord,
  RouteStopRecord,
  VehicleCheckRecord,
  ComplianceItemRecord,
  ComplianceAutomationSettings,
  MessageRecord,
  ReportsSummary,
  AnnouncementRecord,
  CompanyRecord,
  UserMembershipRecord,
  StaffRecord,
  PassengerRecord,
  ContractRecord,
  RecurringTransportRecord,
  SchoolRecord,
  MaintenanceRecord,
  InspectionRecord,
  MessageTemplateRecord,
  IntegrationRecord,
  AuditLogRecord,
  PerformanceMetrics,
  YardSummary,
  PricingRuleRecord,
} from './types'
import { mockBookingsApi } from './mock-bookings'
import { mockTransfersApi } from './mock-transfers'
import type { BookingDraft, BookingListItem, BookingRecord, CustomerBookingContext, CreateDraftOptions, CancelBookingInput, AutoPlanProposal, EditImpact } from '@/lib/bookings/types'
import type {
  AssignmentHistoryEntry,
  CreateTransferInput,
  OperationalPosition,
  OperationalTrip,
  TransferCandidate,
  TransferImpactPreview,
  TransferRecord,
  TransferValidationItem,
} from '@/lib/transfers/types'
import { mockDriversApi } from './mock-drivers'
import { mockVehiclesApi } from './mock-vehicles'
import { mockAdBlueApi } from '@/lib/adblue/mock-adblue'
import { normalizeAdBlueRecords } from '@/lib/adblue/normalize'
import { mockVehicleReportsApi } from '@/lib/vehicle-reports/mock-vehicle-reports'
import { mockMaintenanceApi } from './mock-maintenance'
import { mockInspectionsApi } from './mock-inspections'
import { mockFleetResourcesApi } from './mock-fleet-resources'
import { mockAttendanceApi } from '@/lib/attendance/mock-hub'
import { mockStaffApi } from './mock-staff'
import { mockYardApi } from './mock-yard'
import { mockChecksApi } from './mock-checks'
import { mockDefectsApi } from './mock-defects'
import { mockIncidentsApi } from './mock-incidents'
import { mockDepotsApi } from './mock-depots'
import { isActiveIncident } from '@/lib/incidents/status'
import { profileToLegacyRecord } from '@/lib/eligibility/engine'
import { profileToLegacyVehicleRecord } from '@/lib/vehicles/release'
import type { CreateDriverInput, DriverProfile, DriverDirectorySummary, UpdateDriverInput } from '@/lib/drivers/types'
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleDirectorySummary,
  VehicleProfile,
} from '@/lib/vehicles/types'

function getMockDrivers(): DriverRecord[] {
  return mockDriversApi.list().map(profileToLegacyRecord)
}

function getMockVehicles(): VehicleRecord[] {
  return mockVehiclesApi.list().map(profileToLegacyVehicleRecord)
}

const TOKEN_KEY = 'access_token'
const MEMBERSHIPS_KEY = 'pending_memberships'
export const MOCK_TOKEN = 'mock-demo-token'

const today = () => new Date().toISOString().slice(0, 10)
const shiftDate = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const MOCK_USER: AuthUser = {
  id: 'user-demo',
  email: 'demo@veyvio.com',
  firstName: 'Larone',
  lastName: 'Laing',
  platformRole: null,
  activeTenantId: 'tenant-demo',
  tenantName: 'Metro Transport Ltd',
  tenantStatus: 'ACTIVE',
  mfaEnabled: true,
  role: 'company_owner',
  permissions: [
    'dispatch.view',
    'dispatch.override',
    'duties.view',
    'duties.edit',
    'duties.create',
    'drivers.view',
    'fleet.view',
    'compliance.view',
    'incidents.view',
    'incidents.report',
    'incidents.acknowledge',
    'incidents.investigate',
    'incidents.assign',
    'incidents.close',
    'incidents.safeguarding',
    'incidents.evidence',
    'incidents.regulatory',
    'incidents.export',
    'incidents.escalate',
    'incidents.reopen',
    'incidents.contain',
    'incidents.create_defect',
    'incidents.configure',
    'incidents.medical',
    'incidents.manage',
    'defects.view',
    'defects.report',
    'defects.triage',
    'defects.mark_vor',
    'defects.close',
    'defects.verify',
    'defects.repair',
    'defects.restrict',
    'defects.reopen',
    'defects.bulk',
    'defects.upload_evidence',
    'defects.configure_rules',
    'defects.export',
    'defects.manage',
    'reports.view',
    'transfer.reassign',
    'transfer.live',
    'transfer.vehicle',
    'transfer.queue',
    'transfer.split',
    'transfer.swap',
    'transfer.override',
    'transfer.handover',
    'drivers.create',
    'drivers.edit',
    'drivers.invite',
    'drivers.manage_access',
    'drivers.restrict',
    'drivers.suspend',
    'drivers.view_sensitive',
    'compliance.verify',
    'vehicles.create',
    'vehicles.edit',
    'vehicles.vor',
    'vehicles.release',
    'vehicles.compliance',
    'maintenance.view',
    'maintenance.coordinate',
    'maintenance.manage',
    'staff.view',
    'staff.create',
    'staff.edit',
    'staff.invite',
    'staff.manage_access',
    'staff.suspend',
    'staff.manage',
    'staff.view_sensitive',
    'staff.manage_duty',
    'staff.assign_tasks',
    'staff.verify_training',
    'staff.manage_training',
    'staff.review_access',
    'staff.manage_documents',
    'staff.manage_lifecycle',
    'yard.view',
    'yard.move_vehicle',
    'yard.assign_tasks',
    'yard.release_vehicle',
    'yard.mark_vor',
    'yard.manage',
    'checks.view',
    'checks.start',
    'checks.review',
    'checks.mark_vor',
    'checks.manage',
    'checks.manage_templates',
  ],
}

const ROUTE_STOPS: RouteStopRecord[] = [
  {
    id: 'stop-1',
    stopOrder: 1,
    name: 'Depot — Wembley',
    address: 'Wembley Park, London',
    latitude: 51.5636,
    longitude: -0.2796,
    pickupTime: '07:30',
  },
  {
    id: 'stop-2',
    stopOrder: 2,
    name: 'Passenger A — Home',
    address: '12 Oak Lane, Wembley',
    latitude: 51.552,
    longitude: -0.296,
    pickupTime: '07:45',
  },
  {
    id: 'stop-3',
    stopOrder: 3,
    name: 'Oakwood Primary School',
    address: 'Oakwood Rd, London',
    latitude: 51.548,
    longitude: -0.312,
    dropoffTime: '08:15',
  },
  {
    id: 'stop-4',
    stopOrder: 4,
    name: 'Passenger B — Home',
    address: '8 Elm Close, Wembley',
    latitude: 51.556,
    longitude: -0.285,
    pickupTime: '08:20',
  },
]

const MOCK_ROUTES: RouteRecord[] = [
  { id: 'route-1', name: 'Oakwood School AM', status: 'active', customer: { id: 'cust-1', name: 'Oakwood Primary' } },
  { id: 'route-2', name: 'Day Centre Run', status: 'active', customer: { id: 'cust-2', name: 'Riverside Day Centre' } },
  { id: 'route-3', name: 'School PM Return', status: 'active', customer: { id: 'cust-1', name: 'Oakwood Primary' } },
]

let mockDuties: DutyDetailRecord[] = [
  {
    id: 'duty-1',
    reference: 'SCH-AM-104',
    dutyDate: today(),
    startTime: '07:30',
    endTime: '09:30',
    status: 'passenger_boarded',
    route: { id: 'route-1', name: 'Oakwood School AM', stops: ROUTE_STOPS },
    driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith', status: 'on_duty' },
    vehicle: { id: 'veh-1', registrationNumber: 'AB12 CDE', status: 'in_service' },
    lastLatitude: 51.552,
    lastLongitude: -0.296,
    lastPositionAt: new Date().toISOString(),
  },
  {
    id: 'duty-2',
    reference: 'DAY-024',
    dutyDate: today(),
    startTime: '09:00',
    endTime: '12:00',
    status: 'in_progress',
    route: { id: 'route-2', name: 'Day Centre Run' },
    driver: { id: 'drv-2', firstName: 'Michael', lastName: 'Patel', status: 'on_duty' },
    vehicle: { id: 'veh-2', registrationNumber: 'GH56 HIJ', status: 'in_service' },
    lastLatitude: 51.515,
    lastLongitude: -0.142,
    lastPositionAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
  {
    id: 'duty-3',
    reference: 'SCH-PM-207',
    dutyDate: today(),
    startTime: '14:30',
    endTime: '17:00',
    status: 'unassigned',
    route: { id: 'route-3', name: 'School PM Return' },
    driver: null,
    vehicle: null,
  },
  {
    id: 'duty-4',
    reference: 'EVEN-012',
    dutyDate: today(),
    startTime: '17:30',
    endTime: '20:00',
    status: 'assigned',
    route: { id: 'route-2', name: 'Day Centre Run' },
    driver: { id: 'drv-3', firstName: 'Alice', lastName: 'Brown', status: 'available' },
    vehicle: { id: 'veh-3', registrationNumber: 'KL78 MNO', status: 'in_service' },
  },
  {
    id: 'duty-5',
    reference: 'AM-088',
    dutyDate: today(),
    startTime: '06:45',
    endTime: '08:30',
    status: 'completed',
    route: { id: 'route-1', name: 'Oakwood School AM' },
    driver: { id: 'drv-4', firstName: 'Robert', lastName: 'Wilson', status: 'on_duty' },
    vehicle: { id: 'veh-3', registrationNumber: 'KL78 MNO', status: 'in_service' },
  },
  {
    id: 'duty-6',
    reference: 'AM-112',
    dutyDate: today(),
    startTime: '07:35',
    endTime: '09:45',
    status: 'assigned',
    route: { id: 'route-1', name: 'Oakwood School AM' },
    driver: { id: 'drv-5', firstName: 'Maria', lastName: 'Jones', status: 'signed_on' },
    vehicle: { id: 'veh-6', registrationNumber: 'EO71 NTJ', status: 'available' },
  },
  {
    id: 'duty-7',
    reference: 'AM-107',
    dutyDate: today(),
    startTime: '07:10',
    endTime: '09:00',
    status: 'assigned',
    route: { id: 'route-2', name: 'Day Centre Run' },
    driver: { id: 'drv-2', firstName: 'Michael', lastName: 'Patel', status: 'signed_on' },
    vehicle: { id: 'veh-4', registrationNumber: 'CD34 EFG', status: 'off_road' },
  },
  // Planned duties for the week (Schedule planning view)
  {
    id: 'duty-plan-1',
    reference: 'SCH-AM-210',
    dutyDate: shiftDate(1),
    startTime: '07:20',
    endTime: '09:40',
    status: 'planned',
    route: { id: 'route-1', name: 'Oakwood School AM' },
    driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
    vehicle: { id: 'veh-1', registrationNumber: 'AB12 CDE' },
  },
  {
    id: 'duty-plan-2',
    reference: 'SCH-AM-211',
    dutyDate: shiftDate(1),
    startTime: '07:20',
    endTime: '09:30',
    status: 'planned',
    route: { id: 'route-1', name: 'Oakwood School AM' },
    driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
    vehicle: { id: 'veh-6', registrationNumber: 'EO71 NTJ' },
  },
  {
    id: 'duty-plan-3',
    reference: 'HOSP-044',
    dutyDate: shiftDate(2),
    startTime: '10:00',
    endTime: '13:00',
    status: 'planned',
    route: { id: 'route-4', name: 'Hospital transfer' },
    driver: { id: 'drv-3', firstName: 'Alice', lastName: 'Brown' },
    vehicle: { id: 'veh-2', registrationNumber: 'GH56 HIJ' },
  },
  {
    id: 'duty-plan-4',
    reference: 'SEND-018',
    dutyDate: shiftDate(2),
    startTime: '08:00',
    endTime: '11:30',
    status: 'unassigned',
    route: { id: 'route-5', name: 'SEND morning' },
    driver: null,
    vehicle: null,
  },
  {
    id: 'duty-plan-5',
    reference: 'PRIV-102',
    dutyDate: shiftDate(3),
    startTime: '09:30',
    endTime: '12:00',
    status: 'planned',
    route: { id: 'route-6', name: 'Private hire' },
    driver: { id: 'drv-5', firstName: 'Maria', lastName: 'Jones' },
    vehicle: { id: 'veh-3', registrationNumber: 'KL78 MNO' },
  },
  {
    id: 'duty-plan-6',
    reference: 'SCH-PM-220',
    dutyDate: shiftDate(4),
    startTime: '14:30',
    endTime: '17:15',
    status: 'planned',
    route: { id: 'route-3', name: 'School PM Return' },
    driver: { id: 'drv-4', firstName: 'Robert', lastName: 'Wilson' },
    vehicle: { id: 'veh-4', registrationNumber: 'CD34 EFG', status: 'off_road' },
  },
]

let mockNotifications: ApiNotification[] = [
  {
    id: 'N-502',
    tenantId: 'tenant-demo',
    userId: 'user-demo',
    type: 'driver.onboarding.evidence_submitted',
    title: 'Driver evidence ready for review',
    body: 'Larone Laing uploaded a MiDAS certificate. Submitted for admin review.',
    link: '/drivers',
    readAt: null,
    createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: 'N-501',
    tenantId: 'tenant-demo',
    userId: 'user-demo',
    type: 'vehicle_vor',
    title: 'Vehicle marked VOR',
    body: 'AB12 CDE was marked VOR following a failed vehicle check.',
    link: '/defects',
    readAt: null,
    createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
  },
  {
    id: 'N-500',
    tenantId: 'tenant-demo',
    userId: 'user-demo',
    type: 'tracking_late',
    title: 'Four trips predicted late',
    body: 'Four trips on Run AM-104 are predicted to be late.',
    link: '/runs/duty-1',
    readAt: null,
    createdAt: new Date(Date.now() - 6 * 60_000).toISOString(),
  },
  {
    id: 'N-498',
    tenantId: 'tenant-demo',
    userId: 'user-demo',
    type: 'safety_alert',
    title: 'Safety alert — acknowledgement required',
    body: 'Wembley Depot south gate closed between 10:00 and 14:00.',
    link: null,
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
]

const MOCK_DEFECTS: DefectRecord[] = [
  {
    id: 'def-1',
    severity: 'high',
    category: 'brakes',
    status: 'open',
    description: 'Brake pedal spongy — reported during pre-use check',
    vehicle: { id: 'veh-4', registrationNumber: 'CD34 EFG', status: 'off_road' },
    createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
  },
  {
    id: 'def-2',
    severity: 'medium',
    category: 'bodywork',
    status: 'open',
    description: 'Nearside mirror housing cracked',
    vehicle: { id: 'veh-2', registrationNumber: 'GH56 HIJ', status: 'in_service' },
    createdAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
  },
  {
    id: 'def-3',
    severity: 'critical',
    category: 'steering',
    status: 'open',
    description: 'Steering pull to left under load — driver stop-work',
    vehicle: { id: 'veh-4', registrationNumber: 'CD34 EFG', status: 'off_road' },
    createdAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  },
]

const MOCK_VEHICLE_CHECKS: VehicleCheckRecord[] = [
  {
    id: 'vc-1',
    checkDate: today(),
    checkType: 'pre_use',
    result: 'pass',
    notes: null,
    vehicle: { id: 'veh-1', registrationNumber: 'AB12 CDE' },
    depot: { id: 'depot-wembley', name: 'Wembley Depot' },
    driver: { id: 'drv-1', firstName: 'Jane', lastName: 'Smith' },
  },
  {
    id: 'vc-2',
    checkDate: today(),
    checkType: 'pre_use',
    result: 'pass',
    notes: null,
    vehicle: { id: 'veh-2', registrationNumber: 'GH56 HIJ' },
    depot: { id: 'depot-wembley', name: 'Wembley Depot' },
    driver: { id: 'drv-2', firstName: 'Michael', lastName: 'Patel' },
  },
  {
    id: 'vc-3',
    checkDate: today(),
    checkType: 'yard',
    result: 'fail',
    notes: 'Brake pedal spongy — vehicle marked VOR',
    vehicle: { id: 'veh-4', registrationNumber: 'CD34 EFG' },
    depot: { id: 'depot-wembley', name: 'Wembley Depot' },
    driver: { id: 'drv-5', firstName: 'Sarah', lastName: 'Johnson' },
  },
  {
    id: 'vc-4',
    checkDate: new Date(Date.now() - 24 * 60 * 60_000).toISOString().slice(0, 10),
    checkType: 'pre_use',
    result: 'pass',
    notes: null,
    vehicle: { id: 'veh-3', registrationNumber: 'KL78 MNO' },
    depot: { id: 'depot-croydon', name: 'Croydon Depot' },
    driver: { id: 'drv-3', firstName: 'Alice', lastName: 'Brown' },
  },
]

const MOCK_COMPLIANCE_ITEMS: ComplianceItemRecord[] = [
  { id: 'cmp-1', entityType: 'driver', entityId: 'drv-4', entityLabel: 'Robert Wilson', documentType: 'Licence', expiryDate: '2025-11-20', status: 'expiring_soon', daysUntilExpiry: 28 },
  { id: 'cmp-2', entityType: 'driver', entityId: 'drv-4', entityLabel: 'Robert Wilson', documentType: 'Medical', expiryDate: '2025-12-15', status: 'expiring_soon', daysUntilExpiry: 53 },
  { id: 'cmp-3', entityType: 'vehicle', entityId: 'veh-4', entityLabel: 'CD34 EFG', documentType: 'MOT', expiryDate: '2025-04-01', status: 'expired', daysUntilExpiry: -102 },
  { id: 'cmp-4', entityType: 'vehicle', entityId: 'veh-1', entityLabel: 'AB12 CDE', documentType: 'Insurance', expiryDate: '2026-05-01', status: 'valid', daysUntilExpiry: 120 },
  { id: 'cmp-5', entityType: 'driver', entityId: 'drv-1', entityLabel: 'Jane Smith', documentType: 'CPC', expiryDate: '2026-09-01', status: 'expiring_soon', daysUntilExpiry: 22 },
]

const MOCK_COMPLIANCE_SETTINGS: ComplianceAutomationSettings = {
  warnDaysBeforeExpiry: 30,
  blockAssignmentOnExpired: true,
  autoUnassignOnExpired: true,
  notifyRoles: ['company_owner', 'operations_manager', 'compliance_officer'],
}

let mockMessages: MessageRecord[] = [
  {
    id: 'msg-1',
    subject: 'PM run coverage',
    body: 'Can you confirm who is covering SCH-PM-207 this afternoon? We still have no driver assigned.',
    readAt: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    sender: { id: 'user-ops', firstName: 'Karen', lastName: 'Mitchell' },
    recipient: { id: 'user-demo', firstName: 'Larone', lastName: 'Laing' },
  },
  {
    id: 'msg-2',
    subject: 'VOR — CD34 EFG',
    body: 'CD34 EFG is off road following yard check failure. Replacement needed for tomorrow AM if not cleared.',
    readAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 5 * 60 * 60_000).toISOString(),
    sender: { id: 'user-fleet', firstName: 'Tom', lastName: 'Harris' },
    recipient: { id: 'user-demo', firstName: 'Larone', lastName: 'Laing' },
  },
  {
    id: 'msg-3',
    subject: null,
    body: 'Gate closure at Wembley south entrance until 14:00 — use north gate for departures.',
    readAt: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString(),
    sender: { id: 'user-demo', firstName: 'Larone', lastName: 'Laing' },
    recipient: { id: 'user-ops', firstName: 'Karen', lastName: 'Mitchell' },
  },
]

const MOCK_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: 'ann-1',
    title: 'Wembley south gate closed',
    body: 'South gate at Wembley Depot closed 10:00–14:00 for resurfacing. Use north gate for all departures.',
    publishedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    depotName: 'Wembley Depot',
    priority: 'high',
  },
  {
    id: 'ann-2',
    title: 'New safeguarding procedure',
    body: 'Updated safeguarding escalation flow is live. All drivers must complete the briefing by Friday.',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    depotName: null,
    priority: 'normal',
  },
]

let mockCompany: CompanyRecord = {
  id: 'tenant-demo',
  name: 'Metro Transport Ltd',
  tradingName: 'Metro Transport',
  settings: {
    mainContactName: 'Larone Laing',
    mainContactEmail: 'demo@veyvio.com',
    telephone: '020 7946 0958',
    operatorLicenceNumber: 'OP1234567',
  },
}

const MOCK_USERS: UserMembershipRecord[] = [
  {
    id: 'mem-1',
    roleKey: 'company_owner',
    status: 'active',
    user: { id: 'user-demo', email: 'demo@veyvio.com', firstName: 'Larone', lastName: 'Laing', status: 'active', lastLoginAt: new Date().toISOString() },
  },
  {
    id: 'mem-2',
    roleKey: 'operations_manager',
    status: 'active',
    user: { id: 'user-ops', email: 'k.mitchell@metrotransport.co.uk', firstName: 'Karen', lastName: 'Mitchell', status: 'active', lastLoginAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString() },
  },
  {
    id: 'mem-3',
    roleKey: 'fleet_manager',
    status: 'active',
    user: { id: 'user-fleet', email: 't.harris@metrotransport.co.uk', firstName: 'Tom', lastName: 'Harris', status: 'active', lastLoginAt: new Date(Date.now() - 24 * 60 * 60_000).toISOString() },
  },
  {
    id: 'mem-4',
    roleKey: 'company_admin',
    status: 'invited',
    user: { id: 'user-inv', email: 'new.admin@metrotransport.co.uk', firstName: 'Pending', lastName: 'User', status: 'invited', lastLoginAt: null },
  },
]

const MOCK_PASSENGERS: PassengerRecord[] = [
  { id: 'pax-1', firstName: 'Oliver', lastName: 'Taylor', status: 'active', customerName: 'Oakwood Primary', routeName: 'Oakwood School AM', needsWheelchair: false },
  { id: 'pax-2', firstName: 'Amelia', lastName: 'Chen', status: 'active', customerName: 'Oakwood Primary', routeName: 'Oakwood School AM', needsWheelchair: true },
  { id: 'pax-3', firstName: 'George', lastName: 'Williams', status: 'active', customerName: 'Riverside Day Centre', routeName: 'Day Centre Run', safeguardingFlag: true },
  { id: 'pax-4', firstName: 'Sophie', lastName: 'Murphy', status: 'inactive', customerName: 'Oakwood Primary', routeName: 'School PM Return' },
]

const MOCK_CONTRACTS: ContractRecord[] = [
  { id: 'con-1', name: 'Oakwood Primary 2025/26', contractType: 'school', startDate: '2025-09-01', endDate: '2026-07-31', status: 'active', customer: { organisationName: 'Oakwood Primary' } },
  { id: 'con-2', name: 'Riverside Day Centre', contractType: 'adult_social_care', startDate: '2025-04-01', endDate: null, status: 'active', customer: { organisationName: 'Riverside Day Centre' } },
]

const MOCK_RECURRING: RecurringTransportRecord[] = [
  { id: 'rec-1', name: 'Oakwood AM — term time', pattern: 'weekly', routeName: 'Oakwood School AM', customerName: 'Oakwood Primary', status: 'active', daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { id: 'rec-2', name: 'Oakwood PM — term time', pattern: 'weekly', routeName: 'School PM Return', customerName: 'Oakwood Primary', status: 'active', daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { id: 'rec-3', name: 'Riverside — Mon/Wed/Fri', pattern: 'weekly', routeName: 'Day Centre Run', customerName: 'Riverside Day Centre', status: 'active', daysOfWeek: ['mon', 'wed', 'fri'] },
]

const MOCK_SCHOOLS: SchoolRecord[] = [
  { id: 'sch-1', name: 'Oakwood Primary School', address: 'Oakwood Rd, London NW10', customerId: 'cust-1', routeCount: 2, pupilCount: 48 },
]

const MOCK_MAINTENANCE: MaintenanceRecord[] = [
  { id: 'mnt-1', vehicleRegistration: 'AB12 CDE', vehicleId: 'veh-1', type: 'service', scheduledDate: '2026-04-15', status: 'scheduled', provider: 'Mercedes Commercial' },
  { id: 'mnt-2', vehicleRegistration: 'CD34 EFG', vehicleId: 'veh-4', type: 'repair', scheduledDate: '2026-03-20', status: 'in_progress', provider: 'Fleet Workshop' },
]

const MOCK_TEMPLATES: MessageTemplateRecord[] = [
  { id: 'tpl-1', name: 'Delay notification', category: 'operations', subject: 'Service delay — {{route}}', body: 'We are experiencing a delay on {{route}}. Revised ETA: {{eta}}.' },
  { id: 'tpl-2', name: 'Safeguarding escalation', category: 'safety', subject: 'Safeguarding — immediate review', body: 'A safeguarding concern has been raised. Please review incident {{incident_id}}.' },
  { id: 'tpl-3', name: 'Vehicle off road', category: 'fleet', subject: 'VOR — {{registration}}', body: '{{registration}} has been marked off road. Replacement vehicle required for {{duty_reference}}.' },
]

const MOCK_INTEGRATIONS: IntegrationRecord[] = [
  { id: 'int-1', name: 'GPS Telematics', provider: 'Samsara', status: 'connected', lastSyncAt: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: 'int-2', name: 'Accounting', provider: 'Xero', status: 'connected', lastSyncAt: new Date(Date.now() - 60 * 60_000).toISOString() },
  { id: 'int-3', name: 'Council portal', provider: 'Custom API', status: 'disconnected', lastSyncAt: null },
]

const MOCK_AUDIT: AuditLogRecord[] = [
  { id: 'aud-1', entityType: 'duty', entityId: 'duty-3', action: 'status_changed', createdAt: new Date(Date.now() - 30 * 60_000).toISOString(), user: { firstName: 'Karen', lastName: 'Mitchell', email: 'k.mitchell@metrotransport.co.uk' } },
  { id: 'aud-2', entityType: 'vehicle', entityId: 'veh-4', action: 'marked_vor', createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), user: { firstName: 'Tom', lastName: 'Harris', email: 't.harris@metrotransport.co.uk' } },
  { id: 'aud-3', entityType: 'defect', entityId: 'def-1', action: 'created', createdAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), user: { firstName: 'Sarah', lastName: 'Johnson', email: 's.johnson@metrotransport.co.uk' } },
  { id: 'aud-4', entityType: 'incident', entityId: 'inc-2', action: 'created', createdAt: new Date(Date.now() - 25 * 60 * 60_000).toISOString(), user: { firstName: 'Robert', lastName: 'Wilson', email: 'r.wilson@metrotransport.co.uk' } },
]

const MOCK_PRICING: PricingRuleRecord[] = [
  { id: 'price-1', name: 'School contract — per mile', rateType: 'per_mile', amount: 2.85, currency: 'GBP', status: 'active' },
  { id: 'price-2', name: 'Adult social care — hourly', rateType: 'hourly', amount: 45, currency: 'GBP', status: 'active' },
  { id: 'price-3', name: 'Private hire — minimum', rateType: 'flat', amount: 35, currency: 'GBP', status: 'active' },
]

function delay(ms = 120) {
  return new Promise((r) => setTimeout(r, ms))
}

function dutyToLiveVehicle(duty: DutyDetailRecord): LiveDispatchResponse['vehicles'][0] {
  const stops = duty.route?.stops ?? []
  const staleMinutes =
    duty.lastPositionAt != null
      ? Math.round((Date.now() - new Date(duty.lastPositionAt).getTime()) / 60_000)
      : null
  return {
    dutyId: duty.id,
    reference: duty.reference,
    status: duty.status,
    routeName: duty.route?.name ?? null,
    driverId: duty.driver?.id ?? null,
    driverName: duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : null,
    vehicleRegistration: duty.vehicle?.registrationNumber ?? null,
    lastLatitude: duty.lastLatitude ?? null,
    lastLongitude: duty.lastLongitude ?? null,
    lastPositionAt: duty.lastPositionAt ?? null,
    staleMinutes,
    isStale: staleMinutes == null || staleMinutes > 10,
    staleThresholdMinutes: 10,
    nextStop:
      stops.length > 1
        ? {
            routeStopId: stops[1]!.id,
            name: stops[1]!.name,
            stopOrder: stops[1]!.stopOrder,
            distanceM: 420,
            etaMinutes: 8,
            pickupTime: stops[1]!.pickupTime ?? null,
          }
        : null,
    routeTotalStops: stops.length,
    routeCompletedStops: duty.status === 'completed' ? stops.length : Math.min(1, stops.length),
    routeProgressPercent:
      stops.length > 0
        ? Math.round(
            ((duty.status === 'completed' ? stops.length : 1) / stops.length) * 100,
          )
        : null,
  }
}

export class MockApiClient {
  private accessToken: string | null = null

  setToken(token: string | null, hasTenant = true) {
    this.accessToken = token
    if (typeof window === 'undefined') return
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      if (hasTenant) sessionStorage.setItem('has_tenant', '1')
      else sessionStorage.removeItem('has_tenant')
    } else {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('has_tenant')
      sessionStorage.removeItem(MEMBERSHIPS_KEY)
    }
  }

  clearToken() {
    this.setToken(null)
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) this.accessToken = stored
    return stored
  }

  hasTenant(): boolean {
    return typeof window !== 'undefined' && sessionStorage.getItem('has_tenant') === '1'
  }

  setPendingMemberships(memberships: TenantMembershipOption[]) {
    sessionStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships))
  }

  getPendingMemberships(): TenantMembershipOption[] {
    const raw = sessionStorage.getItem(MEMBERSHIPS_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as TenantMembershipOption[]
    } catch {
      return []
    }
  }

  async login(email: string, _password: string, _rememberMe = false): Promise<LoginResponse> {
    await delay()
    if (!email.trim()) throw new Error('Email is required')
    const name = email.split('@')[0]?.split('.')[0] ?? 'User'
    const firstName = name.charAt(0).toUpperCase() + name.slice(1)
    return {
      accessToken: MOCK_TOKEN,
      user: { ...MOCK_USER, email, firstName },
      requiresTenantSelection: false,
    }
  }

  async selectTenant(tenantId: string): Promise<AuthTokensResponse> {
    await delay()
    return {
      accessToken: MOCK_TOKEN,
      refreshToken: 'mock-refresh',
      user: { ...MOCK_USER, activeTenantId: tenantId, tenantStatus: 'ACTIVE' },
    }
  }

  async signupCompany(input: {
    email: string
    firstName: string
    lastName: string
    companyName: string
    country: string
    phone?: string
    password: string
    termsAccepted: boolean
    privacyAccepted: boolean
  }) {
    await delay(80)
    if (!input.termsAccepted || !input.privacyAccepted) throw new Error('You must accept the terms and privacy notice')
    return {
      ok: true,
      message: 'If an account can be created for this address, we will send instructions.',
      pendingOrganisationId: 'pending-org-1',
      devVerificationToken: 'demo-verify-token',
    }
  }

  async verifySignupEmail(_token: string) {
    await delay(50)
    return { companyId: 'tenant-demo', userId: 'user-demo', nextStep: 'company_verification' }
  }

  async submitCompanyVerification(_input: Record<string, unknown>) {
    await delay(50)
    return { nextStep: 'contract_acceptance' }
  }

  async acceptCompanyContracts() {
    await delay(50)
    return { nextStep: 'setup' }
  }

  async completeCompanySetup(_input: { timezone?: string; depotName?: string; depotCode?: string }) {
    await delay(50)
    return { nextStep: 'active' }
  }

  async listInvitations() {
    await delay(40)
    return [
      {
        id: 'inv-1',
        email: 'sarah.jones@example.com',
        appType: 'COMMAND',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
        acceptedAt: null,
        revokedAt: null,
        invitedBy: 'user-demo',
        createdAt: new Date().toISOString(),
        roleIds: [],
      },
    ]
  }

  async createInvitation(input: { email: string; roleName?: string }) {
    await delay(60)
    return {
      invitation: {
        id: 'inv-new',
        email: input.email,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        status: 'pending',
        appType: 'COMMAND',
      },
      devInvitationToken: 'demo-invite-token',
    }
  }

  async previewInvitation(_token: string) {
    await delay(30)
    return {
      email: 'invitee@example.com',
      companyName: 'Metro Transport Ltd',
      appType: 'COMMAND' as string,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      firstName: 'Invitee' as string | null,
      lastName: 'User' as string | null,
    }
  }

  async acceptInvitation(_input: { token: string; password: string; firstName: string; lastName: string }) {
    await delay(80)
    return {
      companyId: 'tenant-demo',
      userId: 'user-invitee',
      email: 'invitee@example.com',
      appType: 'COMMAND',
    }
  }

  async forgotPassword(email: string) {
    await delay(40)
    return {
      ok: true,
      message: 'If an account exists for this address, we will send reset instructions.',
      devResetToken: email ? 'demo-reset-token' : null,
    }
  }

  async resetPassword(_token: string, _password: string) {
    await delay(50)
    return { ok: true }
  }

  async enableMfa() {
    await delay(50)
    return {
      recoveryCodes: ['AAAA1111', 'BBBB2222', 'CCCC3333', 'DDDD4444', 'EEEE5555', 'FFFF6666', 'GGGG7777', 'HHHH8888'],
      mfaEnabled: true,
    }
  }

  async verifyMfa(input: {
    challengeId: string
    code: string
    companyId?: string
    refreshToken?: string
    accessToken?: string
  }) {
    await delay(50)
    if (!input.challengeId || !input.code) throw new Error('MFA challenge and code are required')
    return {
      accessToken: MOCK_TOKEN,
      refreshToken: 'mock-refresh',
      user: { ...MOCK_USER, mfaEnabled: true },
      requiresTenantSelection: false,
    }
  }

  async createSupportGrant(input: {
    reason: string
    ticketReference?: string
    granteeUserId?: string
    durationMinutes?: number
  }) {
    await delay(50)
    return {
      id: `grant-${Date.now()}`,
      reason: input.reason,
      ticketReference: input.ticketReference ?? null,
      accessLevel: 'read_only',
      expiresAt: new Date(Date.now() + (input.durationMinutes ?? 60) * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    }
  }

  async listSupportGrants() {
    await delay(40)
    return [] as Array<{
      id: string
      reason: string
      ticketReference?: string | null
      accessLevel?: string
      expiresAt?: string
      createdAt?: string
    }>
  }

  async listRetentionPolicies() {
    await delay(40)
    return [
      { category: 'unaccepted_invitations', retentionDays: 30 },
      { category: 'authentication_logs', retentionDays: 365 },
      { category: 'device_sessions', retentionDays: 90 },
    ]
  }

  async requestDataExport(exportType = 'company_full') {
    await delay(50)
    return {
      id: `export-${Date.now()}`,
      exportType,
      status: 'queued',
      createdAt: new Date().toISOString(),
    }
  }

  async listDataExports() {
    await delay(40)
    return [] as Array<{
      id: string
      exportType: string
      status: string
      createdAt?: string
      completedAt?: string | null
    }>
  }

  async getMe(): Promise<AuthUser> {
    await delay(50)
    return MOCK_USER
  }

  async getDashboard(): Promise<DashboardSummary> {
    await delay()
    const active = mockDuties.filter((d) =>
      ['assigned', 'in_progress', 'ready', 'passenger_boarded'].includes(d.status),
    ).length
    const unassigned = mockDuties.filter((d) => d.status === 'unassigned').length
    const incidentsHub = mockIncidentsApi.hub()
    const openIncidents = incidentsHub.register.filter((r) => isActiveIncident(r.status)).length
    return {
      todaysActiveDuties: active,
      vehiclesInService: getMockVehicles().filter((v) => v.status === 'in_service').length,
      vehiclesOffRoad: getMockVehicles().filter((v) => v.status === 'off_road').length,
      driversOnDuty: getMockDrivers().filter((d) => d.status === 'on_duty').length,
      openDefects: MOCK_DEFECTS.length,
      openIncidents,
      expiringDocuments: 3,
      alerts: [
        ...(unassigned > 0
          ? [{
              severity: 'warning' as const,
              title: `${unassigned} duties unassigned today`,
              href: '/dispatch',
              category: 'operations' as const,
            }]
          : []),
        {
          severity: 'danger' as const,
          title: 'high brakes defect on CD34 EFG (off road)',
          href: '/defects/def-1',
          category: 'fleet' as const,
        },
        {
          severity: 'warning' as const,
          title: 'Driver Jane Smith — CPC expiring within 30 days',
          href: '/drivers/drv-1',
          category: 'compliance' as const,
        },
        {
          severity: 'warning' as const,
          title: '2 driver apps have not synced for over 40 minutes',
          href: '/drivers?filter=stale_sync',
          category: 'operations' as const,
          details: ['Silence is not confirmation — check pending uploads'],
        },
        {
          severity: 'danger' as const,
          title: 'Driver assistance requested — Michael Patel',
          href: '/live-operations?duty=duty-2',
          category: 'safety' as const,
          details: ['Category: Unable to find address', 'Vehicle may be moving — urgent contact only if required'],
        },
        {
          severity: 'danger' as const,
          title: 'Run AM-112 blocked — yard return inspection incomplete',
          href: '/yard?tab=tasks',
          category: 'fleet' as const,
          details: ['Vehicle EO71 NTJ', 'Required by 07:35'],
        },
      ],
      navBadges: { defects: MOCK_DEFECTS.length, compliance: 3 },
      timeline: mockDuties.slice(0, 8).map((d) => ({
        id: d.id,
        time: d.startTime,
        title: d.route?.name ?? d.reference,
        status: d.status,
        href: `/runs/${d.id}`,
      })),
    }
  }

  async getLiveDispatch(_date?: string, scope: 'active' | 'completed' = 'active'): Promise<LiveDispatchResponse> {
    await delay()
    const filtered = mockDuties.filter((d) => {
      if (!d.driver) return false
      if (scope === 'completed') return d.status === 'completed'
      return ['in_progress', 'assigned', 'passenger_boarded', 'en_route'].includes(d.status)
    })
    return {
      date: today(),
      generatedAt: new Date().toISOString(),
      trackingEnabled: true,
      vehicles: filtered.map(dutyToLiveVehicle),
    }
  }

  async getDuties(params?: { date?: string; status?: string; from?: string; to?: string }): Promise<DutyRecord[]> {
    await delay()
    let list = [...mockDuties]
    if (params?.from && params?.to) {
      list = list.filter((d) => d.dutyDate >= params.from! && d.dutyDate <= params.to!)
    } else if (params?.date) {
      list = list.filter((d) => d.dutyDate === params.date)
    }
    if (params?.status) list = list.filter((d) => d.status === params.status)
    return list
  }

  async getDuty(id: string): Promise<DutyDetailRecord> {
    await delay()
    const duty = mockDuties.find((d) => d.id === id)
    if (!duty) throw new Error('Duty not found')
    return duty
  }

  async getDutyTrack(id: string): Promise<DutyTrackResponse> {
    await delay()
    const duty = mockDuties.find((d) => d.id === id)
    if (!duty) throw new Error('Duty not found')
    const stops = duty.route?.stops ?? []
    return {
      duty,
      pings: duty.lastLatitude != null
        ? [
            { id: 'p1', latitude: 51.5636, longitude: -0.2796, recordedAt: new Date(Date.now() - 20 * 60_000).toISOString() },
            { id: 'p2', latitude: 51.558, longitude: -0.29, recordedAt: new Date(Date.now() - 10 * 60_000).toISOString() },
            { id: 'p3', latitude: duty.lastLatitude!, longitude: duty.lastLongitude!, recordedAt: duty.lastPositionAt ?? new Date().toISOString() },
          ]
        : [],
      checkpoints: stops.map((s, i) => ({
        routeStopId: s.id,
        name: s.name,
        stopOrder: s.stopOrder,
        arrivedAt: i === 0 && duty.status !== 'unassigned' ? new Date().toISOString() : null,
      })),
    }
  }

  async updateDuty(id: string, data: Record<string, unknown>) {
    return this.assignDuty(id, data)
  }

  async assignDuty(id: string, data: Record<string, unknown>) {
    await delay()
    const idx = mockDuties.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Duty not found')
    const duty = { ...mockDuties[idx]! }
    if ('status' in data && typeof data.status === 'string') duty.status = data.status
    if ('driverId' in data) {
      const driverId = data.driverId as string | null
      duty.driver = driverId
        ? getMockDrivers().find((d) => d.id === driverId)
          ? { id: driverId, firstName: getMockDrivers().find((d) => d.id === driverId)!.firstName, lastName: getMockDrivers().find((d) => d.id === driverId)!.lastName }
          : null
        : null
    }
    if ('vehicleId' in data) {
      const vehicleId = data.vehicleId as string | null
      duty.vehicle = vehicleId
        ? getMockVehicles().find((v) => v.id === vehicleId)
          ? { id: vehicleId, registrationNumber: getMockVehicles().find((v) => v.id === vehicleId)!.registrationNumber }
          : null
        : null
    }
    duty.publicationStatus =
      duty.driver && duty.vehicle ? 'ready_to_publish' : duty.publicationStatus ?? 'draft'
    mockDuties[idx] = duty
    return duty
  }

  async publishDuty(id: string) {
    await delay()
    const idx = mockDuties.findIndex((d) => d.id === id)
    if (idx < 0) throw new Error('Duty not found')
    const duty = { ...mockDuties[idx]! }
    if (!duty.driver) throw new Error('Driver is required before publish')
    duty.publicationStatus = 'published'
    duty.publishedAt = new Date().toISOString()
    duty.acknowledgementRequired = true
    duty.acknowledgementDeadline = `${duty.dutyDate}T20:00:00.000Z`
    duty.driverLifecycleStatus = 'published'
    mockDuties[idx] = duty
    return { duty, eligibility: { status: 'eligible' as const, blockers: [], warnings: [] } }
  }

  async createDuty(data: Record<string, unknown>) {
    await delay()
    const duty: DutyDetailRecord = {
      id: `duty-${Date.now()}`,
      reference: `DUTY-${mockDuties.length + 1}`,
      dutyDate: (data.dutyDate as string) ?? (data.serviceDate as string) ?? today(),
      startTime: (data.startTime as string) ?? (data.plannedSignOnAt as string) ?? null,
      status: 'unassigned',
      publicationStatus: 'draft',
      route: null,
      driver: null,
      vehicle: null,
    }
    mockDuties.push(duty)
    return duty
  }

  async getDrivers(): Promise<DriverRecord[]> {
    await delay(50)
    return getMockDrivers()
  }

  async getDriver(id: string): Promise<DriverRecord> {
    await delay()
    return profileToLegacyRecord(mockDriversApi.get(id))
  }

  async getDriverProfile(id: string): Promise<DriverProfile> {
    await delay()
    return mockDriversApi.get(id)
  }

  async getDriverProfiles(): Promise<DriverProfile[]> {
    await delay(50)
    return mockDriversApi.list()
  }

  async getDriverDirectorySummary(): Promise<DriverDirectorySummary> {
    await delay(30)
    return mockDriversApi.summary()
  }

  async createDriver(input: CreateDriverInput, actorName: string): Promise<DriverProfile> {
    await delay(120)
    return mockDriversApi.create(input, actorName)
  }

  async updateDriver(id: string, input: UpdateDriverInput, actorName: string): Promise<DriverProfile> {
    await delay(100)
    return mockDriversApi.update(id, input, actorName)
  }

  async sendDriverInvitation(id: string, actorName: string, channel: 'email' | 'sms' | 'both' = 'email'): Promise<DriverProfile> {
    await delay(80)
    return mockDriversApi.sendInvitation(id, actorName, channel)
  }

  async createDriverAppAccount(
    id: string,
    input: import('@/lib/drivers/types').CreateDriverAppAccountInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(100)
    return mockDriversApi.createAppAccount(id, input, actorName)
  }

  async activateDriver(
    id: string,
    input: import('@/lib/drivers/types').ActivateDriverInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(100)
    return mockDriversApi.activate(id, input, actorName)
  }

  async suspendDriver(
    id: string,
    input: import('@/lib/drivers/types').SuspendDriverInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(100)
    return mockDriversApi.suspend(id, input, actorName)
  }

  async reinstateDriver(
    id: string,
    input: import('@/lib/drivers/types').ReinstateDriverInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(100)
    return mockDriversApi.reinstate(id, input, actorName)
  }

  async unlockDriver(
    id: string,
    input: import('@/lib/drivers/types').UnlockDriverInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(100)
    return mockDriversApi.unlock(id, input, actorName)
  }

  async offboardDriver(
    id: string,
    input: import('@/lib/drivers/types').OffboardDriverInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(120)
    return mockDriversApi.offboard(id, input, actorName)
  }

  async revokeDriverDevice(
    id: string,
    deviceId: string,
    input: import('@/lib/drivers/types').RevokeDriverDeviceInput,
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(80)
    return mockDriversApi.revokeDevice(id, deviceId, input, actorName)
  }

  async cancelDriverInvitation(id: string, actorName: string, reason: string): Promise<DriverProfile> {
    await delay(80)
    return mockDriversApi.cancelInvitation(id, actorName, reason)
  }

  async addDriverNote(
    id: string,
    input: { category: string; body: string; visibleToDriver?: boolean },
    actorName: string,
  ): Promise<DriverProfile> {
    await delay(80)
    return mockDriversApi.addNote(
      id,
      {
        category: input.category as import('@/lib/drivers/types').DriverNoteCategory,
        body: input.body,
        author: actorName,
        visibleToDriver: Boolean(input.visibleToDriver),
      },
      actorName,
    )
  }

  async initiateDriverPasswordReset(id: string, actorName: string): Promise<DriverProfile> {
    await delay(80)
    return mockDriversApi.initiatePasswordReset(id, actorName)
  }

  async revokeDriverSessions(id: string, actorName: string, reason: string): Promise<DriverProfile> {
    await delay(80)
    return mockDriversApi.revokeSessions(id, actorName, reason)
  }

  async uploadDriverDocument(id: string, input: import('@/lib/drivers/types').UploadDriverDocumentInput, actorName: string) {
    await delay(100)
    return mockDriversApi.uploadDocument(id, input, actorName)
  }

  async recordDriverTraining(
    id: string,
    input: import('@/lib/drivers/types').RecordDriverTrainingInput,
    actorName: string,
  ) {
    await delay(100)
    return mockDriversApi.recordTraining(id, input, actorName)
  }

  async listDriverRequirements(id: string) {
    await delay(40)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    return mockDriverRequirementsApi.list(id)
  }

  async requestDriverRequirements(
    id: string,
    input: import('@/lib/drivers/types').RequestDriverRequirementsInput,
    actorName: string,
  ) {
    await delay(80)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    return mockDriverRequirementsApi.request(id, input, actorName)
  }

  async assignDriverRequirementTraining(
    id: string,
    input: import('@/lib/drivers/types').AssignDriverTrainingInput,
    actorName: string,
  ) {
    await delay(80)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    return mockDriverRequirementsApi.assignTraining(id, input, actorName)
  }

  async rejectDriverRequirement(
    id: string,
    definitionKey: string,
    input: import('@/lib/drivers/types').RejectDriverRequirementInput,
    actorName: string,
  ) {
    await delay(80)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    return mockDriverRequirementsApi.reject(id, definitionKey, input, actorName)
  }

  async markDriverRequirementStatus(
    id: string,
    definitionKey: string,
    status: 'not_applicable' | 'waived',
    actorName: string,
  ) {
    await delay(60)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    return mockDriverRequirementsApi.markStatus(id, definitionKey, status, actorName)
  }

  async submitDriverRequirementEvidence(
    id: string,
    definitionKey: string,
    actorName: string,
    options?: { label?: string; message?: string },
  ) {
    await delay(80)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    const result = mockDriverRequirementsApi.submitEvidence(id, definitionKey, actorName, options)
    mockNotifications = [
      {
        id: `N-${Date.now()}`,
        tenantId: 'tenant-demo',
        userId: 'user-demo',
        type: 'driver.onboarding.evidence_submitted',
        title: 'Driver evidence ready for review',
        body: `${options?.label ?? definitionKey.replace(/_/g, ' ')} was uploaded and is waiting for review.`,
        link: `/drivers/${id}?tab=Eligibility`,
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      ...mockNotifications,
    ]
    return result
  }

  async getDriverRequirementHistory(id: string, definitionKey: string) {
    await delay(40)
    const { mockDriverRequirementsApi } = await import('./mock-driver-requirements')
    return mockDriverRequirementsApi.history(id, definitionKey)
  }

  async verifyDriverDocument(id: string, documentId: string, actorName: string) {
    await delay(80)
    return mockDriversApi.verifyDocument(id, documentId, actorName)
  }

  async rejectDriverDocument(id: string, documentId: string, reason: string, actorName: string) {
    await delay(80)
    return mockDriversApi.rejectDocument(id, documentId, reason, actorName)
  }

  async addDriverRestriction(id: string, input: import('@/lib/drivers/types').AddDriverRestrictionInput, actorName: string) {
    await delay(80)
    return mockDriversApi.addRestriction(id, input, actorName)
  }

  async liftDriverRestriction(id: string, restrictionId: string, reason: string, actorName: string) {
    await delay(80)
    return mockDriversApi.liftRestriction(id, restrictionId, reason, actorName)
  }

  async grantDriverEligibilityOverride(id: string, input: import('@/lib/drivers/types').GrantEligibilityOverrideInput, actorName: string) {
    await delay(100)
    return mockDriversApi.grantEligibilityOverride(id, input, actorName)
  }

  async getDriverEligibilityExceptions() {
    await delay(40)
    return mockDriversApi.listEligibilityExceptions()
  }

  async getVehicles(): Promise<VehicleRecord[]> {
    await delay(50)
    return getMockVehicles()
  }

  async getVehicle(id: string): Promise<VehicleRecord> {
    await delay()
    const vehicle = getMockVehicles().find((v) => v.id === id)
    if (!vehicle) throw new Error('Vehicle not found')
    return vehicle
  }

  async getVehicleProfile(id: string): Promise<VehicleProfile> {
    await delay(40)
    const profile = mockVehiclesApi.get(id)
    if (!profile) throw new Error('Vehicle not found')
    const duty = mockDuties.find((d) => d.vehicle?.id === id && d.lastLatitude != null) ?? null
    return mockVehiclesApi.enrichWithTelematics(profile, duty)
  }

  async getVehicleProfiles(): Promise<VehicleProfile[]> {
    await delay(50)
    return mockVehiclesApi.list()
  }

  async getVehicleDirectorySummary(): Promise<VehicleDirectorySummary> {
    await delay(30)
    return mockVehiclesApi.summary()
  }

  async createVehicle(input: CreateVehicleInput, actorName: string): Promise<VehicleProfile> {
    await delay(120)
    return mockVehiclesApi.create(input, actorName)
  }

  async updateVehicle(id: string, input: UpdateVehicleInput, actorName: string): Promise<VehicleProfile> {
    await delay(100)
    return mockVehiclesApi.update(id, input, actorName)
  }

  async markVehicleVor(id: string, input: import('@/lib/vehicles/types').MarkVehicleVorInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.markVor(id, input, actorName)
  }

  async returnVehicleToService(id: string, actorName: string, input: import('@/lib/vehicles/types').ReturnToServiceInput) {
    await delay(80)
    return mockVehiclesApi.returnToService(id, actorName, input)
  }

  async reportVehicleDefect(id: string, input: import('@/lib/vehicles/types').CreateVehicleDefectInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.reportDefect(id, input, actorName)
  }

  async closeVehicleDefect(id: string, defectId: string, actorName: string, reason: string) {
    await delay(80)
    return mockVehiclesApi.closeDefect(id, defectId, actorName, reason)
  }

  async yardVehicleCheckInOut(id: string, input: import('@/lib/vehicles/types').YardCheckInOutInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.yardCheckInOut(id, input, actorName)
  }

  async createVehicleWorkOrder(id: string, input: import('@/lib/vehicles/types').CreateWorkOrderInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.createWorkOrder(id, input, actorName)
  }

  async completeVehicleWorkOrder(id: string, workOrderId: string, actorName: string, actualCost?: number) {
    await delay(80)
    return mockVehiclesApi.completeWorkOrder(id, workOrderId, actorName, actualCost)
  }

  async triageVehicleDefect(id: string, defectId: string, input: import('@/lib/vehicles/types').TriageDefectInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.triageDefect(id, defectId, input, actorName)
  }

  async updateVehicleWorkOrder(id: string, workOrderId: string, input: import('@/lib/vehicles/types').UpdateWorkOrderInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.updateWorkOrder(id, workOrderId, input, actorName)
  }

  async updateVehiclePmiChecklistItem(
    id: string,
    workOrderId: string,
    input: import('@/lib/vehicles/types').UpdatePmiChecklistItemInput,
    actorName: string,
  ) {
    await delay(80)
    return mockVehiclesApi.updatePmiChecklistItem(id, workOrderId, input, actorName)
  }

  async addVehicleWorkOrderPart(id: string, workOrderId: string, input: import('@/lib/vehicles/types').AddWorkOrderPartInput, actorName: string) {
    await delay(80)
    const updated = mockVehiclesApi.addWorkOrderPart(id, workOrderId, input, actorName)
    const { workOrderPartToResourceInput } = await import('@/lib/fleet-resources/cross-app')
    const ledger = workOrderPartToResourceInput({
      vehicleId: id,
      workOrderId,
      partName: input.partName,
      quantity: input.quantity,
      unitCost: input.unitCost,
      actorName,
    })
    mockFleetResourcesApi.recordTransaction({
      ...ledger,
      workOrderId,
    })
    return updated
  }

  async approveVehicleWorkOrderEstimate(
    id: string,
    workOrderId: string,
    input: import('@/lib/vehicles/types').ApproveWorkOrderEstimateInput,
    actorName: string,
  ) {
    await delay(80)
    return mockVehiclesApi.approveWorkOrderEstimate(id, workOrderId, input, actorName)
  }

  async completeVehicleRetorque(id: string, taskId: string, actorName: string) {
    await delay(80)
    return mockVehiclesApi.completeRetorque(id, taskId, actorName)
  }

  async getFleetIntelligence() {
    await delay(40)
    return mockVehiclesApi.getFleetIntelligence()
  }

  async uploadVehicleDocument(id: string, input: import('@/lib/vehicles/types').UploadVehicleDocumentInput, actorName: string) {
    await delay(100)
    return mockVehiclesApi.uploadDocument(id, input, actorName)
  }

  async verifyVehicleDocument(id: string, documentId: string, actorName: string) {
    await delay(80)
    return mockVehiclesApi.verifyDocument(id, documentId, actorName)
  }

  async getVehicleReleaseExceptions() {
    await delay(40)
    return mockVehiclesApi.listReleaseExceptions()
  }

  async advanceVehicleOnboarding(id: string, stageId: import('@/lib/vehicles/types').OnboardingStageId, actorName: string) {
    await delay(100)
    return mockVehiclesApi.advanceOnboardingStage(id, stageId, actorName)
  }

  async activateVehicleFromWizard(
    id: string,
    options: { acknowledgeWarnings?: boolean; mode: 'submit_for_approval' | 'activate' | 'keep_blocked' },
    actorName: string,
  ) {
    await delay(120)
    return mockVehiclesApi.activateFromWizard(id, options, actorName)
  }

  async reportVehicleDamage(id: string, input: import('@/lib/vehicles/types').ReportDamageInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.reportDamage(id, input, actorName)
  }

  async updateVehicleEquipment(id: string, input: import('@/lib/vehicles/types').UpdateVehicleEquipmentInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.updateEquipment(id, input, actorName)
  }

  async recordVehicleCheck(id: string, input: import('@/lib/vehicles/types').RecordVehicleCheckInput, actorName: string) {
    await delay(80)
    return mockVehiclesApi.recordCheck(id, input, actorName)
  }

  async getVehicleAdBlueRecords(vehicleId: string) {
    await delay(40)
    return normalizeAdBlueRecords(mockAdBlueApi.listForVehicle(vehicleId))
  }

  async recordVehicleAdBlue(
    vehicleId: string,
    input: import('@/lib/adblue/types').RecordAdBlueInput,
    actorName: string,
  ) {
    await delay(80)
    const profile = mockVehiclesApi.get(vehicleId)
    return mockAdBlueApi.record(vehicleId, profile?.registrationNumber ?? '—', input, actorName)
  }

  async getVehicleReports(params?: { vehicleId?: string; status?: string }) {
    await delay(50)
    return mockVehicleReportsApi.list(params)
  }

  async getVehicleReport(id: string) {
    await delay(40)
    const row = mockVehicleReportsApi.get(id)
    if (!row) throw new Error('Vehicle report not found')
    return row
  }

  async createVehicleReport(input: import('@/lib/vehicle-reports/types').CreateVehicleReportInput, actorName: string) {
    await delay(80)
    return mockVehicleReportsApi.create(input, actorName)
  }

  async reviewVehicleReport(
    id: string,
    input: import('@/lib/vehicle-reports/types').ReviewVehicleReportInput,
    actorName: string,
  ) {
    await delay(80)
    return mockVehicleReportsApi.review(id, input, actorName)
  }

  async getVehicleReportsHub() {
    await delay(50)
    return mockVehicleReportsApi.hub()
  }

  async getRoutes(): Promise<RouteRecord[]> {
    await delay(50)
    return MOCK_ROUTES
  }

  async getCustomers(): Promise<CustomerRecord[]> {
    await delay(50)
    return [
      { id: 'cust-1', name: 'Oakwood Primary', status: 'active' },
      { id: 'cust-2', name: 'Riverside Day Centre', status: 'active' },
    ]
  }

  async getDefects(params?: { status?: string }): Promise<DefectRecord[]> {
    await delay()
    const hub = mockDefectsApi.hub()
    let rows = hub.register
    if (params?.status === 'open') rows = rows.filter((r) => r.defectStatus !== 'closed')
    return rows.map((r) => ({
      id: r.id,
      severity: r.severity === 'dangerous' ? 'critical' : r.severity === 'major' ? 'high' : r.severity,
      category: r.category,
      status: r.defectStatus,
      description: r.description,
      vehicle: { id: r.vehicleId, registrationNumber: r.registrationNumber, status: r.vehicleAvailability },
      createdAt: r.reportedAt,
    }))
  }

  async getDefect(id: string): Promise<DefectRecord> {
    await delay()
    const defect = MOCK_DEFECTS.find((d) => d.id === id)
    if (!defect) throw new Error('Defect not found')
    return defect
  }

  async getIncidents(params?: { status?: string }): Promise<IncidentRecord[]> {
    await delay()
    const hub = mockIncidentsApi.hub()
    let rows = hub.register
    if (params?.status === 'open') {
      rows = rows.filter((r) => r.status !== 'closed' && r.status !== 'cancelled_duplicate')
    }
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      incidentType: r.category,
      description: r.shortDescription,
      status: r.status,
      severity: r.severity,
      isSafeguarding: r.isSafeguarding,
      occurredAt: r.occurredAt,
      createdAt: r.reportedAt,
      driver: r.driverId && r.driverName
        ? { id: r.driverId, firstName: r.driverName.split(' ')[0] ?? '', lastName: r.driverName.split(' ').slice(1).join(' ') }
        : null,
      assignedTo: r.ownerName
        ? { firstName: r.ownerName.split(' ')[0] ?? '', lastName: r.ownerName.split(' ').slice(1).join(' ') }
        : null,
      location: r.location,
    }))
  }

  async getIncident(id: string): Promise<IncidentRecord> {
    await delay()
    const detail = mockIncidentsApi.detail(id)
    if (!detail) throw new Error('Incident not found')
    return {
      id: detail.id,
      title: detail.title,
      incidentType: detail.category,
      description: detail.fullDescription,
      status: detail.status,
      severity: detail.severity,
      isSafeguarding: detail.isSafeguarding,
      occurredAt: detail.occurredAt,
      createdAt: detail.reportedAt,
      driver: detail.driverId && detail.driverName
        ? { id: detail.driverId, firstName: detail.driverName.split(' ')[0] ?? '', lastName: detail.driverName.split(' ').slice(1).join(' ') }
        : null,
      assignedTo: detail.ownerName
        ? { firstName: detail.ownerName.split(' ')[0] ?? '', lastName: detail.ownerName.split(' ').slice(1).join(' ') }
        : null,
      location: detail.location,
    }
  }

  async getVehicleChecks(params?: { date?: string; vehicleId?: string }): Promise<VehicleCheckRecord[]> {
    await delay()
    let list = [...MOCK_VEHICLE_CHECKS]
    if (params?.date) list = list.filter((c) => c.checkDate.startsWith(params.date!))
    if (params?.vehicleId) list = list.filter((c) => c.vehicle?.id === params.vehicleId)
    return list
  }

  async getComplianceExpiring(days = 30): Promise<{ items: ComplianceItemRecord[] }> {
    await delay()
    const items = MOCK_COMPLIANCE_ITEMS.filter(
      (i) => i.daysUntilExpiry != null && i.daysUntilExpiry <= days,
    )
    return { items }
  }

  async getComplianceAutomationSettings(): Promise<ComplianceAutomationSettings> {
    await delay(50)
    return MOCK_COMPLIANCE_SETTINGS
  }

  async createMessage(input: {
    driverId: string
    subject?: string
    body: string
    conversationId?: string
    requiresAck?: boolean
  }): Promise<MessageRecord> {
    const record: MessageRecord = {
      id: `msg-${Date.now()}`,
      subject: input.subject ?? 'Ops notice',
      body: input.body,
      readAt: null,
      createdAt: new Date().toISOString(),
      conversationId: input.conversationId ?? `conv-${Date.now()}`,
      driverId: input.driverId,
      sourceApp: 'COMMAND',
      sender: { id: 'admin', firstName: 'Ops', lastName: 'Desk' },
      recipient: { id: input.driverId, firstName: 'Driver', lastName: '' },
    }
    mockMessages = [record, ...mockMessages]
    return record
  }

  async getMessages(params?: { folder?: 'inbox' | 'sent'; driverId?: string }): Promise<MessageRecord[]> {
    await delay()
    const demoUserId = 'user-demo'
    if (params?.driverId) {
      return mockMessages.filter((m) => m.driverId === params.driverId)
    }
    if (params?.folder === 'sent') {
      return mockMessages.filter((m) => m.sender.id === demoUserId)
    }
    if (params?.folder === 'inbox') {
      return mockMessages.filter((m) => m.recipient.id === demoUserId)
    }
    return mockMessages.filter(
      (m) => m.recipient.id === demoUserId || m.sender.id === demoUserId,
    )
  }

  async getMessage(id: string): Promise<MessageRecord> {
    await delay()
    const message = mockMessages.find((m) => m.id === id)
    if (!message) throw new Error('Message not found')
    return message
  }

  async markMessageRead(id: string) {
    await delay()
    mockMessages = mockMessages.map((m) =>
      m.id === id ? { ...m, readAt: new Date().toISOString() } : m,
    )
    return mockMessages.find((m) => m.id === id)
  }

  async getReportsSummary(params?: { from?: string; to?: string }): Promise<ReportsSummary> {
    await delay()
    const from = params?.from ?? today()
    const to = params?.to ?? today()
    return {
      fleet: { vehicles: getMockVehicles().length, drivers: getMockDrivers().length },
      customers: 2,
      safety: {
        openDefects: MOCK_DEFECTS.length,
        openIncidents: mockIncidentsApi.hub().register.filter((r) => isActiveIncident(r.status)).length,
      },
      operations: { dutiesInPeriod: mockDuties.length },
      period: { from, to },
      generatedAt: new Date().toISOString(),
    }
  }

  async getAnnouncements(): Promise<AnnouncementRecord[]> {
    await delay(50)
    return MOCK_ANNOUNCEMENTS
  }

  async getCompany(): Promise<CompanyRecord> {
    await delay(50)
    return mockCompany
  }

  async updateCompany(data: Record<string, unknown>): Promise<CompanyRecord> {
    await delay()
    if (typeof data.name === 'string') mockCompany = { ...mockCompany, name: data.name }
    if ('tradingName' in data) mockCompany = { ...mockCompany, tradingName: (data.tradingName as string) || null }
    if (data.settings && typeof data.settings === 'object') {
      mockCompany = {
        ...mockCompany,
        settings: { ...mockCompany.settings, ...(data.settings as CompanyRecord['settings']) },
      }
    }
    return mockCompany
  }

  async getUsers(): Promise<UserMembershipRecord[]> {
    await delay(50)
    return MOCK_USERS
  }

  async getStaff(): Promise<StaffRecord[]> {
    await delay(50)
    return mockStaffApi.passengerAssistants()
  }

  async getStaffHub() {
    await delay(50)
    return mockStaffApi.hub()
  }

  async getStaffProfiles() {
    await delay(50)
    return mockStaffApi.list()
  }

  async getStaffProfile(id: string) {
    await delay(50)
    const profile = mockStaffApi.get(id)
    if (!profile) throw new Error('Staff member not found')
    return profile
  }

  async getStaffDirectorySummary() {
    await delay(30)
    return mockStaffApi.summary()
  }

  async createStaff(input: import('@/lib/staff/types').CreateStaffInput, actorName: string) {
    await delay(100)
    return mockStaffApi.create(input, actorName)
  }

  async updateStaff(id: string, input: import('@/lib/staff/types').UpdateStaffInput, actorName: string) {
    await delay(80)
    return mockStaffApi.update(id, input, actorName)
  }

  async sendStaffInvitation(id: string, input: import('@/lib/staff/types').SendStaffInvitationInput, actorName: string) {
    await delay(80)
    return mockStaffApi.sendInvitation(id, input, actorName)
  }

  async suspendStaffAccess(id: string, input: import('@/lib/staff/types').SuspendStaffAccessInput, actorName: string) {
    await delay(80)
    return mockStaffApi.suspendAccess(id, input, actorName)
  }

  async reinstateStaffAccess(id: string, actorName: string) {
    await delay(80)
    return mockStaffApi.reinstateAccess(id, actorName)
  }

  async initiateStaffPasswordReset(id: string, actorName: string) {
    await delay(80)
    return mockStaffApi.initiatePasswordReset(id, actorName)
  }

  async revokeStaffSessions(id: string, actorName: string, reason: string) {
    await delay(80)
    return mockStaffApi.revokeSessions(id, actorName, reason)
  }

  async offboardStaff(id: string, actorName: string, lastWorkingDate: string) {
    await delay(80)
    return mockStaffApi.offboard(id, actorName, lastWorkingDate)
  }

  async setStaffDutyStatus(id: string, status: import('@/lib/staff/types').StaffDutyStatus, actorName: string, input?: import('@/lib/staff/types').StaffDutyActionInput) {
    await delay(60)
    return mockStaffApi.setDutyStatus(id, status, actorName, input)
  }

  async createStaffHandover(fromStaffId: string, input: import('@/lib/staff/types').CreateStaffHandoverInput, actorName: string) {
    await delay(80)
    return mockStaffApi.createHandover(fromStaffId, input, actorName)
  }

  async completeStaffHandover(handoverId: string, toStaffId: string, actorName: string) {
    await delay(80)
    return mockStaffApi.completeHandover(handoverId, toStaffId, actorName)
  }

  async assignStaffTask(staffId: string, input: import('@/lib/staff/types').AssignStaffTaskInput, actorName: string) {
    await delay(80)
    return mockStaffApi.assignTask(staffId, input, actorName)
  }

  async completeStaffTask(staffId: string, taskId: string, actorName: string) {
    await delay(60)
    return mockStaffApi.completeTask(staffId, taskId, actorName)
  }

  async verifyStaffQualification(staffId: string, qualificationId: string, actorName: string) {
    await delay(80)
    return mockStaffApi.verifyStaffQualification(staffId, qualificationId, actorName)
  }

  async addStaffQualification(staffId: string, input: import('@/lib/staff/types').AddStaffQualificationInput, actorName: string) {
    await delay(80)
    return mockStaffApi.addStaffQualification(staffId, input, actorName)
  }

  async uploadStaffDocument(staffId: string, input: import('@/lib/staff/types').UploadStaffDocumentInput, actorName: string) {
    await delay(80)
    return mockStaffApi.uploadStaffDocument(staffId, input, actorName)
  }

  async verifyStaffDocument(staffId: string, documentId: string, actorName: string) {
    await delay(80)
    return mockStaffApi.verifyStaffDocument(staffId, documentId, actorName)
  }

  async completeStaffAccessReview(staffId: string, input: import('@/lib/staff/types').CompleteStaffAccessReviewInput, actorName: string) {
    await delay(80)
    return mockStaffApi.completeAccessReview(staffId, input, actorName)
  }

  async extendContractorAccess(staffId: string, input: import('@/lib/staff/types').ExtendContractorAccessInput, actorName: string) {
    await delay(80)
    return mockStaffApi.extendContractorAccess(staffId, input, actorName)
  }

  async moveStaffMember(staffId: string, input: import('@/lib/staff/types').MoveStaffMemberInput, actorName: string) {
    await delay(80)
    return mockStaffApi.moveStaffMember(staffId, input, actorName)
  }

  async getPassengers(): Promise<PassengerRecord[]> {
    await delay(50)
    return MOCK_PASSENGERS
  }

  async getContracts(): Promise<ContractRecord[]> {
    await delay(50)
    return MOCK_CONTRACTS
  }

  async getRecurringTransport(): Promise<RecurringTransportRecord[]> {
    await delay(50)
    return MOCK_RECURRING
  }

  async getSchools(): Promise<SchoolRecord[]> {
    await delay(50)
    return MOCK_SCHOOLS
  }

  async getMaintenance(): Promise<MaintenanceRecord[]> {
    await delay(50)
    return MOCK_MAINTENANCE
  }

  async getMaintenanceHub() {
    await delay(50)
    return mockMaintenanceApi.hub()
  }

  async getInspections(): Promise<InspectionRecord[]> {
    await delay(50)
    return mockInspectionsApi.legacyList()
  }

  async getInspectionsHub() {
    await delay(50)
    return mockInspectionsApi.hub()
  }

  async getFleetResourcesHub() {
    await delay(50)
    return mockFleetResourcesApi.hub()
  }

  async getAttendanceHub() {
    await delay(40)
    return mockAttendanceApi.getHub()
  }

  async getLeaveRequests() {
    await delay(40)
    return mockAttendanceApi.listLeave()
  }

  async updateLeaveRequest(row: import('@/lib/attendance/types').LeaveRequestRecord) {
    await delay(40)
    return mockAttendanceApi.updateLeave(row)
  }

  async getAttendancePersonProfile(input: { personId?: string | null; personName?: string | null }) {
    await delay(40)
    return mockAttendanceApi.getPersonProfile(input)
  }

  async classifyAttendanceRow(input: {
    rowId: string
    classification: import('@/lib/attendance/types').ManagerClassification
    reason?: import('@/lib/attendance/types').AbsenceReasonCode | null
    note?: string
    actorName: string
  }) {
    await delay(40)
    return mockAttendanceApi.classifyBoardRow(input)
  }

  async getAttendanceCoverCandidates(dutyLabel?: string | null) {
    await delay(40)
    return mockAttendanceApi.listCoverCandidates(dutyLabel)
  }

  async assignAttendanceCover(input: {
    originalPersonName: string
    coverPersonId: string
    coverPersonName: string
    dutyLabel: string
    actorName: string
    overrideReason?: string
  }) {
    await delay(60)
    return mockAttendanceApi.assignCover(input)
  }

  async recordResourceTransaction(input: {
    resourceCategory: import('@/lib/fleet-resources/types').ResourceCategory
    resourceItemId: string
    resourceName: string
    transactionType: import('@/lib/fleet-resources/types').ResourceTransactionType
    quantity: number
    unit: string
    unitPrice?: number | null
    vehicleId?: string | null
    driverName?: string | null
    supplierName?: string | null
    odometer?: number | null
    receiptFileName?: string | null
    fuelCardId?: string | null
    notes?: string | null
    depotName?: string | null
    workOrderId?: string | null
    actorName: string
  }) {
    await delay(80)
    return mockFleetResourcesApi.recordTransaction(input)
  }

  async updateFleetResourcesSettings(
    patch: Partial<import('@/lib/fleet-resources/types').FleetResourcesSettings>,
  ) {
    await delay(40)
    return mockFleetResourcesApi.updateSettings(patch)
  }

  async approveResourcePurchase(id: string, actorName: string) {
    await delay(60)
    return mockFleetResourcesApi.approvePurchase(id, actorName)
  }

  async fitResourceTyre(input: {
    tyreId: string
    vehicleId: string
    position: string
    positionLabel: string
    actorName: string
  }) {
    await delay(80)
    return mockFleetResourcesApi.fitTyre(input)
  }

  async removeResourceTyre(input: { tyreId: string; actorName: string; quarantine?: boolean }) {
    await delay(80)
    return mockFleetResourcesApi.removeTyre(input)
  }

  async rotateResourceTyres(input: {
    vehicleId: string
    aTyreId: string
    bTyreId: string
    actorName: string
  }) {
    await delay(80)
    return mockFleetResourcesApi.rotateTyres(input)
  }

  async assignResourceEquipment(input: {
    equipmentId: string
    vehicleId: string | null
    actorName: string
  }) {
    await delay(60)
    return mockFleetResourcesApi.assignEquipment(input)
  }

  async transferResourceStock(input: {
    resourceItemId: string
    resourceName: string
    quantity: number
    unit: string
    fromDepotId: string
    fromDepotName: string
    toDepotId: string
    toDepotName: string
    actorName: string
  }) {
    await delay(80)
    return mockFleetResourcesApi.transferStock(input)
  }

  async receiveResourceTransfer(id: string, actorName: string) {
    await delay(60)
    return mockFleetResourcesApi.receiveTransfer(id, actorName)
  }

  async getInspection(id: string) {
    await delay(40)
    const row = mockInspectionsApi.get(id)
    if (!row) throw new Error('Inspection not found')
    return row
  }

  async scheduleInspection(input: {
    vehicleId: string
    inspectionType: import('@/lib/inspections/types').InspectionType
    dueDate: string
    bookedDate?: string | null
    provider?: string
    driverInstruction?: string | null
  }) {
    await delay(80)
    return mockInspectionsApi.schedule(input)
  }

  async startInspection(id: string, actorName: string) {
    await delay(80)
    return mockInspectionsApi.start(id, actorName)
  }

  async updateInspectionChecklistItem(
    id: string,
    input: import('@/lib/vehicles/types').UpdatePmiChecklistItemInput,
    actorName: string,
  ) {
    await delay(60)
    return mockInspectionsApi.updateChecklistItem(id, input, actorName)
  }

  async completeInspectionChecklist(id: string) {
    await delay(60)
    return mockInspectionsApi.markAwaitingSignOff(id)
  }

  async signOffInspection(id: string, actorName: string) {
    await delay(80)
    return mockInspectionsApi.signOff(id, actorName)
  }

  async importInspection(input: {
    vehicleId: string
    inspectionType: import('@/lib/inspections/types').InspectionType
    dueDate: string
    fileName: string
    outcome?: import('@/lib/inspections/types').InspectionOutcome
  }) {
    await delay(80)
    return mockInspectionsApi.importStub(input)
  }

  async getMessageTemplates(): Promise<MessageTemplateRecord[]> {
    await delay(50)
    return MOCK_TEMPLATES
  }

  async getIntegrations(): Promise<IntegrationRecord[]> {
    await delay(50)
    return MOCK_INTEGRATIONS
  }

  async getAuditLogs(): Promise<AuditLogRecord[]> {
    await delay()
    return MOCK_AUDIT
  }

  async getPricingRules(): Promise<PricingRuleRecord[]> {
    await delay(50)
    return MOCK_PRICING
  }

  async getPerformanceMetrics(params?: { from?: string; to?: string }): Promise<PerformanceMetrics> {
    await delay()
    const from = params?.from ?? today()
    const to = params?.to ?? today()
    return {
      onTimePct: 87.5,
      completedRuns: mockDuties.filter((d) => d.status === 'completed').length,
      avgDelayMinutes: 4.2,
      defectRate: 1.8,
      period: { from, to },
    }
  }

  async getYardSummary(): Promise<YardSummary> {
    await delay()
    const hub = mockYardApi.hub('depot-wembley')
    const checksToday = MOCK_VEHICLE_CHECKS.filter((c) => c.checkDate === today()).length
    return {
      vehiclesOnSite: hub.summary.onSite,
      checksToday,
      openDefects: MOCK_DEFECTS.length,
      adviceWaiting: 1,
      vehicles: getMockVehicles().map((v) => ({
        id: v.id,
        registrationNumber: v.registrationNumber,
        yardCheckToday: MOCK_VEHICLE_CHECKS.find((c) => c.vehicle?.id === v.id && c.checkDate === today())?.result ?? null,
        status: v.status ?? 'unknown',
      })),
    }
  }

  async getYardHub(depotId?: string) {
    await delay(50)
    const hub = mockYardApi.hub(depotId ?? 'depot-wembley')
    return {
      ...hub,
      driverMessages: hub.driverMessages ?? [],
      bodyworkReports: hub.bodyworkReports ?? [],
      vehicleChecks: hub.vehicleChecks ?? [],
    }
  }

  async getYardMessages() {
    await delay(40)
    return [] as import('@/lib/yard/types').YardDriverMessage[]
  }

  async replyYardMessage(input: { conversationId: string; driverId: string; body: string }) {
    await delay(60)
    return {
      id: `yard-reply-${Date.now()}`,
      conversationId: input.conversationId,
      driverId: input.driverId,
      body: input.body,
    }
  }

  async recordYardMovement(input: import('@/lib/yard/types').RecordYardMovementInput, actorName: string) {
    await delay(80)
    return mockYardApi.recordMovement(input, actorName)
  }

  async createYardTask(input: import('@/lib/yard/types').CreateYardTaskInput, actorName: string) {
    await delay(80)
    return mockYardApi.createTask(input, actorName)
  }

  async completeYardTask(input: import('@/lib/yard/types').CompleteYardTaskInput, actorName: string) {
    await delay(80)
    return mockYardApi.completeTask(input, actorName)
  }

  async startYardTask(taskId: string, actorName: string) {
    await delay(60)
    return mockYardApi.startTask(taskId, actorName)
  }

  async submitYardHandover(depotId: string, notes: string, actorName: string) {
    await delay(80)
    return mockYardApi.submitHandover(depotId, notes, actorName)
  }

  async acceptYardHandover(input: import('@/lib/yard/types').AcceptYardHandoverInput) {
    await delay(80)
    return mockYardApi.acceptHandover(input)
  }

  async getChecksHub() {
    await delay(50)
    return mockChecksApi.hub()
  }

  async getCheckDetail(checkId: string) {
    await delay(50)
    const detail = mockChecksApi.detail(checkId)
    if (!detail) throw new Error('Check not found')
    return detail
  }

  async startAdminCheck(input: import('@/lib/checks/types').StartAdminCheckInput, actorName: string) {
    await delay(80)
    return mockChecksApi.startAdminCheck(input, actorName)
  }

  async reviewCheck(input: import('@/lib/checks/types').ReviewCheckInput, actorName: string) {
    await delay(80)
    return mockChecksApi.reviewCheck(input, actorName)
  }

  async conditionalReleaseCheck(input: import('@/lib/checks/types').ConditionalReleaseInput, actorName: string) {
    await delay(80)
    return mockChecksApi.conditionalRelease(input, actorName)
  }

  async resolveCheckImpact(input: import('@/lib/checks/types').ResolveCheckImpactInput, actorName: string) {
    await delay(100)
    return mockChecksApi.resolveImpact(input, actorName)
  }

  async getDefectsHub() {
    await delay()
    return mockDefectsApi.hub()
  }

  async getDefectDetail(vehicleId: string, defectId: string) {
    await delay()
    return mockDefectsApi.detail(vehicleId, defectId)
  }

  async getDefectDetailById(defectId: string) {
    await delay()
    return mockDefectsApi.detailById(defectId)
  }

  async triageDefectHub(input: import('@/lib/defects/types').TriageDefectHubInput, actorName: string) {
    await delay()
    return mockDefectsApi.triage(input, actorName)
  }

  async reportDefectHub(input: import('@/lib/defects/types').ReportDefectHubInput, actorName: string) {
    await delay()
    const hub = mockDefectsApi.report(input, actorName)
    if (input.severity === 'dangerous' || input.markVor || input.emergencySupport) {
      mockNotifications = [
        {
          id: `N-${Date.now()}`,
          tenantId: 'tenant-demo',
          userId: 'user-demo',
          type: 'safety_alert',
          title: input.emergencySupport ? 'Emergency defect support requested' : 'Critical defect reported',
          body: `${input.component}: ${input.description}`,
          link: '/defects',
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        ...mockNotifications,
      ]
    }
    return hub
  }

  async completeDefectRepairHub(input: import('@/lib/defects/types').CompleteRepairHubInput, actorName: string) {
    await delay()
    return mockDefectsApi.completeRepair(input, actorName)
  }

  async verifyDefectHub(input: import('@/lib/defects/types').VerifyDefectHubInput, actorName: string) {
    await delay()
    return mockDefectsApi.verify(input, actorName)
  }

  async closeDefectHub(input: import('@/lib/defects/types').CloseDefectHubInput, actorName: string) {
    await delay()
    return mockDefectsApi.close(input, actorName)
  }

  async applyDefectRestrictionHub(input: import('@/lib/defects/types').ApplyDefectRestrictionInput, actorName: string) {
    await delay()
    return mockDefectsApi.applyRestriction(input, actorName)
  }

  async liftDefectRestrictionHub(vehicleId: string, restrictionId: string, defectId: string, actorName: string) {
    await delay()
    return mockDefectsApi.liftRestriction(vehicleId, restrictionId, actorName, defectId)
  }

  async reopenDefectHub(input: import('@/lib/defects/types').ReopenDefectHubInput, actorName: string) {
    await delay()
    return mockDefectsApi.reopen(input, actorName)
  }

  async uploadDefectEvidenceHub(input: import('@/lib/defects/types').UploadDefectEvidenceInput, actorName: string) {
    await delay()
    return mockDefectsApi.uploadEvidence(input, actorName)
  }

  async bulkDefectActionHub(input: import('@/lib/defects/types').BulkDefectActionInput, actorName: string) {
    await delay()
    return mockDefectsApi.bulkAction(input, actorName)
  }

  async markDefectVorHub(input: import('@/lib/defects/types').MarkDefectVorHubInput, actorName: string) {
    await delay()
    return mockDefectsApi.markVor(input, actorName)
  }

  async getIncidentsHub() {
    await delay()
    return mockIncidentsApi.hub()
  }

  async getIncidentDetail(id: string) {
    await delay()
    const detail = mockIncidentsApi.detail(id)
    if (!detail) throw new Error('Incident not found')
    return detail
  }

  async reportIncidentHub(input: import('@/lib/incidents/types').ReportIncidentHubInput, actorName: string) {
    await delay()
    const hub = mockIncidentsApi.report(input, actorName)
    if (input.severity === 'critical' || input.isSafeguarding) {
      mockNotifications = [
        {
          id: `N-${Date.now()}`,
          tenantId: 'tenant-demo',
          userId: 'user-demo',
          type: 'safety_alert',
          title: input.isSafeguarding ? 'Safeguarding incident reported' : 'Critical incident reported',
          body: input.title,
          link: '/incidents',
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        ...mockNotifications,
      ]
    }
    return hub
  }

  async acknowledgeIncidentHub(input: import('@/lib/incidents/types').AcknowledgeIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.acknowledge(input, actorName)
  }

  async assignIncidentHub(input: import('@/lib/incidents/types').AssignIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.assign(input, actorName)
  }

  async addIncidentUpdateHub(input: import('@/lib/incidents/types').AddIncidentUpdateInput, actorName: string) {
    await delay()
    return mockIncidentsApi.addUpdate(input, actorName)
  }

  async addIncidentActionHub(input: import('@/lib/incidents/types').AddIncidentActionInput, actorName: string) {
    await delay()
    return mockIncidentsApi.addAction(input, actorName)
  }

  async uploadIncidentEvidenceHub(input: import('@/lib/incidents/types').UploadIncidentEvidenceInput, actorName: string) {
    await delay()
    return mockIncidentsApi.uploadEvidence(input, actorName)
  }

  async closeIncidentHub(input: import('@/lib/incidents/types').CloseIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.close(input, actorName)
  }

  async containIncidentHub(input: import('@/lib/incidents/types').ContainIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.contain(input, actorName)
  }

  async escalateIncidentHub(input: import('@/lib/incidents/types').EscalateIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.escalate(input, actorName)
  }

  async reopenIncidentHub(input: import('@/lib/incidents/types').ReopenIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.reopen(input, actorName)
  }

  async createDefectFromIncidentHub(input: import('@/lib/incidents/types').CreateDefectFromIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.createDefect(input, actorName)
  }

  async markIncidentVehicleVorHub(input: import('@/lib/incidents/types').MarkIncidentVehicleVorInput, actorName: string) {
    await delay()
    return mockIncidentsApi.markVehicleVor(input, actorName)
  }

  async recordIncidentRegulatoryDecisionHub(input: import('@/lib/incidents/types').RecordRegulatoryDecisionInput, actorName: string) {
    await delay()
    return mockIncidentsApi.recordRegulatoryDecision(input, actorName)
  }

  async updateIncidentInvestigationHub(input: import('@/lib/incidents/types').UpdateInvestigationInput, actorName: string) {
    await delay()
    return mockIncidentsApi.updateInvestigation(input, actorName)
  }

  async updateIncidentPersonWelfareHub(input: import('@/lib/incidents/types').UpdatePersonWelfareInput, actorName: string) {
    await delay()
    return mockIncidentsApi.updatePersonWelfare(input, actorName)
  }

  async createTelematicsIncidentHub(input: import('@/lib/incidents/types').CreateTelematicsIncidentInput, actorName: string) {
    await delay()
    return mockIncidentsApi.createFromTelematics(input, actorName)
  }

  async linkIncidentEntitiesHub(input: import('@/lib/incidents/types').LinkIncidentEntitiesInput, actorName: string) {
    await delay()
    return mockIncidentsApi.linkEntities(input, actorName)
  }

  async requestCctvPreservationHub(input: import('@/lib/incidents/types').RequestCctvPreservationInput, actorName: string) {
    await delay()
    return mockIncidentsApi.requestCctvPreservation(input, actorName)
  }

  async submitIncidentToInsurerHub(input: import('@/lib/incidents/types').SubmitIncidentToInsurerInput, actorName: string) {
    await delay()
    return mockIncidentsApi.submitToInsurer(input, actorName)
  }

  async processTelematicsFeedHub(input: import('@/lib/incidents/types').ProcessTelematicsFeedInput, actorName: string) {
    await delay()
    return mockIncidentsApi.processTelematicsFeed(input, actorName)
  }

  async getDriverIncidents(driverId: string) {
    await delay()
    return mockIncidentsApi.driverIncidents(driverId)
  }

  async getIncidentSettings() {
    await delay(50)
    return mockIncidentsApi.getSettings()
  }

  async updateIncidentSettings(settings: Partial<import('@/lib/incidents/types').IncidentSettings>) {
    await delay()
    return mockIncidentsApi.updateSettings(settings)
  }

  async getNotifications(params?: { unread_only?: boolean }): Promise<ApiNotification[]> {
    await delay()
    if (params?.unread_only) return mockNotifications.filter((n) => !n.readAt)
    return mockNotifications
  }

  async getNotificationUnreadCount(): Promise<{ count: number }> {
    await delay(50)
    return { count: mockNotifications.filter((n) => !n.readAt).length }
  }

  async markNotificationRead(id: string) {
    await delay()
    mockNotifications = mockNotifications.map((n) =>
      n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
    )
    return mockNotifications.find((n) => n.id === id)
  }

  async markAllNotificationsRead() {
    await delay()
    mockNotifications = mockNotifications.map((n) => ({
      ...n,
      readAt: n.readAt ?? new Date().toISOString(),
    }))
    return { success: true }
  }

  async getDepots(): Promise<DepotRecord[]> {
    await delay(50)
    return mockDepotsApi.listRecords()
  }

  async getDepotProfiles() {
    await delay(60)
    return mockDepotsApi.listProfiles()
  }

  async getDepotProfile(id: string) {
    await delay(40)
    const profile = mockDepotsApi.getProfile(id)
    if (!profile) throw new Error('Depot not found')
    return profile
  }

  async getDepotOpsSnapshot(id: string, date?: string) {
    await delay(80)
    const day = date ?? today()
    const vehicles = mockVehiclesApi.list()
    const drivers = mockDriversApi.list()
    const duties = await this.getDuties({ date: day })
    const staff = mockStaffApi.list()
    return mockDepotsApi.opsSnapshot(id, { vehicles, drivers, duties, staff })
  }

  async createDepot(input: import('@/lib/depots/types').CreateDepotInput, _actorName: string) {
    await delay(100)
    return mockDepotsApi.create(input)
  }

  async updateDepot(id: string, input: import('@/lib/depots/types').UpdateDepotInput, _actorName: string) {
    await delay(80)
    return mockDepotsApi.update(id, input)
  }

  async getBookings(params?: { view?: string }): Promise<BookingListItem[]> {
    await delay()
    return mockBookingsApi.list(params)
  }

  async getBooking(id: string): Promise<BookingRecord> {
    await delay()
    return mockBookingsApi.get(id)
  }

  async createBookingDraft(
    bookingType?: BookingDraft['bookingType'],
    options?: CreateDraftOptions,
  ): Promise<BookingDraft> {
    await delay()
    return mockBookingsApi.createDraft(bookingType, { ...options, passengers: MOCK_PASSENGERS })
  }

  async duplicateBooking(id: string): Promise<BookingDraft> {
    await delay()
    return mockBookingsApi.createDraft(undefined, { duplicateFromId: id, passengers: MOCK_PASSENGERS })
  }

  async createReturnBooking(bookingId: string, tripId: string): Promise<BookingDraft> {
    await delay()
    return mockBookingsApi.createDraft('return', {
      returnFromBookingId: bookingId,
      returnFromTripId: tripId,
      passengers: MOCK_PASSENGERS,
    })
  }

  async getAutoPlanProposal(draft: BookingDraft): Promise<AutoPlanProposal | null> {
    await delay(100)
    return mockBookingsApi.getAutoPlanProposal(draft, mockDriversApi.list(), mockVehiclesApi.list())
  }

  async calculateBookingEditImpact(
    bookingId: string,
    updated: BookingDraft,
    assignments?: { driverName?: string; vehicleReg?: string; runRef?: string },
  ): Promise<EditImpact> {
    await delay(80)
    return mockBookingsApi.calculateEditImpact(bookingId, updated, assignments)
  }

  async updateBooking(
    bookingId: string,
    updated: BookingDraft,
    opts: { applyScope: 'trip_only' | 'all_future' | 'recurring_pattern' | 'exception' },
  ): Promise<BookingRecord> {
    await delay()
    return mockBookingsApi.updateBooking(bookingId, updated, opts)
  }

  async cancelBooking(bookingId: string, input: CancelBookingInput): Promise<BookingRecord> {
    await delay()
    return mockBookingsApi.cancelBooking(bookingId, input)
  }

  async getBookingDraft(id: string): Promise<BookingDraft> {
    await delay(50)
    return mockBookingsApi.getDraft(id)
  }

  async saveBookingDraft(draft: BookingDraft): Promise<BookingDraft> {
    await delay()
    return mockBookingsApi.saveDraft(draft)
  }

  async getCustomerBookingContext(customerId: string): Promise<CustomerBookingContext | null> {
    await delay(50)
    return mockBookingsApi.getCustomerContext(customerId)
  }

  async validateBookingDraft(draft: BookingDraft) {
    await delay(80)
    const wcCount = getMockVehicles().filter((v) => (v.wheelchairCapacity ?? 0) > 0 && v.status === 'in_service').length
    const staffCount = mockStaffApi.passengerAssistants().filter((s) => s.status !== 'unavailable').length
    return mockBookingsApi.validateDraft(draft, {
      wheelchairVehicleCount: wcCount,
      suitableStaffCount: staffCount,
    })
  }

  async confirmBookingDraft(draft: BookingDraft, options?: { asQuotation?: boolean }): Promise<BookingRecord> {
    await delay(150)
    const wcCount = getMockVehicles().filter((v) => (v.wheelchairCapacity ?? 0) > 0 && v.status === 'in_service').length
    const staffCount = mockStaffApi.passengerAssistants().filter((s) => s.status !== 'unavailable').length
    return mockBookingsApi.confirmDraft(draft, {
      asQuotation: options?.asQuotation,
      wheelchairVehicleCount: wcCount,
      suitableStaffCount: staffCount,
      mockDuties,
      depots: mockDepotsApi.listRecords(),
      drivers: getMockDrivers(),
      vehicles: getMockVehicles(),
      passengers: MOCK_PASSENGERS,
    })
  }

  async getOperationalTrips(params?: { dutyId?: string; status?: string }): Promise<OperationalTrip[]> {
    await delay(50)
    return mockTransfersApi.listTrips(params)
  }

  async getOperationalTrip(id: string): Promise<OperationalTrip> {
    await delay(50)
    return mockTransfersApi.getTrip(id)
  }

  async getOperationalTripByDuty(dutyId: string): Promise<OperationalTrip | null> {
    await delay(50)
    const trips = mockTransfersApi.listTrips({ dutyId })
    return trips[0] ?? null
  }

  async getOperationalPosition(tripId: string): Promise<OperationalPosition> {
    await delay(50)
    return mockTransfersApi.getPosition(tripId)
  }

  async getTransferCandidates(tripId: string): Promise<TransferCandidate[]> {
    await delay(80)
    return mockTransfersApi.getCandidates(tripId, getMockDrivers(), getMockVehicles())
  }

  async validateTransfer(input: CreateTransferInput): Promise<{
    items: TransferValidationItem[]
    workflowType: CreateTransferInput['workflowType']
  }> {
    await delay(80)
    return mockTransfersApi.validateTransferRequest(input, getMockDrivers(), getMockVehicles())
  }

  async previewTransferImpact(input: CreateTransferInput): Promise<TransferImpactPreview> {
    await delay(80)
    return mockTransfersApi.previewImpact(input, getMockDrivers(), getMockVehicles())
  }

  async commitTransfer(input: CreateTransferInput, actorName: string): Promise<TransferRecord> {
    await delay(150)
    return mockTransfersApi.commitTransfer(input, actorName, getMockDrivers(), getMockVehicles())
  }

  async getTransferHistory(tripId?: string): Promise<TransferRecord[]> {
    await delay(50)
    return mockTransfersApi.listTransfers(tripId)
  }

  async getAssignmentHistory(tripId: string): Promise<AssignmentHistoryEntry[]> {
    await delay(50)
    return mockTransfersApi.getAssignmentHistory(tripId)
  }

  async getOperationalTripsByBooking(bookingId: string) {
    await delay(50)
    return mockTransfersApi.getTripsByBooking(bookingId)
  }

  async getJourneysByBooking(bookingId: string) {
    await delay(50)
    return mockTransfersApi.getJourneysByBooking(bookingId)
  }

  async commitHandover(input: import('@/lib/transfers/types').HandoverInput, actorName: string) {
    await delay(150)
    return mockTransfersApi.commitHandover(input, actorName, getMockDrivers(), getMockVehicles())
  }

  async getTransferReport(periodFrom: string, periodTo: string) {
    await delay(80)
    return mockTransfersApi.getTransferReport(periodFrom, periodTo)
  }

  async getCommandResource<T>(path: string): Promise<T> {
    await delay(80)
    const normalized = path.split('?')[0].replace(/^\/+/, '')
    const records: Record<string, unknown> = {
      availability: {
        generatedAt: new Date().toISOString(),
        drivers: [
          { id: 'drv-1', firstName: 'Larone', lastName: 'Mitchell', status: 'available', depotName: 'Wembley' },
          { id: 'drv-2', firstName: 'Emma', lastName: 'Taylor', status: 'restricted', depotName: 'Wembley' },
        ],
        vehicles: [
          { id: 'veh-1', registrationNumber: 'LK23 ABC', status: 'ready', depotName: 'Wembley' },
          { id: 'veh-2', registrationNumber: 'MB12 VYO', status: 'vor', depotName: 'Wembley' },
        ],
        commitments: [],
      },
      cancellations: [
        { id: 'can-1042', reference: 'B-1042', status: 'cancelled', cancelledAt: new Date().toISOString(), cancellation: { reason: 'Passenger unavailable', noticeMinutes: 42 } },
        { id: 'can-1039', reference: 'B-1039', status: 'cancelled', cancelledAt: new Date().toISOString(), cancellation: { reason: 'Vehicle failure', noticeMinutes: 12 } },
      ],
      handover: [
        { id: 'hnd-204', title: 'MB-12 release evidence', detail: 'Independent return-to-service decision required', priority: 'critical', status: 'open' },
        { id: 'hnd-201', title: 'T-0191 passenger assistant', detail: 'Confirmation received by AM control', priority: 'normal', status: 'accepted' },
      ],
      'maintenance/work-orders': [
        { id: 'wo-441', reference: 'WO-441', title: 'Rear position light repair', status: 'in_progress', priority: 'critical', provider: 'Northside Fleet' },
        { id: 'wo-438', reference: 'WO-438', title: 'Brake inspection', status: 'overdue', priority: 'high', provider: 'Central Workshop' },
      ],
      compliance: { clearPercent: 91, expiring: 14, blocked: 4 },
      'compliance/expiries': {
        items: [
          { id: 'exp-1', entityType: 'driver', entityLabel: 'James Wilson', documentType: 'Driver CPC', status: 'expiring_soon', daysUntilExpiry: 7 },
          { id: 'exp-2', entityType: 'vehicle', entityLabel: 'LK22 DEF', documentType: 'MOT', status: 'expiring_soon', daysUntilExpiry: 12 },
        ],
      },
      safeguarding: [
        { id: 'sg-028', reference: 'SG-028', title: 'Approved collection contact control', severity: 'high', status: 'under_review', isSafeguarding: true },
      ],
      'risk-assessments': [
        { id: 'ra-204', reference: 'RA-204', title: 'Wheelchair boarding', riskLevel: 'medium', status: 'active', reviewDueAt: '2026-07-18T09:00:00Z' },
      ],
      'corrective-actions': [
        { id: 'ca-311', reference: 'CA-311', title: 'Improve pickup-bay separation', priority: 'high', status: 'in_progress', dueAt: '2026-07-18T16:00:00Z' },
      ],
      'communication/delivery': [
        { id: 'msg-8812', subject: 'Run AM-104 delay', channel: 'driver_app', deliveryState: 'acknowledged', createdAt: new Date().toISOString() },
        { id: 'msg-8808', subject: 'Revised passenger ETA', channel: 'sms', deliveryState: 'failed', createdAt: new Date().toISOString() },
      ],
      'settings/roles': [
        { id: 'role-1', roleKey: 'transport_manager', label: 'Transport manager', userCount: 6, permissions: ['*'] },
        { id: 'role-2', roleKey: 'dispatcher', label: 'Dispatcher', userCount: 14, permissions: ['dispatch.read', 'dispatch.manage'] },
      ],
      'settings/invitations': [
        { id: 'inv-1', email: 'sarah.jones@example.com', roleKey: 'dispatcher', status: 'invited', invitedAt: new Date().toISOString() },
      ],
      imports: [
        { id: 'imp-104', jobType: 'import', resourceType: 'passengers', fileName: 'passenger-updates.csv', status: 'validation_failed', rowCount: 184, errorCount: 6 },
      ],
      exports: [
        { id: 'exp-881', jobType: 'export', resourceType: 'contract_activity', fileName: 'july-contract-activity.csv', status: 'completed', rowCount: 2814, errorCount: 0 },
      ],
    }
    if (normalized === 'profile') {
      return { id: 'usr-1', firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah.mitchell@ridgeway.example', platformRole: 'transport_manager' } as T
    }
    if (normalized === 'search') return { results: [] } as T
    if (/^duties\/[^/]+$/.test(normalized)) return { id: 'duty-104', reference: 'DUT-104', status: 'on_duty', driverName: 'Larone Mitchell', vehicleRegistration: 'LK23 ABC', startTime: '2026-07-17T05:58:00Z', updatedAt: new Date().toISOString() } as T
    if (/^maintenance\/work-orders\/[^/]+$/.test(normalized)) return { id: 'wo-441', reference: 'WO-441', title: 'Rear position light repair', status: 'in_progress', provider: 'Northside Fleet', updatedAt: new Date().toISOString() } as T
    if (/^inspections\/[^/]+$/.test(normalized)) return { id: 'ins-204', reference: 'INS-204', title: 'Wembley pickup operation', status: 'action_required', updatedAt: new Date().toISOString() } as T
    if (/^passengers\/[^/]+$/.test(normalized)) return { id: 'passenger-1', name: 'Amira Khan', status: 'active', mobility: 'Wheelchair user', safeguarding: 'Approved contacts only', updatedAt: new Date().toISOString() } as T
    if (/^customers\/[^/]+$/.test(normalized)) return { id: 'customer-1', name: 'Brent Supported Travel', status: 'active', activePassengers: 42, updatedAt: new Date().toISOString() } as T
    if (/^schools\/[^/]+$/.test(normalized)) return { id: 'school-1', name: 'Brookfield Academy', status: 'active', arrivalWindow: '08:25–08:45', updatedAt: new Date().toISOString() } as T
    if (/^contracts\/[^/]+$/.test(normalized)) return { id: 'contract-1', reference: 'CTR-2026-014', name: 'Supported travel 2026/27', status: 'active', updatedAt: new Date().toISOString() } as T
    if (/^messages\/[^/]+$/.test(normalized)) return { id: 'message-1', title: 'Run AM-104 delay', status: 'response_due', createdAt: new Date().toISOString() } as T
    if (/^staff\/[^/]+$/.test(normalized)) return { id: 'staff-1', name: 'Sarah Mitchell', status: 'active', role: 'Transport manager', updatedAt: new Date().toISOString() } as T
    return (records[normalized] ?? []) as T
  }
}

export const mockApi = new MockApiClient()
