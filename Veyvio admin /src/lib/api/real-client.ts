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
import type { BookingDraft, BookingListItem, BookingRecord, CustomerBookingContext, CreateDraftOptions, CancelBookingInput, AutoPlanProposal, EditImpact } from '@/lib/bookings/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const TOKEN_KEY = 'access_token'
const MEMBERSHIPS_KEY = 'pending_memberships'

function apiErrorMessage(err: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(err.message)) return err.message.join(', ')
  return err.message ?? fallback
}

export class ApiClient {
  private accessToken: string | null = null

  setToken(token: string | null, hasTenant = true) {
    this.accessToken = token
    if (typeof window === 'undefined') return
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      if (hasTenant) {
        sessionStorage.setItem('has_tenant', '1')
      } else {
        sessionStorage.removeItem('has_tenant')
      }
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

  async fetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    }
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}/api${path}`, { ...options, headers })

    if (!res.ok) {
      if (res.status === 401 && token) {
        this.clearToken()
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/login')
        }
      }
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(apiErrorMessage(err, res.statusText || 'Request failed'))
    }

    return res.json() as Promise<T>
  }

  login(email: string, password: string, rememberMe = false) {
    return this.fetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    })
  }

  selectTenant(tenantId: string) {
    return this.fetch<AuthTokensResponse>('/auth/select-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    })
  }

  getMe() {
    return this.fetch<AuthUser>('/auth/me')
  }

  getDashboard() {
    return this.fetch<DashboardSummary>('/dashboard')
  }

  getLiveDispatch(date?: string, scope: 'active' | 'completed' = 'active') {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (scope !== 'active') params.set('scope', scope)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return this.fetch<LiveDispatchResponse>(`/dispatch/live${qs}`)
  }

  getDuties(params?: { date?: string; status?: string }) {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return this.fetch<DutyRecord[]>(`/duties${q ? `?${q}` : ''}`)
  }

  getDuty(id: string) {
    return this.fetch<DutyDetailRecord>(`/duties/${id}`)
  }

  getDutyTrack(id: string) {
    return this.fetch<DutyTrackResponse>(`/duties/${id}/track`)
  }

  updateDuty(id: string, data: Record<string, unknown>) {
    return this.fetch(`/duties/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
  }

  createDuty(data: Record<string, unknown>) {
    return this.fetch('/duties', { method: 'POST', body: JSON.stringify(data) })
  }

  getDrivers() {
    return this.fetch<DriverRecord[]>('/drivers')
  }

  getDriver(id: string) {
    return this.fetch<DriverRecord>(`/drivers/${id}`)
  }

  getDriverProfile(id: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/profile`)
  }

  getDriverProfiles() {
    return this.fetch<import('@/lib/drivers/types').DriverProfile[]>('/drivers/profiles')
  }

  getDriverDirectorySummary() {
    return this.fetch<import('@/lib/drivers/types').DriverDirectorySummary>('/drivers/summary')
  }

  createDriver(input: import('@/lib/drivers/types').CreateDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>('/drivers', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateDriver(id: string, input: import('@/lib/drivers/types').UpdateDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  sendDriverInvitation(id: string, actorName: string, channel: 'email' | 'sms' | 'both' = 'email') {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/invitation`, {
      method: 'POST',
      body: JSON.stringify({ actorName, channel }),
    })
  }

  cancelDriverInvitation(id: string, actorName: string, reason: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/invitation/cancel`, {
      method: 'POST',
      body: JSON.stringify({ actorName, reason }),
    })
  }

  initiateDriverPasswordReset(id: string, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/password-reset`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  revokeDriverSessions(id: string, actorName: string, reason: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/sessions/revoke`, {
      method: 'POST',
      body: JSON.stringify({ actorName, reason }),
    })
  }

  uploadDriverDocument(id: string, input: import('@/lib/drivers/types').UploadDriverDocumentInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  verifyDriverDocument(id: string, documentId: string, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/documents/${documentId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  rejectDriverDocument(id: string, documentId: string, reason: string, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ actorName, reason }),
    })
  }

  addDriverRestriction(id: string, input: import('@/lib/drivers/types').AddDriverRestrictionInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/restrictions`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  liftDriverRestriction(id: string, restrictionId: string, reason: string, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/restrictions/${restrictionId}/lift`, {
      method: 'POST',
      body: JSON.stringify({ actorName, reason }),
    })
  }

  grantDriverEligibilityOverride(id: string, input: import('@/lib/drivers/types').GrantEligibilityOverrideInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/overrides`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getDriverEligibilityExceptions() {
    return this.fetch<import('@/lib/types').OperationalException[]>('/drivers/eligibility-exceptions')
  }

  getVehicles() {
    return this.fetch<VehicleRecord[]>('/vehicles')
  }

  getVehicle(id: string) {
    return this.fetch<VehicleRecord>(`/vehicles/${id}`)
  }

  getVehicleProfile(id: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/profile`)
  }

  getVehicleProfiles() {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile[]>('/vehicles/profiles')
  }

  getVehicleDirectorySummary() {
    return this.fetch<import('@/lib/vehicles/types').VehicleDirectorySummary>('/vehicles/summary')
  }

  createVehicle(input: import('@/lib/vehicles/types').CreateVehicleInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>('/vehicles', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateVehicle(id: string, input: import('@/lib/vehicles/types').UpdateVehicleInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  markVehicleVor(id: string, input: import('@/lib/vehicles/types').MarkVehicleVorInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/vor`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  returnVehicleToService(id: string, actorName: string, input: import('@/lib/vehicles/types').ReturnToServiceInput) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/return-to-service`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reportVehicleDefect(id: string, input: import('@/lib/vehicles/types').CreateVehicleDefectInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/defects`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  closeVehicleDefect(id: string, defectId: string, actorName: string, reason: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/defects/${defectId}/close`, {
      method: 'POST',
      body: JSON.stringify({ actorName, reason }),
    })
  }

  yardVehicleCheckInOut(id: string, input: import('@/lib/vehicles/types').YardCheckInOutInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/yard`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  createVehicleWorkOrder(id: string, input: import('@/lib/vehicles/types').CreateWorkOrderInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/work-orders`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  completeVehicleWorkOrder(id: string, workOrderId: string, actorName: string, actualCost?: number) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/work-orders/${workOrderId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actorName, actualCost }),
    })
  }

  triageVehicleDefect(id: string, defectId: string, input: import('@/lib/vehicles/types').TriageDefectInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/defects/${defectId}/triage`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateVehicleWorkOrder(id: string, workOrderId: string, input: import('@/lib/vehicles/types').UpdateWorkOrderInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/work-orders/${workOrderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  addVehicleWorkOrderPart(id: string, workOrderId: string, input: import('@/lib/vehicles/types').AddWorkOrderPartInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/work-orders/${workOrderId}/parts`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  completeVehicleRetorque(id: string, taskId: string, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/retorque/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  getFleetIntelligence() {
    return this.fetch<import('@/lib/vehicles/types').FleetIntelligenceSummary>('/vehicles/intelligence')
  }

  uploadVehicleDocument(id: string, input: import('@/lib/vehicles/types').UploadVehicleDocumentInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/documents`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  verifyVehicleDocument(id: string, documentId: string, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/documents/${documentId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  getVehicleReleaseExceptions() {
    return this.fetch<import('@/lib/types').OperationalException[]>('/vehicles/release-exceptions')
  }

  advanceVehicleOnboarding(id: string, stageId: string, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/onboarding/${stageId}`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  reportVehicleDamage(id: string, input: import('@/lib/vehicles/types').ReportDamageInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/damage`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateVehicleEquipment(id: string, input: import('@/lib/vehicles/types').UpdateVehicleEquipmentInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/equipment`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  recordVehicleCheck(id: string, input: import('@/lib/vehicles/types').RecordVehicleCheckInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/checks`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getRoutes() {
    return this.fetch<RouteRecord[]>('/routes')
  }

  getCustomers() {
    return this.fetch<CustomerRecord[]>('/customers')
  }

  getDefects(params?: { status?: string }) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return this.fetch<DefectRecord[]>(`/defects${q ? `?${q}` : ''}`)
  }

  getDefect(id: string) {
    return this.fetch<DefectRecord>(`/defects/${id}`)
  }

  getIncidents(params?: { status?: string }) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return this.fetch<IncidentRecord[]>(`/incidents${q ? `?${q}` : ''}`)
  }

  getIncident(id: string) {
    return this.fetch<IncidentRecord>(`/incidents/${id}`)
  }

  getVehicleChecks(params?: { date?: string; vehicleId?: string }) {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.vehicleId) qs.set('vehicle_id', params.vehicleId)
    const q = qs.toString()
    return this.fetch<VehicleCheckRecord[]>(`/yard-checks${q ? `?${q}` : ''}`)
  }

  getComplianceExpiring(days = 30) {
    return this.fetch<{ items: ComplianceItemRecord[] }>(`/compliance/expiring?days=${days}`)
  }

  getComplianceAutomationSettings() {
    return this.fetch<ComplianceAutomationSettings>('/compliance/automation-settings')
  }

  getMessages(params?: { folder?: 'inbox' | 'sent' }) {
    const qs = new URLSearchParams()
    if (params?.folder) qs.set('folder', params.folder)
    const q = qs.toString()
    return this.fetch<MessageRecord[]>(`/messages${q ? `?${q}` : ''}`)
  }

  getMessage(id: string) {
    return this.fetch<MessageRecord>(`/messages/${id}`)
  }

  markMessageRead(id: string) {
    return this.fetch(`/messages/${id}/read`, { method: 'PATCH' })
  }

  getReportsSummary(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const q = qs.toString()
    return this.fetch<ReportsSummary>(`/reports/summary${q ? `?${q}` : ''}`)
  }

  getAnnouncements() {
    return this.fetch<AnnouncementRecord[]>('/announcements')
  }

  getCompany() {
    return this.fetch<CompanyRecord>('/company')
  }

  updateCompany(data: Record<string, unknown>) {
    return this.fetch<CompanyRecord>('/company', { method: 'PATCH', body: JSON.stringify(data) })
  }

  getUsers() {
    return this.fetch<UserMembershipRecord[]>('/users')
  }

  getStaff() {
    return this.fetch<StaffRecord[]>('/passenger-assistants')
  }

  getStaffHub() {
    return this.fetch<import('@/lib/staff/types').StaffHubData>('/staff/hub')
  }

  getStaffProfiles() {
    return this.fetch<import('@/lib/staff/types').StaffProfile[]>('/staff')
  }

  getStaffProfile(id: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}`)
  }

  getStaffDirectorySummary() {
    return this.fetch<import('@/lib/staff/types').StaffDirectorySummary>('/staff/summary')
  }

  createStaff(input: import('@/lib/staff/types').CreateStaffInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>('/staff', { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  updateStaff(id: string, input: import('@/lib/staff/types').UpdateStaffInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}`, { method: 'PATCH', body: JSON.stringify({ ...input, actorName }) })
  }

  sendStaffInvitation(id: string, input: import('@/lib/staff/types').SendStaffInvitationInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/invitation`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  suspendStaffAccess(id: string, input: import('@/lib/staff/types').SuspendStaffAccessInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/suspend`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  reinstateStaffAccess(id: string, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/reinstate`, { method: 'POST', body: JSON.stringify({ actorName }) })
  }

  initiateStaffPasswordReset(id: string, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/password-reset`, { method: 'POST', body: JSON.stringify({ actorName }) })
  }

  revokeStaffSessions(id: string, actorName: string, reason: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/revoke-sessions`, { method: 'POST', body: JSON.stringify({ actorName, reason }) })
  }

  offboardStaff(id: string, actorName: string, lastWorkingDate: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/offboard`, { method: 'POST', body: JSON.stringify({ actorName, lastWorkingDate }) })
  }

  setStaffDutyStatus(id: string, status: import('@/lib/staff/types').StaffDutyStatus, actorName: string, input?: import('@/lib/staff/types').StaffDutyActionInput) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${id}/duty`, { method: 'POST', body: JSON.stringify({ status, actorName, ...input }) })
  }

  createStaffHandover(fromStaffId: string, input: import('@/lib/staff/types').CreateStaffHandoverInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffHandover>(`/staff/${fromStaffId}/handover`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  completeStaffHandover(handoverId: string, toStaffId: string, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffHandover>(`/staff/handovers/${handoverId}/complete`, { method: 'POST', body: JSON.stringify({ toStaffId, actorName }) })
  }

  assignStaffTask(staffId: string, input: import('@/lib/staff/types').AssignStaffTaskInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/tasks`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  completeStaffTask(staffId: string, taskId: string, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify({ actorName }) })
  }

  verifyStaffQualification(staffId: string, qualificationId: string, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/qualifications/${qualificationId}/verify`, { method: 'POST', body: JSON.stringify({ actorName }) })
  }

  addStaffQualification(staffId: string, input: import('@/lib/staff/types').AddStaffQualificationInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/qualifications`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  uploadStaffDocument(staffId: string, input: import('@/lib/staff/types').UploadStaffDocumentInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/documents`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  verifyStaffDocument(staffId: string, documentId: string, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/documents/${documentId}/verify`, { method: 'POST', body: JSON.stringify({ actorName }) })
  }

  completeStaffAccessReview(staffId: string, input: import('@/lib/staff/types').CompleteStaffAccessReviewInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/access-review`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  extendContractorAccess(staffId: string, input: import('@/lib/staff/types').ExtendContractorAccessInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/extend-contractor`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  moveStaffMember(staffId: string, input: import('@/lib/staff/types').MoveStaffMemberInput, actorName: string) {
    return this.fetch<import('@/lib/staff/types').StaffProfile>(`/staff/${staffId}/move`, { method: 'POST', body: JSON.stringify({ ...input, actorName }) })
  }

  getPassengers() {
    return this.fetch<PassengerRecord[]>('/passengers')
  }

  getContracts() {
    return this.fetch<ContractRecord[]>('/contracts')
  }

  getRecurringTransport() {
    return this.fetch<RecurringTransportRecord[]>('/recurring-transport')
  }

  getSchools() {
    return this.fetch<SchoolRecord[]>('/schools')
  }

  getMaintenance() {
    return this.fetch<MaintenanceRecord[]>('/maintenance')
  }

  getMaintenanceHub() {
    return this.fetch<import('@/lib/maintenance/types').MaintenanceHubData>('/maintenance/hub')
  }

  getInspections() {
    return this.fetch<InspectionRecord[]>('/inspections')
  }

  getMessageTemplates() {
    return this.fetch<MessageTemplateRecord[]>('/message-templates')
  }

  getIntegrations() {
    return this.fetch<IntegrationRecord[]>('/integrations')
  }

  getAuditLogs() {
    return this.fetch<AuditLogRecord[]>('/audit')
  }

  getPricingRules() {
    return this.fetch<PricingRuleRecord[]>('/pricing')
  }

  getPerformanceMetrics(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const q = qs.toString()
    return this.fetch<PerformanceMetrics>(`/reports/performance${q ? `?${q}` : ''}`)
  }

  getYardSummary() {
    return this.fetch<YardSummary>('/yard/summary')
  }

  getYardHub(depotId?: string) {
    const q = depotId ? `?depotId=${encodeURIComponent(depotId)}` : ''
    return this.fetch<import('@/lib/yard/types').YardHubData>(`/yard/hub${q}`)
  }

  recordYardMovement(input: import('@/lib/yard/types').RecordYardMovementInput, actorName: string) {
    return this.fetch<import('@/lib/yard/types').YardHubData>('/yard/movements', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  createYardTask(input: import('@/lib/yard/types').CreateYardTaskInput, actorName: string) {
    return this.fetch<import('@/lib/yard/types').YardHubData>('/yard/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  completeYardTask(input: import('@/lib/yard/types').CompleteYardTaskInput, actorName: string) {
    return this.fetch<import('@/lib/yard/types').YardHubData>(`/yard/tasks/${encodeURIComponent(input.taskId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  startYardTask(taskId: string, actorName: string) {
    return this.fetch<import('@/lib/yard/types').YardHubData>(`/yard/tasks/${encodeURIComponent(taskId)}/start`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  submitYardHandover(depotId: string, notes: string, actorName: string) {
    return this.fetch<import('@/lib/yard/types').YardHubData>('/yard/handovers/submit', {
      method: 'POST',
      body: JSON.stringify({ depotId, notes, actorName }),
    })
  }

  acceptYardHandover(input: import('@/lib/yard/types').AcceptYardHandoverInput) {
    return this.fetch<import('@/lib/yard/types').YardHubData>('/yard/handovers/accept', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  getChecksHub() {
    return this.fetch<import('@/lib/checks/types').ChecksHubData>('/checks/hub')
  }

  getCheckDetail(checkId: string) {
    return this.fetch<import('@/lib/checks/types').CheckDetailRecord>(`/checks/${encodeURIComponent(checkId)}`)
  }

  startAdminCheck(input: import('@/lib/checks/types').StartAdminCheckInput, actorName: string) {
    return this.fetch<import('@/lib/checks/types').ChecksHubData>('/checks/start', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reviewCheck(input: import('@/lib/checks/types').ReviewCheckInput, actorName: string) {
    return this.fetch<import('@/lib/checks/types').ChecksHubData>(`/checks/${encodeURIComponent(input.checkId)}/review`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  conditionalReleaseCheck(input: import('@/lib/checks/types').ConditionalReleaseInput, actorName: string) {
    return this.fetch<import('@/lib/checks/types').ChecksHubData>('/checks/conditional-release', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  resolveCheckImpact(input: import('@/lib/checks/types').ResolveCheckImpactInput, actorName: string) {
    return this.fetch<import('@/lib/checks/types').ChecksHubData>('/checks/resolve-impact', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getDefectsHub() {
    return this.fetch<import('@/lib/defects/types').DefectsHubData>('/defects/hub')
  }

  getDefectDetail(vehicleId: string, defectId: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>(
      `/vehicles/${encodeURIComponent(vehicleId)}/defects/${encodeURIComponent(defectId)}`,
    )
  }

  getDefectDetailById(defectId: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>(`/defects/${encodeURIComponent(defectId)}`)
  }

  triageDefectHub(input: import('@/lib/defects/types').TriageDefectHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectsHubData>('/defects/triage', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reportDefectHub(input: import('@/lib/defects/types').ReportDefectHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectsHubData>('/defects/report', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  completeDefectRepairHub(input: import('@/lib/defects/types').CompleteRepairHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/repair/complete', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  verifyDefectHub(input: import('@/lib/defects/types').VerifyDefectHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/verify', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  closeDefectHub(input: import('@/lib/defects/types').CloseDefectHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/close', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  applyDefectRestrictionHub(input: import('@/lib/defects/types').ApplyDefectRestrictionInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/restrictions', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reopenDefectHub(input: import('@/lib/defects/types').ReopenDefectHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/reopen', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  uploadDefectEvidenceHub(input: import('@/lib/defects/types').UploadDefectEvidenceInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/evidence', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  bulkDefectActionHub(input: import('@/lib/defects/types').BulkDefectActionInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectsHubData>('/defects/bulk', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  markDefectVorHub(input: import('@/lib/defects/types').MarkDefectVorHubInput, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/mark-vor', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getIncidentsHub() {
    return this.fetch<import('@/lib/incidents/types').IncidentsHubData>('/incidents/hub')
  }

  getIncidentDetail(id: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>(`/incidents/${encodeURIComponent(id)}`)
  }

  reportIncidentHub(input: import('@/lib/incidents/types').ReportIncidentHubInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentsHubData>('/incidents/report', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  acknowledgeIncidentHub(input: import('@/lib/incidents/types').AcknowledgeIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/acknowledge', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  assignIncidentHub(input: import('@/lib/incidents/types').AssignIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/assign', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  addIncidentUpdateHub(input: import('@/lib/incidents/types').AddIncidentUpdateInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/update', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  addIncidentActionHub(input: import('@/lib/incidents/types').AddIncidentActionInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/actions', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  uploadIncidentEvidenceHub(input: import('@/lib/incidents/types').UploadIncidentEvidenceInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/evidence', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  closeIncidentHub(input: import('@/lib/incidents/types').CloseIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/close', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  containIncidentHub(input: import('@/lib/incidents/types').ContainIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/contain', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  escalateIncidentHub(input: import('@/lib/incidents/types').EscalateIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/escalate', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reopenIncidentHub(input: import('@/lib/incidents/types').ReopenIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/reopen', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  createDefectFromIncidentHub(input: import('@/lib/incidents/types').CreateDefectFromIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/create-defect', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  markIncidentVehicleVorHub(input: import('@/lib/incidents/types').MarkIncidentVehicleVorInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/mark-vor', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  recordIncidentRegulatoryDecisionHub(input: import('@/lib/incidents/types').RecordRegulatoryDecisionInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/regulatory-decision', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateIncidentInvestigationHub(input: import('@/lib/incidents/types').UpdateInvestigationInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/investigation', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateIncidentPersonWelfareHub(input: import('@/lib/incidents/types').UpdatePersonWelfareInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/person-welfare', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  createTelematicsIncidentHub(input: import('@/lib/incidents/types').CreateTelematicsIncidentInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentsHubData>('/incidents/telematics', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  linkIncidentEntitiesHub(input: import('@/lib/incidents/types').LinkIncidentEntitiesInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/link-entities', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  requestCctvPreservationHub(input: import('@/lib/incidents/types').RequestCctvPreservationInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/cctv/preserve', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  submitIncidentToInsurerHub(input: import('@/lib/incidents/types').SubmitIncidentToInsurerInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentDetailRecord>('/incidents/insurer/submit', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  processTelematicsFeedHub(input: import('@/lib/incidents/types').ProcessTelematicsFeedInput, actorName: string) {
    return this.fetch<import('@/lib/incidents/types').IncidentsHubData>('/incidents/telematics/feed/process', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getDriverIncidents(driverId: string) {
    return this.fetch<import('@/lib/incidents/types').DriverIncidentSummary[]>(`/drivers/${encodeURIComponent(driverId)}/incidents`)
  }

  getIncidentSettings() {
    return this.fetch<import('@/lib/incidents/types').IncidentSettings>('/incidents/settings')
  }

  updateIncidentSettings(settings: Partial<import('@/lib/incidents/types').IncidentSettings>) {
    return this.fetch<import('@/lib/incidents/types').IncidentSettings>('/incidents/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  }

  liftDefectRestrictionHub(vehicleId: string, restrictionId: string, defectId: string, actorName: string) {
    return this.fetch<import('@/lib/defects/types').DefectDetailRecord>('/defects/restrictions/lift', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, restrictionId, defectId, actorName }),
    })
  }

  getBookings(params?: { view?: string }) {
    const qs = new URLSearchParams()
    if (params?.view) qs.set('view', params.view)
    const q = qs.toString()
    return this.fetch<BookingListItem[]>(`/bookings${q ? `?${q}` : ''}`)
  }

  getBooking(id: string) {
    return this.fetch<BookingRecord>(`/bookings/${id}`)
  }

  createBookingDraft(bookingType?: BookingDraft['bookingType'], options?: CreateDraftOptions) {
    return this.fetch<BookingDraft>('/bookings/drafts', {
      method: 'POST',
      body: JSON.stringify({ bookingType, ...options }),
    })
  }

  duplicateBooking(id: string) {
    return this.fetch<BookingDraft>(`/bookings/${id}/duplicate`, { method: 'POST' })
  }

  createReturnBooking(bookingId: string, tripId: string) {
    return this.fetch<BookingDraft>(`/bookings/${bookingId}/return`, {
      method: 'POST',
      body: JSON.stringify({ tripId }),
    })
  }

  getAutoPlanProposal(draft: BookingDraft) {
    return this.fetch<AutoPlanProposal | null>('/bookings/auto-plan', {
      method: 'POST',
      body: JSON.stringify(draft),
    })
  }

  calculateBookingEditImpact(
    bookingId: string,
    updated: BookingDraft,
    assignments?: { driverName?: string; vehicleReg?: string; runRef?: string },
  ) {
    return this.fetch<EditImpact>(`/bookings/${bookingId}/edit-impact`, {
      method: 'POST',
      body: JSON.stringify({ updated, assignments }),
    })
  }

  updateBooking(
    bookingId: string,
    updated: BookingDraft,
    opts: { applyScope: 'trip_only' | 'all_future' | 'recurring_pattern' | 'exception' },
  ) {
    return this.fetch<BookingRecord>(`/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...updated, applyScope: opts.applyScope }),
    })
  }

  cancelBooking(bookingId: string, input: CancelBookingInput) {
    return this.fetch<BookingRecord>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  getBookingDraft(id: string) {
    return this.fetch<BookingDraft>(`/bookings/drafts/${id}`)
  }

  saveBookingDraft(draft: BookingDraft) {
    return this.fetch<BookingDraft>(`/bookings/drafts/${draft.id}`, {
      method: 'PUT',
      body: JSON.stringify(draft),
    })
  }

  getCustomerBookingContext(customerId: string) {
    return this.fetch<CustomerBookingContext | null>(`/customers/${customerId}/booking-context`)
  }

  validateBookingDraft(draft: BookingDraft) {
    return this.fetch<import('@/lib/bookings/types').BookingValidationItem[]>('/bookings/validate', {
      method: 'POST',
      body: JSON.stringify(draft),
    })
  }

  confirmBookingDraft(draft: BookingDraft, options?: { asQuotation?: boolean }) {
    return this.fetch<BookingRecord>('/bookings/confirm', {
      method: 'POST',
      body: JSON.stringify({ ...draft, asQuotation: options?.asQuotation }),
    })
  }

  getNotifications(params?: { unread_only?: boolean }) {
    const qs = new URLSearchParams()
    if (params?.unread_only) qs.set('unread_only', 'true')
    const q = qs.toString()
    return this.fetch<ApiNotification[]>(`/notifications${q ? `?${q}` : ''}`)
  }

  getNotificationUnreadCount() {
    return this.fetch<{ count: number }>('/notifications/unread-count')
  }

  markNotificationRead(id: string) {
    return this.fetch(`/notifications/${id}/read`, { method: 'PATCH' })
  }

  markAllNotificationsRead() {
    return this.fetch('/notifications/read-all', { method: 'PATCH' })
  }

  getDepots() {
    return this.fetch<DepotRecord[]>('/depots')
  }

  getOperationalTrips(params?: { dutyId?: string; status?: string }) {
    const qs = new URLSearchParams()
    if (params?.dutyId) qs.set('dutyId', params.dutyId)
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return this.fetch<import('@/lib/transfers/types').OperationalTrip[]>(`/operational-trips${q ? `?${q}` : ''}`)
  }

  getOperationalTrip(id: string) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip>(`/operational-trips/${id}`)
  }

  getOperationalTripByDuty(dutyId: string) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip | null>(`/duties/${dutyId}/operational-trip`)
  }

  getOperationalPosition(tripId: string) {
    return this.fetch<import('@/lib/transfers/types').OperationalPosition>(`/operational-trips/${tripId}/position`)
  }

  getTransferCandidates(tripId: string) {
    return this.fetch<import('@/lib/transfers/types').TransferCandidate[]>(`/operational-trips/${tripId}/transfer-candidates`)
  }

  validateTransfer(input: import('@/lib/transfers/types').CreateTransferInput) {
    return this.fetch<{ items: import('@/lib/transfers/types').TransferValidationItem[]; workflowType: import('@/lib/transfers/types').TransferWorkflowType }>(
      '/transfers/validate',
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  previewTransferImpact(input: import('@/lib/transfers/types').CreateTransferInput) {
    return this.fetch<import('@/lib/transfers/types').TransferImpactPreview>('/transfers/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  commitTransfer(input: import('@/lib/transfers/types').CreateTransferInput, actorName: string) {
    return this.fetch<import('@/lib/transfers/types').TransferRecord>('/transfers', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getTransferHistory(tripId?: string) {
    const q = tripId ? `?tripId=${tripId}` : ''
    return this.fetch<import('@/lib/transfers/types').TransferRecord[]>(`/transfers${q}`)
  }

  getAssignmentHistory(tripId: string) {
    return this.fetch<import('@/lib/transfers/types').AssignmentHistoryEntry[]>(`/operational-trips/${tripId}/assignment-history`)
  }

  getOperationalTripsByBooking(bookingId: string) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip[]>(`/bookings/${bookingId}/operational-trips`)
  }

  getJourneysByBooking(bookingId: string) {
    return this.fetch<import('@/lib/transfers/types').JourneyRecord[]>(`/bookings/${bookingId}/journeys`)
  }

  commitHandover(input: import('@/lib/transfers/types').HandoverInput, actorName: string) {
    return this.fetch<import('@/lib/transfers/types').TransferRecord>('/transfers/handover', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getTransferReport(periodFrom: string, periodTo: string) {
    return this.fetch<import('@/lib/transfers/types').TransferReportSummary>(
      `/transfers/report?from=${periodFrom}&to=${periodTo}`,
    )
  }
}
