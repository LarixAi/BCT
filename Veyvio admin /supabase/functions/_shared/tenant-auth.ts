/**
 * Multi-tenant company signup / verification helpers.
 * Employees never self-register a company here — only first authorised representative.
 */
import { HttpError } from './http.ts'
import { sendResendEmail } from './resend.ts'
import { admin } from './supabase.ts'
import { sanitizeSecurityMetadata } from './security-event-redaction.ts'
import {
  isKnownSecurityEventType,
  SECURITY_EVENT_CATALOG,
} from './security-monitoring-catalog.ts'
import { buildOtpauthUri, generateTotpSecret, verifyTotpCode } from './totp.ts'
import {
  decideInvitationAuthority,
  normalizeAppType,
  sourceAppFor,
  type VeyvioAppType,
} from './account-authority.ts'

const encoder = new TextEncoder()

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function recordSecurityEvent(input: {
  companyId?: string | null
  actorUserId?: string | null
  eventType: string
  message: string
  severity?: 'info' | 'attention' | 'critical'
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
  evaluateAlerts?: boolean
}) {
  const catalog = isKnownSecurityEventType(input.eventType)
    ? SECURITY_EVENT_CATALOG[input.eventType]
    : null
  const severity = input.severity ?? catalog?.defaultSeverity ?? 'info'
  const metadata = sanitizeSecurityMetadata(input.metadata ?? {}) as Record<
    string,
    unknown
  >
  const { data, error } = await admin
    .from('security_events')
    .insert({
      company_id: input.companyId ?? null,
      actor_user_id: input.actorUserId ?? null,
      event_type: input.eventType,
      severity,
      message: String(input.message).slice(0, 2_000),
      ip_address: input.ipAddress ? String(input.ipAddress).slice(0, 128) : null,
      user_agent: input.userAgent ? String(input.userAgent).slice(0, 512) : null,
      metadata,
    })
    .select('id')
    .maybeSingle()
  if (error) {
    console.error('security_events insert failed', error)
    return null
  }
  if (input.evaluateAlerts !== false && input.companyId && data?.id) {
    try {
      const { evaluateSecurityAlertsForCompany } = await import(
        './security-monitoring-core.ts'
      )
      await evaluateSecurityAlertsForCompany(String(input.companyId), String(data.id))
    } catch (alertError) {
      console.error('security alert evaluation failed', alertError)
    }
  }
  return data
}

export async function startCompanySignup(input: {
  email: string
  firstName: string
  lastName: string
  companyName: string
  country: string
  phone?: string
  password: string
  termsAccepted: boolean
  privacyAccepted: boolean
  ipAddress?: string | null
  userAgent?: string | null
}) {
  if (!input.termsAccepted || !input.privacyAccepted) {
    throw new Error('You must accept the terms and privacy notice')
  }
  const email = input.email.trim().toLowerCase()
  if (!email || !input.password || input.password.length < 12) {
    throw new Error('Use a work email and a password of at least 12 characters')
  }

  // Enumeration-safe: if already registered, still return generic success shape.
  const { data: existingAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const alreadyUser = (existingAuth.users ?? []).some((u) => (u.email ?? '').toLowerCase() === email)

  const { data: org, error: orgError } = await admin
    .from('pending_organisations')
    .insert({
      trading_name: input.companyName.trim(),
      legal_name: input.companyName.trim(),
      country: input.country || 'GB',
      phone: input.phone ?? null,
      status: 'pending_email',
    })
    .select('id')
    .single()
  if (orgError || !org) throw new Error(orgError?.message ?? 'Signup could not start')

  await admin.from('signup_risk_assessments').insert({
    pending_organisation_id: org.id,
    risk_level: alreadyUser ? 'elevated' : 'standard',
    signals: { alreadyRegisteredEmail: alreadyUser, country: input.country },
  })

  const { data: pendingUser, error: userError } = await admin
    .from('pending_users')
    .insert({
      pending_organisation_id: org.id,
      email,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: input.phone ?? null,
      password_hash: null,
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      status: alreadyUser ? 'blocked_existing' : 'pending_email',
    })
    .select('id')
    .single()
  if (userError || !pendingUser) throw new Error(userError?.message ?? 'Signup user could not be created')

  let devVerificationToken: string | null = null
  if (!alreadyUser) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: false,
      user_metadata: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        pending_organisation_id: org.id,
        pending_user_id: pendingUser.id,
      },
    })
    if (createError || !created.user) throw new Error(createError?.message ?? 'Account could not be prepared')

    const token = randomToken(32)
    const tokenHash = await sha256Hex(token)
    await admin.from('email_verification_challenges').insert({
      pending_user_id: pendingUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      created_ip: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    })
    await admin.from('pending_users').update({
      auth_user_id: created.user.id,
    }).eq('id', pendingUser.id)
    devVerificationToken = token
  }

  await recordSecurityEvent({
    eventType: 'signup.started',
    message: 'Company registration started',
    metadata: { pendingOrganisationId: org.id, emailDomain: email.split('@')[1] },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  return {
    ok: true,
    message: 'If an account can be created for this address, we will send instructions.',
    pendingOrganisationId: org.id,
    // Temporary until transactional email is connected
    devVerificationToken,
  }
}

export async function verifySignupEmail(token: string, ipAddress?: string | null, userAgent?: string | null) {
  const tokenHash = await sha256Hex(token)
  const { data: challenge, error } = await admin
    .from('email_verification_challenges')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('consumed_at', null)
    .is('invalidated_at', null)
    .maybeSingle()
  if (error || !challenge) throw new Error('This verification link is invalid or has expired')
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new Error('This verification link is invalid or has expired')
  }

  const { data: pendingUser } = await admin
    .from('pending_users')
    .select('*')
    .eq('id', challenge.pending_user_id)
    .single()
  if (!pendingUser?.auth_user_id) throw new Error('This verification link is invalid or has expired')

  await admin.from('email_verification_challenges').update({
    consumed_at: new Date().toISOString(),
  }).eq('id', challenge.id)

  await admin.auth.admin.updateUserById(pendingUser.auth_user_id, { email_confirm: true })

  await admin.from('users').upsert({
    id: pendingUser.auth_user_id,
    email: pendingUser.email,
    first_name: pendingUser.first_name,
    last_name: pendingUser.last_name,
    phone: pendingUser.phone,
  }, { onConflict: 'id' })

  const { data: org } = await admin
    .from('pending_organisations')
    .select('*')
    .eq('id', pendingUser.pending_organisation_id)
    .single()

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      legal_name: org?.legal_name ?? org?.trading_name ?? 'New company',
      trading_name: org?.trading_name ?? 'New company',
      country: org?.country ?? 'GB',
      phone: org?.phone ?? pendingUser.phone,
      tenant_status: 'PENDING_COMPANY_VERIFICATION',
      status: 'active',
      created_by: pendingUser.auth_user_id,
      updated_by: pendingUser.auth_user_id,
      source_app: 'EXECUTIVE',
    })
    .select('id')
    .single()
  if (companyError || !company) throw new Error(companyError?.message ?? 'Company could not be created')

  const { data: ownerRoleId, error: roleError } = await admin.rpc('ensure_default_company_roles', {
    p_company_id: company.id,
    p_actor: pendingUser.auth_user_id,
  })
  if (roleError) throw new Error(roleError.message)

  const { data: ownerMembership, error: ownerMembershipError } = await admin.from('company_memberships').insert({
    user_id: pendingUser.auth_user_id,
    company_id: company.id,
    role_ids: ownerRoleId ? [ownerRoleId] : [],
    status: 'active',
    accepted_at: new Date().toISOString(),
    created_by: pendingUser.auth_user_id,
    updated_by: pendingUser.auth_user_id,
    source_app: 'EXECUTIVE',
  }).select('id').single()
  if (ownerMembershipError || !ownerMembership) {
    throw new Error(ownerMembershipError?.message ?? 'Company owner membership could not be created')
  }

  const { error: ownerAccessError } = await admin.from('membership_application_access').insert([
    {
      company_id: company.id,
      membership_id: ownerMembership.id,
      app_type: 'EXECUTIVE',
      access_level: 'admin',
      status: 'active',
      granted_by: pendingUser.auth_user_id,
    },
    {
      company_id: company.id,
      membership_id: ownerMembership.id,
      app_type: 'COMMAND',
      access_level: 'oversight',
      status: 'active',
      granted_by: pendingUser.auth_user_id,
    },
  ])
  if (ownerAccessError) throw new Error(ownerAccessError.message)

  await admin.from('pending_users').update({
    email_verified_at: new Date().toISOString(),
    status: 'email_verified',
  }).eq('id', pendingUser.id)

  await admin.from('pending_organisations').update({
    status: 'pending_company_verification',
    completed_company_id: company.id,
  }).eq('id', pendingUser.pending_organisation_id)

  await recordSecurityEvent({
    companyId: company.id,
    actorUserId: pendingUser.auth_user_id,
    eventType: 'signup.email_verified',
    message: 'Signup email verified; company pending verification',
    ipAddress,
    userAgent,
  })

  return {
    companyId: company.id as string,
    userId: pendingUser.auth_user_id as string,
    nextStep: 'company_verification',
  }
}

