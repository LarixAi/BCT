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
import {
  deriveOperationalPosition,
  isOperationalPositionLike,
  isOperationalTripLike,
} from '@/lib/transfers/operational-trip'
import { normalizeAdBlueRecords } from '@/lib/adblue/normalize'
import { normalizeVehicleProfile } from '@/lib/vehicles/readiness-projection'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const MEMBERSHIPS_KEY = 'pending_memberships'

/** Resolve `/api/...` against either a Nest-style origin or a Supabase Edge Function base URL. */
function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (API_URL.includes('/functions/v1/')) {
    return `${API_URL}/api${normalized}`
  }
  return `${API_URL}/api${normalized}`
}

function apiErrorMessage(err: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(err.message)) return err.message.join(', ')
  return err.message ?? fallback
}

/** Live API payloads sometimes omit nested jobs; keep the UI board resilient. */
function normalizeOperationalTrip(
  trip: import('@/lib/transfers/types').OperationalTrip,
): import('@/lib/transfers/types').OperationalTrip {
  const jobs = Array.isArray(trip.jobs) ? trip.jobs : []
  return {
    ...trip,
    reference: trip.reference ?? (trip as { tripReference?: string }).tripReference ?? trip.id,
    dutyId: trip.dutyId ?? null,
    runReference: trip.runReference ?? null,
    status: trip.status ?? 'planned',
    driverId: trip.driverId ?? null,
    driverName: trip.driverName ?? null,
    vehicleId: trip.vehicleId ?? null,
    vehicleRegistration: trip.vehicleRegistration ?? null,
    depotId: trip.depotId ?? null,
    depotName: trip.depotName ?? null,
    assignmentStatus: trip.assignmentStatus ?? (trip.driverId ? 'assigned' : 'unassigned'),
    acceptedAt: trip.acceptedAt ?? null,
    acknowledgedAt: trip.acknowledgedAt ?? null,
    manifestVersion: trip.manifestVersion ?? 1,
    lastAppSync: trip.lastAppSync ?? null,
    jobs,
    delayMinutes: trip.delayMinutes ?? 0,
    passengersOnboard: trip.passengersOnboard ?? 0,
    completedJobCount: trip.completedJobCount ?? jobs.filter((j) => j.status === 'completed').length,
    totalJobCount: trip.totalJobCount ?? jobs.length,
    activeJobId: trip.activeJobId ?? null,
    gpsLat: trip.gpsLat ?? null,
    gpsLng: trip.gpsLng ?? null,
    driverOnline: trip.driverOnline ?? false,
    routeName: trip.routeName ?? null,
  }
}

