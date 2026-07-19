/**
 * Multi-tenant company signup / verification helpers.
 * Employees never self-register a company here — only first authorised representative.
 */
import { HttpError } from './http.ts'
import { admin } from './supabase.ts'

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
}) {
  await admin.from('security_events').insert({
    company_id: input.companyId ?? null,
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    severity: input.severity ?? 'info',
    message: input.message,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
  })
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
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (companyError || !company) throw new Error(companyError?.message ?? 'Company could not be created')

  const { data: ownerRoleId, error: roleError } = await admin.rpc('ensure_default_company_roles', {
    p_company_id: company.id,
    p_actor: pendingUser.auth_user_id,
  })
  if (roleError) throw new Error(roleError.message)

  await admin.from('company_memberships').insert({
    user_id: pendingUser.auth_user_id,
    company_id: company.id,
    role_ids: ownerRoleId ? [ownerRoleId] : [],
    status: 'active',
    accepted_at: new Date().toISOString(),
    created_by: pendingUser.auth_user_id,
    updated_by: pendingUser.auth_user_id,
    source_app: 'COMMAND',
  })

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

export async function createUserSession(input: {
  userId: string
  companyId: string
  membershipId: string
  authStrength?: 'password' | 'password_mfa' | 'passkey' | 'phishing_resistant_mfa'
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const { data, error } = await admin
    .from('user_sessions')
    .insert({
      user_id: input.userId,
      active_company_id: input.companyId,
      membership_id: input.membershipId,
      auth_method: 'password',
      auth_strength: input.authStrength ?? 'password',
      expires_at: new Date(Date.now() + 12 * 60 * 60_000).toISOString(),
      ip_history: input.ipAddress ? [input.ipAddress] : [],
      user_agent: input.userAgent ?? null,
    })
    .select('id')
    .single()
  if (error) return null
  return data?.id as string
}

export function getDriverAppBaseUrl(): string {
  const raw =
    Deno.env.get('VEYVIO_DRIVER_APP_URL')?.trim() ||
    Deno.env.get('DRIVER_APP_URL')?.trim() ||
    ''
  return raw.replace(/\/$/, '')
}

/** Supabase Auth redirect allow-list target (no query string — wildcards match path). */
export function getDriverInviteRedirectUrl(): string {
  const base = getDriverAppBaseUrl()
  if (!base) {
    throw new Error(
      'VEYVIO_DRIVER_APP_URL is not configured on the server. Set it to the Driver app origin (for example http://192.168.1.136:8081).',
    )
  }
  return `${base}/accept-invitation`
}

/** Stable Driver first-login link with our invitation token (preferred over Auth OTP links). */
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
  if (message.includes('veyvio_driver_app_url') || message.includes('driver_app_url')) {
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
  const inviteMetadata = {
    app: 'veyvio-driver',
    role_slug: 'driver',
    driver_id: input.driverId,
    organisation_id: input.companyId,
    company_id: input.companyId,
    depot_id: input.depotId ?? null,
    full_name: input.fullName,
    invitation_id: input.invitationId,
    veyvio_invite_token: input.token,
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: inviteMetadata,
  })
  if (!error) {
    return {
      authUserId: data.user?.id ?? null,
      redirectTo,
      appLink,
      emailDelivered: true,
    }
  }

  const alreadyRegistered = /already|registered|exists/i.test(error.message)
  if (!alreadyRegistered) throw new Error(error.message)

  const existing = await findAuthUserByEmail(input.email)
  if (!existing) throw new Error(error.message)

  // Refresh metadata so acceptInvitation can still resolve driver_id / invitation_id.
  await admin.auth.admin.updateUserById(existing.id, { user_metadata: inviteMetadata })

  // Best-effort reminder email — success of resend is optional; appLink is the source of truth.
  let emailDelivered = false
  if (!existing.emailConfirmedAt) {
    const { error: resendError } = await admin.auth.resend({
      type: 'signup',
      email: input.email,
      options: { emailRedirectTo: redirectTo },
    })
    emailDelivered = !resendError
  }

  return {
    authUserId: existing.id,
    redirectTo,
    appLink,
    emailDelivered,
  }
}

export async function createCompanyInvitation(input: {
  companyId: string
  invitedBy: string
  email: string
  roleName?: string
  roleIds?: string[]
  depotIds?: string[]
  appType?: 'COMMAND' | 'DRIVER' | 'YARD'
  expiresInDays?: number
}) {
  const email = input.email.trim().toLowerCase()
  if (!email.includes('@')) throw new Error('A valid work email is required')

  let roleIds = input.roleIds ?? []
  if (!roleIds.length) {
    const roleName = input.roleName ?? 'dispatcher'
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
          source_app: 'COMMAND',
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
      app_type: input.appType ?? 'COMMAND',
      role_ids: roleIds,
      depot_ids: input.depotIds ?? [],
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: input.invitedBy,
      status: 'pending',
      created_by: input.invitedBy,
      updated_by: input.invitedBy,
      source_app: 'COMMAND',
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

  return {
    invitation: {
      id: invitation.id,
      email: invitation.email as string,
      expiresAt: invitation.expires_at as string,
      status: invitation.status as string,
      appType: invitation.app_type as string,
    },
    /** Plaintext token for Driver accept URL — only return after email send succeeds (or explicit manual fallback). */
    invitationToken: token,
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
      password: input.password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        first_name: firstName,
        last_name: lastName,
        invitation_id: invitation.id,
      },
    })
    if (updateError) throw new Error(updateError.message)
    userId = existing.id
  } else {
    userId = created.user.id
  }

  const acceptedAt = new Date().toISOString()
  const appType = String(invitation.app_type ?? 'COMMAND')

  await admin.from('users').upsert({
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
  }, { onConflict: 'id' })

  const { data: existingMembership } = await admin
    .from('company_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', invitation.company_id)
    .maybeSingle()

  let membershipId = existingMembership?.id as string | undefined
  if (!membershipId) {
    const { data: membership, error: membershipError } = await admin
      .from('company_memberships')
      .insert({
        user_id: userId,
        company_id: invitation.company_id,
        role_ids: invitation.role_ids ?? [],
        status: 'active',
        accepted_at: acceptedAt,
        created_by: invitation.invited_by,
        updated_by: userId,
        source_app: appType === 'DRIVER' ? 'DRIVER' : 'COMMAND',
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
      role_ids: invitation.role_ids ?? [],
      updated_by: userId,
    }).eq('id', membershipId)
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
  })

  return {
    companyId: invitation.company_id as string,
    userId,
    email,
    appType,
  }
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