export async function submitCompanyVerification(input: {
  companyId: string
  userId: string
  legalName: string
  tradingName: string
  companiesHouseNumber?: string
  registeredAddress?: Record<string, unknown>
  operatingAddress?: Record<string, unknown>
  operatorLicenceNumber?: string
  phone?: string
  billingContact?: Record<string, unknown>
  transportManagerName?: string
  estimatedFleetSize?: number
  estimatedUserCount?: number
}) {
  const { data: membership } = await admin
    .from('company_memberships')
    .select('id, status')
    .eq('company_id', input.companyId)
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership) throw new Error('You do not have access to this company')

  const { error } = await admin.from('companies').update({
    legal_name: input.legalName,
    trading_name: input.tradingName,
    company_number: input.companiesHouseNumber ?? null,
    operator_licence_number: input.operatorLicenceNumber ?? null,
    registered_address: input.registeredAddress ?? {},
    operating_address: input.operatingAddress ?? {},
    address: input.operatingAddress ?? input.registeredAddress ?? {},
    phone: input.phone ?? null,
    billing_contact: input.billingContact ?? {},
    transport_manager_name: input.transportManagerName ?? null,
    estimated_fleet_size: input.estimatedFleetSize ?? null,
    estimated_user_count: input.estimatedUserCount ?? null,
    tenant_status: 'PENDING_CONTRACT',
    updated_by: input.userId,
  }).eq('id', input.companyId)
  if (error) throw new Error(error.message)

  await recordSecurityEvent({
    companyId: input.companyId,
    actorUserId: input.userId,
    eventType: 'signup.company_verification_submitted',
    message: 'Company verification details submitted',
  })

  return { nextStep: 'contract_acceptance' }
}