function normalizeOperationalPosition(
  raw: unknown,
): import('@/lib/transfers/types').OperationalPosition {
  if (isOperationalPositionLike(raw)) {
    return {
      ...raw,
      trip: normalizeOperationalTrip(raw.trip),
      completedJobs: Array.isArray(raw.completedJobs) ? raw.completedJobs : [],
      remainingJobs: Array.isArray(raw.remainingJobs) ? raw.remainingJobs : [],
      onboardPassengers: Array.isArray(raw.onboardPassengers) ? raw.onboardPassengers : [],
      activeJob: raw.activeJob ?? null,
    }
  }
  if (isOperationalTripLike(raw)) {
    return deriveOperationalPosition(normalizeOperationalTrip(raw))
  }
  throw new Error('Operational position could not be loaded')
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
      localStorage.removeItem(REFRESH_TOKEN_KEY)
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    }
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    } else if (SUPABASE_ANON_KEY) {
      // Supabase gateway still expects a Bearer token on public Edge Function routes.
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
    }

    let res: Response
    try {
      res = await fetch(apiUrl(path), { ...options, headers })
    } catch (error) {
      // Safari reports CORS/network failures as TypeError: "Load failed"
      const raw = error instanceof Error ? error.message : 'Network request failed'
      if (/load failed|failed to fetch|networkerror/i.test(raw)) {
        throw new Error('Could not reach Command API. Check your connection or try again.')
      }
      throw error instanceof Error ? error : new Error(raw)
    }

    if (!res.ok) {
      if (res.status === 401 && token) {
        this.clearToken()
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/session-expired')
        }
      }
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(apiErrorMessage(err, res.statusText || 'Request failed'))
    }

    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }

  async login(email: string, password: string, rememberMe = false) {
    // Public auth: never attach a leftover session token on login.
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
    }
    const res = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, rememberMe }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(apiErrorMessage(err, res.statusText || 'Request failed'))
    }
    const result = (await res.json()) as LoginResponse
    if (result.refreshToken && typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
    }
    return result
  }

  async selectTenant(tenantId: string) {
    const refreshToken = typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_TOKEN_KEY)
    const result = await this.fetch<AuthTokensResponse>('/auth/select-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantId, refreshToken }),
    })
    if (result.refreshToken && typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
    }
    return result
  }

  signupCompany(input: {
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
    return this.fetch<{ ok: boolean; message: string; pendingOrganisationId?: string; devVerificationToken?: string | null }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  verifySignupEmail(token: string) {
    return this.fetch<{ companyId: string; userId: string; nextStep: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  }

  submitCompanyVerification(input: Record<string, unknown>) {
    return this.fetch<{ nextStep: string }>('/auth/company-verification', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  acceptCompanyContracts() {
    return this.fetch<{ nextStep: string }>('/auth/accept-contracts', { method: 'POST', body: '{}' })
  }

  completeCompanySetup(input: { timezone?: string; depotName?: string; depotCode?: string }) {
    return this.fetch<{ nextStep: string }>('/auth/setup-complete', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  listInvitations() {
    return this.fetch<Array<{
      id: string
      email: string
      appType: string
      status: string
      expiresAt: string
      acceptedAt: string | null
      revokedAt: string | null
      invitedBy: string | null
      createdAt: string
      roleIds: string[]
    }>>('/settings/invitations')
  }

  createInvitation(input: {
    email: string
    roleName?: string
    roleIds?: string[]
    depotIds?: string[]
    appType?: 'COMMAND' | 'DRIVER' | 'YARD'
    expiresInDays?: number
  }) {
    return this.fetch<{
      invitation: { id: string; email: string; expiresAt: string; status: string; appType: string }
      devInvitationToken?: string | null
    }>('/settings/invitations', { method: 'POST', body: JSON.stringify(input) })
  }

  previewInvitation(token: string) {
    return this.fetch<{
      email: string
      companyName: string
      appType: string
      expiresAt: string
      firstName?: string | null
      lastName?: string | null
    }>(`/auth/invitation-preview?token=${encodeURIComponent(token)}`)
  }

  acceptInvitation(input: { token: string; password: string; firstName: string; lastName: string }) {
    return this.fetch<{ companyId: string; userId: string; email: string; appType?: string }>(
      '/auth/accept-invitation',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  }

  forgotPassword(email: string) {
    return this.fetch<{ ok: boolean; message: string; devResetToken: string | null }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }

  resetPassword(token: string, password: string) {
    return this.fetch<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  }

  enableMfa() {
    return this.fetch<{ recoveryCodes: string[]; mfaEnabled: boolean }>('/auth/mfa/enable', {
      method: 'POST',
      body: '{}',
    })
  }

  verifyMfa(input: {
    challengeId: string
    code: string
    companyId?: string
    refreshToken?: string
    accessToken?: string
  }) {
    // Use a dedicated auth fetch (same pattern as login). Avoid paths containing
    // "/mfa/" — some browser privacy filters block them and surface "Failed to fetch".
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY
    }
    const bearer = input.accessToken || this.getToken() || SUPABASE_ANON_KEY
    if (bearer) headers.Authorization = `Bearer ${bearer}`

    return fetch(apiUrl('/auth/verify-factor'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        challengeId: input.challengeId,
        code: input.code,
        companyId: input.companyId,
        refreshToken: input.refreshToken,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }))
          throw new Error(apiErrorMessage(err, res.statusText || 'MFA verification failed'))
        }
        return res.json() as Promise<AuthTokensResponse & {
          requiresTenantSelection?: boolean
          memberships?: TenantMembershipOption[]
        }>
      })
      .then((result) => {
        if (result.refreshToken && typeof window !== 'undefined') {
          localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
        }
        return result
      })
      .catch((error: unknown) => {
        if (error instanceof TypeError) {
          throw new Error('Could not reach Command to verify MFA. Check your connection and try again.')
        }
        throw error
      })
  }

  createSupportGrant(input: {
    reason: string
    ticketReference?: string
    granteeUserId?: string
    durationMinutes?: number
  }) {
    return this.fetch('/settings/support-access', { method: 'POST', body: JSON.stringify(input) })
  }

  listSupportGrants() {
    return this.fetch('/settings/support-access')
  }

  listRetentionPolicies() {
    return this.fetch('/settings/data-retention')
  }

  requestDataExport(exportType = 'company_full') {
    return this.fetch('/settings/data-export', { method: 'POST', body: JSON.stringify({ exportType }) })
  }

  listDataExports() {
    return this.fetch('/settings/data-export')
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

  getDuties(params?: { date?: string; status?: string; from?: string; to?: string }) {
    const qs = new URLSearchParams()
    if (params?.date) qs.set('date', params.date)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return this.fetch<DutyRecord[]>(`/duties${q ? `?${q}` : ''}`).then((rows) =>
      Array.isArray(rows) ? rows : [],
    )
  }

  getDuty(id: string) {
    return this.fetch<DutyDetailRecord>(`/duties/${id}`)
  }

  getDutyTrack(id: string) {
    return this.fetch<DutyTrackResponse>(`/duties/${id}/track`)
  }

  updateDuty(id: string, data: Record<string, unknown>) {
    // Prefer assign endpoint so eligibility is evaluated server-side.
    return this.assignDuty(id, data)
  }

  createDuty(data: Record<string, unknown>) {
    return this.fetch<{ duty: DutyRecord; eligibility?: import('./types').DutyEligibilityResult }>(
      '/duties',
      { method: 'POST', body: JSON.stringify(data) },
    ).then((result) => result.duty ?? (result as unknown as DutyRecord))
  }

  assignDuty(id: string, data: Record<string, unknown>) {
    return this.fetch<{ duty: DutyRecord; eligibility?: import('./types').DutyEligibilityResult }>(
      `/duties/${id}/assign`,
      { method: 'POST', body: JSON.stringify(data) },
    ).then((result) => result.duty ?? (result as unknown as DutyRecord))
  }

  publishDuty(id: string) {
    return this.fetch<{ duty: DutyRecord; eligibility?: import('./types').DutyEligibilityResult }>(
      `/duties/${id}/publish`,
      { method: 'POST', body: JSON.stringify({}) },
    )
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

  createDriverAppAccount(
    id: string,
    input: import('@/lib/drivers/types').CreateDriverAppAccountInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/account`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  activateDriver(id: string, input: import('@/lib/drivers/types').ActivateDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  suspendDriver(id: string, input: import('@/lib/drivers/types').SuspendDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reinstateDriver(id: string, input: import('@/lib/drivers/types').ReinstateDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/reinstate`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  unlockDriver(id: string, input: import('@/lib/drivers/types').UnlockDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  offboardDriver(id: string, input: import('@/lib/drivers/types').OffboardDriverInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/offboard`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  revokeDriverDevice(
    id: string,
    deviceId: string,
    input: import('@/lib/drivers/types').RevokeDriverDeviceInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/devices/${deviceId}`, {
      method: 'DELETE',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  cancelDriverInvitation(id: string, actorName: string, reason: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/invitation/cancel`, {
      method: 'POST',
      body: JSON.stringify({ actorName, reason }),
    })
  }

  addDriverNote(
    id: string,
    input: { category: string; body: string; visibleToDriver?: boolean },
    actorName: string,
  ) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
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

  recordDriverTraining(
    id: string,
    input: import('@/lib/drivers/types').RecordDriverTrainingInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/training`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  listDriverRequirements(id: string) {
    return this.fetch<{
      driverId: string
      requirements: import('@/lib/drivers/types').DriverRequirementState[]
    }>(`/drivers/${id}/requirements`)
  }

  requestDriverRequirements(
    id: string,
    input: import('@/lib/drivers/types').RequestDriverRequirementsInput,
    actorName: string,
  ) {
    return this.fetch<{
      driverId: string
      sentAt: string
      count: number
      skipped: string[]
      requirements: import('@/lib/drivers/types').DriverRequirementState[]
    }>(`/drivers/${id}/requirements/request-missing`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  assignDriverRequirementTraining(
    id: string,
    input: import('@/lib/drivers/types').AssignDriverTrainingInput,
    actorName: string,
  ) {
    return this.fetch<{ requirement: import('@/lib/drivers/types').DriverRequirementState }>(
      `/drivers/${id}/requirements/${encodeURIComponent(input.definitionKey)}`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'assign_training', ...input, actorName }),
      },
    )
  }

  rejectDriverRequirement(
    id: string,
    definitionKey: string,
    input: import('@/lib/drivers/types').RejectDriverRequirementInput,
    actorName: string,
  ) {
    return this.fetch<{ requirement: import('@/lib/drivers/types').DriverRequirementState }>(
      `/drivers/${id}/requirements/${encodeURIComponent(definitionKey)}`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', ...input, actorName }),
      },
    )
  }

  markDriverRequirementStatus(
    id: string,
    definitionKey: string,
    status: 'not_applicable' | 'waived',
    actorName: string,
  ) {
    return this.fetch<{ requirement: import('@/lib/drivers/types').DriverRequirementState }>(
      `/drivers/${id}/requirements/${encodeURIComponent(definitionKey)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: status === 'waived' ? 'waive' : 'mark_not_applicable',
          actorName,
        }),
      },
    )
  }

  submitDriverRequirementEvidence(
    id: string,
    definitionKey: string,
    actorName: string,
    options?: { label?: string; message?: string },
  ) {
    return this.fetch<{ requirement: import('@/lib/drivers/types').DriverRequirementState }>(
      `/drivers/${id}/requirements/${encodeURIComponent(definitionKey)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit_evidence',
          actorName,
          label: options?.label,
          message: options?.message,
        }),
      },
    )
  }

  getDriverRequirementHistory(id: string, definitionKey: string) {
    return this.fetch<{
      driverId: string
      definitionKey: string
      history: import('@/lib/drivers/types').DriverRequirementHistoryItem[]
    }>(`/drivers/${id}/requirements/${encodeURIComponent(definitionKey)}/history`)
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
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/profile`).then(
      normalizeVehicleProfile,
    )
  }

  getVehicleProfiles() {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile[]>('/vehicles/profiles').then((rows) =>
      rows.map(normalizeVehicleProfile),
    )
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

  getVehicleAdBlueRecords(vehicleId: string) {
    return this.fetch<unknown>(`/vehicles/${vehicleId}/adblue`)
      .then((rows) => normalizeAdBlueRecords(rows))
      .catch(() => [])
  }

  recordVehicleAdBlue(
    vehicleId: string,
    input: import('@/lib/adblue/types').RecordAdBlueInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/adblue/types').AdBlueRecord>(`/vehicles/${vehicleId}/adblue`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getVehicleReports(params?: { vehicleId?: string; status?: string }) {
    const q = new URLSearchParams()
    if (params?.vehicleId) q.set('vehicleId', params.vehicleId)
    if (params?.status) q.set('status', params.status)
    const suffix = q.toString() ? `?${q}` : ''
    return this.fetch<import('@/lib/vehicle-reports/types').VehicleReportRecord[]>(`/vehicle-reports${suffix}`)
      .then((rows) => (Array.isArray(rows) ? rows : []))
      .catch(() => [])
  }

  getVehicleReport(id: string) {
    return this.fetch<import('@/lib/vehicle-reports/types').VehicleReportRecord>(`/vehicle-reports/${id}`)
  }

  createVehicleReport(input: import('@/lib/vehicle-reports/types').CreateVehicleReportInput, actorName: string) {
    return this.fetch<import('@/lib/vehicle-reports/types').VehicleReportRecord>('/vehicle-reports', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  reviewVehicleReport(
    id: string,
    input: import('@/lib/vehicle-reports/types').ReviewVehicleReportInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/vehicle-reports/types').VehicleReportRecord>(`/vehicle-reports/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getVehicleReportsHub() {
    return this.fetch<import('@/lib/vehicle-reports/types').VehicleReportsHubData>('/vehicle-reports/hub').catch(() => ({
      operationalDate: new Date().toISOString().slice(0, 10),
      summary: {
        openReports: 0,
        criticalReports: 0,
        vehiclesVor: 0,
        awaitingReview: 0,
        awaitingVerification: 0,
        overdueActions: 0,
        repeatDefects: 0,
        submittedToday: 0,
      },
      reports: [],
    }))
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

  updateVehiclePmiChecklistItem(
    id: string,
    workOrderId: string,
    input: import('@/lib/vehicles/types').UpdatePmiChecklistItemInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(
      `/vehicles/${id}/work-orders/${workOrderId}/pmi-checklist`,
      {
        method: 'PATCH',
        body: JSON.stringify({ ...input, actorName }),
      },
    )
  }

  addVehicleWorkOrderPart(id: string, workOrderId: string, input: import('@/lib/vehicles/types').AddWorkOrderPartInput, actorName: string) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/work-orders/${workOrderId}/parts`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  approveVehicleWorkOrderEstimate(
    id: string,
    workOrderId: string,
    input: import('@/lib/vehicles/types').ApproveWorkOrderEstimateInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(
      `/vehicles/${id}/work-orders/${workOrderId}/estimate/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ ...input, actorName }),
      },
    )
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

  activateVehicleFromWizard(
    id: string,
    options: { acknowledgeWarnings?: boolean; mode: 'submit_for_approval' | 'activate' | 'keep_blocked' },
    actorName: string,
  ) {
    return this.fetch<import('@/lib/vehicles/types').VehicleProfile>(`/vehicles/${id}/onboarding/activate`, {
      method: 'POST',
      body: JSON.stringify({ ...options, actorName }),
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

  async getComplianceAutomationSettings() {
    try {
      const raw = await this.fetch<Partial<ComplianceAutomationSettings>>('/compliance/automation-settings')
      return {
        warnDaysBeforeExpiry: raw.warnDaysBeforeExpiry ?? 30,
        blockAssignmentOnExpired: Boolean(raw.blockAssignmentOnExpired),
        autoUnassignOnExpired: Boolean(raw.autoUnassignOnExpired),
        notifyRoles: Array.isArray(raw.notifyRoles) ? raw.notifyRoles : [],
      } satisfies ComplianceAutomationSettings
    } catch {
      return {
        warnDaysBeforeExpiry: 30,
        blockAssignmentOnExpired: true,
        autoUnassignOnExpired: false,
        notifyRoles: [],
      } satisfies ComplianceAutomationSettings
    }
  }

  getMessages(params?: { folder?: 'inbox' | 'sent'; driverId?: string }) {
    const qs = new URLSearchParams()
    if (params?.folder) qs.set('folder', params.folder)
    if (params?.driverId) qs.set('driverId', params.driverId)
    const q = qs.toString()
    return this.fetch<MessageRecord[]>(`/messages${q ? `?${q}` : ''}`)
  }

  getMessage(id: string) {
    return this.fetch<MessageRecord>(`/messages/${id}`)
  }

  createMessage(input: { driverId: string; subject?: string; body: string; conversationId?: string; requiresAck?: boolean }) {
    return this.fetch<MessageRecord>('/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    })
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

  getInspectionsHub() {
    return this.fetch<import('@/lib/inspections/types').InspectionsHubData>('/inspections/hub')
  }

  getFleetResourcesHub() {
    return this.fetch<import('@/lib/fleet-resources/types').FleetResourcesHubData>('/fleet-resources/hub')
  }

  /** Attendance hub — live Command API (duties + leave). Mock only if the gateway is unavailable. */
  async getAttendanceHub() {
    const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
    try {
      const data = await this.fetch<import('@/lib/attendance/types').AttendanceHubData>(
        '/attendance/hub',
      )
      // Reject generic commandPage shells / incomplete payloads.
      if (
        !data?.summary ||
        typeof data.summary.operationalDate !== 'string' ||
        !Array.isArray(data.board) ||
        !Array.isArray(data.leaveRequests)
      ) {
        return mockAttendanceApi.getHub()
      }
      return {
        ...data,
        trends: data.trends ?? mockAttendanceApi.getHub().trends,
      }
    } catch {
      return mockAttendanceApi.getHub()
    }
  }

  async getLeaveRequests() {
    const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
    try {
      const data = await this.fetch<import('@/lib/attendance/types').LeaveRequestRecord[]>(
        '/attendance/leave',
      )
      // Empty array is a valid live response — do not replace with demo leave.
      if (!Array.isArray(data)) return mockAttendanceApi.listLeave()
      return data
    } catch {
      return mockAttendanceApi.listLeave()
    }
  }

  async updateLeaveRequest(row: import('@/lib/attendance/types').LeaveRequestRecord) {
    try {
      return await this.fetch<import('@/lib/attendance/types').LeaveRequestRecord>('/attendance/leave', {
        method: 'PUT',
        body: JSON.stringify(row),
      })
    } catch {
      const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
      return mockAttendanceApi.updateLeave(row)
    }
  }

  async getAttendancePersonProfile(input: { personId?: string | null; personName?: string | null }) {
    const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
    try {
      const q = new URLSearchParams()
      if (input.personId) q.set('personId', input.personId)
      if (input.personName) q.set('personName', input.personName)
      const data = await this.fetch<import('@/lib/attendance/types').AttendancePersonProfile | null>(
        `/attendance/profile?${q}`,
      )
      // Gateway may return a generic page shell for unknown routes — require a real score payload.
      if (!data || typeof data !== 'object' || !data.score || typeof data.score.score !== 'number') {
        return mockAttendanceApi.getPersonProfile(input)
      }
      return {
        ...data,
        scoreContributors: Array.isArray(data.scoreContributors) ? data.scoreContributors : [],
        upcomingLeave: Array.isArray(data.upcomingLeave) ? data.upcomingLeave : [],
        recentEvents: Array.isArray(data.recentEvents) ? data.recentEvents : [],
        returnToWork: Array.isArray(data.returnToWork) ? data.returnToWork : [],
        managerNotes: Array.isArray(data.managerNotes) ? data.managerNotes : [],
        adjustments: Array.isArray(data.adjustments) ? data.adjustments : [],
        calendarMonth: data.calendarMonth ?? { year: new Date().getFullYear(), month: new Date().getMonth() + 1, days: [] },
      }
    } catch {
      return mockAttendanceApi.getPersonProfile(input)
    }
  }

  async classifyAttendanceRow(input: {
    rowId: string
    classification: import('@/lib/attendance/types').ManagerClassification
    reason?: import('@/lib/attendance/types').AbsenceReasonCode | null
    note?: string
    actorName: string
  }) {
    try {
      return await this.fetch<import('@/lib/attendance/types').AttendanceBoardRow | null>(
        '/attendance/classify',
        { method: 'POST', body: JSON.stringify(input) },
      )
    } catch {
      const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
      return mockAttendanceApi.classifyBoardRow(input)
    }
  }

  async getAttendanceCoverCandidates(dutyLabel?: string | null) {
    try {
      const q = dutyLabel ? `?duty=${encodeURIComponent(dutyLabel)}` : ''
      return await this.fetch<import('@/lib/attendance/types').CoverCandidate[]>(
        `/attendance/cover-candidates${q}`,
      )
    } catch {
      const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
      return mockAttendanceApi.listCoverCandidates(dutyLabel)
    }
  }

  async assignAttendanceCover(input: {
    originalPersonName: string
    coverPersonId: string
    coverPersonName: string
    dutyLabel: string
    actorName: string
    overrideReason?: string
  }) {
    try {
      return await this.fetch<{ ok: true; message: string; actorName: string }>('/attendance/assign-cover', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    } catch {
      const { mockAttendanceApi } = await import('@/lib/attendance/mock-hub')
      return mockAttendanceApi.assignCover(input)
    }
  }

  recordResourceTransaction(input: {
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
    actorName: string
  }) {
    return this.fetch<import('@/lib/fleet-resources/types').ResourceTransaction>(
      '/fleet-resources/transactions',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  }

  updateFleetResourcesSettings(
    patch: Partial<import('@/lib/fleet-resources/types').FleetResourcesSettings>,
  ) {
    return this.fetch<import('@/lib/fleet-resources/types').FleetResourcesSettings>(
      '/fleet-resources/settings',
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      },
    )
  }

  approveResourcePurchase(id: string, actorName: string) {
    return this.fetch<import('@/lib/fleet-resources/types').PurchaseRequestRow | null>(
      `/fleet-resources/purchases/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ actorName }),
      },
    )
  }

  fitResourceTyre(input: {
    tyreId: string
    vehicleId: string
    position: string
    positionLabel: string
    actorName: string
  }) {
    return this.fetch<import('@/lib/fleet-resources/types').TyreAsset>('/fleet-resources/tyres/fit', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  removeResourceTyre(input: { tyreId: string; actorName: string; quarantine?: boolean }) {
    return this.fetch<import('@/lib/fleet-resources/types').TyreAsset>('/fleet-resources/tyres/remove', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  rotateResourceTyres(input: {
    vehicleId: string
    aTyreId: string
    bTyreId: string
    actorName: string
  }) {
    return this.fetch<import('@/lib/fleet-resources/types').TyreAsset[]>(
      '/fleet-resources/tyres/rotate',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  }

  assignResourceEquipment(input: {
    equipmentId: string
    vehicleId: string | null
    actorName: string
  }) {
    return this.fetch<import('@/lib/fleet-resources/types').EquipmentAsset>(
      '/fleet-resources/equipment/assign',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  }

  transferResourceStock(input: {
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
    return this.fetch<import('@/lib/fleet-resources/types').StockTransferRow>(
      '/fleet-resources/stock/transfers',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
  }

  receiveResourceTransfer(id: string, actorName: string) {
    return this.fetch<import('@/lib/fleet-resources/types').StockTransferRow | null>(
      `/fleet-resources/stock/transfers/${id}/receive`,
      {
        method: 'POST',
        body: JSON.stringify({ actorName }),
      },
    )
  }

  async getInspection(id: string) {
    try {
      return await this.fetch<import('@/lib/inspections/types').InspectionRecord>(`/inspections/${id}`)
    } catch {
      const hub = await this.getInspectionsHub()
      const row = hub.register.find((r) => r.id === id)
      if (!row) throw new Error('Inspection not found')
      return row
    }
  }

  scheduleInspection(input: {
    vehicleId: string
    inspectionType: import('@/lib/inspections/types').InspectionType
    dueDate: string
    bookedDate?: string | null
    provider?: string
    driverInstruction?: string | null
  }) {
    return this.fetch<import('@/lib/inspections/types').InspectionRecord>('/inspections', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  startInspection(id: string, actorName: string) {
    return this.fetch<import('@/lib/inspections/types').InspectionRecord>(`/inspections/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  updateInspectionChecklistItem(
    id: string,
    input: import('@/lib/vehicles/types').UpdatePmiChecklistItemInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/inspections/types').InspectionRecord>(
      `/inspections/${id}/checklist`,
      {
        method: 'PATCH',
        body: JSON.stringify({ ...input, actorName }),
      },
    )
  }

  completeInspectionChecklist(id: string) {
    return this.fetch<import('@/lib/inspections/types').InspectionRecord>(
      `/inspections/${id}/complete-checklist`,
      { method: 'POST' },
    )
  }

  signOffInspection(id: string, actorName: string) {
    return this.fetch<import('@/lib/inspections/types').InspectionRecord>(`/inspections/${id}/sign-off`, {
      method: 'POST',
      body: JSON.stringify({ actorName }),
    })
  }

  importInspection(input: {
    vehicleId: string
    inspectionType: import('@/lib/inspections/types').InspectionType
    dueDate: string
    fileName: string
    outcome?: import('@/lib/inspections/types').InspectionOutcome
  }) {
    return this.fetch<import('@/lib/inspections/types').InspectionRecord>('/inspections/import', {
      method: 'POST',
      body: JSON.stringify(input),
    })
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

  getYardMessages() {
    return this.fetch<import('@/lib/yard/types').YardDriverMessage[]>('/yard/messages')
  }

  replyYardMessage(input: { conversationId: string; driverId: string; body: string }) {
    return this.fetch('/yard/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    })
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

  async getNotifications(params?: { unread_only?: boolean }) {
    const qs = new URLSearchParams()
    if (params?.unread_only) qs.set('unread_only', 'true')
    const q = qs.toString()
    const rows = await this.fetch<Array<Record<string, unknown>>>(`/notifications${q ? `?${q}` : ''}`)
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      id: String(row.id ?? ''),
      tenantId: String(row.companyId ?? row.tenantId ?? ''),
      userId: String(row.recipientUserId ?? row.userId ?? ''),
      type: String(row.notificationType ?? row.type ?? 'system'),
      title: String(row.title ?? ''),
      body: row.body != null ? String(row.body) : null,
      link: row.actionUrl != null ? String(row.actionUrl) : row.link != null ? String(row.link) : null,
      readAt: row.readAt != null ? String(row.readAt) : null,
      createdAt: String(row.createdAt ?? new Date().toISOString()),
    })) as import('@/lib/api/types').ApiNotification[]
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

  getDepotProfiles() {
    return this.fetch<import('@/lib/depots/types').DepotProfile[]>('/depots/profiles')
  }

  getDepotProfile(id: string) {
    return this.fetch<import('@/lib/depots/types').DepotProfile>(`/depots/${id}`)
  }

  getDepotOpsSnapshot(id: string, date?: string) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : ''
    return this.fetch<import('@/lib/depots/types').DepotOpsSnapshot>(`/depots/${id}/ops-snapshot${qs}`)
  }

  createDepot(input: import('@/lib/depots/types').CreateDepotInput, actorName: string) {
    return this.fetch<import('@/lib/depots/types').DepotProfile>('/depots', {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  updateDepot(id: string, input: import('@/lib/depots/types').UpdateDepotInput, actorName: string) {
    return this.fetch<import('@/lib/depots/types').DepotProfile>(`/depots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...input, actorName }),
    })
  }

  getOperationalTrips(params?: { dutyId?: string; status?: string }) {
    const qs = new URLSearchParams()
    if (params?.dutyId) qs.set('dutyId', params.dutyId)
    if (params?.status) qs.set('status', params.status)
    const q = qs.toString()
    return this.fetch<import('@/lib/transfers/types').OperationalTrip[]>(
      `/operational-trips${q ? `?${q}` : ''}`,
    ).then((trips) => trips.map(normalizeOperationalTrip))
  }

  getOperationalTrip(id: string) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip>(`/operational-trips/${id}`).then(
      normalizeOperationalTrip,
    )
  }

  async getOperationalTripByDuty(dutyId: string) {
    try {
      const trip = await this.fetch<import('@/lib/transfers/types').OperationalTrip | null>(
        `/duties/${dutyId}/operational-trip`,
      )
      if (trip && !Array.isArray(trip) && isOperationalTripLike(trip)) {
        return normalizeOperationalTrip(trip)
      }
    } catch {
      // Fall through — older gateways may not expose the by-duty route yet.
    }

    try {
      const trips = await this.getOperationalTrips()
      const match = trips.find((t) => t.dutyId === dutyId)
      return match ?? null
    } catch {
      return null
    }
  }

  async getOperationalPosition(tripId: string) {
    try {
      const raw = await this.fetch<unknown>(`/operational-trips/${tripId}/position`)
      return normalizeOperationalPosition(raw)
    } catch {
      const trip = await this.getOperationalTrip(tripId)
      return deriveOperationalPosition(trip)
    }
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
    return this.fetch<import('@/lib/transfers/types').OperationalTrip[]>(
      `/bookings/${bookingId}/operational-trips`,
    ).then((trips) => trips.map(normalizeOperationalTrip))
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

  /** Typed escape hatch for route-backed Command modules added ahead of dedicated domain clients. */
  getCommandResource<T>(path: string) {
    return this.fetch<T>(path.startsWith('/') ? path : `/${path}`)
  }
}