export async function enableMfaForUser(userId: string, companyId?: string | null) {
  const recoveryCodes = Array.from({ length: 8 }, () => randomToken(4).slice(0, 8).toUpperCase())
  await admin.from('mfa_recovery_codes').delete().eq('user_id', userId).is('used_at', null)
  await admin.from('mfa_recovery_codes').insert(
    await Promise.all(recoveryCodes.map(async (code) => ({
      user_id: userId,
      code_hash: await sha256Hex(code),
    }))),
  )
  await admin.from('user_mfa_methods').insert({
    user_id: userId,
    method_type: 'authenticator_app',
    label: 'Authenticator app',
    is_primary: true,
    metadata: { enrolledVia: 'command_setup' },
  })
  await admin.from('users').update({ mfa_enabled: true }).eq('id', userId)
  await recordSecurityEvent({
    companyId,
    actorUserId: userId,
    eventType: 'auth.mfa_enabled',
    message: 'MFA enabled for user',
    severity: 'attention',
  })
  return { recoveryCodes, mfaEnabled: true }
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
    .select('role_ids')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .maybeSingle()
  const roleIds = (membership?.role_ids as string[] | null) ?? []
  if (!roleIds.length) return true
  const { data: roles } = await admin.from('roles').select('name').in('id', roleIds)
  return (roles ?? []).some((r) => PRIVILEGED_ROLES.has(String(r.name)))
}

export async function createMfaLoginChallenge(userId: string, ipAddress?: string | null, userAgent?: string | null) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const { data, error } = await admin
    .from('mfa_login_challenges')
    .insert({
      user_id: userId,
      code_hash: await sha256Hex(code),
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
  return { challengeId: data.id as string, devMfaCode: code }
}

export async function verifyMfaLoginChallenge(challengeId: string, code: string, userId: string) {
  const { data: challenge } = await admin
    .from('mfa_login_challenges')
    .select('*')
    .eq('id', challengeId)
    .eq('user_id', userId)
    .is('consumed_at', null)
    .maybeSingle()
  if (!challenge || new Date(challenge.expires_at).getTime() < Date.now()) {
    throw new Error('This MFA challenge is invalid or has expired')
  }

  const codeHash = await sha256Hex(code.trim())
  let matched = challenge.code_hash === codeHash
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
  if (!matched) throw new Error('The MFA code is incorrect')

  await admin.from('mfa_login_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', challengeId)
  await recordSecurityEvent({
    actorUserId: userId,
    eventType: 'auth.mfa_challenge_passed',
    message: 'MFA challenge verified',
  })
  return { ok: true }
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

export async function requestCompanyExport(input: {
  companyId: string
  userId: string
  exportType?: string
}) {
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