export async function acceptCompanyContracts(input: {
  companyId: string
  userId: string
  ipAddress?: string | null
  userAgent?: string | null
  documents: Array<{ documentType: string; documentVersion: string }>
}) {
  const rows = input.documents.map((doc) => ({
    company_id: input.companyId,
    document_type: doc.documentType,
    document_version: doc.documentVersion,
    accepted_by: input.userId,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    acceptance_method: 'web_checkbox',
  }))
  const { error } = await admin.from('company_contract_acceptances').insert(rows)
  if (error) throw new Error(error.message)

  await admin.from('companies').update({
    tenant_status: 'SETUP_REQUIRED',
    updated_by: input.userId,
  }).eq('id', input.companyId)

  await recordSecurityEvent({
    companyId: input.companyId,
    actorUserId: input.userId,
    eventType: 'signup.contracts_accepted',
    message: 'Company contracts accepted',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  return { nextStep: 'setup' }
}

export async function completeCompanySetup(input: {
  companyId: string
  userId: string
  timezone?: string
  depotName?: string
  depotCode?: string
}) {
  const depotName = input.depotName?.trim() || 'Primary depot'
  const depotCode = input.depotCode?.trim() || 'MAIN'

  const { count } = await admin
    .from('depots')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', input.companyId)

  if ((count ?? 0) === 0) {
    await admin.from('depots').insert({
      company_id: input.companyId,
      name: depotName,
      code: depotCode,
      status: 'active',
      created_by: input.userId,
      updated_by: input.userId,
      source_app: 'COMMAND',
    })
  }

  if (input.timezone) {
    await admin.from('companies').update({ timezone: input.timezone, updated_by: input.userId }).eq('id', input.companyId)
  }

  await admin.from('companies').update({
    tenant_status: 'ACTIVE',
    activated_at: new Date().toISOString(),
    updated_by: input.userId,
  }).eq('id', input.companyId)

  await recordSecurityEvent({
    companyId: input.companyId,
    actorUserId: input.userId,
    eventType: 'tenant.activated',
    message: 'Tenant activated after setup',
    severity: 'attention',
  })

  return { nextStep: 'active' }
}

export function assertTenantCanOperate(tenantStatus: string | null | undefined) {
  const status = tenantStatus ?? 'ACTIVE'
  if (status === 'ACTIVE' || status === 'SETUP_REQUIRED' || status === 'READ_ONLY') return
  if (status === 'SUSPENDED' || status === 'CLOSED' || status === 'CLOSING') {
    throw new HttpError(403, 'This company account is not available', 'forbidden')
  }
  // Pending states: allow authenticated setup routes only — callers decide.
}

/** Enforce lifecycle on every authenticated company-scoped request. */
export function enforceTenantLifecycle(tenantStatus: string, method: string): void {
  assertTenantCanOperate(tenantStatus)
  if (tenantStatus === 'READ_ONLY' && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    throw new HttpError(403, 'This company is read-only until billing is resolved', 'tenant_read_only')
  }
}

export async function createUserSession(input: {
  userId: string
  companyId: string
  membershipId: string
  authStrength?: 'password' | 'password_mfa' | 'passkey' | 'phishing_resistant_mfa'
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const sessionStartedAt = new Date().toISOString()
  const executiveStrength =
    input.authStrength === 'password_mfa' ||
    input.authStrength === 'passkey' ||
    input.authStrength === 'phishing_resistant_mfa'
  const expiresAt = new Date(
    Date.now() + (executiveStrength ? 8 : 12) * 60 * 60_000,
  ).toISOString()
  const { data, error } = await admin
    .from('user_sessions')
    .insert({
      user_id: input.userId,
      active_company_id: input.companyId,
      membership_id: input.membershipId,
      auth_method: 'password',
      auth_strength: input.authStrength ?? 'password',
      expires_at: expiresAt,
      last_used_at: sessionStartedAt,
      ip_history: input.ipAddress ? [input.ipAddress] : [],
      user_agent: input.userAgent ?? null,
    })
    .select('id, auth_strength, created_at, last_used_at, expires_at')
    .single()
  if (error) return null

  if (executiveStrength) {
    const { data: activeSessions } = await admin
      .from('user_sessions')
      .select('id')
      .eq('user_id', input.userId)
      .eq('active_company_id', input.companyId)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    const sessionsToRevoke = (activeSessions ?? []).slice(2).map((session) => String(session.id))
    if (sessionsToRevoke.length) {
      await admin
        .from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .in('id', sessionsToRevoke)
      await recordSecurityEvent({
        companyId: input.companyId,
        actorUserId: input.userId,
        eventType: 'auth.concurrent_session_limit',
        message: 'Older Executive sessions revoked after the concurrent-session limit was reached',
        severity: 'attention',
        metadata: { revokedCount: sessionsToRevoke.length, maximumSessions: 2 },
      })
    }
  }

  return {
    id: String(data.id),
    authStrength: String(data.auth_strength),
    assuranceLevel: executiveStrength ? 'aal2' as const : 'aal1' as const,
    createdAt: String(data.created_at),
    lastUsedAt: String(data.last_used_at),
    expiresAt: String(data.expires_at),
  }
}

const EXECUTIVE_IDLE_MINUTES = 15
const EXECUTIVE_STEP_UP_MINUTES = 10

export async function validateExecutiveUserSession(input: {
  sessionId: string
  userId: string
  companyId: string
  membershipId: string
}) {
  const { data: session, error } = await admin
    .from('user_sessions')
    .select('id, user_id, active_company_id, membership_id, auth_strength, created_at, last_used_at, expires_at, revoked_at')
    .eq('id', input.sessionId)
    .eq('user_id', input.userId)
    .eq('active_company_id', input.companyId)
    .eq('membership_id', input.membershipId)
    .maybeSingle()

  if (error || !session || session.revoked_at) {
    throw new HttpError(401, 'The Executive session is no longer active', 'executive_session_revoked')
  }

  const now = Date.now()
  const expiresAt = new Date(String(session.expires_at)).getTime()
  const lastUsedAt = new Date(String(session.last_used_at)).getTime()
  const createdAt = new Date(String(session.created_at)).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await admin.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', session.id)
    await recordSecurityEvent({
      companyId: input.companyId,
      actorUserId: input.userId,
      eventType: 'auth.session_revoked',
      message: 'Executive session revoked after absolute expiry',
      severity: 'attention',
      metadata: { reason: 'expired', sessionId: session.id },
      evaluateAlerts: false,
    })
    throw new HttpError(401, 'The Executive session has expired', 'executive_session_expired')
  }
  if (
    !Number.isFinite(createdAt) ||
    createdAt > now + 60_000 ||
    now - createdAt > 8 * 60 * 60_000
  ) {
    await admin.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', session.id)
    await recordSecurityEvent({
      companyId: input.companyId,
      actorUserId: input.userId,
      eventType: 'auth.session_revoked',
      message: 'Executive session revoked after 8-hour limit',
      severity: 'attention',
      metadata: { reason: 'max_lifetime', sessionId: session.id },
      evaluateAlerts: false,
    })
    throw new HttpError(401, 'The Executive session reached its 8-hour limit', 'executive_session_expired')
  }
  if (
    !Number.isFinite(lastUsedAt) ||
    now - lastUsedAt > EXECUTIVE_IDLE_MINUTES * 60_000
  ) {
    await admin.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', session.id)
    await recordSecurityEvent({
      companyId: input.companyId,
      actorUserId: input.userId,
      eventType: 'auth.session_revoked',
      message: 'Executive session revoked after idle timeout',
      severity: 'attention',
      metadata: { reason: 'idle', sessionId: session.id },
      evaluateAlerts: false,
    })
    throw new HttpError(401, 'The Executive session ended after 15 minutes of inactivity', 'executive_session_idle')
  }

  const authStrength = String(session.auth_strength)
  if (!['password_mfa', 'passkey', 'phishing_resistant_mfa'].includes(authStrength)) {
    throw new HttpError(403, 'Multi-factor authentication is required for Executive', 'executive_aal2_required')
  }

  const touchedAt = new Date().toISOString()
  await admin.from('user_sessions').update({ last_used_at: touchedAt }).eq('id', session.id)
  return {
    id: String(session.id),
    authStrength,
    assuranceLevel: 'aal2' as const,
    createdAt: String(session.created_at),
    lastUsedAt: touchedAt,
    expiresAt: String(session.expires_at),
    idleMinutes: EXECUTIVE_IDLE_MINUTES,
    absoluteHours: 8,
    concurrentSessionLimit: 2,
    stepUpFresh:
      Number.isFinite(createdAt) &&
      now - createdAt <= EXECUTIVE_STEP_UP_MINUTES * 60_000,
    stepUpMinutes: EXECUTIVE_STEP_UP_MINUTES,
  }
}

export function getDriverAppBaseUrl(): string {
  const raw =
    Deno.env.get('VEYVIO_DRIVER_APP_URL')?.trim() ||
    Deno.env.get('DRIVER_APP_URL')?.trim() ||
    ''
  return raw.replace(/\/$/, '')
}

/**
 * Accept-invitation UI lives on Command (Admin), not the Driver Capacitor shell.
 * Prefer Admin public origin so emailed links work off LAN / Outlook.
 */
export function getInviteAcceptBaseUrl(): string {
  const raw =
    Deno.env.get('VEYVIO_INVITE_APP_URL')?.trim() ||
    Deno.env.get('VEYVIO_ADMIN_APP_URL')?.trim() ||
    Deno.env.get('VEYVIO_DRIVER_APP_URL')?.trim() ||
    Deno.env.get('DRIVER_APP_URL')?.trim() ||
    ''
  return raw.replace(/\/$/, '')
}

/** Public accept-invitation path (no query — used for docs / redirects). */
export function getDriverInviteRedirectUrl(): string {
  const base = getInviteAcceptBaseUrl()
  if (!base) {
    throw new Error(
      'VEYVIO_ADMIN_APP_URL is not configured on the server. Set it to the Command origin (for example https://veyvio-admin.pages.dev).',
    )
  }
  return `${base}/accept-invitation`
}

/** Stable first-login link with our invitation token (preferred over Auth OTP links). */
export function getDriverInviteAppLink(token: string): string {
  return `${getDriverInviteRedirectUrl()}?token=${encodeURIComponent(token)}`
}

export function friendlyInviteError(error: unknown): string {
  if (!(error instanceof Error)) return 'The driver invitation could not be sent.'
  const message = error.message.toLowerCase()
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account already exists for this email address. Link the existing account instead of sending a new invitation.'
  }
  if (message.includes('rate limit')) {
    return 'Too many invitation attempts. Wait a few minutes before resending.'
  }
  if (
    message.includes('veyvio_driver_app_url') ||
    message.includes('driver_app_url') ||
    message.includes('veyvio_admin_app_url') ||
    message.includes('resend_api_key')
  ) {
    return error.message
  }
  if (message.includes('error sending') || message.includes('email') || message.includes('smtp')) {
    return `The invitation email could not be sent: ${error.message}`
  }
  return error.message
}

export async function findAuthUserByEmail(
  email: string,
): Promise<{ id: string; email?: string; emailConfirmedAt?: string | null } | null> {
  const normalised = email.trim().toLowerCase()
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = (data.users ?? []).find((user) => (user.email ?? '').toLowerCase() === normalised)
    if (match) {
      return {
        id: match.id,
        email: match.email,
        emailConfirmedAt: match.email_confirmed_at ?? null,
      }
    }
    if ((data.users ?? []).length < 200) break
    page += 1
  }
  return null
}

