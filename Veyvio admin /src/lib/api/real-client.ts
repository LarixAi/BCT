import type {
  AuthTokensResponse,
  AuthUser,
  DashboardSummary,
  DefectRecord,
  IncidentRecord,
  LiveDispatchResponse,
  LoginResponse,
  TenantMembershipOption,
  DepotRecord,
  DutyRecord,
  DutyDetailRecord,
  DutyTrackResponse,
  DriverRecord,
  VehicleRecord,
  VehicleSwapRequestRecord,
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
  IntegrationApiKeyRecord,
  AuditLogRecord,
  PerformanceMetrics,
  YardSummary,
  PricingRuleRecord,
  ExceptionsPort,
} from './types'
import type { BookingDraft, BookingListItem, BookingRecord, CustomerBookingContext, CreateDraftOptions, CancelBookingInput, AutoPlanProposal, EditImpact } from '@/lib/bookings/types'
import {
  deriveOperationalPosition,
  isOperationalPositionLike,
  isOperationalTripLike,
} from '@/lib/transfers/operational-trip'
import { normalizeAdBlueRecords } from '@/lib/adblue/normalize'
import { normalizeVehicleProfile } from '@/lib/vehicles/readiness-projection'
import { normalizeDriverProfileDocuments } from '@/lib/drivers/document-display'
import { normalizeBookingRecord } from '@/lib/bookings/normalize-booking'
import { safeMaintenanceHub } from '@/lib/api/safe-hubs'

/**
 * Wave 3E-1: production SPA talks only to the same-origin Pages Functions BFF.
 * Credentials live in HttpOnly cookies — never in localStorage/sessionStorage.
 */
const API_URL = (import.meta.env.VITE_API_URL ?? '/api/command').replace(/\/$/, '')
const MEMBERSHIPS_KEY = 'pending_memberships'
const HAS_TENANT_KEY = 'has_tenant'

/** Command data plane via same-origin BFF proxy (or legacy direct URL in non-prod). */
function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (API_URL.startsWith('/')) {
    return `${API_URL}${normalized}`
  }
  if (API_URL.includes('/functions/v1/')) {
    return `${API_URL}/api${normalized}`
  }
  return `${API_URL}/api${normalized}`
}

function sessionUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/api/session${normalized}`
}

function apiErrorMessage(err: { message?: string | string[] }, fallback: string): string {
  if (Array.isArray(err.message)) return err.message.join(', ')
  return err.message ?? fallback
}

/** Command sometimes returns page hubs `{ items: [] }` for unimplemented lists — never treat as array. */
function asRecordList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: T[] }).items
  }
  return []
}

function isCommandPageHub(raw: unknown): boolean {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      'path' in (raw as object) &&
      'items' in (raw as object),
  )
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
    dispatcherName: trip.dispatcherName ?? null,
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
    serviceDate:
      trip.serviceDate ??
      (trip as { plannedPickupAt?: string }).plannedPickupAt?.slice(0, 10) ??
      null,
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

export class ApiClient implements ExceptionsPort {
  /** In-memory only — never holds access/refresh credential material. */
  private sessionActive = false

  /**
   * @deprecated Wave 3E-1 — cookies hold credentials. Prefer markSession / clearSession.
   * Kept so call sites can clear or mark tenant without touching tokens.
   */
  setToken(_token: string | null, hasTenant = true) {
    if (_token) this.markSession(hasTenant)
    else this.clearSession()
  }

  markSession(hasTenant = true) {
    this.sessionActive = true
    if (typeof window === 'undefined') return
    if (hasTenant) sessionStorage.setItem(HAS_TENANT_KEY, '1')
    else sessionStorage.removeItem(HAS_TENANT_KEY)
  }

  clearTenantFlag() {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(HAS_TENANT_KEY)
  }

  clearToken() {
    this.clearSession()
  }

  clearSession() {
    this.sessionActive = false
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(HAS_TENANT_KEY)
    sessionStorage.removeItem(MEMBERSHIPS_KEY)
    // Purge any pre-3E-1 credential leftovers.
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  /** Session gate only — never returns a real Bearer credential. */
  getToken(): string | null {
    return this.sessionActive ? 'cookie-session' : null
  }

  hasTenant(): boolean {
    return typeof window !== 'undefined' && sessionStorage.getItem(HAS_TENANT_KEY) === '1'
  }

  hasAuthSession(): boolean {
    return this.sessionActive
  }

  setPendingMemberships(memberships: TenantMembershipOption[]) {
    sessionStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships))
  }

  clearPendingMemberships() {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem(MEMBERSHIPS_KEY)
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

  /** Server-side refresh via Pages Functions BFF (rotates HttpOnly cookies). */
  async refreshAccessToken(): Promise<string> {
    const res = await fetch(sessionUrl('/refresh'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) {
      this.clearSession()
      throw new Error('Session expired — sign in again')
    }
    this.markSession(this.hasTenant())
    return 'cookie-session'
  }

  async ensureValidAccessToken(options?: { force?: boolean }): Promise<string | null> {
    if (!this.sessionActive && !this.hasTenant()) {
      // Cold start may still have HttpOnly cookies — probe status when forced.
      if (!options?.force) return null
    }
    if (options?.force) {
      await this.refreshAccessToken()
    }
    return this.sessionActive ? 'cookie-session' : null
  }

  async getSessionStatus(): Promise<{ authenticated: boolean; hasTenant: boolean }> {
    const res = await fetch(sessionUrl('/status'), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      this.clearSession()
      return { authenticated: false, hasTenant: false }
    }
    const data = (await res.json()) as { authenticated?: boolean; hasTenant?: boolean }
    if (data.authenticated) this.markSession(Boolean(data.hasTenant))
    else this.clearSession()
    return {
      authenticated: Boolean(data.authenticated),
      hasTenant: Boolean(data.hasTenant),
    }
  }

  async listMemberships() {
    const data = await this.fetch<{ memberships?: TenantMembershipOption[] }>('/auth/memberships')
    return Array.isArray(data.memberships) ? data.memberships : []
  }

  async fetch<T = unknown>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    }

    let res: Response
    try {
      res = await fetch(apiUrl(path), {
        ...options,
        headers,
        credentials: 'include',
      })
    } catch (error) {
      // Safari reports CORS/network failures as TypeError: "Load failed"
      const raw = error instanceof Error ? error.message : 'Network request failed'
      if (/load failed|failed to fetch|networkerror/i.test(raw)) {
        throw new Error('Could not reach Command API. Check your connection or try again.')
      }
      throw error instanceof Error ? error : new Error(raw)
    }

    if (!res.ok) {
      if (res.status === 401 && this.sessionActive && !retried) {
        try {
          await this.refreshAccessToken()
          return this.fetch<T>(path, options, true)
        } catch {
          // Fall through to session expiry handling.
        }
      }
      if (res.status === 401 && this.sessionActive) {
        this.clearSession()
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
    // Clear prior SPA workspace state; BFF login replaces HttpOnly cookies.
    this.clearSession()

    const res = await fetch(sessionUrl('/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(apiErrorMessage(err, res.statusText || 'Request failed'))
    }
    const result = (await res.json()) as LoginResponse
    if (result.requiresMfaChallenge) {
      return result
    }
    if (result.requiresTenantSelection) {
      this.markSession(false)
      return result
    }
    // Fully signed in with company — cookies set by BFF; no tokens in body.
    this.markSession(true)
    return result
  }

  async selectTenant(tenantId: string) {
    const res = await fetch(sessionUrl('/select-tenant'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(apiErrorMessage(err, res.statusText || 'Request failed'))
    }
    const result = (await res.json()) as AuthTokensResponse
    this.markSession(true)
    return result
  }

  async logoutRemote() {
    try {
      await fetch(sessionUrl('/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
    } finally {
      this.clearSession()
    }
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

  enableMfa(input?: { code?: string }) {
    return this.fetch<{
      recoveryCodes?: string[]
      mfaEnabled: boolean
      secret?: string
      otpauthUri?: string
      status?: 'pending' | 'active'
    }>('/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify(input?.code ? { code: input.code } : {}),
    })
  }

  verifyMfa(input: {
    challengeId: string
    code: string
    companyId?: string
  }) {
    return fetch(sessionUrl('/confirm'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: input.challengeId,
        code: input.code,
        companyId: input.companyId,
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
        if (result.requiresTenantSelection) {
          this.markSession(false)
        } else {
          this.markSession(true)
        }
        return result
      })
      .catch((error: unknown) => {
        if (error instanceof TypeError) {
          const detail = error.message && error.message !== 'Failed to fetch' ? ` (${error.message})` : ''
          throw new Error(
            `Could not reach Command to verify MFA${detail}. Check your connection and try again.`,
          )
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

  getCompanyEntitlements() {
    return this.fetch<{
      planCode: string
      subscriptionStatus: string
      tenantStatus: string
      enabledModules: string[]
      usageLimits: Record<string, number | null>
      trialEndsAt: string | null
      currentPeriodEnd: string | null
      gracePeriodEndsAt: string | null
    }>('/company/entitlements')
  }

  listPlatformCompanies() {
    return this.fetch<import('./types').PlatformCompanyRow[]>('/platform/companies')
  }

  getPlatformCompany(companyId: string) {
    return this.fetch<import('./types').PlatformCompanyDetail>(`/platform/companies/${companyId}`)
  }

  patchPlatformCompany(
    companyId: string,
    body: {
      tenantStatus?: string
      planCode?: string
      subscriptionStatus?: string
      moduleOverrides?: Array<{ moduleKey: string; enabled: boolean; reason?: string }>
      usageLimits?: Array<{ limitKey: string; limitValue: number | null; reason?: string }>
    },
  ) {
    return this.fetch<{ ok: boolean; entitlements?: Record<string, unknown> }>(
      `/platform/companies/${companyId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    )
  }

  listPlatformPlans() {
    return this.fetch<import('./types').PlatformPlanRow[]>('/platform/plans')
  }

  listPlatformSubscriptions() {
    return this.fetch<import('./types').PlatformSubscriptionRow[]>('/platform/subscriptions')
  }

  listPlatformAudit() {
    return this.fetch<import('./types').PlatformAuditRow[]>('/platform/audit')
  }

  getPlatformHealth() {
    return this.fetch<import('./types').PlatformHealth>('/platform/health')
  }

  listPlatformFeatureFlags() {
    return this.fetch<import('./types').PlatformFeatureFlag[]>('/platform/feature-flags')
  }

  patchPlatformFeatureFlag(flagKey: string, body: { enabled?: boolean; description?: string }) {
    return this.fetch<import('./types').PlatformFeatureFlag>(
      `/platform/feature-flags/${encodeURIComponent(flagKey)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
    )
  }

  listAllPlatformSupportGrants() {
    return this.fetch<import('./types').PlatformSupportGrant[]>('/platform/support-grants')
  }

  listPlatformSupportGrants(companyId: string) {
    return this.fetch<import('./types').PlatformSupportGrant[]>(
      `/platform/support-grants?companyId=${encodeURIComponent(companyId)}`,
    )
  }

  createPlatformSupportGrant(body: {
    companyId: string
    reason: string
    granteeUserId?: string
    ticketReference?: string
    accessLevel?: string
    durationMinutes?: number
  }) {
    return this.fetch('/platform/support-grants', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  revokePlatformSupportGrant(grantId: string) {
    return this.fetch<{ ok: boolean }>(`/platform/support-grants/${grantId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  createPlatformCheckout(body: { companyId: string; planCode: string }) {
    return this.fetch<{
      checkoutUrl: string | null
      sessionId: string | null
      configured?: boolean
      placeholder?: boolean
      message?: string
    }>('/platform/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    })
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
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/profile`).then(
      (profile) => normalizeDriverProfileDocuments(profile),
    )
  }

  getDriverProfiles() {
    return this.fetch<import('@/lib/drivers/types').DriverProfile[]>('/drivers/profiles').then(
      (profiles) => profiles.map((p) => normalizeDriverProfileDocuments(p)),
    )
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
    }).then((profile) => normalizeDriverProfileDocuments(profile))
  }

  uploadDriverPhoto(id: string, input: import('@/lib/drivers/types').UploadDriverPhotoInput, actorName: string) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/photo`, {
      method: 'POST',
      body: JSON.stringify({ ...input, actorName }),
    }).then((profile) => normalizeDriverProfileDocuments(profile))
  }

  getDriverDocumentDownloadUrl(driverId: string, documentId: string) {
    return this.fetch<{ url: string; fileName: string; mimeType: string; label: string | null }>(
      `/drivers/${driverId}/documents/${documentId}/download`,
    )
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
    }).then((profile) => normalizeDriverProfileDocuments(profile))
  }

  rejectDriverDocument(
    id: string,
    documentId: string,
    reason: string,
    actorName: string,
    options?: { requestResubmit?: boolean },
  ) {
    return this.fetch<import('@/lib/drivers/types').DriverProfile>(`/drivers/${id}/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        actorName,
        reason,
        requestResubmit: options?.requestResubmit !== false,
      }),
    }).then((profile) => normalizeDriverProfileDocuments(profile))
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

  importVehicles(
    vehicles: import('@/lib/vehicles/vehicle-csv-import').VehicleImportParsedRow[],
    actorName: string,
  ) {
    return this.fetch<{
      rowsRead: number
      created: number
      skippedDuplicates: number
      failed: Array<{ row: number; registrationNumber: string; reason: string }>
      createdIds: string[]
    }>('/vehicles/import', {
      method: 'POST',
      body: JSON.stringify({ vehicles, actorName }),
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
    // Live hub only — never fall back to empty mock summary in production Command.
    return this.fetch<import('@/lib/vehicle-reports/types').VehicleReportsHubData>('/vehicle-reports/hub')
  }

  async getBodyConditionHub(depotId?: string) {
    const q = depotId ? `?depotId=${encodeURIComponent(depotId)}` : ''
    try {
      return await this.fetch<import('@/lib/body-condition/types').BodyConditionHubData>(`/body-condition/hub${q}`)
    } catch {
      const { emptyBodyConditionHub } = await import('@/lib/body-condition/empty-hub')
      return emptyBodyConditionHub()
    }
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

  getExceptions(params?: { status?: string; openOnly?: boolean }) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.openOnly === false) qs.set('openOnly', 'false')
    const q = qs.toString()
    return this.fetch<import('@/lib/types').OperationalException[]>(`/exceptions${q ? `?${q}` : ''}`)
  }

  getException(id: string) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}`,
    )
  }

  raiseException(input: {
    title: string
    description?: string
    severity?: string
    category?: string
    typeCode?: string
    relatedRecord?: string
    relatedHref?: string
    depotId?: string | null
    actorName?: string
  }) {
    return this.fetch<import('@/lib/types').OperationalException>('/exceptions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  acknowledgeException(id: string, input: { notes?: string; actorName?: string } = {}) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}/acknowledge`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  assignException(
    id: string,
    input: { assigneeUserId?: string; assigneeName?: string; actorName?: string } = {},
  ) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}/assign`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  investigateException(id: string, input: { actorName?: string } = {}) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}/investigate`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  escalateException(id: string, input: { reason?: string; actorName?: string } = {}) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}/escalate`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  closeException(
    id: string,
    input: { resolution?: string; dismiss?: boolean; actorName?: string } = {},
  ) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}/close`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  addExceptionNote(id: string, input: { body: string; actorName?: string }) {
    return this.fetch<import('@/lib/types').OperationalException>(
      `/exceptions/${encodeURIComponent(id)}/notes`,
      { method: 'POST', body: JSON.stringify(input) },
    )
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
      const raw = await this.fetch<Record<string, unknown>>('/compliance/automation-settings')
      return {
        warnDaysBeforeExpiry: Number(raw.warnDaysBeforeExpiry ?? 30),
        blockAssignmentOnExpired: Boolean(
          raw.blockAssignmentOnExpired ?? raw.blockExpiredCpc ?? raw.blockExpiredLicence ?? true,
        ),
        autoUnassignOnExpired: Boolean(raw.autoUnassignOnExpired ?? false),
        notifyRoles: Array.isArray(raw.notifyRoles) ? (raw.notifyRoles as string[]) : [],
        blockExpiredCpc: Boolean(raw.blockExpiredCpc ?? true),
        blockExpiredLicence: Boolean(raw.blockExpiredLicence ?? true),
        blockExpiredMot: Boolean(raw.blockExpiredMot ?? true),
        blockCriticalDefects: Boolean(raw.blockCriticalDefects ?? true),
        blockVorVehicles: Boolean(raw.blockVorVehicles ?? true),
        defectAutomationRules: Array.isArray(raw.defectAutomationRules) ? raw.defectAutomationRules : [],
      }
    } catch {
      return {
        warnDaysBeforeExpiry: 30,
        blockAssignmentOnExpired: true,
        autoUnassignOnExpired: false,
        notifyRoles: [] as string[],
      }
    }
  }

  updateComplianceAutomationSettings(input: Partial<ComplianceAutomationSettings>) {
    return this.fetch<ComplianceAutomationSettings>('/compliance/automation-settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
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
    return this.fetch<ReportsSummary | Record<string, unknown>>(`/reports/summary${q ? `?${q}` : ''}`).then(
      async (raw) => {
        const data = raw as ReportsSummary
        if (data?.fleet && data?.safety && data?.operations) return data
        // Legacy commandPage shell — derive a usable summary from dashboard counts.
        try {
          const dash = await this.getDashboard()
          const from = params?.from ?? new Date().toISOString().slice(0, 10)
          const to = params?.to ?? from
          return {
            fleet: {
              vehicles: Number(dash.vehiclesInService ?? 0) + Number(dash.vehiclesOffRoad ?? 0),
              drivers: Number(dash.driversOnDuty ?? 0),
            },
            customers: 0,
            safety: {
              openDefects: Number(dash.openDefects ?? 0),
              openIncidents: Number(dash.openIncidents ?? 0),
            },
            operations: { dutiesInPeriod: Number(dash.todaysActiveDuties ?? 0) },
            period: { from, to },
            generatedAt: new Date().toISOString(),
          } satisfies ReportsSummary
        } catch {
          const from = params?.from ?? new Date().toISOString().slice(0, 10)
          const to = params?.to ?? from
          return {
            fleet: { vehicles: 0, drivers: 0 },
            customers: 0,
            safety: { openDefects: 0, openIncidents: 0 },
            operations: { dutiesInPeriod: 0 },
            period: { from, to },
            generatedAt: new Date().toISOString(),
          } satisfies ReportsSummary
        }
      },
    )
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
    return this.fetch<UserMembershipRecord[] | Record<string, unknown>[]>('/users').then((rows) => {
      if (!Array.isArray(rows)) return []
      return rows.map((raw, index) => {
        const row = raw as Record<string, unknown>
        const nested = row.user as Record<string, unknown> | undefined
        if (nested && (nested.firstName != null || nested.email != null)) {
          return {
            id: String(row.id ?? index),
            roleKey: String(row.roleKey ?? 'member'),
            status: String(row.status ?? 'active'),
            user: {
              id: String(nested.id ?? ''),
              email: String(nested.email ?? ''),
              firstName: String(nested.firstName ?? ''),
              lastName: String(nested.lastName ?? ''),
              status: String(nested.status ?? 'active'),
              lastLoginAt: (nested.lastLoginAt as string | null | undefined) ?? null,
            },
          } satisfies UserMembershipRecord
        }
        return {
          id: String(row.id ?? index),
          roleKey: String(row.roleKey ?? 'member'),
          status: String(row.status ?? 'active'),
          user: {
            id: String(row.userId ?? row.user_id ?? ''),
            email: String(row.email ?? ''),
            firstName: String(row.firstName ?? row.first_name ?? 'User'),
            lastName: String(row.lastName ?? row.last_name ?? ''),
            status: String(row.authenticationStatus ?? row.status ?? 'active'),
            lastLoginAt: (row.lastLoginAt ?? row.last_login_at ?? null) as string | null,
          },
        } satisfies UserMembershipRecord
      })
    })
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
    return this.fetch<SchoolRecord[] | Record<string, unknown>[]>('/schools').then((rows) => {
      if (!Array.isArray(rows)) return []
      return rows.map((raw, index) => {
        const row = raw as Record<string, unknown>
        const address = row.address
        let addressText: string | null = null
        if (typeof address === 'string') addressText = address
        else if (address && typeof address === 'object') {
          const parts = ['line1', 'line2', 'city', 'town', 'postcode']
            .map((key) => {
              const value = (address as Record<string, unknown>)[key]
              return value == null ? '' : String(value).trim()
            })
            .filter(Boolean)
          addressText = parts.length ? parts.join(', ') : null
        }
        return {
          id: String(row.id ?? index),
          name: String(row.name ?? 'School'),
          address: addressText,
          customerId: String(row.customerId ?? row.customer_id ?? ''),
          routeCount: Number(row.routeCount ?? 0),
          pupilCount: Number(row.pupilCount ?? 0),
        } satisfies SchoolRecord
      })
    })
  }

  getMaintenance() {
    return this.fetch<MaintenanceRecord[]>('/maintenance')
  }

  getMaintenanceHub() {
    return this.fetch<import('@/lib/maintenance/types').MaintenanceHubData>('/maintenance/hub').then((hub) =>
      safeMaintenanceHub(hub),
    )
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

  /** Attendance hub — live Command API; fail-closed empty hub when unavailable. */
  async getAttendanceHub() {
    const { emptyAttendanceHub, emptyAttendanceTrends } = await import('@/lib/attendance/empty-hub')
    try {
      const data = await this.fetch<import('@/lib/attendance/types').AttendanceHubData>(
        '/attendance/hub',
      )
      if (
        !data?.summary ||
        typeof data.summary.operationalDate !== 'string' ||
        !Array.isArray(data.board) ||
        !Array.isArray(data.leaveRequests)
      ) {
        const empty = emptyAttendanceHub()
        return {
          ...empty,
          trends: {
            ...empty.trends,
            mondayFridayPatternNote:
              'Attendance response was incomplete — showing an empty board until Command returns a full hub.',
          },
        }
      }
      return {
        ...data,
        trends: data.trends ?? emptyAttendanceTrends(),
      }
    } catch (error) {
      const empty = emptyAttendanceHub()
      const detail = error instanceof Error ? error.message : 'Command attendance hub unavailable'
      return {
        ...empty,
        trends: {
          ...empty.trends,
          mondayFridayPatternNote: `Could not load live attendance (${detail}).`,
        },
      }
    }
  }

  async getLeaveRequests() {
    try {
      const data = await this.fetch<import('@/lib/attendance/types').LeaveRequestRecord[]>(
        '/attendance/leave',
      )
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  async updateLeaveRequest(row: import('@/lib/attendance/types').LeaveRequestRecord) {
    return this.fetch<import('@/lib/attendance/types').LeaveRequestRecord>('/attendance/leave', {
      method: 'PUT',
      body: JSON.stringify(row),
    })
  }

  async getDriverHoliday(driverId: string) {
    return this.fetch<import('@/lib/holiday/types').DriverHolidayBundle>(
      `/drivers/${driverId}/holiday`,
    )
  }

  async updateDriverHolidayProfile(
    driverId: string,
    input: import('@/lib/holiday/types').UpdateDriverHolidayProfileInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/holiday/types').DriverHolidayBundle>(
      `/drivers/${driverId}/holiday/profile`,
      {
        method: 'PATCH',
        body: JSON.stringify({ ...input, actorName }),
      },
    )
  }

  async adjustDriverHoliday(
    driverId: string,
    input: import('@/lib/holiday/types').AdjustDriverHolidayInput,
    actorName: string,
  ) {
    return this.fetch<import('@/lib/holiday/types').DriverHolidayBundle>(
      `/drivers/${driverId}/holiday/adjustments`,
      {
        method: 'POST',
        body: JSON.stringify({ ...input, actorName }),
      },
    )
  }

  async accrueDriverHoliday(
    driverId: string,
    input: { hoursWorked: number; reason?: string },
    actorName: string,
  ) {
    return this.fetch<import('@/lib/holiday/types').DriverHolidayBundle>(
      `/drivers/${driverId}/holiday/accruals`,
      {
        method: 'POST',
        body: JSON.stringify({ ...input, actorName }),
      },
    )
  }

  async getAttendancePersonProfile(input: { personId?: string | null; personName?: string | null }) {
    const q = new URLSearchParams()
    if (input.personId) q.set('personId', input.personId)
    if (input.personName) q.set('personName', input.personName)
    const data = await this.fetch<import('@/lib/attendance/types').AttendancePersonProfile | null>(
      `/attendance/profile?${q}`,
    )
    if (!data || typeof data !== 'object' || !data.score || typeof data.score.score !== 'number') {
      return null
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
  }

  async classifyAttendanceRow(input: {
    rowId: string
    classification: import('@/lib/attendance/types').ManagerClassification
    reason?: import('@/lib/attendance/types').AbsenceReasonCode | null
    note?: string
    actorName: string
  }) {
    return this.fetch<import('@/lib/attendance/types').AttendanceBoardRow | null>(
      '/attendance/classify',
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  async getAttendanceCoverCandidates(dutyLabel?: string | null) {
    const q = dutyLabel ? `?duty=${encodeURIComponent(dutyLabel)}` : ''
    try {
      const data = await this.fetch<import('@/lib/attendance/types').CoverCandidate[]>(
        `/attendance/cover-candidates${q}`,
      )
      return Array.isArray(data) ? data : []
    } catch {
      return []
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
    return this.fetch<{ ok: true; message: string; actorName: string }>('/attendance/assign-cover', {
      method: 'POST',
      body: JSON.stringify(input),
    })
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

  createResourcePurchase(input: {
    resourceName: string
    quantity: number
    unit?: string
    estimatedCost: number
    vehicleId?: string | null
    depotId?: string | null
    reason?: string
    urgency?: string
    neededBy?: string | null
    actorName: string
  }) {
    return this.fetch<import('@/lib/fleet-resources/types').PurchaseRequestRow>(
      '/fleet-resources/purchases',
      {
        method: 'POST',
        body: JSON.stringify(input),
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

  createResourceEquipment(input: {
    name: string
    category?: string
    vehicleId?: string | null
    qrCode?: string | null
    serialNumber?: string | null
    expiryDate?: string | null
    requiredForDuty?: boolean
    actorName: string
  }) {
    return this.fetch<import('@/lib/fleet-resources/types').EquipmentAsset>(
      '/fleet-resources/equipment',
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
    return this.fetch<IntegrationRecord[] | Record<string, unknown>>('/integrations')
      .then((raw) => (Array.isArray(raw) ? raw : []))
      .catch(() => [] as IntegrationRecord[])
  }

  getIntegrationApiKeys() {
    return this.fetch<{ items?: IntegrationApiKeyRecord[] } | IntegrationApiKeyRecord[]>(
      '/settings/integration-keys',
    ).then((raw) => {
      if (Array.isArray(raw)) return raw
      return Array.isArray(raw?.items) ? raw.items : []
    })
  }

  createIntegrationApiKey(input: { name: string; scopes?: string[]; expiresAt?: string | null }) {
    return this.fetch<IntegrationApiKeyRecord>('/settings/integration-keys', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  revokeIntegrationApiKey(id: string) {
    return this.fetch<IntegrationApiKeyRecord>(`/settings/integration-keys/${id}`, {
      method: 'DELETE',
    })
  }

  getAuditLogs() {
    return this.fetch<AuditLogRecord[]>('/audit')
  }

  getOverrideAuditEvents() {
    return this.fetch<{ items?: Array<Record<string, unknown>> }>('/overrides').then((body) => {
      const items = Array.isArray(body?.items) ? body.items : []
      return items.map((row) => ({
        id: String(row.id ?? ''),
        ruleCode: row.ruleCode != null ? String(row.ruleCode) : undefined,
        reason: row.reason != null ? String(row.reason) : undefined,
        entityType: row.entityType != null ? String(row.entityType) : undefined,
        entityId: row.entityId != null ? String(row.entityId) : undefined,
        blockers: Array.isArray(row.blockers) ? row.blockers.map(String) : [],
        occurredAt:
          row.occurredAt != null
            ? String(row.occurredAt)
            : row.createdAt != null
              ? String(row.createdAt)
              : undefined,
        createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
        actorUserId: row.actorUserId != null ? String(row.actorUserId) : null,
      }))
    })
  }

  getPricingRules() {
    return this.fetch<PricingRuleRecord[]>('/pricing')
  }

  getPerformanceMetrics(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    const q = qs.toString()
    return this.fetch<PerformanceMetrics | Record<string, unknown>>(`/reports/performance${q ? `?${q}` : ''}`).then(
      (raw) => {
        const data = raw as PerformanceMetrics
        if (typeof data?.onTimePct === 'number' && data.period?.from) return data
        const from = params?.from ?? new Date().toISOString().slice(0, 10)
        const to = params?.to ?? from
        const metricsBag = (raw as { metrics?: Record<string, unknown> })?.metrics ?? {}
        return {
          onTimePct: Number(metricsBag.onTimePct ?? data?.onTimePct ?? 0),
          completedRuns: Number(metricsBag.completedRuns ?? data?.completedRuns ?? 0),
          avgDelayMinutes: Number(metricsBag.avgDelayMinutes ?? data?.avgDelayMinutes ?? 0),
          defectRate: Number(metricsBag.defectRate ?? data?.defectRate ?? 0),
          period: { from, to },
        } satisfies PerformanceMetrics
      },
    )
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
    return this.fetch<BookingRecord>(`/bookings/${id}`).then((raw) =>
      normalizeBookingRecord(raw as unknown as Record<string, unknown>),
    )
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

  getPlaces() {
    return this.fetch<import('@/lib/places/types').PlaceRecord[]>('/places')
  }

  createPlace(input: import('@/lib/places/types').CreatePlaceInput) {
    return this.fetch<import('@/lib/places/types').PlaceRecord>('/places', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  getInterestSubmissions(params?: import('@/lib/interests/types').InterestListParams) {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.source) qs.set('source', params.source)
    if (params?.assignedTo) qs.set('assignedTo', params.assignedTo)
    if (params?.service) qs.set('service', params.service)
    if (params?.borough) qs.set('borough', params.borough)
    if (params?.postcode) qs.set('postcode', params.postcode)
    if (params?.accessibility) qs.set('accessibility', params.accessibility)
    if (params?.marketing) qs.set('marketing', params.marketing)
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.q) qs.set('q', params.q)
    const q = qs.toString()
    return this.fetch<import('@/lib/interests/types').InterestListResponse>(`/interests${q ? `?${q}` : ''}`)
  }

  getInterestSubmission(id: string) {
    return this.fetch<import('@/lib/interests/types').InterestDetail>(`/interests/${id}`)
  }

  patchInterestSubmission(id: string, input: import('@/lib/interests/types').InterestPatchInput) {
    return this.fetch<import('@/lib/interests/types').InterestDetail>(`/interests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  acceptInterestSubmission(id: string) {
    return this.fetch<import('@/lib/interests/types').InterestAcceptResult>(
      `/interests/${encodeURIComponent(id)}/accept`,
      { method: 'POST', body: '{}' },
    )
  }

  rejectInterestSubmission(id: string, input?: { reason?: string; notifyCustomer?: boolean }) {
    return this.fetch<import('@/lib/interests/types').InterestRejectResult>(
      `/interests/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(input ?? {}),
      },
    )
  }

  getOperationalTrips(params?: { dutyId?: string; status?: string; serviceDate?: string }) {
    const qs = new URLSearchParams()
    if (params?.dutyId) qs.set('dutyId', params.dutyId)
    if (params?.status) qs.set('status', params.status)
    if (params?.serviceDate) qs.set('serviceDate', params.serviceDate)
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

  assignPlanningTrip(
    tripId: string,
    input: { driverId?: string | null; vehicleId?: string | null },
  ) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip>(
      `/operational-trips/${tripId}/assign`,
      { method: 'POST', body: JSON.stringify(input) },
    ).then((raw) => normalizeOperationalTrip(raw as import('@/lib/transfers/types').OperationalTrip))
  }

  movePlanningJob(jobId: string, targetTripId: string) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip>(
      `/operational-trips/${targetTripId}/jobs`,
      { method: 'POST', body: JSON.stringify({ jobId }) },
    )
  }

  createPlanningTripFromJobs(
    jobIds: string[],
    opts?: { dutyId?: string | null; runReference?: string | null; routeName?: string | null },
  ) {
    return this.fetch<import('@/lib/transfers/types').OperationalTrip>('/operational-trips/plan', {
      method: 'POST',
      body: JSON.stringify({ jobIds, ...opts }),
    })
  }

  validateSchedulePlanningAssignment(input: {
    tripId: string
    driverId?: string | null
    vehicleId?: string | null
    dutyDate: string
  }) {
    return this.fetch<import('@/lib/schedule/planning-types').PlanningAssignmentValidation>(
      '/schedule/planning/validate',
      { method: 'POST', body: JSON.stringify(input) },
    )
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

  commitJourneySequenceReorder(input: {
    tripId: string
    orderedPickupJobIds: string[]
    reason: string
    reasonNotes?: string
    linkedReturnDecision?: string
    sendNotifications?: boolean
    actorName?: string
    dutyId?: string | null
  }) {
    return this.fetch<{
      mode: 'run_trips' | 'passenger_ids'
      entityId: string
      originalOrder: string[]
      newOrder: string[]
      changed: boolean
      auditId: string
      trip: import('@/lib/transfers/types').OperationalTrip | null
      acknowledgement: import('@/lib/journey-sequence/types').DriverAckRecord | null
    }>(`/operational-trips/${encodeURIComponent(input.tripId)}/journey-sequence/reorder`, {
      method: 'POST',
      body: JSON.stringify({
        orderedPickupJobIds: input.orderedPickupJobIds,
        reason: input.reason,
        reasonNotes: input.reasonNotes,
        linkedReturnDecision: input.linkedReturnDecision ?? 'keep_unchanged',
        sendNotifications: Boolean(input.sendNotifications),
        actorName: input.actorName,
        dutyId: input.dutyId ?? null,
      }),
    }).then((result) => ({
      ...result,
      trip: result.trip ? normalizeOperationalTrip(result.trip) : null,
      acknowledgement: result.acknowledgement ?? null,
    }))
  }

  listJourneySequenceDestinations(tripId: string, dutyId?: string | null) {
    const q = dutyId ? `?dutyId=${encodeURIComponent(dutyId)}` : ''
    return this.fetch<
      Array<{
        tripId: string
        tripReference: string
        runReference: string | null
        routeName: string | null
        driverName: string | null
        vehicleRegistration: string | null
        tripStatus: string
        jobCount: number
        wheelchairSpacesHint: number
      }>
    >(`/operational-trips/${encodeURIComponent(tripId)}/journey-sequence/destinations${q}`)
  }

  commitJourneySequenceMove(input: {
    tripId: string
    jobIds: string[]
    action: string
    destinationTripId?: string | null
    reason?: string
    actorName?: string
    dutyId?: string | null
  }) {
    return this.fetch<{
      action: string
      movedTripIds: string[]
      sourceRunId: string | null
      destinationRunId: string | null
      message: string
      auditId: string
      trip: import('@/lib/transfers/types').OperationalTrip | null
      acknowledgement: import('@/lib/journey-sequence/types').DriverAckRecord | null
    }>(`/operational-trips/${encodeURIComponent(input.tripId)}/journey-sequence/move`, {
      method: 'POST',
      body: JSON.stringify({
        jobIds: input.jobIds,
        action: input.action,
        destinationTripId: input.destinationTripId ?? null,
        reason: input.reason,
        actorName: input.actorName,
        dutyId: input.dutyId ?? null,
      }),
    }).then((result) => ({
      ...result,
      trip: result.trip ? normalizeOperationalTrip(result.trip) : null,
      acknowledgement: result.acknowledgement ?? null,
    }))
  }

  getJourneySequenceAcknowledgement(tripId: string) {
    return this.fetch<{
      acknowledgement: import('@/lib/journey-sequence/types').DriverAckRecord | null
    }>(`/operational-trips/${encodeURIComponent(tripId)}/journey-sequence/acknowledgement`)
  }

  advanceJourneySequenceAcknowledgement(input: {
    tripId: string
    status: 'viewed' | 'acknowledged' | 'declined' | 'delivered'
    declineReason?: string
  }) {
    return this.fetch<{
      acknowledgement: import('@/lib/journey-sequence/types').DriverAckRecord
    }>(`/operational-trips/${encodeURIComponent(input.tripId)}/journey-sequence/acknowledgement`, {
      method: 'POST',
      body: JSON.stringify({
        status: input.status,
        declineReason: input.declineReason,
      }),
    })
  }

  getTransferHistory(tripId?: string) {
    const q = tripId ? `?tripId=${tripId}` : ''
    return this.fetch<import('@/lib/transfers/types').TransferRecord[]>(`/transfers${q}`)
  }

  getAssignmentHistory(tripId: string) {
    return this.fetch<import('@/lib/transfers/types').AssignmentHistoryEntry[]>(
      `/operational-trips/${tripId}/assignment-history`,
    ).then((raw) => (Array.isArray(raw) ? raw : []))
  }

  getOperationalTripsByBooking(bookingId: string) {
    return this.fetch<unknown>(`/bookings/${bookingId}/operational-trips`).then((raw) => {
      if (!Array.isArray(raw)) return []
      return raw
        .filter(isOperationalTripLike)
        .map(normalizeOperationalTrip)
        .filter((trip) => !trip.bookingId || trip.bookingId === bookingId)
    })
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
    return this.fetch<import('@/lib/transfers/types').TransferReportSummary | Record<string, unknown>>(
      `/transfers/report?from=${periodFrom}&to=${periodTo}`,
    ).then((raw) => {
      const data = (raw ?? {}) as Partial<import('@/lib/transfers/types').TransferReportSummary>
      // command-api may still return a generic page shell for unimplemented transfer report.
      if (!Array.isArray(data.byReason) || !Array.isArray(data.recentTransfers)) {
        return {
          periodFrom,
          periodTo,
          totalTransfers: Number(data.totalTransfers ?? 0),
          byReason: Array.isArray(data.byReason) ? data.byReason : [],
          byDepot: Array.isArray(data.byDepot) ? data.byDepot : [],
          driverCaused: Number(data.driverCaused ?? 0),
          vehicleCaused: Number(data.vehicleCaused ?? 0),
          lateRecovery: Number(data.lateRecovery ?? 0),
          managerOverrides: Number(data.managerOverrides ?? 0),
          avgRecoveryMinutes: Number(data.avgRecoveryMinutes ?? 0),
          passengersAffected: Number(data.passengersAffected ?? 0),
          recentTransfers: Array.isArray(data.recentTransfers) ? data.recentTransfers : [],
        } satisfies import('@/lib/transfers/types').TransferReportSummary
      }
      return data as import('@/lib/transfers/types').TransferReportSummary
    })
  }

  getDialARideMembers() {
    return this.fetch<unknown>('/dial-a-ride/members').then((raw) =>
      asRecordList<import('@/lib/dial-a-ride/types').DialARideMember>(raw),
    )
  }

  getDialARideMember(id: string) {
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideMember>(`/dial-a-ride/members/${id}`)
  }

  getDialARideRequests(params?: { view?: string }) {
    const q = params?.view ? `?view=${params.view}` : ''
    return this.fetch<unknown>(`/dial-a-ride/requests${q}`).then((raw) =>
      asRecordList<import('@/lib/dial-a-ride/types').DialARideRequestListItem>(raw),
    )
  }

  getDialARideRequest(id: string) {
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideRequest>(`/dial-a-ride/requests/${id}`)
  }

  getDialARideSummary() {
    return this.fetch<unknown>('/dial-a-ride/summary').then((raw) => {
      if (isCommandPageHub(raw) || !raw || typeof raw !== 'object') {
        return { requestsToday: 0, awaitingDecision: 0, unscheduled: 0, membersTravelling: 0 }
      }
      const row = raw as Record<string, unknown>
      return {
        requestsToday: Number(row.requestsToday ?? 0),
        awaitingDecision: Number(row.awaitingDecision ?? 0),
        unscheduled: Number(row.unscheduled ?? 0),
        membersTravelling: Number(row.membersTravelling ?? 0),
      }
    })
  }

  createDialARideRequestDraft(memberId?: string) {
    const q = memberId ? `?memberId=${memberId}` : ''
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideRequest>(`/dial-a-ride/requests/draft${q}`, {
      method: 'POST',
    })
  }

  saveDialARideRequest(draft: import('@/lib/dial-a-ride/types').DialARideRequestDraft) {
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideRequest>('/dial-a-ride/requests', {
      method: 'PUT',
      body: JSON.stringify(draft),
    })
  }

  runDialARideServiceChecks(draft: import('@/lib/dial-a-ride/types').DialARideRequestDraft) {
    return this.fetch<import('@/lib/dial-a-ride/eligibility').ServiceCheckOutcome>('/dial-a-ride/service-checks', {
      method: 'POST',
      body: JSON.stringify(draft),
    })
  }

  acceptDialARideRequest(requestId: string, opts?: { overrideReason?: string }) {
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideRequest>(
      `/dial-a-ride/requests/${requestId}/accept`,
      { method: 'POST', body: JSON.stringify(opts ?? {}) },
    )
  }

  declineDialARideRequest(requestId: string, reason: string) {
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideRequest>(
      `/dial-a-ride/requests/${requestId}/decline`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    )
  }

  waitingListDialARideRequest(requestId: string) {
    return this.fetch<import('@/lib/dial-a-ride/types').DialARideRequest>(
      `/dial-a-ride/requests/${requestId}/waiting-list`,
      { method: 'POST' },
    )
  }

  getSchoolRoutes(params?: { view?: string }) {
    const q = params?.view ? `?view=${params.view}` : ''
    return this.fetch<unknown>(`/school-routes${q}`).then((raw) =>
      asRecordList<import('@/lib/school-routes/types').SchoolRouteListItem>(raw),
    )
  }

  getSchoolRoute(id: string) {
    return this.fetch<import('@/lib/school-routes/types').SchoolRoute>(`/school-routes/${id}`)
  }

  getSchoolRoutesSummary() {
    return this.fetch<unknown>('/school-routes/summary').then((raw) => {
      if (isCommandPageHub(raw) || !raw || typeof raw !== 'object') {
        return { activeRoutes: 0, pupilsToday: 0, unscheduledJobs: 0, exceptions: 0 }
      }
      const row = raw as Record<string, unknown>
      return {
        activeRoutes: Number(row.activeRoutes ?? 0),
        pupilsToday: Number(row.pupilsToday ?? 0),
        unscheduledJobs: Number(row.unscheduledJobs ?? 0),
        exceptions: Number(row.exceptions ?? 0),
      }
    })
  }

  createSchoolRouteDraft() {
    return this.fetch<import('@/lib/school-routes/types').SchoolRoute>('/school-routes/draft', { method: 'POST' })
  }

  saveSchoolRoute(draft: import('@/lib/school-routes/types').SchoolRouteDraft) {
    return this.fetch<import('@/lib/school-routes/types').SchoolRoute>('/school-routes', {
      method: 'PUT',
      body: JSON.stringify(draft),
    })
  }

  publishSchoolRoute(routeId: string) {
    return this.fetch<import('@/lib/school-routes/types').SchoolRoute>(`/school-routes/${routeId}/publish`, {
      method: 'POST',
    })
  }

  previewSchoolRouteJobCount(routeId: string) {
    return this.fetch<{ count: number }>(`/school-routes/${routeId}/job-preview`)
  }

  getSchoolRouteAttendance(routeId: string) {
    return this.fetch<unknown>(`/school-routes/${routeId}/attendance`).then((raw) =>
      asRecordList<import('@/lib/school-routes/types').SchoolRouteAttendanceRow>(raw),
    )
  }

  listVehicleSwapRequests(status = 'pending') {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    return this.fetch<VehicleSwapRequestRecord[]>(`/vehicle-swap-requests${qs}`)
  }

  approveVehicleSwapRequest(requestId: string, notes?: string) {
    return this.fetch<VehicleSwapRequestRecord>(`/vehicle-swap-requests/${encodeURIComponent(requestId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null }),
    })
  }

  rejectVehicleSwapRequest(requestId: string, notes?: string) {
    return this.fetch<VehicleSwapRequestRecord>(`/vehicle-swap-requests/${encodeURIComponent(requestId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null }),
    })
  }

  getJobExecution(jobId: string) {
    return this.fetch<import('@/lib/operations/job-execution').JobExecutionSnapshot>(
      `/jobs/${encodeURIComponent(jobId)}/execution`,
    )
  }

  /** Typed escape hatch for route-backed Command modules added ahead of dedicated domain clients. */
  getCommandResource<T>(path: string) {
    return this.fetch<T>(path.startsWith('/') ? path : `/${path}`)
  }

  patchCommandResource<T>(path: string, body: unknown) {
    return this.fetch<T>(path.startsWith('/') ? path : `/${path}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }
}