/** Revoke all pending DRIVER invitations for this company email so resend does not stack rows. */
export async function revokePendingDriverInvitations(input: {
  companyId: string
  email: string
  actorUserId: string
  reason?: string
}) {
  const email = input.email.trim().toLowerCase()
  const now = new Date().toISOString()
  const { data: pending } = await admin
    .from('invitations')
    .select('id')
    .eq('company_id', input.companyId)
    .eq('email', email)
    .eq('app_type', 'DRIVER')
    .eq('status', 'pending')

  for (const row of pending ?? []) {
    await admin
      .from('invitations')
      .update({
        status: 'revoked',
        revoked_at: now,
        updated_by: input.actorUserId,
        updated_at: now,
      })
      .eq('id', row.id)

    await admin.from('invitation_events').insert({
      invitation_id: row.id,
      event_type: 'revoked',
      actor_user_id: input.actorUserId,
      metadata: { reason: input.reason ?? 'superseded_by_resend' },
    })
  }
}

export type DriverInviteEmailResult = {
  authUserId: string | null
  redirectTo: string
  appLink: string
  /** False when Auth already had the user — Admin must share appLink (Outlook OTP links are unreliable). */
  emailDelivered: boolean
}

/**
 * Create/refresh Auth invite state and return the stable Driver app link.
 * When the Auth user already exists (common after a previous invite click), we still succeed
 * and return appLink for Copy link — we do not block resend with “link existing account”.
 */
export async function sendDriverInvitationEmail(input: {
  email: string
  token: string
  driverId: string
  companyId: string
  invitationId: string
  fullName: string
  depotId?: string | null
}): Promise<DriverInviteEmailResult> {
  const redirectTo = getDriverInviteRedirectUrl()
  const appLink = getDriverInviteAppLink(input.token)
  const firstName = input.fullName.trim().split(/\s+/)[0] || 'there'

  // Auth account is created when the driver accepts (sets their own password).
  // Email delivery uses Resend with our stable Command accept link — not Supabase Auth invite mail.
  const text = [
    `Hi ${firstName},`,
    '',
    'You have been invited to Veyvio Driver.',
    '',
    'Open this secure link to create your login and choose your own password:',
    appLink,
    '',
    'This link is single-use and expires soon. If it does not open, copy and paste it into your browser.',
    '',
    'Your office never sees or sets your password.',
    '',
    '— Veyvio',
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>You have been invited to <strong>Veyvio Driver</strong>.</p>
    <p><a href="${escapeHtml(appLink)}">Create your Driver login</a></p>
    <p style="word-break:break-all;font-size:12px;color:#555">${escapeHtml(appLink)}</p>
    <p>This link is single-use and expires soon. Your office never sees or sets your password.</p>
    <p>— Veyvio</p>
  `.trim()

  await sendResendEmail({
    to: input.email,
    subject: 'Your Veyvio Driver invitation',
    text,
    html,
  })

  const existing = await findAuthUserByEmail(input.email)
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: {
        app: 'veyvio-driver',
        role_slug: 'driver',
        driver_id: input.driverId,
        organisation_id: input.companyId,
        company_id: input.companyId,
        depot_id: input.depotId ?? null,
        full_name: input.fullName,
        invitation_id: input.invitationId,
        veyvio_invite_token: input.token,
      },
    })
  }

  return {
    authUserId: existing?.id ?? null,
    redirectTo,
    appLink,
    emailDelivered: true,
  }
}

const DEPARTMENT_APP_LABELS: Record<string, string> = {
  EXECUTIVE: 'Executive',
  COMMAND: 'Command',
  FINANCE: 'Finance',
  HR: 'HR',
  DRIVER: 'Driver',
  YARD: 'Yard',
}

/**
 * Email for Command / Finance / HR / Executive invitations created from
 * Executive or Command. Uses the same Resend + accept-invitation path as Driver.
 */
export async function sendDepartmentInvitationEmail(input: {
  email: string
  token: string
  appType: VeyvioAppType
  companyName?: string | null
}): Promise<{ appLink: string; emailDelivered: boolean }> {
  const appLink = getDriverInviteAppLink(input.token)
  const appLabel = DEPARTMENT_APP_LABELS[input.appType] ?? input.appType
  const company = input.companyName?.trim() || 'your company'

  const text = [
    'Hello,',
    '',
    `You have been invited to Veyvio ${appLabel} for ${company}.`,
    '',
    'Open this secure link to create your login and choose your own password:',
    appLink,
    '',
    'This link is single-use and expires in seven days. If it does not open, copy and paste it into your browser.',
    '',
    '— Veyvio',
  ].join('\n')

  const html = `
    <p>Hello,</p>
    <p>You have been invited to <strong>Veyvio ${escapeHtml(appLabel)}</strong> for ${escapeHtml(company)}.</p>
    <p><a href="${escapeHtml(appLink)}">Accept invitation</a></p>
    <p style="word-break:break-all;font-size:12px;color:#555">${escapeHtml(appLink)}</p>
    <p>This link is single-use and expires in seven days.</p>
    <p>— Veyvio</p>
  `.trim()

  await sendResendEmail({
    to: input.email,
    subject: `Your Veyvio ${appLabel} invitation`,
    text,
    html,
  })

  return { appLink, emailDelivered: true }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function createCompanyInvitation(input: {
  companyId: string
  invitedBy: string
  email: string
  roleName?: string
  roleIds?: string[]
  depotIds?: string[]
  appType?: VeyvioAppType
  /** Calling app — when EXECUTIVE, department invites are limited to Command/Finance/HR. */
  sourceApp?: string | null
  expiresInDays?: number
}) {
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) throw new Error('A valid work email is required')
  const appType = normalizeAppType(input.appType ?? 'COMMAND')
  if (!appType) throw new HttpError(400, 'A recognised Veyvio application is required', 'unknown_application')

  let roleIds = input.roleIds ?? []
  let targetRoleNames: string[] = []

  if (roleIds.length) {
    const { data: selectedRoles } = await admin
      .from('roles')
      .select('id, name')
      .eq('company_id', input.companyId)
      .in('id', roleIds)
    if ((selectedRoles ?? []).length !== roleIds.length) {
      throw new HttpError(400, 'One or more selected roles do not belong to this company', 'invalid_role_scope')
    }
    targetRoleNames = (selectedRoles ?? []).map((role) => String(role.name))
  } else {
    targetRoleNames = [String(input.roleName ?? 'dispatcher').trim().toLowerCase()]
  }

  const { data: actorMembership } = await admin
    .from('company_memberships')
    .select('role_ids, status')
    .eq('company_id', input.companyId)
    .eq('user_id', input.invitedBy)
    .eq('status', 'active')
    .maybeSingle()
  if (!actorMembership) {
    throw new HttpError(403, 'Active company membership is required to create an account', 'company_access_denied')
  }

  const actorRoleIds = (actorMembership.role_ids as string[] | null) ?? []
  const { data: actorRoles } = actorRoleIds.length
    ? await admin
      .from('roles')
      .select('name')
      .eq('company_id', input.companyId)
      .in('id', actorRoleIds)
    : { data: [] }
  const actorRoleKeys = (actorRoles ?? []).map((role) => String(role.name))
  const authority = decideInvitationAuthority({
    actorRoleKeys,
    targetAppType: appType,
    targetRoleKeys: targetRoleNames,
    sourceApp: input.sourceApp,
  })
  if (!authority.allowed) {
    await recordSecurityEvent({
      companyId: input.companyId,
      actorUserId: input.invitedBy,
      eventType: 'invitation.authority_denied',
      message: authority.message,
      severity: 'attention',
      metadata: {
        appType,
        sourceApp: input.sourceApp ?? null,
        targetRoleNames,
        actorRoleKeys,
        reason: authority.code,
      },
    }).catch(() => undefined)
    throw new HttpError(403, authority.message, authority.code)
  }

  if (!roleIds.length) {
    const roleName = targetRoleNames[0]
    const { data: role } = await admin
      .from('roles')
      .select('id')
      .eq('company_id', input.companyId)
      .eq('name', roleName)
      .maybeSingle()
    if (!role) {
      const { data: created } = await admin
        .from('roles')
        .insert({
          company_id: input.companyId,
          name: roleName,
          description: roleName.replaceAll('_', ' '),
          is_system_role: false,
          created_by: input.invitedBy,
          updated_by: input.invitedBy,
          source_app: sourceAppFor(appType),
        })
        .select('id')
        .single()
      if (created) roleIds = [created.id]
    } else {
      roleIds = [role.id]
    }
  }

  const token = randomToken(32)
  const tokenHash = await sha256Hex(token)
  const expiresAt = new Date(Date.now() + (input.expiresInDays ?? 7) * 86400000).toISOString()

  const { data: invitation, error } = await admin
    .from('invitations')
    .insert({
      company_id: input.companyId,
      email,
      app_type: appType,
      role_ids: roleIds,
      depot_ids: input.depotIds ?? [],
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: input.invitedBy,
      status: 'pending',
      created_by: input.invitedBy,
      updated_by: input.invitedBy,
      source_app: sourceAppFor(appType),
    })
    .select('id, email, expires_at, status, app_type')
    .single()
  if (error || !invitation) throw new Error(error?.message ?? 'Invitation could not be created')

  await admin.from('invitation_events').insert({
    invitation_id: invitation.id,
    event_type: 'created',
    actor_user_id: input.invitedBy,
    metadata: { email, roleIds },
  })
  await recordSecurityEvent({
    companyId: input.companyId,
    actorUserId: input.invitedBy,
    eventType: 'invitation.created',
    message: `Invitation created for ${email.split('@')[1]} domain`,
    metadata: { invitationId: invitation.id, appType: invitation.app_type },
  })

  let emailDelivered = false
  let acceptUrl: string | null = null
  let emailError: string | null = null
  try {
    acceptUrl = getDriverInviteAppLink(token)
    if (appType === 'DRIVER') {
      // Driver email is sent by the dedicated driver Access / AppInvite workflow.
      emailDelivered = false
    } else {
      const { data: company } = await admin
        .from('companies')
        .select('trading_name, legal_name')
        .eq('id', input.companyId)
        .maybeSingle()
      const sent = await sendDepartmentInvitationEmail({
        email,
        token,
        appType,
        companyName:
          (company?.trading_name as string | null) ??
          (company?.legal_name as string | null) ??
          null,
      })
      emailDelivered = sent.emailDelivered
      acceptUrl = sent.appLink
      await admin.from('invitation_events').insert({
        invitation_id: invitation.id,
        event_type: 'email_sent',
        actor_user_id: input.invitedBy,
        metadata: { channel: 'resend', appType },
      })
    }
  } catch (error) {
    emailError = friendlyInviteError(error)
    try {
      acceptUrl = getDriverInviteAppLink(token)
    } catch {
      acceptUrl = null
    }
    await admin.from('invitation_events').insert({
      invitation_id: invitation.id,
      event_type: 'email_failed',
      actor_user_id: input.invitedBy,
      metadata: { error: emailError },
    }).catch(() => undefined)
  }

  return {
    invitation: {
      id: invitation.id,
      email: invitation.email as string,
      expiresAt: invitation.expires_at as string,
      status: invitation.status as string,
      appType: invitation.app_type as string,
    },
    /** Plaintext token for accept URL — returned so staff can copy the link if email fails. */
    invitationToken: token,
    acceptUrl,
    emailDelivered,
    emailError,
  }
}

export async function previewInvitation(token: string) {
  const tokenHash = await sha256Hex(token)
  const { data: invitation } = await admin
    .from('invitations')
    .select('id, email, company_id, app_type, expires_at, accepted_at, revoked_at, status, companies(trading_name)')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!invitation || invitation.revoked_at || invitation.accepted_at || invitation.status !== 'pending') {
    throw new Error('This invitation is invalid or no longer available')
  }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new Error('This invitation has expired')
  }
  const company = invitation.companies as { trading_name?: string } | null
  const existingAccount = Boolean(await findAuthUserByEmail(String(invitation.email)))
  let firstName: string | null = null
  let lastName: string | null = null
  if (invitation.app_type === 'DRIVER') {
    const { data: driver } = await admin
      .from('drivers')
      .select('staff_members(first_name, last_name)')
      .eq('company_id', invitation.company_id)
      .eq('invitation_id', invitation.id)
      .maybeSingle()
    const staff = driver?.staff_members as { first_name?: string; last_name?: string } | null
    firstName = staff?.first_name ?? null
    lastName = staff?.last_name ?? null
  }
  return {
    email: invitation.email,
    companyName: company?.trading_name ?? 'Company',
    appType: invitation.app_type,
    expiresAt: invitation.expires_at,
    firstName,
    lastName,
    existingAccount,
  }
}

export async function acceptInvitation(input: {
  token: string
  password: string
  firstName: string
  lastName: string
  ipAddress?: string | null
  userAgent?: string | null
}) {
  if (!input.password || input.password.length < 12) {
    throw new Error('Choose a password of at least 12 characters')
  }
  const tokenHash = await sha256Hex(input.token)
  const { data: invitation } = await admin
    .from('invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!invitation || invitation.revoked_at || invitation.accepted_at || invitation.status !== 'pending') {
    throw new Error('This invitation is invalid or no longer available')
  }
  if (new Date(invitation.expires_at).getTime() < Date.now()) {
    throw new Error('This invitation has expired')
  }

  const email = String(invitation.email).toLowerCase()
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (!firstName || !lastName) throw new Error('First name and last name are required')

  let userId: string
  let existingIdentity = false
  let identityFirstName = firstName
  let identityLastName = lastName
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      invitation_id: invitation.id,
    },
  })

  if (createError || !created.user) {
    const alreadyExists = /already|registered|exists/i.test(createError?.message ?? '')
    if (!alreadyExists) throw new Error(createError?.message ?? 'Account could not be created')

    const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    const existing = (listed.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email)
    if (!existing) throw new Error(createError?.message ?? 'Account could not be created')

    const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        first_name: existing.user_metadata?.first_name ?? firstName,
        last_name: existing.user_metadata?.last_name ?? lastName,
        invitation_id: invitation.id,
      },
    })
    if (updateError) throw new Error(updateError.message)
    userId = existing.id
    existingIdentity = true
    identityFirstName = String(existing.user_metadata?.first_name ?? firstName)
    identityLastName = String(existing.user_metadata?.last_name ?? lastName)
  } else {
    userId = created.user.id
  }

  const acceptedAt = new Date().toISOString()
  const appType = normalizeAppType(String(invitation.app_type ?? 'COMMAND'))
  if (!appType) throw new Error('This invitation references an unknown Veyvio application')

  await admin.from('users').upsert({
    id: userId,
    email,
    first_name: identityFirstName,
    last_name: identityLastName,
  }, { onConflict: 'id' })

  const { data: existingMembership } = await admin
    .from('company_memberships')
    .select('id, role_ids')
    .eq('user_id', userId)
    .eq('company_id', invitation.company_id)
    .maybeSingle()

  let membershipId = existingMembership?.id as string | undefined
  const existingRoleIds = (existingMembership?.role_ids as string[] | null) ?? []
  const invitedRoleIds = (invitation.role_ids as string[] | null) ?? []
  const mergedRoleIds = [...new Set([...existingRoleIds, ...invitedRoleIds])]
  if (!membershipId) {
    const { data: membership, error: membershipError } = await admin
      .from('company_memberships')
      .insert({
        user_id: userId,
        company_id: invitation.company_id,
        role_ids: mergedRoleIds,
        status: 'active',
        accepted_at: acceptedAt,
        created_by: invitation.invited_by,
        updated_by: userId,
        source_app: sourceAppFor(appType),
      })
      .select('id')
      .single()
    if (membershipError || !membership) {
      throw new Error(membershipError?.message ?? 'Company membership could not be created')
    }
    membershipId = membership.id
  } else {
    await admin.from('company_memberships').update({
      status: 'active',
      accepted_at: acceptedAt,
      role_ids: mergedRoleIds,
      updated_by: userId,
      source_app: sourceAppFor(appType),
    }).eq('id', membershipId)
  }

  if (membershipId) {
    await admin.from('membership_application_access').upsert({
      company_id: invitation.company_id,
      membership_id: membershipId,
      app_type: appType,
      access_level: appType === 'EXECUTIVE' ? 'admin' : 'member',
      status: 'active',
      granted_by: invitation.invited_by,
      granted_at: acceptedAt,
      updated_at: acceptedAt,
    }, { onConflict: 'membership_id,app_type' })
  }

  const depotIds = (invitation.depot_ids as string[] | null) ?? []
  if (depotIds.length && membershipId) {
    for (const depotId of depotIds) {
      await admin.from('depot_access').upsert({
        membership_id: membershipId,
        depot_id: depotId,
        access_level: 'operate',
      })
    }
  }

  if (appType === 'DRIVER') {
    const { data: driverByInvite } = await admin
      .from('drivers')
      .select('id, staff_id, company_id')
      .eq('company_id', invitation.company_id)
      .eq('invitation_id', invitation.id)
      .maybeSingle()

    let driver = driverByInvite
    let driverId = driver?.id as string | undefined

    if (!driverId) {
      const { data: appAccount } = await admin
        .from('driver_app_accounts')
        .select('driver_id')
        .eq('company_id', invitation.company_id)
        .eq('invitation_id', invitation.id)
        .maybeSingle()
      driverId = appAccount?.driver_id as string | undefined
      if (driverId) {
        const { data: byAccount } = await admin
          .from('drivers')
          .select('id, staff_id, company_id')
          .eq('id', driverId)
          .eq('company_id', invitation.company_id)
          .maybeSingle()
        driver = byAccount
      }
    }

    // Fallback: invitation_id may have moved on resend — match by staff email for this company.
    if (!driverId) {
      const { data: staff } = await admin
        .from('staff_members')
        .select('id')
        .eq('company_id', invitation.company_id)
        .eq('email', email)
        .maybeSingle()
      if (staff?.id) {
        const { data: byEmail } = await admin
          .from('drivers')
          .select('id, staff_id, company_id')
          .eq('company_id', invitation.company_id)
          .eq('staff_id', staff.id)
          .maybeSingle()
        if (byEmail?.id) {
          driverId = String(byEmail.id)
          driver = byEmail
        }
      }
    }

    if (!driverId) {
      throw new Error(
        'This invitation is not linked to a driver record. Ask your office to resend the Driver invitation.',
      )
    }

    // Password created — setup may still be incomplete; admin activation remains separate.
    await admin.from('drivers').update({
      account_status: 'registration_started',
      invitation_id: invitation.id,
      updated_by: userId,
      updated_at: acceptedAt,
    }).eq('id', driverId).eq('company_id', invitation.company_id)

    await admin.from('driver_app_accounts').upsert({
      company_id: invitation.company_id,
      driver_id: driverId,
      user_id: userId,
      membership_id: membershipId,
      invitation_id: invitation.id,
      account_status: 'registration_started',
      registration_completed_at: acceptedAt,
      updated_by: userId,
      updated_at: acceptedAt,
      source_app: 'DRIVER',
    }, { onConflict: 'driver_id' })

    const staffId = driver?.staff_id
    if (staffId) {
      await admin.from('staff_members').update({
        user_id: userId,
        updated_by: userId,
        updated_at: acceptedAt,
      }).eq('id', staffId).eq('company_id', invitation.company_id)
    }
  } else {
    // Non-driver invites are created from Staff or Executive — link any staff
    // profile by email without creating a second identity.
    await admin.from('staff_members').update({
      user_id: userId,
      updated_by: userId,
      updated_at: acceptedAt,
    })
      .eq('company_id', invitation.company_id)
      .eq('email', email)
      .is('user_id', null)
  }

  await admin.from('invitations').update({
    accepted_at: acceptedAt,
    status: 'accepted',
    updated_by: userId,
  }).eq('id', invitation.id)

  await admin.from('invitation_events').insert({
    invitation_id: invitation.id,
    event_type: 'accepted',
    actor_user_id: userId,
  })
  await recordSecurityEvent({
    companyId: invitation.company_id,
    actorUserId: userId,
    eventType: 'invitation.accepted',
    message: appType === 'DRIVER'
      ? 'Driver invitation accepted; app account linked'
      : 'Invitation accepted and membership activated',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { appType, membershipId, roleCount: mergedRoleIds.length },
  })
  await recordSecurityEvent({
    companyId: invitation.company_id,
    actorUserId: invitation.invited_by,
    eventType: 'access.role_changed',
    message: 'Membership roles updated via invitation acceptance',
    severity: 'attention',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { membershipId, roleIds: mergedRoleIds, via: 'invitation.accepted' },
  })
  await recordSecurityEvent({
    companyId: invitation.company_id,
    actorUserId: invitation.invited_by,
    eventType: 'access.application_grant_changed',
    message: `Application access granted for ${appType}`,
    severity: 'attention',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { membershipId, appType, via: 'invitation.accepted' },
  })
  if (depotIds.length) {
    await recordSecurityEvent({
      companyId: invitation.company_id,
      actorUserId: invitation.invited_by,
      eventType: 'access.branch_scope_changed',
      message: 'Depot/branch scope granted via invitation',
      severity: 'attention',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { membershipId, depotCount: depotIds.length, via: 'invitation.accepted' },
    })
  }

  let confirmationEmailSent = false
  if (appType === 'DRIVER') {
    try {
      const { data: company } = await admin
        .from('companies')
        .select('trading_name')
        .eq('id', invitation.company_id)
        .maybeSingle()
      await sendDriverAccountConfirmationEmail({
        email,
        firstName,
        companyName: String(company?.trading_name ?? 'your operator'),
      })
      confirmationEmailSent = true
    } catch (confirmError) {
      // Account is already created — do not fail accept if confirmation mail fails.
      console.error('driver confirmation email failed', confirmError)
    }
  }

  return {
    companyId: invitation.company_id as string,
    userId,
    email,
    appType,
    existingIdentity,
    passwordChanged: !existingIdentity,
    confirmationEmailSent,
  }
}

export async function sendDriverAccountConfirmationEmail(input: {
  email: string
  firstName: string
  companyName: string
}): Promise<void> {
  const name = input.firstName.trim() || 'there'
  const company = input.companyName.trim() || 'your operator'
  const text = [
    `Hi ${name},`,
    '',
    `Your Veyvio Driver login is ready for ${company}.`,
    '',
    `Sign in to the Veyvio Driver app with:`,
    `Email: ${input.email}`,
    '',
    'Use the password you chose when you accepted the invitation. Your office cannot see your password.',
    '',
    'If you did not create this account, contact your office immediately.',
    '',
    '— Veyvio',
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your <strong>Veyvio Driver</strong> login is ready for <strong>${escapeHtml(company)}</strong>.</p>
    <p>Sign in to the Veyvio Driver app with:<br/>Email: <strong>${escapeHtml(input.email)}</strong></p>
    <p>Use the password you chose when you accepted the invitation. Your office cannot see your password.</p>
    <p>If you did not create this account, contact your office immediately.</p>
    <p>— Veyvio</p>
  `.trim()

  await sendResendEmail({
    to: input.email,
    subject: 'Your Veyvio Driver account is ready',
    text,
    html,
  })
}

export async function startPasswordReset(emailRaw: string, ipAddress?: string | null, userAgent?: string | null) {
  const email = emailRaw.trim().toLowerCase()
  // Enumeration-safe response always
  const generic = {
    ok: true,
    message: 'If an account exists for this address, we will send reset instructions.',
    devResetToken: null as string | null,
  }
  if (!email.includes('@')) return generic

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const user = (listed.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email)
  if (!user) return generic

  await admin.from('password_reset_challenges')
    .update({ invalidated_at: new Date().toISOString() })
    .eq('email', email)
    .is('consumed_at', null)
    .is('invalidated_at', null)

  const token = randomToken(32)
  await admin.from('password_reset_challenges').insert({
    user_id: user.id,
    email,
    token_hash: await sha256Hex(token),
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
    created_ip: ipAddress ?? null,
    user_agent: userAgent ?? null,
  })
  await recordSecurityEvent({
    actorUserId: user.id,
    eventType: 'auth.password_reset_requested',
    message: 'Password reset requested',
    ipAddress,
    userAgent,
  })
  return { ...generic, devResetToken: token }
}

export async function completePasswordReset(token: string, newPassword: string, ipAddress?: string | null, userAgent?: string | null) {
  if (!newPassword || newPassword.length < 12) throw new Error('Choose a password of at least 12 characters')
  const tokenHash = await sha256Hex(token)
  const { data: challenge } = await admin
    .from('password_reset_challenges')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('consumed_at', null)
    .is('invalidated_at', null)
    .maybeSingle()
  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new Error('This reset link is invalid or has expired')
  }
  if (!challenge.user_id) throw new Error('This reset link is invalid or has expired')

  const { error } = await admin.auth.admin.updateUserById(challenge.user_id, { password: newPassword })
  if (error) throw new Error(error.message)

  await admin.from('password_reset_challenges').update({
    consumed_at: new Date().toISOString(),
  }).eq('id', challenge.id)

  await admin.from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', challenge.user_id)
    .is('revoked_at', null)

  await recordSecurityEvent({
    actorUserId: challenge.user_id,
    eventType: 'auth.password_reset_completed',
    message: 'Password reset completed; sessions revoked',
    severity: 'attention',
    ipAddress,
    userAgent,
  })
  return { ok: true }
}

/**
 * Start authenticator enrollment: issue a TOTP secret + otpauth URI for QR apps.
 * MFA stays off until confirmMfaForUser verifies a live authenticator code.
 */
export async function beginMfaForUser(userId: string, companyId?: string | null) {
  const { data: profile } = await admin.from('users').select('email, mfa_enabled').eq('id', userId).maybeSingle()
  if (!profile?.email) throw new Error('Account email is required to set up MFA')
  if (profile.mfa_enabled) {
    throw new Error('MFA is already enabled on this account')
  }

  const secret = generateTotpSecret()
  const otpauthUri = buildOtpauthUri({
    secret,
    accountName: String(profile.email),
    issuer: 'Veyvio Command',
  })

  await admin
    .from('user_mfa_methods')
    .update({ is_primary: false, disabled_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('method_type', 'authenticator_app')
    .is('disabled_at', null)

  const { error } = await admin.from('user_mfa_methods').insert({
    user_id: userId,
    method_type: 'authenticator_app',
    label: 'Authenticator app',
    is_primary: true,
    totp_secret: secret,
    disabled_at: new Date().toISOString(),
    metadata: { enrolledVia: 'command_setup', status: 'pending' },
  })
  if (error) throw new Error(error.message)

  await recordSecurityEvent({
    companyId,
    actorUserId: userId,
    eventType: 'auth.mfa_setup_started',
    message: 'Authenticator MFA setup started',
    severity: 'info',
  })

  return {
    secret,
    otpauthUri,
    mfaEnabled: false,
    status: 'pending' as const,
  }
}

/**
 * Confirm authenticator enrollment with a current TOTP code, then issue recovery codes.
 */
export async function confirmMfaForUser(userId: string, code: string, companyId?: string | null) {
  const { data: method } = await admin
    .from('user_mfa_methods')
    .select('id, totp_secret, disabled_at')
    .eq('user_id', userId)
    .eq('method_type', 'authenticator_app')
    .order('enabled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!method?.totp_secret) {
    throw new Error('Start authenticator setup before confirming the code')
  }

  const ok = await verifyTotpCode(String(method.totp_secret), code)
  if (!ok) throw new Error('That authenticator code is incorrect or has expired')

  const recoveryCodes = Array.from({ length: 8 }, () => randomToken(4).slice(0, 8).toUpperCase())
  await admin.from('mfa_recovery_codes').delete().eq('user_id', userId).is('used_at', null)
  await admin.from('mfa_recovery_codes').insert(
    await Promise.all(recoveryCodes.map(async (recovery) => ({
      user_id: userId,
      code_hash: await sha256Hex(recovery),
    }))),
  )

  await admin
    .from('user_mfa_methods')
    .update({
      disabled_at: null,
      is_primary: true,
      last_used_at: new Date().toISOString(),
      metadata: { enrolledVia: 'command_setup', status: 'active' },
    })
    .eq('id', method.id)

  await admin.from('users').update({ mfa_enabled: true }).eq('id', userId)
  await recordSecurityEvent({
    companyId,
    actorUserId: userId,
    eventType: 'auth.mfa_enabled',
    message: 'Authenticator MFA enabled for user',
    severity: 'attention',
  })

  return { recoveryCodes, mfaEnabled: true, status: 'active' as const }
}

/** @deprecated Prefer beginMfaForUser + confirmMfaForUser. Kept for one-shot callers. */
export async function enableMfaForUser(userId: string, companyId?: string | null) {
  const started = await beginMfaForUser(userId, companyId)
  return {
    ...started,
    recoveryCodes: [] as string[],
    mfaEnabled: false,
  }
}

export async function listCompanyInvitations(companyId: string) {
  const { data, error } = await admin
    .from('invitations')
    .select('id, email, app_type, status, expires_at, accepted_at, revoked_at, invited_by, created_at, role_ids')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    appType: row.app_type,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    roleIds: row.role_ids ?? [],
  }))
}

const PRIVILEGED_ROLES = new Set([
  'company_owner',
  'company_administrator',
  'transport_manager',
  'dispatcher',
  'safeguarding_lead',
  'compliance_manager',
])

export async function userNeedsMfaChallenge(userId: string, companyId?: string | null) {
  const { data: profile } = await admin.from('users').select('mfa_enabled').eq('id', userId).maybeSingle()
  if (!profile?.mfa_enabled) return false
  if (!companyId) return true
  const { data: membership } = await admin
    .from('company_memberships')
    .select('id, role_ids')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle()
  if (!membership?.id) return true

  // Executive access always requires MFA, even when the member does not hold
  // one of the legacy role names below. The explicit application grant is the
  // authority boundary for the Executive app.
  const { data: executiveAccess } = await admin
    .from('membership_application_access')
    .select('membership_id')
    .eq('membership_id', membership.id)
    .eq('company_id', companyId)
    .eq('app_type', 'EXECUTIVE')
    .eq('status', 'active')
    .maybeSingle()
  if (executiveAccess) return true

  const roleIds = (membership?.role_ids as string[] | null) ?? []
  if (!roleIds.length) return true
  const { data: roles } = await admin.from('roles').select('name').in('id', roleIds)
  return (roles ?? []).some((r) => PRIVILEGED_ROLES.has(String(r.name)))
}

/**
 * Creates the challenge and stores the pending refresh token server-side —
 * the caller never receives a usable session until the code is verified.
 * `devMfaCode` is only ever populated when MFA_DEV_MODE is explicitly set,
 * which must never be configured as a secret on a real/hosted project.
 */
export async function createMfaLoginChallenge(
  userId: string,
  refreshToken: string,
  ipAddress?: string | null,
  userAgent?: string | null,
) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const { data, error } = await admin
    .from('mfa_login_challenges')
    .insert({
      user_id: userId,
      code_hash: await sha256Hex(code),
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      created_ip: ipAddress ?? null,
      user_agent: userAgent ?? null,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'MFA challenge could not be created')
  await recordSecurityEvent({
    actorUserId: userId,
    eventType: 'auth.mfa_challenge_created',
    message: 'MFA challenge issued after password authentication',
    ipAddress,
    userAgent,
  })
  const devMode = Deno.env.get('MFA_DEV_MODE') === 'true'
  return { challengeId: data.id as string, devMfaCode: devMode ? code : undefined }
}

/**
 * Verifies the code against the stored challenge (looked up by challengeId
 * alone — the caller has no session yet, so there is nothing else to check
 * them against) and hands back the pending refresh token on success so the
 * route can mint a real session. This is the only place a session becomes
 * usable after an MFA-required login.
 */
export async function verifyMfaLoginChallenge(challengeId: string, code: string) {
  const { data: challenge } = await admin
    .from('mfa_login_challenges')
    .select('*')
    .eq('id', challengeId)
    .is('consumed_at', null)
    .maybeSingle()
  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new Error('This MFA challenge is invalid or has expired')
  }

  const userId = challenge.user_id as string
  const normalised = code.trim().replace(/\s+/g, '')
  const codeHash = await sha256Hex(normalised)
  let matched = challenge.code_hash === codeHash

  if (!matched) {
    const { data: method } = await admin
      .from('user_mfa_methods')
      .select('id, totp_secret')
      .eq('user_id', userId)
      .eq('method_type', 'authenticator_app')
      .is('disabled_at', null)
      .order('enabled_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (method?.totp_secret && (await verifyTotpCode(String(method.totp_secret), normalised))) {
      matched = true
      await admin
        .from('user_mfa_methods')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', method.id)
    }
  }

  if (!matched) {
    const { data: recovery } = await admin
      .from('mfa_recovery_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .maybeSingle()
    if (recovery) {
      matched = true
      await admin.from('mfa_recovery_codes').update({ used_at: new Date().toISOString() }).eq('id', recovery.id)
    }
  }
  if (!matched) {
    await recordSecurityEvent({
      actorUserId: userId,
      eventType: 'auth.mfa_challenge_failed',
      message: 'MFA challenge failed',
      severity: 'attention',
      metadata: { challengeId },
    })
    throw new Error('The MFA code is incorrect')
  }

  await admin.from('mfa_login_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', challengeId)
  await recordSecurityEvent({
    actorUserId: userId,
    eventType: 'auth.mfa_challenge_passed',
    message: 'MFA challenge verified',
  })
  return { ok: true, userId, refreshToken: challenge.refresh_token as string }
}

export async function createSupportGrant(input: {
  companyId: string
  granteeUserId: string
  grantedBy: string
  reason: string
  ticketReference?: string
  accessLevel?: string
  durationMinutes?: number
}) {
  const expiresAt = new Date(Date.now() + (input.durationMinutes ?? 60) * 60_000).toISOString()
  const { data, error } = await admin
    .from('privileged_access_grants')
    .insert({
      company_id: input.companyId,
      grantee_user_id: input.granteeUserId,
      granted_by: input.grantedBy,
      reason: input.reason,
      ticket_reference: input.ticketReference ?? null,
      access_level: input.accessLevel ?? 'read_only',
      expires_at: expiresAt,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Support grant could not be created')

  const { data: session } = await admin
    .from('support_access_sessions')
    .insert({
      grant_id: data.id,
      company_id: input.companyId,
      support_user_id: input.granteeUserId,
      banner_acknowledged_at: new Date().toISOString(),
      metadata: { reason: input.reason },
    })
    .select('id')
    .single()

  await recordSecurityEvent({
    companyId: input.companyId,
    actorUserId: input.grantedBy,
    eventType: 'support.access_granted',
    message: 'Time-limited support access granted',
    severity: 'attention',
    metadata: { grantId: data.id, expiresAt, ticket: input.ticketReference },
  })

  return {
    grant: {
      id: data.id,
      companyId: data.company_id,
      accessLevel: data.access_level,
      expiresAt: data.expires_at,
      reason: data.reason,
    },
    sessionId: session?.id ?? null,
  }
}

export async function listSupportGrants(companyId: string) {
  const { data, error } = await admin
    .from('privileged_access_grants')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    granteeUserId: row.grantee_user_id,
    grantedBy: row.granted_by,
    reason: row.reason,
    ticketReference: row.ticket_reference,
    accessLevel: row.access_level,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }))
}

export async function revokeSupportGrant(input: {
  grantId: string
  actorUserId: string
  companyId?: string
}) {
  const now = new Date().toISOString()
  let query = admin
    .from('privileged_access_grants')
    .update({ revoked_at: now })
    .eq('id', input.grantId)
    .is('revoked_at', null)
  if (input.companyId) query = query.eq('company_id', input.companyId)

  const { data, error } = await query.select('id, company_id').maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Support grant not found or already revoked')

  await admin
    .from('support_access_sessions')
    .update({ ended_at: now })
    .eq('grant_id', input.grantId)
    .is('ended_at', null)

  await recordSecurityEvent({
    companyId: String(data.company_id),
    actorUserId: input.actorUserId,
    eventType: 'support.access_revoked',
    message: 'Support access grant revoked',
    severity: 'attention',
  })

  return { id: data.id, companyId: data.company_id, revokedAt: now }
}

export async function requestCompanyExport(input: {
  companyId: string
  userId: string
  exportType?: string
}) {
  const { assertCommandExportAllowed } = await import('./executive-documents.ts')
  assertCommandExportAllowed(input.exportType)

  const { data, error } = await admin
    .from('data_export_jobs')
    .insert({
      company_id: input.companyId,
      requested_by: input.userId,
      export_type: input.exportType ?? 'company_full',
      status: 'queued',
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Export could not be queued')

  // Synchronous stub completion until worker service exists.
  await admin.from('data_export_jobs').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
  }).eq('id', data.id)

  await recordSecurityEvent({
    companyId: input.companyId,
    actorUserId: input.userId,
    eventType: 'data.export_requested',
    message: 'Company data export requested',
    severity: 'attention',
    metadata: { exportJobId: data.id, exportType: input.exportType ?? 'company_full' },
  })

  return {
    id: data.id,
    status: 'completed',
    exportType: data.export_type,
    message: 'Export recorded. Encrypted download delivery will be connected to object storage next.',
  }
}

export async function listRetentionPolicies(companyId: string) {
  const { data, error } = await admin
    .from('data_retention_policies')
    .select('*')
    .eq('company_id', companyId)
    .order('category')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    retentionDays: row.retention_days,
    legalHoldAllowed: row.legal_hold_allowed,
  }))
}

export async function listExportJobs(companyId: string) {
  const { data, error } = await admin
    .from('data_export_jobs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return expandCamel(data ?? [])
}

function expandCamel(rows: Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value,
      ]),
    ),
  )
}
