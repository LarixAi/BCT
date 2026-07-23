/**
 * Veyvio Command API — authorised Command projection over shared platform domains.
 * Writes reach shared tables (company-scoped). Driver/Yard APIs will project the same records later.
 */
import { apiError, corsHeaders, json, readJson, toApiErrorResponse, toCamelCase } from '../_shared/http.ts'
import {
  projectBookingList,
  projectDriverProfile,
  projectDuties,
  projectDutyTrack,
  projectOperationalTripByDuty,
  projectOperationalTrips,
  projectVehicleProfile,
  summariseDrivers,
  summariseVehicles,
  toOperationalPosition,
} from '../_shared/projections.ts'
import {
  attendanceAssignCover,
  attendanceClassify,
  attendanceCoverCandidates,
  attendanceHub,
  attendanceLeaveList,
  attendanceLeaveUpsert,
  attendanceProfile,
} from '../_shared/attendance.ts'
import {
  effectiveDocumentVerificationStatus,
  resolveProjectedDocumentExpiry,
} from '../_shared/document-verification.ts'
import {
  driverRequirementHistory,
  listDriverRequirements,
  patchDriverRequirement,
  requestDriverRequirements,
  syncDriverRequirementAfterDocumentRejected,
  syncDriverRequirementAfterDocumentVerified,
} from '../_shared/driver-requirements.ts'
import {
  listDriverTrainingCentre,
  updateDriverTrainingProgress,
} from '../_shared/driver-training-centre.ts'
import {
  adminDriverHolidayAccrue,
  adminDriverHolidayAdjust,
  adminDriverHolidayGet,
  adminDriverHolidayPatchProfile,
  driverHolidayBalance,
  driverHolidayListRequests,
  driverHolidaySubmitRequest,
} from '../_shared/holiday-balance.ts'
import {
  maybeReleaseDriverForActivationTraining,
  resolveDriverActivationPhase,
} from '../_shared/driver-activation-release.ts'
import {
  getDriverDeviceStatus,
  postDriverSecurityEvent,
  revokeDriverDevice as revokeDriverDeviceRecord,
  upsertDriverDevice,
} from '../_shared/driver-devices.ts'
import {
  DRIVER_ONBOARDING_NOTIFICATION,
  notifyCompanyAdmins,
} from '../_shared/notifications.ts'
import { seedDemoCompany } from '../_shared/seed-demo.ts'
import { resolveEntitlements } from '../_shared/entitlements.ts'
import {
  assertCompanyScopedDefect,
  assertCompanyScopedDriver,
  assertCompanyScopedDuty,
  assertCompanyScopedVehicle,
  moduleForApiPath,
  requireModule,
} from '../_shared/tenant-guards.ts'
import {
  companyEntitlements,
  platformAudit,
  platformBillingWebhook,
  platformCheckout,
  platformCompanies,
  platformCompanyDetail,
  platformFeatureFlags,
  platformHealth,
  platformPatchCompany,
  platformPatchFeatureFlag,
  platformPlans,
  platformSeedIsolation,
  platformSubscriptions,
  platformSupportGrant,
  platformSupportGrantRevoke,
  platformSupportGrantsAll,
  platformSupportGrantsList,
} from '../_shared/platform-admin.ts'
import { admin, authenticate, ensurePlatformUser, publicClient } from '../_shared/supabase.ts'
import {
  acceptCompanyContracts,
  acceptInvitation,
  completeCompanySetup,
  completePasswordReset,
  createCompanyInvitation,
  createMfaLoginChallenge,
  createSupportGrant,
  createUserSession,
  beginMfaForUser,
  confirmMfaForUser,
  findAuthUserByEmail,
  friendlyInviteError,
  listCompanyInvitations,
  listExportJobs,
  listRetentionPolicies,
  listSupportGrants,
  previewInvitation,
  recordSecurityEvent,
  requestCompanyExport,
  revokePendingDriverInvitations,
  sendDriverInvitationEmail,
  startCompanySignup,
  startPasswordReset,
  submitCompanyVerification,
  userNeedsMfaChallenge,
  verifyMfaLoginChallenge,
  verifySignupEmail,
} from '../_shared/tenant-auth.ts'
import {
  projectDefectsHub,
  projectFleetResourcesHub,
  projectIncidentsHub,
  projectInspectionsHub,
  projectMaintenanceHub,
} from '../_shared/hubs.ts'
import {
  acknowledgePublishedDuty,
  assignDuty,
  buildHomeSummaryFromDuties,
  createDraftDuty,
  projectPublishedDutiesForDriver,
  publishDuty,
  signOffPublishedDuty,
  signOnPublishedDuty,
} from '../_shared/duty-publication.ts'

type Row = Record<string, unknown>

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** Path segment → shared domain table. Missing Phase 3+ tables return empty lists. */
const LIST_RESOURCES: Record<string, string | null> = {
  announcements: null,
  audit: 'audit_events',
  bookings: 'bookings',
  contracts: 'contracts',
  'corrective-actions': null,
  customers: 'customers',
  defects: 'defects',
  depots: 'depots',
  drivers: 'drivers',
  duties: 'duties',
  incidents: 'incidents',
  inspections: null,
  integrations: null,
  handover: null,
  imports: null,
  maintenance: 'maintenance_work_orders',
  messages: 'messages',
  'message-templates': null,
  notifications: 'notifications',
  'operational-trips': 'trips',
  passengers: 'passengers',
  'passenger-assistants': 'staff_members',
  pricing: 'rate_cards',
  'risk-assessments': null,
  'recurring-transport': null,
  routes: null,
  runs: 'runs',
  schools: 'schools',
  staff: 'staff_members',
  trips: 'trips',
  users: 'company_memberships',
  vehicles: 'vehicles',
  'vehicle-checks': null,
  'yard-checks': null,
  exports: null,
  invitations: 'invitations',
  roles: 'roles',
  exceptions: 'operational_exceptions',
  'vor-cases': 'vor_cases',
}

function expandRow(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(expandRow)
  if (!value || typeof value !== 'object') return value
  const row = toCamelCase(value) as Row
  if (row.companyId && !row.tenantId) row.tenantId = row.companyId
  if (row.tradingName && !row.name) row.name = row.tradingName
  if (row.legalName && !row.name) row.name = row.legalName
  if (row.bookingReference && !row.reference) row.reference = row.bookingReference
  if (row.tripReference && !row.reference) row.reference = row.tripReference
  if (row.runReference && !row.reference) row.reference = row.runReference
  if (row.defectReference && !row.reference) row.reference = row.defectReference
  if (row.incidentReference && !row.reference) row.reference = row.incidentReference
  if (row.workOrderReference && !row.reference) row.reference = row.workOrderReference
  if (row.operationalStatus && !row.status) row.status = row.operationalStatus
  if (row.registration && !row.registrationNumber) row.registrationNumber = row.registration
  if (row.serviceDate && !row.dutyDate) row.dutyDate = row.serviceDate
  if (row.recipientUserId && !row.userId) row.userId = row.recipientUserId
  if (row.notificationType && !row.type) row.type = row.notificationType
  if (row.actionUrl && !row.link) row.link = row.actionUrl
  if (row.seatCapacity != null && row.seatingCapacity == null) row.seatingCapacity = row.seatCapacity
  return row
}

function routePath(request: Request) {
  const pathname = new URL(request.url).pathname
  const apiIndex = pathname.indexOf('/api/')
  if (apiIndex >= 0) return pathname.slice(apiIndex + 5).replace(/^\/+|\/+$/g, '')
  if (pathname.endsWith('/api')) return ''
  return pathname.split('/command-api/').pop()?.replace(/^\/+|\/+$/g, '') ?? ''
}

async function bootstrapFirstCompany(userId: string, email: string, companyName: string) {
  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      legal_name: companyName,
      trading_name: companyName,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (companyError || !company) throw new Error(companyError?.message ?? 'Company create failed')

  const { data: role, error: roleError } = await admin
    .from('roles')
    .insert({
      company_id: company.id,
      name: 'transport_manager',
      description: 'Full Command access for the company transport manager',
      is_system_role: true,
      created_by: userId,
      updated_by: userId,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (roleError || !role) throw new Error(roleError?.message ?? 'Role create failed')

  const { data: permissions } = await admin.from('permissions').select('code')
  if (permissions?.length) {
    await admin.from('role_permissions').insert(
      permissions.map((p: { code: string }) => ({
        role_id: role.id,
        permission_code: p.code,
        effect: 'allow',
      })),
    )
  }

  const { error: membershipError } = await admin.from('company_memberships').insert({
    user_id: userId,
    company_id: company.id,
    role_ids: [role.id],
    status: 'active',
    accepted_at: new Date().toISOString(),
    created_by: userId,
    updated_by: userId,
    source_app: 'COMMAND',
  })
  if (membershipError) throw new Error(membershipError.message)

  await admin.from('audit_events').insert({
    company_id: company.id,
    actor_type: 'user',
    actor_id: userId,
    action: 'company.bootstrapped',
    entity_type: 'company',
    entity_id: company.id,
    source_app: 'COMMAND',
    after_snapshot: { email, tradingName: companyName },
  })

  await seedDemoCompany(company.id as string, userId)
  return company.id as string
}

async function login(request: Request) {
  const input = await readJson<{ email?: string; password?: string }>(request)
  if (!input.email || !input.password) return apiError(400, 'Email and password are required', 'invalid_credentials')

  const client = publicClient()
  const { data, error } = await client.auth.signInWithPassword({ email: input.email, password: input.password })
  if (error || !data.session || !data.user) return apiError(401, 'Email or password is incorrect', 'invalid_credentials')

  await ensurePlatformUser(data.user)

  const { data: memberships, error: membershipsError } = await admin
    .from('company_memberships')
    .select('company_id, status, companies(trading_name, legal_name)')
    .eq('user_id', data.user.id)
    .eq('status', 'active')

  if (membershipsError) return apiError(500, 'Company access could not be loaded')

  const options = (memberships ?? []).map((membership: Row) => {
    const company = membership.companies as Row | null
    return {
      tenantId: membership.company_id,
      companyId: membership.company_id,
      tenantName: company?.trading_name ?? company?.legal_name ?? 'Company',
      role: 'member',
    }
  })

  if (options.length === 0) {
    const { count: companyCount } = await admin.from('companies').select('*', { count: 'exact', head: true })
    if ((companyCount ?? 0) === 0) {
      try {
        const companyName = String(data.user.user_metadata.company_name ?? 'Veyvio Transport')
        const companyId = await bootstrapFirstCompany(data.user.id, data.user.email ?? input.email, companyName)
        return activateCompany(data.user.id, companyId, data.session.refresh_token, request)
      } catch (bootstrapError) {
        return apiError(500, bootstrapError instanceof Error ? bootstrapError.message : 'First company could not be created')
      }
    }
  }

  const primaryCompanyId = options.length === 1 ? String(options[0].tenantId) : null
  if (await userNeedsMfaChallenge(data.user.id, primaryCompanyId)) {
    try {
      // The password-verified session is not handed to the client yet — it's
      // held server-side against the challenge and only exchanged for a real
      // session once the code is verified (see verifyMfa below).
      const challenge = await createMfaLoginChallenge(
        data.user.id,
        data.session.refresh_token,
        request.headers.get('x-forwarded-for'),
        request.headers.get('user-agent'),
      )
      return json({
        requiresMfaChallenge: true,
        mfaChallengeId: challenge.challengeId,
        devMfaCode: challenge.devMfaCode,
        requiresTenantSelection: options.length > 1,
        memberships: options.length > 1 ? options : undefined,
        pendingCompanyId: primaryCompanyId,
      })
    } catch (challengeError) {
      return apiError(500, challengeError instanceof Error ? challengeError.message : 'MFA challenge failed')
    }
  }

  if (options.length === 1) {
    return activateCompany(data.user.id, options[0].tenantId as string, data.session.refresh_token, request)
  }

  return json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    requiresTenantSelection: true,
    memberships: options,
  })
}

async function activateCompany(userId: string, companyId: string, refreshToken?: string | null, request?: Request) {
  const { data: membership } = await admin
    .from('company_memberships')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!membership) return apiError(403, 'You do not have access to this company', 'company_access_denied')
  if (!refreshToken) return apiError(400, 'A refresh token is required to select a company', 'refresh_token_required')

  const { data: company } = await admin
    .from('companies')
    .select('tenant_status, trading_name')
    .eq('id', companyId)
    .maybeSingle()

  const tenantStatus = company?.tenant_status ?? 'ACTIVE'
  if (['SUSPENDED', 'CLOSED', 'CLOSING'].includes(tenantStatus)) {
    return apiError(403, 'This company account is not available', 'company_unavailable')
  }

  const { data: existing } = await admin.auth.admin.getUserById(userId)
  const appMetadata = { ...(existing.user?.app_metadata ?? {}), active_company_id: companyId, active_tenant_id: companyId }
  const companyIds = new Set<string>([...(appMetadata.company_ids as string[] | undefined ?? []), companyId])
  appMetadata.company_ids = [...companyIds]

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { app_metadata: appMetadata })
  if (updateError) return apiError(500, 'Company context could not be selected')

  const { data: refreshed, error: refreshError } = await publicClient().auth.refreshSession({
    refresh_token: refreshToken,
  })
  if (refreshError || !refreshed.session) return apiError(401, 'Sign in again to select this company', 'session_refresh_failed')

  await createUserSession({
    userId,
    companyId,
    membershipId: membership.id as string,
    ipAddress: request?.headers.get('x-forwarded-for'),
    userAgent: request?.headers.get('user-agent'),
  })
  await recordSecurityEvent({
    companyId,
    actorUserId: userId,
    eventType: 'auth.company_selected',
    message: `Active company set to ${company?.trading_name ?? companyId}`,
    ipAddress: request?.headers.get('x-forwarded-for'),
    userAgent: request?.headers.get('user-agent'),
  })

  const user = await authUser(refreshed.user!, companyId)
  return json({
    accessToken: refreshed.session.access_token,
    refreshToken: refreshed.session.refresh_token,
    user,
  })
}

async function selectTenant(request: Request) {
  const context = await authenticate(request, false)
  const input = await readJson<{ tenantId?: string; companyId?: string; refreshToken?: string }>(request)
  const companyId = input.companyId ?? input.tenantId
  if (!companyId) return apiError(400, 'Company is required')
  return activateCompany(context.user.id, companyId, input.refreshToken, request)
}

async function authUser(
  user: { id: string; email?: string; app_metadata?: Row; user_metadata?: Row },
  companyId: string,
  extras?: {
    platformRole?: string | null
    entitlements?: Awaited<ReturnType<typeof resolveEntitlements>> | null
  },
) {
  const [{ data: profile }, { data: membership }, { data: company }] = await Promise.all([
    admin.from('users').select('*').eq('id', user.id).maybeSingle(),
    admin.from('company_memberships').select('role_ids').eq('company_id', companyId).eq('user_id', user.id).maybeSingle(),
    admin.from('companies').select('trading_name, legal_name, tenant_status').eq('id', companyId).maybeSingle(),
  ])

  const roleIds = (membership?.role_ids as string[] | null) ?? []
  let roleName: string | null = null
  let permissions: string[] = []
  if (roleIds.length) {
    const { data: roles } = await admin.from('roles').select('name').in('id', roleIds).limit(1)
    roleName = roles?.[0]?.name ?? null
    const { data: rolePerms } = await admin
      .from('role_permissions')
      .select('permission_code')
      .in('role_id', roleIds)
      .eq('effect', 'allow')
    permissions = (rolePerms ?? []).map((p: { permission_code: string }) => p.permission_code)
  }

  const entitlements = extras?.entitlements ?? (await resolveEntitlements(companyId))

  return {
    id: user.id,
    email: user.email ?? '',
    firstName: profile?.first_name ?? user.user_metadata?.first_name ?? '',
    lastName: profile?.last_name ?? user.user_metadata?.last_name ?? '',
    platformRole: extras?.platformRole ?? null,
    activeTenantId: companyId,
    activeCompanyId: companyId,
    tenantName: company?.trading_name ?? company?.legal_name ?? null,
    tenantStatus: entitlements.tenantStatus || company?.tenant_status || 'ACTIVE',
    mfaEnabled: Boolean(profile?.mfa_enabled),
    role: roleName,
    permissions,
    planCode: entitlements.planCode,
    subscriptionStatus: entitlements.subscriptionStatus,
    enabledModules: entitlements.enabledModules,
    usageLimits: entitlements.usageLimits,
  }
}

async function getMe(request: Request) {
  const context = await authenticate(request)
  return json(
    await authUser(context.user, context.companyId, {
      platformRole: context.platformRole,
      entitlements: context.entitlements,
    }),
  )
}

function formatDepotAddress(address: unknown): string {
  if (!address || typeof address !== 'object') return 'Address to be confirmed'
  const row = address as Row
  const parts = [row.line1, row.line2, row.city, row.postcode]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Address to be confirmed'
}

async function driverSession(request: Request) {
  const context = await authenticate(request)

  const { data: appAccount, error: accountError } = await admin
    .from('driver_app_accounts')
    .select('driver_id, account_status, membership_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (accountError) return apiError(500, 'Driver account could not be loaded')
  if (!appAccount?.driver_id) {
    return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  }

  const [{ data: driver }, { data: company }, { data: membership }] = await Promise.all([
    admin
      .from('drivers')
      .select(
        'id, onboarding_step, operational_status, staff_members(first_name, last_name, email, phone, date_of_birth, home_address, emergency_contact)',
      )
      .eq('id', appAccount.driver_id)
      .eq('company_id', context.companyId)
      .maybeSingle(),
    admin
      .from('companies')
      .select('trading_name, legal_name')
      .eq('id', context.companyId)
      .maybeSingle(),
    appAccount.membership_id
      ? admin.from('company_memberships').select('id').eq('id', appAccount.membership_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const staff = (driver?.staff_members as Row | null) ?? null
  const driverId = String(appAccount.driver_id)
  const operationalStatus = String(driver?.operational_status ?? 'draft')
  const onboardingStep = String(driver?.onboarding_step ?? '')

  // Resolve phase + depots in parallel — keep driver-session under client timeouts.
  const activationPhasePromise = resolveDriverActivationPhase(
    context.companyId,
    driverId,
    operationalStatus,
    onboardingStep,
  ).catch(() => 'active' as const)

  let depotRows: Row[] = []

  if (membership?.id) {
    const { data: accessRows } = await admin
      .from('depot_access')
      .select('depot_id, depots(id, company_id, name, code, address, status)')
      .eq('membership_id', membership.id)
    depotRows = (accessRows ?? [])
      .map((row: Row) => row.depots as Row | null)
      .filter((depot): depot is Row => Boolean(depot && depot.status !== 'archived'))
  }

  if (!depotRows.length) {
    const { data: companyDepots } = await admin
      .from('depots')
      .select('id, company_id, name, code, address, status')
      .eq('company_id', context.companyId)
      .neq('status', 'archived')
      .order('name')
    depotRows = companyDepots ?? []
  }

  const activationPhase = await activationPhasePromise

  // Non-blocking — do not delay the session response.
  void admin
    .from('driver_app_accounts')
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: context.user.id,
    })
    .eq('driver_id', appAccount.driver_id)
    .eq('company_id', context.companyId)

  return json({
    driverId,
    companyId: context.companyId,
    companyName: company?.trading_name ?? company?.legal_name ?? 'Company',
    role: 'driver',
    accountStatus: String(appAccount.account_status ?? 'active'),
    operationalStatus,
    onboardingStep,
    activationPhase,
    firstName: String(staff?.first_name ?? context.user.user_metadata?.first_name ?? ''),
    lastName: String(staff?.last_name ?? context.user.user_metadata?.last_name ?? ''),
    email: String(staff?.email ?? context.user.email ?? ''),
    mobile: staff?.phone ? String(staff.phone) : undefined,
    dateOfBirth: staff?.date_of_birth ? String(staff.date_of_birth).slice(0, 10) : undefined,
    homeAddress: staff?.home_address ? String(staff.home_address) : undefined,
    emergencyContact: staff?.emergency_contact ? String(staff.emergency_contact) : undefined,
    depots: depotRows.map((depot) => ({
      id: String(depot.id),
      companyId: String(depot.company_id ?? context.companyId),
      name: String(depot.name ?? 'Depot'),
      code: String(depot.code ?? ''),
      address: formatDepotAddress(depot.address),
    })),
  })
}

/** Map driver_app_accounts.account_status → Driver bootstrap accessStatus. */
function mapDriverBootstrapAccessStatus(status: unknown): string {
  const s = String(status ?? 'active')
  if (s === 'active' || s === 'pending_approval' || s === 'setup_incomplete') return 'active'
  if (s === 'compliance_restricted') return 'restricted'
  if (s === 'temporarily_suspended' || s === 'suspended' || s === 'locked') return 'suspended'
  if (s === 'offboarded' || s === 'archived' || s === 'disabled') return 'removed'
  if (s === 'invitation_pending' || s === 'draft') return 'inactive'
  return 'active'
}

/**
 * Driver offline bootstrap projection (schema v8).
 * First slice: identity + empty operational packs so first-login sync can complete.
 * Duty/run detail projection expands later from the same shared tables.
 */
async function driverBootstrap(request: Request) {
  const context = await authenticate(request)
  const requestedDepotId = new URL(request.url).searchParams.get('depotId')

  const { data: appAccount, error: accountError } = await admin
    .from('driver_app_accounts')
    .select('driver_id, account_status, membership_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (accountError) return apiError(500, 'Driver account could not be loaded')
  if (!appAccount?.driver_id) {
    return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  }

  const [{ data: driver }, { data: company }, { data: membership }] = await Promise.all([
    admin
      .from('drivers')
      .select('id, staff_members(first_name, last_name, email, phone)')
      .eq('id', appAccount.driver_id)
      .eq('company_id', context.companyId)
      .maybeSingle(),
    admin
      .from('companies')
      .select('trading_name, legal_name')
      .eq('id', context.companyId)
      .maybeSingle(),
    appAccount.membership_id
      ? admin.from('company_memberships').select('id').eq('id', appAccount.membership_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const staff = (driver?.staff_members as Row | null) ?? null
  let depotRows: Row[] = []

  if (membership?.id) {
    const { data: accessRows } = await admin
      .from('depot_access')
      .select('depot_id, depots(id, company_id, name, code, address, status)')
      .eq('membership_id', membership.id)
    depotRows = (accessRows ?? [])
      .map((row: Row) => row.depots as Row | null)
      .filter((depot): depot is Row => Boolean(depot && depot.status !== 'archived'))
  }

  if (!depotRows.length) {
    const { data: companyDepots } = await admin
      .from('depots')
      .select('id, company_id, name, code, address, status')
      .eq('company_id', context.companyId)
      .neq('status', 'archived')
      .order('name')
    depotRows = companyDepots ?? []
  }

  if (!depotRows.length) {
    return apiError(403, 'No depot is available for your Driver account.', 'forbidden')
  }

  const depotIds = depotRows.map((depot) => String(depot.id))
  const activeDepot =
    (requestedDepotId && depotRows.find((depot) => String(depot.id) === requestedDepotId)) ||
    depotRows[0]

  if (requestedDepotId && String(activeDepot.id) !== requestedDepotId) {
    return apiError(403, 'This depot is not available for your Driver account.', 'forbidden')
  }

  const companyName = String(company?.trading_name ?? company?.legal_name ?? 'Company')
  const depotId = String(activeDepot.id)
  const depotName = String(activeDepot.name ?? 'Depot')
  const depotCode = activeDepot.code ? String(activeDepot.code) : undefined
  const driverId = String(appAccount.driver_id)
  const firstName = String(staff?.first_name ?? context.user.user_metadata?.first_name ?? '')
  const lastName = String(staff?.last_name ?? context.user.user_metadata?.last_name ?? '')
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Driver'
  const email = String(staff?.email ?? context.user.email ?? '')
  const serverTime = new Date().toISOString()
  const accessStatus = mapDriverBootstrapAccessStatus(appAccount.account_status)

  let publishedDuties: Row[] = []
  try {
    publishedDuties = await projectPublishedDutiesForDriver({
      companyId: context.companyId,
      driverId,
      depotId,
    })
  } catch (error) {
    console.error('Published duty projection failed', error)
    publishedDuties = []
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  let todayCheckRows: Row[] = []
  try {
    const { data, error: checksError } = await admin
      .from('vehicle_checks')
      .select(
        'id, vehicle_id, duty_id, check_type, result, ops_outcome, odometer, fuel_level, started_at, submitted_at, checklist, evidence, vehicles(registration)',
      )
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .gte('submitted_at', todayStart.toISOString())
      .order('submitted_at', { ascending: false })
      .limit(25)
    if (checksError) console.error('vehicle_checks bootstrap query failed', checksError.message)
    else todayCheckRows = (data ?? []) as Row[]
  } catch (error) {
    console.error('vehicle_checks bootstrap query failed', error)
  }

  const vehicleChecks = todayCheckRows.map((row: Row) => mapDriverVehicleCheckRow(row))
  const latestCheckByVehicle = new Map<string, Row>()
  for (const check of vehicleChecks) {
    const vehicleId = String(check.vehicleId ?? '')
    if (vehicleId && !latestCheckByVehicle.has(vehicleId)) {
      latestCheckByVehicle.set(vehicleId, check)
    }
  }

  publishedDuties = publishedDuties.map((duty) => {
    const vehicle = duty.vehicle as Row | undefined
    const vehicleId = vehicle?.id ? String(vehicle.id) : ''
    const check = vehicleId ? latestCheckByVehicle.get(vehicleId) : undefined
    const result = check ? String(check.result ?? '') : ''
    const complete = result === 'pass' || result === 'passed' || result === 'nil_defect' || result === 'pass_with_advisory'
    const failed = result === 'fail' || result === 'failed'
    return {
      ...duty,
      vehicleCheck: {
        ...(duty.vehicleCheck as Row | undefined),
        status: complete ? 'complete' : failed ? 'failed' : 'not_started',
        canStartDuty: complete && !failed,
        pendingManagerAdvice: failed,
        checklist: (check?.checklist as Row | undefined) ?? {},
        vehicleId: vehicleId || undefined,
        checkId: check?.id,
        result: check?.result,
        submittedAt: check?.submittedAt,
      },
      vehicleVerified: complete,
    }
  })

  const homeSummary = buildHomeSummaryFromDuties({
    driverId,
    displayName,
    companyName,
    depotName,
    duties: publishedDuties,
    serverTime,
    accessStatus,
  })

  if (homeSummary.vehicleAssignment) {
    const assignedId = String(homeSummary.vehicleAssignment.vehicleId ?? '')
    const check = assignedId ? latestCheckByVehicle.get(assignedId) : undefined
    const result = check ? String(check.result ?? '') : ''
    const complete = result === 'pass' || result === 'passed' || result === 'nil_defect' || result === 'pass_with_advisory'
    homeSummary.vehicleAssignment = {
      ...homeSummary.vehicleAssignment,
      checkStatus: complete ? 'complete' : check ? 'failed' : 'required',
    }
  }

  return json({
    schemaVersion: 8,
    serverTime,
    syncCursor: `platform_${context.companyId}_${depotId}_${Date.now()}`,
    authoritySource: 'platform',
    identity: {
      userId: context.user.id,
      driverId,
      companyId: context.companyId,
      depotIds,
      activeDepotId: depotId,
      accessStatus,
    },
    entitlements: {
      planCode: context.entitlements?.planCode ?? null,
      subscriptionStatus: context.entitlements?.subscriptionStatus ?? null,
      enabledModules: context.entitlements?.enabledModules ?? [],
      tenantStatus: context.entitlements?.tenantStatus ?? context.tenantStatus ?? null,
      usageLimits: context.entitlements?.usageLimits ?? {},
    },
    operator: {
      companyId: context.companyId,
      companyName,
      depotId,
      depotName,
      depotCode,
    },
    driver: {
      driverId,
      displayName,
      email: email || undefined,
    },
    duties: publishedDuties,
    vehicleChecks,
    messages: await projectDriverMessagesInbox({
      companyId: context.companyId,
      driverId,
      userId: context.user.id,
    }),
    requiredActions: homeSummary.requiredActions ?? [],
    eligibility: {
      allowed: accessStatus === 'active' || accessStatus === 'restricted',
      evaluatedAt: serverTime,
      blockers: [],
      warnings: [],
    },
    unresolvedIncidents: [],
    featurePolicy: {
      offlineBootstrapAllowed: true,
      maxBootstrapCacheAgeHours: 24,
      maxSafetySensitiveCacheAgeHours: 8,
    },
    legacy: {
      homeSummary,
      tripsSchedule: {
        operationalAlerts: [],
        today: publishedDuties.map((duty) => ({
          id: String(duty.id),
          dutyId: String(duty.id),
          reference: String(duty.reference ?? ''),
          assignmentType: 'duty',
          status:
            String(duty.lifecycleStatus) === 'acknowledged' ||
            String(duty.lifecycleStatus) === 'ready' ||
            String(duty.lifecycleStatus) === 'in_progress'
              ? 'acknowledged'
              : 'assigned',
          scheduledDate: String(duty.dutyDate),
          scheduledStart: String(duty.startTime ?? ''),
          scheduledEnd: String(duty.endTime ?? ''),
          origin: String(duty.reportingLocation ?? depotName),
          destination: String(duty.routeName ?? ''),
          runName: String(duty.routeName ?? ''),
          vehicleRegistration: (duty.vehicle as Row | undefined)?.registrationNumber
            ? String((duty.vehicle as Row).registrationNumber)
            : undefined,
          primaryActionLabel:
            String(duty.lifecycleStatus) === 'published' ||
            String(duty.lifecycleStatus) === 'delivered' ||
            String(duty.lifecycleStatus) === 'viewed'
              ? 'Acknowledge duty'
              : String(duty.lifecycleStatus) === 'in_progress'
                ? 'On duty'
                : 'Sign on',
          primaryActionHref: '/duty',
        })),
        upcoming: {},
        completed: {},
      },
      messagesInbox: await projectDriverMessagesInbox({
        companyId: context.companyId,
        driverId,
        userId: context.user.id,
      }),
      documentWarnings: [],
      legacyMessages: [],
    },
  })
}

async function driverAcknowledgeDuty(request: Request, dutyId: string) {
  const context = await authenticate(request)
  const { data: appAccount, error: accountError } = await admin
    .from('driver_app_accounts')
    .select('driver_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()

  if (accountError) return apiError(500, 'Driver account could not be loaded')
  if (!appAccount?.driver_id) {
    return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  }

  const body = await readJson<{ deviceId?: string }>(request).catch(() => ({} as { deviceId?: string }))
  return acknowledgePublishedDuty(
    context,
    dutyId,
    String(appAccount.driver_id),
    body.deviceId ?? null,
  )
}

async function driverSignOnDuty(request: Request, dutyId: string) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const body = await readJson<{ deviceId?: string }>(request).catch(() => ({} as { deviceId?: string }))
  return signOnPublishedDuty(context, dutyId, String(resolved.appAccount!.driver_id), body.deviceId ?? null)
}

async function driverSignOffDuty(request: Request, dutyId: string) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const body = await readJson<{ deviceId?: string }>(request).catch(() => ({} as { deviceId?: string }))
  return signOffPublishedDuty(context, dutyId, String(resolved.appAccount!.driver_id), body.deviceId ?? null)
}

async function projectDriverMessagesInbox(input: { companyId: string; driverId: string; userId: string }) {
  try {
    const { data, error } = await admin
      .from('messages')
      .select('id, conversation_id, subject, body, sent_at, read_at, sender_id, source_app, status, audience')
      .eq('company_id', input.companyId)
      .eq('driver_id', input.driverId)
      .order('sent_at', { ascending: false })
      .limit(100)
    if (error) {
      console.error('messages inbox projection failed', error.message)
      return { unreadTotal: 0, conversations: [] as Row[] }
    }

    const byConversation = new Map<string, Row[]>()
    for (const row of data ?? []) {
      const key = String(row.conversation_id ?? row.id)
      const list = byConversation.get(key) ?? []
      list.push(row as Row)
      byConversation.set(key, list)
    }

    const conversations = [...byConversation.entries()].map(([id, rows]) => {
      const latest = rows[0]
      const unreadCount = rows.filter(
        (r) => !r.read_at && String(r.sender_id ?? '') !== input.userId,
      ).length
      return {
        id,
        title: String(latest.subject ?? 'Ops notice'),
        subject: latest.subject ? String(latest.subject) : 'Ops notice',
        preview: String(latest.body ?? '').slice(0, 160),
        body: String(latest.body ?? ''),
        updatedAt: String(latest.sent_at ?? ''),
        unreadCount,
        audience: normalizeMessageAudience(latest.audience),
        requiresAck: false,
      }
    })

    return {
      unreadTotal: conversations.reduce((sum, c) => sum + Number(c.unreadCount ?? 0), 0),
      conversations,
    }
  } catch (error) {
    console.error('messages inbox projection failed', error)
    return { unreadTotal: 0, conversations: [] as Row[] }
  }
}


async function driverUpdateOnboardingProfile(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const phone = String(input.phone ?? '').trim()
  if (!phone) return apiError(400, 'Please enter your phone number.')

  let dateOfBirth: string | null = null
  if (input.dateOfBirth != null && String(input.dateOfBirth).trim()) {
    const raw = String(input.dateOfBirth).trim()
    // Accept YYYY-MM-DD or DD/MM/YYYY from mobile date controls.
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : (() => {
          const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
          if (!m) return null
          return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
        })()
    if (!iso) return apiError(400, 'Enter your date of birth as a valid date.')
    dateOfBirth = iso
  }

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id, staff_id, onboarding_step, operational_status, status, staff_members(id, phone, date_of_birth)')
    .eq('company_id', context.companyId)
    .eq('id', appAccount.driver_id)
    .maybeSingle()
  if (driverError || !driver) return apiError(404, driverError?.message ?? 'Driver not found')

  const staff = (driver.staff_members as Row | null) ?? null
  const staffId = staff?.id ?? driver.staff_id
  if (!staffId) return apiError(400, 'Driver staff profile is missing. Ask your transport manager to fix your account.')

  const now = new Date().toISOString()
  const { error: staffError } = await admin
    .from('staff_members')
    .update({
      phone,
      date_of_birth: dateOfBirth,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', staffId)
    .eq('company_id', context.companyId)
  if (staffError) return apiError(400, staffError.message)

  const currentStep = String(driver.onboarding_step ?? 'personal')
  // Admin wizard steps: personal → employment → documents → …
  const nextStep = currentStep === 'personal' || currentStep === '' ? 'employment' : currentStep
  const operationalStatus =
    String(driver.operational_status ?? driver.status) === 'draft' ? 'onboarding' : driver.operational_status

  const { error: driverUpdateError } = await admin
    .from('drivers')
    .update({
      onboarding_step: nextStep,
      operational_status: operationalStatus,
      status:
        operationalStatus === 'onboarding' || operationalStatus === 'pending_compliance'
          ? 'onboarding'
          : driver.status,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', driver.id)
    .eq('company_id', context.companyId)
  if (driverUpdateError) return apiError(400, driverUpdateError.message)

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.onboarding_profile_updated',
    String(driver.id),
    {
      phone: staff?.phone ?? null,
      dateOfBirth: staff?.date_of_birth ?? null,
      onboardingStep: currentStep,
    },
    {
      phone,
      dateOfBirth,
      onboardingStep: nextStep,
    },
    'Driver updated personal profile in the Driver app',
  )

  return json({
    ok: true,
    phone,
    dateOfBirth,
    onboardingStep: nextStep,
  })
}

async function upsertDriverOnboardingRequirement(
  companyId: string,
  driverId: string,
  userId: string,
  definitionKey: string,
  requirementType: string,
  internalNote: string | null,
) {
  const now = new Date().toISOString()
  await admin.from('driver_requirements').upsert(
    {
      company_id: companyId,
      driver_id: driverId,
      definition_key: definitionKey,
      requirement_type: requirementType,
      status_override: 'submitted',
      internal_note: internalNote,
      updated_at: now,
      updated_by: userId,
      created_by: userId,
    },
    { onConflict: 'driver_id,definition_key' },
  )
}

async function driverUpdateOnboardingContact(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const line1 = String(input.addressLine1 ?? '').trim()
  const city = String(input.addressCity ?? '').trim()
  const postcode = String(input.addressPostcode ?? '').trim()
  if (!line1 || !city || !postcode) {
    return apiError(400, 'Enter your full home address (line, city and postcode).')
  }

  const contactName = String(input.contactName ?? '').trim()
  const relationship = String(input.relationship ?? '').trim()
  const emergencyPhone = String(input.emergencyPhone ?? input.phone ?? '').trim()
  if (!contactName) return apiError(400, 'Enter your emergency contact’s name.')
  if (!relationship) return apiError(400, 'Enter how this person is related to you.')
  if (!emergencyPhone) return apiError(400, 'Enter an emergency contact phone number.')

  const homeAddress = [line1, city, postcode].filter(Boolean).join(', ')
  const secondary = String(input.emergencySecondaryPhone ?? '').trim()
  const emergencyLines = [
    `Name: ${contactName}`,
    `Relationship: ${relationship}`,
    `Phone: ${emergencyPhone}`,
  ]
  if (secondary) emergencyLines.push(`Secondary: ${secondary}`)
  const emergencyContact = emergencyLines.join('\n')

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id, staff_id, onboarding_step, operational_status, status, staff_members(id)')
    .eq('company_id', context.companyId)
    .eq('id', appAccount.driver_id)
    .maybeSingle()
  if (driverError || !driver) return apiError(404, driverError?.message ?? 'Driver not found')

  const staff = (driver.staff_members as Row | null) ?? null
  const staffId = staff?.id ?? driver.staff_id
  if (!staffId) return apiError(400, 'Driver staff profile is missing. Ask your transport manager to fix your account.')

  const now = new Date().toISOString()
  const { error: staffError } = await admin
    .from('staff_members')
    .update({
      home_address: homeAddress,
      emergency_contact: emergencyContact,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', staffId)
    .eq('company_id', context.companyId)
  if (staffError) return apiError(400, staffError.message)

  const currentStep = String(driver.onboarding_step ?? 'personal')
  const nextStep =
    currentStep === 'personal' || currentStep === 'employment' || currentStep === ''
      ? 'documents'
      : currentStep
  const operationalStatus =
    String(driver.operational_status ?? driver.status) === 'draft' ? 'onboarding' : driver.operational_status

  const { error: driverUpdateError } = await admin
    .from('drivers')
    .update({
      onboarding_step: nextStep,
      operational_status: operationalStatus,
      status:
        operationalStatus === 'onboarding' || operationalStatus === 'pending_compliance'
          ? 'onboarding'
          : driver.status,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', driver.id)
    .eq('company_id', context.companyId)
  if (driverUpdateError) return apiError(400, driverUpdateError.message)

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.onboarding_contact_updated',
    String(driver.id),
    null,
    { homeAddress, emergencyContact, onboardingStep: nextStep },
    'Driver updated home address and emergency contact in the Driver app',
  )

  return json({ ok: true, homeAddress, emergencyContact, onboardingStep: nextStep })
}

const DRIVER_ONBOARDING_STEP_ORDER = [
  'personal_profile',
  'emergency_contact',
  'right_to_work',
  'driving_licence',
  'dvla_check',
  'dqc_cpc',
  'tacho_card',
  'dbs_safeguarding',
  'medical_declaration',
  'driver_handbook',
  'vehicle_check_training',
  'defect_policy',
  'review_submit',
] as const

function parseRequirementInternalNote(note: unknown): Row {
  if (!note) return {}
  if (typeof note === 'object' && note !== null) return note as Row
  try {
    return JSON.parse(String(note)) as Row
  } catch {
    return {}
  }
}

function requirementKeysToCompletedSteps(keys: Set<string>, driver: Row): Set<string> {
  const completed = new Set<string>()
  const submitted = (key: string) => keys.has(key)

  if (submitted('right_to_work')) completed.add('right_to_work')
  if (submitted('driving_licence') || (submitted('licence_front') && submitted('licence_back'))) {
    completed.add('driving_licence')
  }
  if (submitted('dvla_check')) completed.add('dvla_check')
  if (submitted('dqc')) completed.add('dqc_cpc')
  if (submitted('tachograph')) completed.add('tacho_card')
  if (submitted('dbs')) completed.add('dbs_safeguarding')
  if (submitted('medical')) completed.add('medical_declaration')
  if (submitted('vehicle_check_training')) completed.add('vehicle_check_training')
  if (submitted('driver_handbook')) completed.add('driver_handbook')
  if (submitted('defect_policy') || submitted('incident_policy')) completed.add('defect_policy')
  if (submitted('review_submit')) completed.add('review_submit')

  if (driver.licence_expiry_date) completed.add('driving_licence')
  if (driver.dqc_number && driver.cpc_expiry_date) completed.add('dqc_cpc')
  if (driver.tacho_card_number && driver.tacho_card_expiry) completed.add('tacho_card')
  if (driver.dbs_expiry_date) completed.add('dbs_safeguarding')

  return completed
}

async function driverOnboardingProgress(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const driverId = String(resolved.appAccount!.driver_id)

  const [{ data: driver }, { data: requirements }, { data: documents }, { data: auditRows }] =
    await Promise.all([
      admin
        .from('drivers')
        .select(
          'id, onboarding_step, licence_expiry_date, licence_categories, dqc_number, cpc_expiry_date, dbs_expiry_date, tacho_card_number, tacho_card_expiry, staff_members(phone, date_of_birth, home_address, emergency_contact, first_name, last_name, email)',
        )
        .eq('company_id', context.companyId)
        .eq('id', driverId)
        .maybeSingle(),
      admin
        .from('driver_requirements')
        .select('definition_key, status_override, internal_note')
        .eq('company_id', context.companyId)
        .eq('driver_id', driverId),
      admin
        .from('driver_documents')
        .select('requirement_type, verification_status, file_object_id, file_name, created_at')
        .eq('company_id', context.companyId)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false }),
      admin
        .from('audit_events')
        .select('action, after_snapshot, occurred_at')
        .eq('company_id', context.companyId)
        .eq('entity_type', 'driver')
        .eq('entity_id', driverId)
        .like('action', 'driver.onboarding%')
        .order('occurred_at', { ascending: false })
        .limit(80),
    ])

  if (!driver) return apiError(404, 'Driver not found')

  const staff = (driver.staff_members as Row | null) ?? {}
  const submittedReqKeys = new Set<string>()
  const formFromRequirements: Row = {}

  for (const row of requirements ?? []) {
    const key = String(row.definition_key ?? '')
    const override = String(row.status_override ?? '')
    if (override === 'submitted' || override === 'approved' || override === 'verified') {
      submittedReqKeys.add(key)
    }
    const note = parseRequirementInternalNote(row.internal_note)
    if (key === 'dvla_check' && note.dvlaCheckCode) {
      formFromRequirements.dvlaCheckCode = String(note.dvlaCheckCode)
    }
    if (key === 'driving_licence' && note.penaltyPoints != null) {
      formFromRequirements.penaltyPoints = String(note.penaltyPoints)
    }
    if (key === 'medical') {
      if (note.fitToDrive != null) formFromRequirements.fitToDrive = Boolean(note.fitToDrive)
      if (note.eyesight != null) formFromRequirements.eyesight = Boolean(note.eyesight)
      if (note.fatigueAccepted != null) formFromRequirements.fatigueAccepted = Boolean(note.fatigueAccepted)
    }
  }

  const completedStepKeys = requirementKeysToCompletedSteps(submittedReqKeys, driver as Row)

  for (const event of auditRows ?? []) {
    const action = String(event.action ?? '')
    const after = (event.after_snapshot as Row | null) ?? {}
    if (action === 'driver.onboarding_profile_updated') completedStepKeys.add('personal_profile')
    if (action === 'driver.onboarding_contact_updated') completedStepKeys.add('emergency_contact')
    if (action === 'driver.onboarding_step_completed' && after.stepKey) {
      completedStepKeys.add(String(after.stepKey))
    }
    if (action === 'driver.onboarding_submitted') completedStepKeys.add('review_submit')
  }

  const phone = staff.phone ? String(staff.phone) : ''
  const dateOfBirth = staff.date_of_birth ? String(staff.date_of_birth).slice(0, 10) : ''
  if (phone.trim() && dateOfBirth) completedStepKeys.add('personal_profile')
  if (staff.home_address && staff.emergency_contact) completedStepKeys.add('emergency_contact')

  for (const doc of documents ?? []) {
    const type = String(doc.requirement_type ?? '')
    const hasFile = Boolean(doc.file_object_id)
    const status = String(doc.verification_status ?? '')
    if (!hasFile && !['awaiting_review', 'verified', 'uploaded'].includes(status)) continue
    if (type === 'right_to_work') completedStepKeys.add('right_to_work')
    if (type === 'driving_licence' || type === 'licence') completedStepKeys.add('driving_licence')
    if (type === 'dqc' || type === 'cpc') completedStepKeys.add('dqc_cpc')
    if (type === 'dbs') completedStepKeys.add('dbs_safeguarding')
    if (type === 'medical') completedStepKeys.add('medical_declaration')
  }

  const nextStepKey =
    DRIVER_ONBOARDING_STEP_ORDER.find((key) => !completedStepKeys.has(key)) ?? 'review_submit'

  return json({
    onboardingStep: String(driver.onboarding_step ?? nextStepKey),
    suggestedNextStepKey: nextStepKey,
    completedStepKeys: [...completedStepKeys],
    submittedRequirementKeys: [...submittedReqKeys],
    form: {
      phone,
      dateOfBirth,
      licenceExpiry: driver.licence_expiry_date ? String(driver.licence_expiry_date).slice(0, 10) : '',
      licenceCategories: driver.licence_categories ? String(driver.licence_categories) : '',
      licenceOnFile: Boolean(driver.licence_expiry_date),
      dqcNumber: driver.dqc_number ? String(driver.dqc_number) : '',
      cpcExpiry: driver.cpc_expiry_date ? String(driver.cpc_expiry_date).slice(0, 10) : '',
      dbsExpiry: driver.dbs_expiry_date ? String(driver.dbs_expiry_date).slice(0, 10) : '',
      tachoCardNumber: driver.tacho_card_number ? String(driver.tacho_card_number) : '',
      tachoCardExpiry: driver.tacho_card_expiry ? String(driver.tacho_card_expiry).slice(0, 10) : '',
      ...formFromRequirements,
    },
    documents: (documents ?? []).map((d) => ({
      requirementType: String(d.requirement_type ?? ''),
      verificationStatus: String(d.verification_status ?? ''),
      hasFile: Boolean(d.file_object_id),
      fileName: d.file_name ? String(d.file_name) : null,
    })),
  })
}

async function driverUpdateOnboardingStep(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const stepKey = String(input.stepKey ?? '').trim()
  if (!stepKey) return apiError(400, 'Onboarding step is missing.')

  const driverId = String(appAccount.driver_id)
  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id, onboarding_step, operational_status, status')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (driverError || !driver) return apiError(404, driverError?.message ?? 'Driver not found')

  const now = new Date().toISOString()
  const driverPatch: Row = { updated_at: now, updated_by: context.user.id }

  if (stepKey === 'driving_licence') {
    const licenceNumber = String(input.licenceNumber ?? '').trim()
    const licenceExpiry = String(input.licenceExpiry ?? '').trim()
    if (!licenceNumber) return apiError(400, 'Please enter your driving licence number.')
    if (!licenceExpiry) return apiError(400, 'Please enter your licence expiry date.')
    driverPatch.licence_number_encrypted = licenceNumber
    driverPatch.licence_expiry_date = licenceExpiry
    driverPatch.licence_categories = input.licenceCategories ? String(input.licenceCategories).trim() : null
    const penalty =
      input.penaltyPoints != null && String(input.penaltyPoints).trim() !== ''
        ? Number(input.penaltyPoints)
        : null
    await upsertDriverOnboardingRequirement(
      context.companyId,
      driverId,
      context.user.id,
      'driving_licence',
      'document',
      penalty != null && !Number.isNaN(penalty) ? JSON.stringify({ penaltyPoints: penalty }) : null,
    )
  } else if (stepKey === 'dvla_check') {
    const code = String(input.dvlaCheckCode ?? '').trim()
    if (!code) return apiError(400, 'Enter your DVLA check code.')
    await upsertDriverOnboardingRequirement(
      context.companyId,
      driverId,
      context.user.id,
      'dvla_check',
      'compliance',
      JSON.stringify({ dvlaCheckCode: code }),
    )
  } else if (stepKey === 'tacho_card') {
    driverPatch.tacho_card_number = input.tachoCardNumber ? String(input.tachoCardNumber).trim() : null
    driverPatch.tacho_card_expiry = input.tachoCardExpiry ? String(input.tachoCardExpiry).trim() : null
    await upsertDriverOnboardingRequirement(context.companyId, driverId, context.user.id, 'tachograph', 'document', null)
  } else if (stepKey === 'dqc_cpc') {
    const dqcNumber = String(input.dqcNumber ?? '').trim()
    const cpcExpiry = String(input.cpcExpiry ?? '').trim()
    if (!dqcNumber) return apiError(400, 'Please enter your DQC number.')
    if (!cpcExpiry) return apiError(400, 'Please enter your DQC / CPC expiry date.')
    driverPatch.dqc_number = dqcNumber
    driverPatch.cpc_expiry_date = cpcExpiry
    await upsertDriverOnboardingRequirement(context.companyId, driverId, context.user.id, 'dqc', 'document', null)
  } else if (stepKey === 'dbs_safeguarding') {
    const dbsExpiry = String(input.dbsExpiry ?? '').trim()
    if (!dbsExpiry) return apiError(400, 'Please enter your DBS certificate expiry date.')
    driverPatch.dbs_expiry_date = dbsExpiry
    await upsertDriverOnboardingRequirement(context.companyId, driverId, context.user.id, 'dbs', 'document', null)
  } else if (stepKey === 'medical_declaration') {
    if (!input.fitToDrive || !input.eyesight || !input.fatigueAccepted) {
      return apiError(400, 'Please confirm all medical declarations before continuing.')
    }
    await upsertDriverOnboardingRequirement(
      context.companyId,
      driverId,
      context.user.id,
      'medical',
      'compliance',
      JSON.stringify({
        fitToDrive: Boolean(input.fitToDrive),
        eyesight: Boolean(input.eyesight),
        fatigueAccepted: Boolean(input.fatigueAccepted),
        signedAt: now,
        source: 'driver_mobile',
      }),
    )
  } else if (stepKey === 'right_to_work') {
    await upsertDriverOnboardingRequirement(
      context.companyId,
      driverId,
      context.user.id,
      'right_to_work',
      'document',
      null,
    )
  } else if (stepKey === 'vehicle_check_training') {
    await upsertDriverOnboardingRequirement(
      context.companyId,
      driverId,
      context.user.id,
      'vehicle_check_training',
      'training',
      JSON.stringify({ completedAt: now, source: 'driver_mobile' }),
    )
  } else if (stepKey === 'policies' || stepKey === 'driver_handbook' || stepKey === 'defect_policy') {
    const keys = Array.isArray(input.policyKeys)
      ? input.policyKeys.map(String)
      : stepKey === 'defect_policy'
        ? ['defect_policy', 'incident_policy']
        : ['driver_handbook']
    for (const policyKey of keys) {
      await upsertDriverOnboardingRequirement(
        context.companyId,
        driverId,
        context.user.id,
        policyKey,
        'training',
        JSON.stringify({ acceptedAt: now, source: 'driver_mobile' }),
      )
    }
  } else {
    return apiError(400, `This onboarding step cannot be saved yet (${stepKey}).`)
  }

  if (Object.keys(driverPatch).length > 2) {
    const { error: updateError } = await admin
      .from('drivers')
      .update(driverPatch)
      .eq('id', driverId)
      .eq('company_id', context.companyId)
    if (updateError) return apiError(400, updateError.message)
  }

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.onboarding_step_completed',
    driverId,
    { stepKey },
    { stepKey, savedAt: now },
    `Driver completed ${stepKey.replace(/_/g, ' ')} in the Driver app`,
  )

  return json({ ok: true, stepKey })
}

async function driverSubmitOnboardingForReview(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const driverId = String(appAccount.driver_id)
  const now = new Date().toISOString()

  const { error: updateError } = await admin
    .from('drivers')
    .update({
      onboarding_step: 'review',
      operational_status: 'pending_compliance',
      status: 'onboarding',
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('id', driverId)
    .eq('company_id', context.companyId)
  if (updateError) return apiError(400, updateError.message)

  await upsertDriverOnboardingRequirement(
    context.companyId,
    driverId,
    context.user.id,
    'review_submit',
    'compliance',
    JSON.stringify({ submittedAt: now, source: 'driver_mobile' }),
  )

  const { data: staff } = await admin
    .from('drivers')
    .select('staff_members(first_name, last_name)')
    .eq('id', driverId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  const member = (staff?.staff_members as Row | null) ?? {}
  const driverName =
    [member.first_name, member.last_name].filter(Boolean).join(' ').trim() || 'A driver'

  await notifyCompanyAdmins({
    companyId: context.companyId,
    type: DRIVER_ONBOARDING_NOTIFICATION.evidenceSubmitted,
    title: 'Driver onboarding ready for review',
    body: `${driverName} submitted their profile for admin review.`,
    severity: 'attention',
    actionUrl: `/drivers/${driverId}?tab=Overview`,
    sourceEntityId: driverId,
  })

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.onboarding_submitted',
    driverId,
    null,
    { submittedAt: now },
    'Driver submitted onboarding for admin review',
  )

  return json({ ok: true, submittedAt: now })
}

async function resolveDriverAppAccount(context: Awaited<ReturnType<typeof authenticate>>) {
  const { data: appAccount, error } = await admin
    .from('driver_app_accounts')
    .select('driver_id, membership_id')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (error) return { error: apiError(500, 'Driver account could not be loaded') }
  if (!appAccount?.driver_id) {
    return { error: apiError(403, 'No Driver account is linked to this login', 'driver_account_missing') }
  }
  return { appAccount }
}

async function driverReportDefect(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const description = String(input.description ?? '').trim()
  if (!description) return apiError(400, 'Describe the defect before submitting.')

  let vehicleId = input.vehicleId ? String(input.vehicleId) : ''
  if (!vehicleId) {
    const duties = await projectPublishedDutiesForDriver({
      companyId: context.companyId,
      driverId: String(appAccount.driver_id),
      depotId: String(input.depotId ?? ''),
    }).catch(() => [] as Row[])
    const vehicle = (duties[0] as Row | undefined)?.vehicle as Row | undefined
    vehicleId = vehicle?.id ? String(vehicle.id) : ''
  }
  if (!vehicleId) {
    return apiError(400, 'No vehicle is assigned on a published duty. Ask dispatch before reporting.')
  }

  const severityRaw = String(input.severity ?? 'major')
  const severity =
    severityRaw === 'critical' ? 'critical' : severityRaw === 'minor' ? 'attention' : 'attention'
  const now = new Date().toISOString()
  const defectReference = `DEF-DRV-${Date.now().toString(36).toUpperCase()}`

  const { data, error } = await admin
    .from('defects')
    .insert({
      company_id: context.companyId,
      vehicle_id: vehicleId,
      defect_reference: defectReference,
      source_type: 'driver_app',
      source_id: String(appAccount.driver_id),
      reported_by: context.user.id,
      reported_at: now,
      category: input.category ? String(input.category) : 'driver_reported',
      severity,
      description,
      status: 'reported',
      depot_id: input.depotId ? String(input.depotId) : null,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'DRIVER',
      client_generated_id: input.clientId ? String(input.clientId) : null,
    })
    .select('id, defect_reference, status, severity, description, vehicle_id, reported_at')
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  return json(data, 201)
}

async function driverReportIncident(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const description = String(input.description ?? '').trim()
  if (!description) return apiError(400, 'Describe the incident before submitting.')

  const severityRaw = String(input.severity ?? 'medium').toLowerCase()
  const severity = (['low', 'medium', 'high', 'critical'].includes(severityRaw)
    ? severityRaw
    : 'medium') as string
  const now = new Date().toISOString()
  const incidentReference = `INC-DRV-${Date.now().toString(36).toUpperCase()}`

  const { data, error } = await admin
    .from('incidents')
    .insert({
      company_id: context.companyId,
      incident_reference: incidentReference,
      incident_type: String(input.incidentType ?? input.type ?? 'general'),
      severity,
      status: 'open',
      occurred_at: input.occurredAt ? String(input.occurredAt) : now,
      reported_at: now,
      location: typeof input.location === 'object' && input.location ? input.location : {},
      reported_by: context.user.id,
      vehicle_id: input.vehicleId ? String(input.vehicleId) : null,
      driver_id: String(appAccount.driver_id),
      description,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'DRIVER',
    })
    .select('id, incident_reference, status, severity, description, reported_at')
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  return json(data, 201)
}

function mapDriverVehicleCheckRow(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? null
  return {
    id: String(row.id),
    vehicleId: row.vehicle_id ? String(row.vehicle_id) : null,
    dutyId: row.duty_id ? String(row.duty_id) : null,
    checkType: String(row.check_type ?? 'driver_pre_use'),
    result: String(row.result ?? ''),
    opsOutcome: row.ops_outcome ? String(row.ops_outcome) : null,
    odometer: row.odometer ?? null,
    fuelLevel: row.fuel_level ? String(row.fuel_level) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    submittedAt: String(row.submitted_at ?? row.created_at ?? ''),
    checklist: row.checklist ?? {},
    evidence: row.evidence ?? {},
    vehicleRegistration: vehicle?.registration ? String(vehicle.registration) : null,
  }
}

async function driverListVehicleChecks(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 40) || 40, 100)
  const todayOnly = url.searchParams.get('today') !== '0'

  let query = admin
    .from('vehicle_checks')
    .select(
      'id, vehicle_id, duty_id, check_type, result, ops_outcome, odometer, fuel_level, started_at, submitted_at, checklist, evidence, vehicles(registration, make, model)',
    )
    .eq('company_id', context.companyId)
    .eq('driver_id', String(appAccount.driver_id))
    .order('submitted_at', { ascending: false })
    .limit(limit)

  if (todayOnly) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    query = query.gte('submitted_at', todayStart.toISOString())
  }

  const { data, error } = await query
  if (error) return apiError(500, error.message, 'database_error')
  return json((data ?? []).map((row: Row) => mapDriverVehicleCheckRow(row)))
}

async function driverSubmitVehicleCheck(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  let vehicleId = input.vehicleId ? String(input.vehicleId) : ''
  let dutyId = input.dutyId ? String(input.dutyId) : ''

  const duties = await projectPublishedDutiesForDriver({
    companyId: context.companyId,
    driverId: String(appAccount.driver_id),
    depotId: String(input.depotId ?? ''),
  }).catch(() => [] as Row[])

  if (!vehicleId) {
    const vehicle = (duties[0] as Row | undefined)?.vehicle as Row | undefined
    vehicleId = vehicle?.id ? String(vehicle.id) : ''
  }
  if (!dutyId) {
    const match =
      duties.find((duty) => {
        const vehicle = duty.vehicle as Row | undefined
        return vehicle?.id && String(vehicle.id) === vehicleId
      }) ?? duties[0]
    dutyId = match?.id ? String(match.id) : ''
  }

  if (!vehicleId) {
    return apiError(400, 'No vehicle is assigned on a published duty. Ask dispatch before checking.')
  }

  const { data: vehicleRow, error: vehicleError } = await admin
    .from('vehicles')
    .select('id')
    .eq('id', vehicleId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (vehicleError) return apiError(500, vehicleError.message, 'database_error')
  if (!vehicleRow) return apiError(400, 'That vehicle is not available for this company.')

  const resultRaw = String(input.result ?? 'pass').toLowerCase()
  const allowedResults = new Set(['pass', 'fail', 'pass_with_advisory', 'nil_defect', 'passed', 'failed'])
  const result = allowedResults.has(resultRaw) ? resultRaw : 'pass'
  const now = new Date().toISOString()
  const clientCheckId = input.clientCheckId ? String(input.clientCheckId) : null

  if (clientCheckId) {
    const { data: existing } = await admin
      .from('vehicle_checks')
      .select(
        'id, vehicle_id, duty_id, check_type, result, ops_outcome, odometer, fuel_level, started_at, submitted_at, checklist, evidence, vehicles(registration)',
      )
      .eq('company_id', context.companyId)
      .eq('client_check_id', clientCheckId)
      .maybeSingle()
    if (existing) return json(mapDriverVehicleCheckRow(existing as Row), 200)
  }

  const checklist = typeof input.checklist === 'object' && input.checklist ? (input.checklist as Row) : {}
  const evidence = typeof input.evidence === 'object' && input.evidence ? (input.evidence as Row) : {}

  const { data, error } = await admin
    .from('vehicle_checks')
    .insert({
      company_id: context.companyId,
      vehicle_id: vehicleId,
      driver_id: String(appAccount.driver_id),
      duty_id: dutyId || null,
      client_check_id: clientCheckId,
      check_type: String(input.checkType ?? 'driver_pre_use'),
      template_version: input.templateVersion ? String(input.templateVersion) : null,
      result,
      ops_outcome: input.opsOutcome ? String(input.opsOutcome) : null,
      checklist,
      evidence,
      odometer: input.odometer != null && input.odometer !== '' ? Number(input.odometer) : null,
      fuel_level: input.fuelLevel ? String(input.fuelLevel) : null,
      started_at: input.startedAt ? String(input.startedAt) : null,
      submitted_at: now,
      source_app: 'DRIVER',
      sync_status: 'synced',
      created_by: context.user.id,
      updated_by: context.user.id,
    })
    .select(
      'id, vehicle_id, duty_id, check_type, result, ops_outcome, odometer, fuel_level, started_at, submitted_at, checklist, evidence, vehicles(registration)',
    )
    .single()

  if (error) {
    if (String(error.code) === '23505' && clientCheckId) {
      const { data: existing } = await admin
        .from('vehicle_checks')
        .select(
          'id, vehicle_id, duty_id, check_type, result, ops_outcome, odometer, fuel_level, started_at, submitted_at, checklist, evidence, vehicles(registration)',
        )
        .eq('company_id', context.companyId)
        .eq('client_check_id', clientCheckId)
        .maybeSingle()
      if (existing) return json(mapDriverVehicleCheckRow(existing as Row), 200)
    }
    return apiError(500, error.message, 'database_error')
  }

  const createdDefects = await createBodyworkDefectsFromVehicleCheck({
    companyId: context.companyId,
    vehicleId,
    driverId: String(appAccount.driver_id),
    userId: context.user.id,
    vehicleCheckId: String((data as Row).id),
    checklist,
    reportedAt: now,
  })

  return json(
    {
      ...mapDriverVehicleCheckRow(data as Row),
      createdDefects,
    },
    201,
  )
}

function isBodyworkFailItem(item: Row) {
  if (item.isBodyworkDamage === true) return true
  const key = String(item.key ?? item.itemId ?? '')
  if (key === 'core_body_exterior' || key === 'outside_bodywork' || key === 'eod_body_damage') return true
  return String(item.category ?? '').toLowerCase() === 'bodywork'
}

async function createBodyworkDefectsFromVehicleCheck(input: {
  companyId: string
  vehicleId: string
  driverId: string
  userId: string
  vehicleCheckId: string
  checklist: Row
  reportedAt: string
}) {
  const failedItems = Array.isArray(input.checklist.failedItems)
    ? (input.checklist.failedItems as Row[])
    : []
  const bodyworkFromList = Array.isArray(input.checklist.bodyworkReports)
    ? (input.checklist.bodyworkReports as Row[])
    : failedItems.filter((item) => isBodyworkFailItem(item))

  const created: Row[] = []
  for (const item of bodyworkFromList) {
    const note = String(item.note ?? item.driverNote ?? '').trim()
    const zone = item.zone ? String(item.zone) : null
    const damageType = item.damageType ? String(item.damageType) : null
    const description =
      note ||
      `Bodywork damage reported on walkaround${zone ? ` (${zone})` : ''}${damageType ? ` — ${damageType}` : ''}`
    const clientGeneratedId = `bodywork_${input.vehicleCheckId}_${String(item.key ?? item.itemId ?? created.length)}`
    const defectReference = `DEF-BODY-${Date.now().toString(36).toUpperCase()}-${created.length + 1}`
    const severityRaw = String(item.severity ?? 'major').toLowerCase()
    const severity =
      severityRaw === 'critical' || severityRaw === 'dangerous'
        ? 'critical'
        : severityRaw === 'minor'
          ? 'minor'
          : 'major'

    const photoDataUrl =
      typeof item.photoDataUrl === 'string' && item.photoDataUrl.startsWith('data:')
        ? item.photoDataUrl
        : null
    const photoPath = item.photoPath ? String(item.photoPath) : null

    const { data, error } = await admin
      .from('defects')
      .insert({
        company_id: input.companyId,
        vehicle_id: input.vehicleId,
        defect_reference: defectReference,
        source_type: 'vehicle_check',
        source_id: input.vehicleCheckId,
        reported_by: input.userId,
        reported_at: input.reportedAt,
        category: 'bodywork',
        component: damageType ?? 'bodywork',
        severity,
        description,
        location_on_vehicle: zone,
        status: 'reported',
        created_by: input.userId,
        updated_by: input.userId,
        source_app: 'DRIVER',
        client_generated_id: clientGeneratedId,
        evidence: {
          kind: 'driver_walkaround_photo',
          photoDataUrl,
          photoPath,
          zone,
          damageType,
          vehicleCheckId: input.vehicleCheckId,
          canContinue: item.canContinue ?? null,
          itemKey: item.key ?? item.itemId ?? null,
          itemLabel: item.label ?? null,
        },
      })
      .select('id, defect_reference, status, severity, description, vehicle_id, reported_at, location_on_vehicle')
      .maybeSingle()

    if (error) {
      // Idempotent retry: same client_generated_id already created.
      if (String(error.code) === '23505') {
        const { data: existing } = await admin
          .from('defects')
          .select('id, defect_reference, status, severity, description, vehicle_id, reported_at, location_on_vehicle')
          .eq('company_id', input.companyId)
          .eq('client_generated_id', clientGeneratedId)
          .maybeSingle()
        if (existing) created.push(existing as Row)
        continue
      }
      console.error('bodywork defect create failed', error.message)
      continue
    }
    if (data) created.push(data as Row)
  }
  return created
}

function normalizeDriverDocumentMimeType(mime: string | null, fileName: string | null): string {
  const raw = String(mime ?? '').toLowerCase()
  if (raw === 'image/jpg' || raw === 'image/pjpeg') return 'image/jpeg'
  if (raw === 'image/heic' || raw === 'image/heif') return 'image/jpeg'
  if (raw && raw !== 'application/octet-stream') return raw
  const name = String(fileName ?? '').toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.jpeg') || name.endsWith('.jpg')) return 'image/jpeg'
  return 'image/jpeg'
}

function decodeBase64FilePayload(value: string): Uint8Array | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const b64 = trimmed.replace(/^data:[^;]+;base64,/, '')
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function mapDriverDocumentRow(row: Row, driver?: Row) {
  const expiryDate = resolveProjectedDocumentExpiry(
    driver ?? {},
    row.requirement_type,
    row.expiry_date,
  )
  const verificationStatus = effectiveDocumentVerificationStatus(
    row.verification_status,
    expiryDate,
  )
  return {
    id: String(row.id),
    requirementType: String(row.requirement_type ?? ''),
    label: String(row.label ?? row.requirement_type ?? 'Document'),
    referenceNumber: row.reference_number ? String(row.reference_number) : null,
    expiryDate,
    verificationStatus,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    storagePath: row.storage_path ? String(row.storage_path) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function persistDriverDocumentFile(
  companyId: string,
  driverId: string,
  requirementType: string,
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
  userId: string,
): Promise<{ fileObjectId: string | null; storagePath: string | null; error: string | null }> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document.jpg'
  const storageKey = `${companyId}/drivers/${driverId}/${requirementType}/${crypto.randomUUID()}-${safeName}`
  const bucket = 'driver-documents'

  const { error: uploadError } = await admin.storage.from(bucket).upload(storageKey, bytes, {
    contentType: normalizeDriverDocumentMimeType(mimeType, fileName),
    upsert: true,
  })
  if (uploadError) {
    return { fileObjectId: null, storagePath: null, error: uploadError.message }
  }

  const checksum = await sha256Hex(bytes)
  const now = new Date().toISOString()
  const { data: fileRow, error: fileError } = await admin
    .from('file_objects')
    .insert({
      company_id: companyId,
      storage_key: storageKey,
      original_filename: fileName,
      mime_type: normalizeDriverDocumentMimeType(mimeType, fileName),
      size: bytes.length,
      checksum,
      uploaded_by: userId,
      classification: 'identity',
      source_app: 'DRIVER',
      created_by: userId,
      updated_by: userId,
      updated_at: now,
    })
    .select('id')
    .single()

  if (fileError) {
    console.error('file_objects insert failed', fileError)
    return { fileObjectId: null, storagePath: storageKey, error: fileError.message }
  }

  return { fileObjectId: fileRow?.id ? String(fileRow.id) : null, storagePath: storageKey, error: null }
}

async function parseDriverDocumentSubmitInput(request: Request): Promise<{
  requirementType: string
  label: string
  referenceNumber: string | null
  expiryDate: string | null
  notes: string | null
  fileName: string | null
  fileBytes: Uint8Array | null
  mimeType: string | null
}> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    const requirementType = String(form.get('requirementType') ?? form.get('documentType') ?? '').trim()
    const label = String(form.get('label') ?? requirementType.replace(/_/g, ' '))
    let fileBytes: Uint8Array | null = null
    let mimeType: string | null = null
    let fileName = String(form.get('fileName') ?? '')
    if (file instanceof File) {
      fileBytes = new Uint8Array(await file.arrayBuffer())
      mimeType = normalizeDriverDocumentMimeType(file.type || null, fileName || file.name)
      if (!fileName) fileName = file.name
    }
    return {
      requirementType,
      label,
      referenceNumber: form.get('referenceNumber') ? String(form.get('referenceNumber')) : null,
      expiryDate: form.get('expiryDate') ? String(form.get('expiryDate')) : null,
      notes: form.get('notes') ? String(form.get('notes')) : null,
      fileName: fileName || null,
      fileBytes,
      mimeType,
    }
  }

  const input = await readJson<Row>(request)
  const requirementType = String(input.requirementType ?? input.documentType ?? '').trim()
  let fileBytes: Uint8Array | null = null
  let mimeType: string | null = input.mimeType ? String(input.mimeType) : null
  let fileName = input.fileName ? String(input.fileName) : null
  if (input.fileBase64) {
    fileBytes = decodeBase64FilePayload(String(input.fileBase64))
  }
  return {
    requirementType,
    label: String(input.label ?? requirementType.replace(/_/g, ' ')),
    referenceNumber: input.referenceNumber ? String(input.referenceNumber) : null,
    expiryDate: input.expiryDate ? String(input.expiryDate) : null,
    notes: input.notes ? String(input.notes) : null,
    fileName,
    fileBytes,
    mimeType,
  }
}

async function driverSubmitDocument(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const parsed = await parseDriverDocumentSubmitInput(request).catch(() => null)
  if (!parsed) return apiError(400, 'We could not read your photo. Take the picture again and retry.')
  if (!parsed.requirementType) return apiError(400, 'Choose a document type before submitting.')

  const driverId = String(appAccount.driver_id)
  let fileObjectId: string | null = null
  let storagePath: string | null = null

  if (!parsed.fileBytes?.length) {
    return apiError(
      400,
      'We could not read your photo. Open the camera or gallery again and upload once more.',
    )
  }

  if (parsed.fileBytes?.length) {
    const normalizedMime = normalizeDriverDocumentMimeType(parsed.mimeType, parsed.fileName)
    const stored = await persistDriverDocumentFile(
      context.companyId,
      driverId,
      parsed.requirementType,
      parsed.fileName ?? `${parsed.requirementType}.jpg`,
      normalizedMime,
      parsed.fileBytes,
      context.user.id,
    )
    if (stored.error && !stored.storagePath) {
      return apiError(
        400,
        'Your file could not be stored. Ask your transport manager to check document storage is set up.',
      )
    }
    if (!stored.fileObjectId) {
      return apiError(400, 'Your photo could not be saved. Please try uploading again.')
    }
    fileObjectId = stored.fileObjectId
    storagePath = stored.storagePath
  }

  const { data, error } = await admin
    .from('driver_documents')
    .insert({
      company_id: context.companyId,
      driver_id: driverId,
      requirement_type: parsed.requirementType,
      label: parsed.label,
      reference_number: parsed.referenceNumber,
      expiry_date: parsed.expiryDate,
      verification_status: 'awaiting_review',
      file_name: parsed.fileName,
      file_object_id: fileObjectId,
      notes: parsed.notes,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'DRIVER',
    })
    .select(
      'id, requirement_type, label, reference_number, expiry_date, verification_status, rejection_reason, file_name, created_at, updated_at',
    )
    .single()

  if (error) return apiError(500, error.message, 'database_error')

  const now = new Date().toISOString()
  await admin.from('driver_requirements').upsert(
    {
      company_id: context.companyId,
      driver_id: driverId,
      definition_key: parsed.requirementType,
      requirement_type: 'document',
      status_override: 'submitted',
      updated_at: now,
      updated_by: context.user.id,
      created_by: context.user.id,
    },
    { onConflict: 'driver_id,definition_key' },
  )

  const { data: staff } = await admin
    .from('drivers')
    .select('staff_members(first_name, last_name)')
    .eq('id', driverId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  const member = (staff?.staff_members as Row | null) ?? {}
  const driverName =
    [member.first_name, member.last_name].filter(Boolean).join(' ').trim() || 'A driver'

  await notifyCompanyAdmins({
    companyId: context.companyId,
    type: DRIVER_ONBOARDING_NOTIFICATION.evidenceSubmitted,
    title: 'Driver evidence ready for review',
    body: `${driverName} uploaded ${parsed.label}. Submitted ${new Date().toLocaleString('en-GB')}.`,
    severity: 'attention',
    actionUrl: `/drivers/${driverId}?tab=Compliance`,
    sourceEntityId: driverId,
  })

  return json({ ...mapDriverDocumentRow(data as Row), storagePath }, 201)
}

async function driverListDocuments(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!
  const driverId = String(appAccount.driver_id)

  const [{ data, error }, { data: driverRow }] = await Promise.all([
    admin
      .from('driver_documents')
      .select(
        'id, requirement_type, label, reference_number, expiry_date, verification_status, rejection_reason, file_name, created_at, updated_at',
      )
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .order('updated_at', { ascending: false })
      .limit(100),
    admin
      .from('drivers')
      .select(
        'licence_expiry_date, cpc_expiry_date, dbs_expiry_date, medical_expiry_date, tacho_card_expiry',
      )
      .eq('company_id', context.companyId)
      .eq('id', driverId)
      .maybeSingle(),
  ])

  if (error) return apiError(500, error.message, 'database_error')
  return json((data ?? []).map((row: Row) => mapDriverDocumentRow(row, (driverRow as Row) ?? {})))
}

function normalizeMessageAudience(value: unknown) {
  const audience = String(value ?? 'dispatch').toLowerCase()
  if (audience === 'yard' || audience === 'both' || audience === 'dispatch') return audience
  return 'dispatch'
}

function mapOpsMessageRecord(row: Row, people: Map<string, Row>) {
  const sender = people.get(String(row.sender_id ?? '')) ?? {}
  const recipient = people.get(String(row.recipient_user_id ?? '')) ?? {}
  return {
    id: String(row.id),
    subject: row.subject ? String(row.subject) : null,
    body: String(row.body ?? ''),
    readAt: row.read_at ? String(row.read_at) : null,
    createdAt: String(row.sent_at ?? row.created_at ?? ''),
    conversationId: row.conversation_id ? String(row.conversation_id) : String(row.id),
    driverId: row.driver_id ? String(row.driver_id) : null,
    audience: normalizeMessageAudience(row.audience),
    sourceApp: String(row.source_app ?? 'COMMAND'),
    sender: {
      id: String(row.sender_id ?? ''),
      firstName: String(sender.first_name ?? sender.firstName ?? 'Ops'),
      lastName: String(sender.last_name ?? sender.lastName ?? ''),
    },
    recipient: {
      id: String(row.recipient_user_id ?? row.driver_id ?? ''),
      firstName: String(recipient.first_name ?? recipient.firstName ?? 'Driver'),
      lastName: String(recipient.last_name ?? recipient.lastName ?? ''),
    },
  }
}

async function loadMessagePeople(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))]
  const people = new Map<string, Row>()
  if (!unique.length) return people
  const { data } = await admin.from('users').select('id, first_name, last_name').in('id', unique)
  for (const row of data ?? []) {
    people.set(String(row.id), row as Row)
  }
  return people
}

async function listOpsMessages(request: Request) {
  const context = await authenticate(request)
  const url = new URL(request.url)
  const driverId = url.searchParams.get('driverId')
  const folder = url.searchParams.get('folder')

  const audience = url.searchParams.get('audience')
  let query = admin
    .from('messages')
    .select(
      'id, company_id, conversation_id, sender_id, recipient_user_id, driver_id, subject, body, sent_at, read_at, source_app, created_at, status, audience',
    )
    .eq('company_id', context.companyId)
    .order('sent_at', { ascending: false })
    .limit(200)

  if (driverId) query = query.eq('driver_id', driverId)
  if (folder === 'sent') query = query.eq('sender_id', context.user.id)
  if (folder === 'inbox') query = query.neq('sender_id', context.user.id)
  if (audience === 'yard') query = query.in('audience', ['yard', 'both'])
  if (audience === 'dispatch') query = query.in('audience', ['dispatch', 'both'])
  if (audience === 'both') query = query.eq('audience', 'both')

  const { data, error } = await query
  if (error) return apiError(500, error.message, 'database_error')

  const people = await loadMessagePeople(
    (data ?? []).flatMap((row: Row) => [String(row.sender_id ?? ''), String(row.recipient_user_id ?? '')]),
  )
  return json((data ?? []).map((row: Row) => mapOpsMessageRecord(row, people)))
}

async function createOpsMessage(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const body = String(input.body ?? '').trim()
  if (!body) return apiError(400, 'Write a message before sending.')

  const driverId = input.driverId ? String(input.driverId) : ''
  if (!driverId) return apiError(400, 'Choose a driver before sending.')

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id, staff_members(first_name, last_name)')
    .eq('id', driverId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (driverError) return apiError(500, driverError.message, 'database_error')
  if (!driver) return apiError(404, 'Driver not found', 'not_found')

  const { data: appAccount } = await admin
    .from('driver_app_accounts')
    .select('user_id')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .maybeSingle()

  const conversationId = input.conversationId ? String(input.conversationId) : crypto.randomUUID()
  const staff = (driver.staff_members as Row | null) ?? null
  const driverName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ').trim() || 'Driver'
  const subject = String(input.subject ?? `Message for ${driverName}`).trim()
  let audience = normalizeMessageAudience(input.audience)
  if (input.conversationId) {
    const { data: prior } = await admin
      .from('messages')
      .select('audience')
      .eq('company_id', context.companyId)
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (prior?.audience) audience = normalizeMessageAudience(prior.audience)
  }

  const { data, error } = await admin
    .from('messages')
    .insert({
      company_id: context.companyId,
      conversation_id: conversationId,
      sender_id: context.user.id,
      recipient_user_id: appAccount?.user_id ? String(appAccount.user_id) : null,
      driver_id: driverId,
      subject,
      body,
      message_type: String(input.messageType ?? 'ops_notice'),
      status: 'sent',
      source_app: 'COMMAND',
      audience,
      requires_ack: Boolean(input.requiresAck),
    })
    .select(
      'id, conversation_id, sender_id, recipient_user_id, driver_id, subject, body, sent_at, read_at, source_app, created_at, status, audience',
    )
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  const people = await loadMessagePeople([context.user.id, String(appAccount?.user_id ?? '')])
  return json(mapOpsMessageRecord(data as Row, people), 201)
}

async function markOpsMessageRead(request: Request, messageId: string) {
  const context = await authenticate(request)
  const now = new Date().toISOString()
  const { data, error } = await admin
    .from('messages')
    .update({ read_at: now, status: 'read' })
    .eq('id', messageId)
    .eq('company_id', context.companyId)
    .select(
      'id, conversation_id, sender_id, recipient_user_id, driver_id, subject, body, sent_at, read_at, source_app, created_at, status, audience',
    )
    .maybeSingle()
  if (error) return apiError(500, error.message, 'database_error')
  if (!data) return apiError(404, 'Message not found', 'not_found')
  const people = await loadMessagePeople([String(data.sender_id ?? ''), String(data.recipient_user_id ?? '')])
  return json(mapOpsMessageRecord(data as Row, people))
}

async function driverListMessages(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const inbox = await projectDriverMessagesInbox({
    companyId: context.companyId,
    driverId: String(resolved.appAccount!.driver_id),
    userId: context.user.id,
  })
  return json(inbox)
}

async function driverStartMessage(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const subject = String(input.subject ?? '').trim()
  const body = String(input.body ?? input.message ?? '').trim()
  if (!subject || !body) return apiError(400, 'Subject and message are required.')

  const audience = normalizeMessageAudience(input.audience)
  const conversationId = crypto.randomUUID()

  const { data, error } = await admin
    .from('messages')
    .insert({
      company_id: context.companyId,
      conversation_id: conversationId,
      sender_id: context.user.id,
      recipient_user_id: null,
      driver_id: String(appAccount.driver_id),
      subject,
      body,
      message_type: 'driver_support',
      status: 'sent',
      source_app: 'DRIVER',
      audience,
    })
    .select('id, conversation_id, subject, body, sent_at, audience')
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  return json({ ok: true, conversationId, threadId: conversationId, message: data }, 201)
}

async function driverGetMessageThread(request: Request, conversationId: string) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error

  const { data, error } = await admin
    .from('messages')
    .select(
      'id, conversation_id, sender_id, subject, body, sent_at, source_app, audience, status',
    )
    .eq('company_id', context.companyId)
    .eq('driver_id', String(resolved.appAccount!.driver_id))
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })

  if (error) return apiError(500, error.message, 'database_error')
  if (!data?.length) return apiError(404, 'Conversation not found', 'not_found')

  const first = data[0] as Row
  return json({
    thread: {
      id: conversationId,
      subject: String(first.subject ?? 'Conversation'),
      status: 'open',
      audience: normalizeMessageAudience(first.audience),
      updated_at: String(data[data.length - 1]?.sent_at ?? ''),
    },
    messages: data.map((row: Row) => ({
      id: String(row.id),
      body: String(row.body ?? ''),
      created_at: String(row.sent_at ?? ''),
      from_driver: String(row.source_app) === 'DRIVER',
      sender_name:
        String(row.source_app) === 'DRIVER'
          ? 'You'
          : String(row.source_app) === 'YARD'
            ? 'Yard'
            : 'Transport office',
      sourceApp: String(row.source_app ?? ''),
    })),
  })
}

async function driverReplyMessage(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const body = String(input.body ?? '').trim()
  if (!body) return apiError(400, 'Write a reply before sending.')

  const conversationId = input.conversationId ? String(input.conversationId) : ''
  if (!conversationId) return apiError(400, 'Conversation is required.')

  const { data: prior } = await admin
    .from('messages')
    .select('id, subject, sender_id, audience')
    .eq('company_id', context.companyId)
    .eq('driver_id', String(appAccount.driver_id))
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('messages')
    .insert({
      company_id: context.companyId,
      conversation_id: conversationId,
      sender_id: context.user.id,
      recipient_user_id: prior?.sender_id ? String(prior.sender_id) : null,
      driver_id: String(appAccount.driver_id),
      subject: prior?.subject ? String(prior.subject) : 'Driver reply',
      body,
      message_type: 'driver_reply',
      status: 'sent',
      source_app: 'DRIVER',
      audience: normalizeMessageAudience(prior?.audience),
    })
    .select('id, conversation_id, subject, body, sent_at, audience')
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  return json(data, 201)
}

async function listYardDriverMessages(request: Request) {
  const context = await authenticate(request)
  const { data, error } = await admin
    .from('messages')
    .select(
      'id, conversation_id, sender_id, recipient_user_id, driver_id, subject, body, sent_at, read_at, source_app, created_at, status, audience, drivers(staff_members(first_name, last_name))',
    )
    .eq('company_id', context.companyId)
    .in('audience', ['yard', 'both'])
    .order('sent_at', { ascending: false })
    .limit(100)

  if (error) return apiError(500, error.message, 'database_error')

  const people = await loadMessagePeople(
    (data ?? []).flatMap((row: Row) => [String(row.sender_id ?? ''), String(row.recipient_user_id ?? '')]),
  )

  return json(
    (data ?? []).map((row: Row) => {
      const mapped = mapOpsMessageRecord(row, people)
      const staff = ((row.drivers as Row | null)?.staff_members as Row | null) ?? null
      return {
        ...mapped,
        driverName: staff
          ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || null
          : null,
      }
    }),
  )
}

async function replyYardDriverMessage(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const body = String(input.body ?? '').trim()
  if (!body) return apiError(400, 'Write a reply before sending.')
  const conversationId = input.conversationId ? String(input.conversationId) : ''
  const driverId = input.driverId ? String(input.driverId) : ''
  if (!conversationId || !driverId) return apiError(400, 'Conversation and driver are required.')

  const { data: prior } = await admin
    .from('messages')
    .select('subject, audience')
    .eq('company_id', context.companyId)
    .eq('conversation_id', conversationId)
    .eq('driver_id', driverId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: appAccount } = await admin
    .from('driver_app_accounts')
    .select('user_id')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .maybeSingle()

  const { data, error } = await admin
    .from('messages')
    .insert({
      company_id: context.companyId,
      conversation_id: conversationId,
      sender_id: context.user.id,
      recipient_user_id: appAccount?.user_id ? String(appAccount.user_id) : null,
      driver_id: driverId,
      subject: prior?.subject ? String(prior.subject) : 'Yard reply',
      body,
      message_type: 'yard_reply',
      status: 'sent',
      source_app: 'YARD',
      audience: normalizeMessageAudience(prior?.audience ?? 'yard'),
    })
    .select(
      'id, conversation_id, sender_id, recipient_user_id, driver_id, subject, body, sent_at, read_at, source_app, created_at, status, audience',
    )
    .single()

  if (error) return apiError(500, error.message, 'database_error')
  const people = await loadMessagePeople([context.user.id, String(appAccount?.user_id ?? '')])
  return json(mapOpsMessageRecord(data as Row, people), 201)
}

async function driverMarkMessageRead(request: Request, conversationId: string) {
  const context = await authenticate(request)
  const resolved = await resolveDriverAppAccount(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const now = new Date().toISOString()
  const { error } = await admin
    .from('messages')
    .update({ read_at: now, status: 'read' })
    .eq('company_id', context.companyId)
    .eq('driver_id', String(resolved.appAccount!.driver_id))
    .eq('conversation_id', conversationId)
    .is('read_at', null)
    .neq('sender_id', context.user.id)
  if (error) return apiError(500, error.message, 'database_error')
  return json({ ok: true, conversationId, readAt: now })
}

async function listCompanyUsers(request: Request) {
  const context = await authenticate(request)
  const { data: memberships, error } = await admin
    .from('company_memberships')
    .select('id, status, role_ids, user_id, users(id, email, first_name, last_name, authentication_status, last_login_at)')
    .eq('company_id', context.companyId)
    .order('created_at', { ascending: false })
  if (error) return apiError(500, error.message, 'database_error')

  const roleIds = new Set<string>()
  for (const membership of memberships ?? []) {
    for (const roleId of (membership.role_ids as string[] | null) ?? []) roleIds.add(String(roleId))
  }

  const { data: roles } = roleIds.size
    ? await admin.from('roles').select('id, name').in('id', [...roleIds])
    : { data: [] as Row[] }
  const roleNameById = new Map((roles ?? []).map((role: Row) => [String(role.id), String(role.name ?? 'member')]))

  return json(
    (memberships ?? []).map((membership: Row) => {
      const user = (membership.users as Row | null) ?? null
      const membershipRoleIds = (membership.role_ids as string[] | null) ?? []
      const roleKey = membershipRoleIds.map((id) => roleNameById.get(String(id))).find(Boolean) ?? 'member'
      return {
        id: String(membership.id),
        roleKey,
        status: String(membership.status ?? 'active'),
        user: {
          id: String(user?.id ?? membership.user_id ?? ''),
          email: String(user?.email ?? ''),
          firstName: String(user?.first_name ?? ''),
          lastName: String(user?.last_name ?? ''),
          status: String(user?.authentication_status ?? 'active'),
          lastLoginAt: user?.last_login_at ? String(user.last_login_at) : null,
        },
      }
    }),
  )
}

async function listSchools(request: Request) {
  const context = await authenticate(request)
  const { data: schools, error } = await admin
    .from('schools')
    .select('id, name, address, customer_id, status')
    .eq('company_id', context.companyId)
    .order('name')
  if (error) return apiError(500, error.message, 'database_error')

  return json(
    (schools ?? []).map((school: Row) => {
      const address = school.address
      let addressText: string | null = null
      if (typeof address === 'string') addressText = address
      else if (address && typeof address === 'object') {
        const row = address as Row
        addressText = [row.line1, row.line2, row.city, row.postcode, row.town]
          .map((part) => (part == null ? '' : String(part).trim()))
          .filter(Boolean)
          .join(', ') || null
      }
      return {
        id: String(school.id),
        name: String(school.name ?? 'School'),
        address: addressText,
        customerId: school.customer_id ? String(school.customer_id) : '',
        routeCount: 0,
        pupilCount: 0,
      }
    }),
  )
}

async function reportsSummary(request: Request) {
  const context = await authenticate(request)
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
  const to = url.searchParams.get('to') ?? from
  const companyId = context.companyId

  const counts = await Promise.all([
    admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('defects').select('*', { count: 'exact', head: true }).eq('company_id', companyId).not('status', 'in', '("closed","rejected")'),
    admin.from('incidents').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('status', 'closed'),
    admin
      .from('duties')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('service_date', from)
      .lte('service_date', to),
  ])

  return json({
    fleet: {
      vehicles: counts[0].count ?? 0,
      drivers: counts[1].count ?? 0,
    },
    customers: counts[2].count ?? 0,
    safety: {
      openDefects: counts[3].count ?? 0,
      openIncidents: counts[4].count ?? 0,
    },
    operations: {
      dutiesInPeriod: counts[5].count ?? 0,
    },
    period: { from, to },
    generatedAt: new Date().toISOString(),
  })
}

async function reportsPerformance(request: Request) {
  const context = await authenticate(request)
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
  const to = url.searchParams.get('to') ?? from
  const companyId = context.companyId

  const [{ data: duties }, { count: defectCount }, { count: vehicleCount }] = await Promise.all([
    admin
      .from('duties')
      .select('id, status')
      .eq('company_id', companyId)
      .gte('service_date', from)
      .lte('service_date', to),
    admin
      .from('defects')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', `${from}T00:00:00.000Z`)
      .lte('created_at', `${to}T23:59:59.999Z`),
    admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
  ])

  const rows = duties ?? []
  const completed = rows.filter((d) => String(d.status) === 'completed')
  const onTimePct = completed.length ? 100 : rows.length ? 0 : 100
  const avgDelayMinutes = 0
  const fleet = vehicleCount ?? 0
  const defectRate = fleet > 0 ? Math.round(((defectCount ?? 0) / fleet) * 1000) / 10 : 0

  return json({
    onTimePct,
    completedRuns: completed.length,
    avgDelayMinutes,
    defectRate,
    period: { from, to },
  })
}

async function listResource(request: Request, resource: string, id?: string) {
  const context = await authenticate(request)
  const table = LIST_RESOURCES[resource]
  if (table === undefined) return apiError(404, 'API resource not found', 'not_found')
  if (table === null) return json(id ? null : [])

  try {
    if (id && resource === 'defects') await assertCompanyScopedDefect(id, context.companyId)
    if (id && resource === 'vehicles') await assertCompanyScopedVehicle(id, context.companyId)
    if (id && resource === 'drivers') await assertCompanyScopedDriver(id, context.companyId)
    if (id && resource === 'duties') await assertCompanyScopedDuty(id, context.companyId)
  } catch (error) {
    return toApiErrorResponse(error, 'Record not found')
  }

  let query = admin.from(table).select('*').eq('company_id', context.companyId)
  if (id) query = query.eq('id', id).limit(1)

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  if (status && !id) {
    if (resource === 'vehicles') query = query.eq('operational_status', status)
    else query = query.eq('status', status)
  }
  if (resource === 'notifications' && url.searchParams.get('unread_only') === 'true') {
    query = query.is('read_at', null).eq('recipient_user_id', context.user.id)
  }
  if (resource === 'notifications') query = query.eq('recipient_user_id', context.user.id)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return apiError(500, error.message, 'database_error')
  if (id && !data?.length) return apiError(404, 'Record not found', 'not_found')
  return json(id ? expandRow(data?.[0]) : expandRow(data ?? []))
}

async function dashboard(request: Request) {
  const context = await authenticate(request)
  const companyId = context.companyId
  const today = new Date().toISOString().slice(0, 10)
  const counts = await Promise.all([
    admin.from('duties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('service_date', today).in('status', ['planned', 'signed_on', 'in_progress']),
    admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('operational_status', 'in_service'),
    admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('operational_status', 'vor'),
    admin.from('duties').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('service_date', today).eq('status', 'signed_on'),
    admin.from('defects').select('*', { count: 'exact', head: true }).eq('company_id', companyId).not('status', 'in', '("closed","rejected")'),
    admin.from('incidents').select('*', { count: 'exact', head: true }).eq('company_id', companyId).neq('status', 'closed'),
    admin.from('operational_exceptions').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
  ])
  const [activeDuties, vehiclesInService, vehiclesOffRoad, driversOnDuty, openDefects, openIncidents, openExceptions] =
    counts.map((result) => result.count ?? 0)

  const { data: exceptions } = await admin
    .from('operational_exceptions')
    .select('id, title, severity, status, source_entity_type')
    .eq('company_id', companyId)
    .eq('status', 'open')
    .order('detected_at', { ascending: false })
    .limit(5)

  const { data: todayDuties } = await admin
    .from('duties')
    .select('id, status, planned_sign_on_at, drivers(driver_number)')
    .eq('company_id', companyId)
    .eq('service_date', today)
    .order('planned_sign_on_at', { ascending: true })
    .limit(8)

  const alerts = (exceptions ?? []).map((item: Row) => ({
    severity: item.severity === 'critical' || item.severity === 'high' ? 'danger' : 'warning',
    title: item.title,
    href: item.source_entity_type === 'vehicle' ? '/vehicles/vor' : '/exceptions',
    category: item.source_entity_type === 'vehicle' ? 'fleet' : 'operations',
  }))

  const timeline = (todayDuties ?? []).map((duty: Row) => {
    const driver = duty.drivers as Row | null
    return {
      id: duty.id,
      time: duty.planned_sign_on_at
        ? new Date(String(duty.planned_sign_on_at)).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : null,
      title: `Duty for ${driver?.driver_number ?? 'driver'}`,
      status: duty.status,
      href: `/runs/${duty.id}`,
    }
  })

  return json({
    todaysActiveDuties: activeDuties,
    vehiclesInService,
    vehiclesOffRoad,
    driversOnDuty,
    openDefects,
    openIncidents,
    openExceptions,
    expiringDocuments: 0,
    alerts,
    navBadges: { defects: openDefects, compliance: 0, exceptions: openExceptions },
    timeline,
  })
}

async function company(request: Request) {
  const context = await authenticate(request)
  if (request.method === 'PATCH') {
    const input = await readJson<Row>(request)
    const patch: Row = {}
    if (input.legalName || input.legal_name) patch.legal_name = input.legalName ?? input.legal_name
    if (input.tradingName || input.trading_name || input.name) {
      patch.trading_name = input.tradingName ?? input.trading_name ?? input.name
    }
    if (input.timezone) patch.timezone = input.timezone
    if (input.address) patch.address = input.address
    if (input.operatorLicenceNumber || input.operator_licence_number) {
      patch.operator_licence_number = input.operatorLicenceNumber ?? input.operator_licence_number
    }
    patch.updated_by = context.user.id
    const { data, error } = await admin.from('companies').update(patch).eq('id', context.companyId).select().single()
    if (error) return apiError(400, error.message)
    return json(expandRow(data))
  }
  const { data, error } = await admin.from('companies').select('*').eq('id', context.companyId).single()
  if (error) return apiError(404, 'Company is unavailable', 'company_unavailable')
  return json(expandRow(data))
}

async function unreadCount(request: Request) {
  const context = await authenticate(request)
  const { count } = await admin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', context.companyId)
    .eq('recipient_user_id', context.user.id)
    .is('read_at', null)
  return json({ count: count ?? 0 })
}

async function updateNotification(request: Request, id?: string) {
  const context = await authenticate(request)
  const now = new Date().toISOString()
  let query = admin
    .from('notifications')
    .update({ read_at: now, status: 'read' })
    .eq('company_id', context.companyId)
    .eq('recipient_user_id', context.user.id)
  if (id) {
    query = query.eq('id', id)
  }
  // Mark-all updates every notification for this user in the active company.
  const { data, error } = await query.select('id')
  if (error) return apiError(400, error.message)
  return json({ ok: true, updated: (data ?? []).length })
}

async function resolveDriverAccount(context: { companyId: string; user: { id: string } }) {
  const { data: appAccount, error } = await admin
    .from('driver_app_accounts')
    .select('driver_id, account_status')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!appAccount?.driver_id) return null
  return appAccount
}

/** Resolve the driver row for GPS ingest — app account, staff email match, or duty assignee. */
async function resolveDriverIdForLocation(
  context: { companyId: string; user: { id: string; email?: string } },
  dutyId?: string | null,
) {
  const appAccount = await resolveDriverAccount(context)
  if (appAccount?.driver_id) return String(appAccount.driver_id)

  const email = String(context.user.email ?? '').trim().toLowerCase()
  if (email) {
    const { data: staffRows } = await admin
      .from('staff_members')
      .select('id')
      .eq('company_id', context.companyId)
      .ilike('email', email)
      .limit(5)
    const staffIds = (staffRows ?? []).map((row: Row) => String(row.id))
    if (staffIds.length) {
      const { data: drivers } = await admin
        .from('drivers')
        .select('id')
        .eq('company_id', context.companyId)
        .in('staff_id', staffIds)
        .limit(1)
      if (drivers?.[0]?.id) return String(drivers[0].id)
    }
  }

  if (dutyId && isUuid(dutyId)) {
    const { data: duty } = await admin
      .from('duties')
      .select('driver_id')
      .eq('company_id', context.companyId)
      .eq('id', dutyId)
      .maybeSingle()
    if (duty?.driver_id) return String(duty.driver_id)
  }

  return null
}

async function driverPostLocation(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<{
    dutyId?: string
    latitude?: number
    longitude?: number
    accuracyMeters?: number
    heading?: number
    speedMps?: number
    recordedAt?: string
    vehicleId?: string
  }>(request)

  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return apiError(400, 'Valid latitude and longitude are required')
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return apiError(400, 'Coordinates are out of range')
  }

  let dutyId = input.dutyId && isUuid(input.dutyId) ? input.dutyId : null
  const driverId = await resolveDriverIdForLocation(context, dutyId)
  if (!driverId) {
    return apiError(403, 'No Driver account is linked to this login', 'driver_account_missing')
  }

  if (dutyId) {
    const { data: duty } = await admin
      .from('duties')
      .select('id, driver_id, vehicle_id, status')
      .eq('company_id', context.companyId)
      .eq('id', dutyId)
      .maybeSingle()
    if (!duty) return apiError(404, 'Duty not found', 'not_found')
    if (duty.driver_id && String(duty.driver_id) !== driverId) {
      return apiError(403, 'This duty is assigned to another driver', 'duty_not_yours')
    }
  } else {
    const today = new Date().toISOString().slice(0, 10)
    const { data: activeDuty } = await admin
      .from('duties')
      .select('id, vehicle_id, status')
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('service_date', today)
      .in('status', ['signed_on', 'in_progress', 'planned'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    dutyId = activeDuty?.id ? String(activeDuty.id) : null
    if (!dutyId) {
      return apiError(400, 'No active duty to attach this location to', 'no_active_duty')
    }
  }

  const { data: dutyRow } = await admin
    .from('duties')
    .select('vehicle_id')
    .eq('id', dutyId)
    .maybeSingle()

  const recordedAt = input.recordedAt && !Number.isNaN(Date.parse(input.recordedAt))
    ? new Date(input.recordedAt).toISOString()
    : new Date().toISOString()

  const { error } = await admin.from('duty_live_positions').upsert(
    {
      duty_id: dutyId,
      company_id: context.companyId,
      driver_id: driverId,
      vehicle_id: isUuid(input.vehicleId) ? input.vehicleId : dutyRow?.vehicle_id ?? null,
      latitude,
      longitude,
      accuracy_meters: Number.isFinite(Number(input.accuracyMeters)) ? Number(input.accuracyMeters) : null,
      heading: Number.isFinite(Number(input.heading)) ? Number(input.heading) : null,
      speed_mps: Number.isFinite(Number(input.speedMps)) ? Number(input.speedMps) : null,
      recorded_at: recordedAt,
      source_app: 'DRIVER',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'duty_id' },
  )
  if (error) return apiError(400, error.message)

  return json({
    ok: true,
    dutyId,
    latitude,
    longitude,
    recordedAt,
  })
}

async function liveDispatch(request: Request) {
  const context = await authenticate(request)
  const url = new URL(request.url)
  const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10)
  const scope = url.searchParams.get('scope') ?? 'active'

  try {
    const activeStatuses = ['planned', 'signed_on', 'in_progress']
    const completedStatuses = ['signed_off', 'cancelled']
    const statuses = scope === 'completed' ? completedStatuses : activeStatuses

    let { data: duties, error } = await admin
      .from('duties')
      .select('*, drivers(id, driver_number, status, staff_members(first_name, last_name)), depots(id, name, latitude, longitude), vehicles(id, registration, operational_status)')
      .eq('company_id', context.companyId)
      .eq('service_date', date)
      .in('status', statuses)
      .order('planned_sign_on_at', { ascending: true })

    if (error) return apiError(500, error.message)

    // Demo / first-run: if nothing scheduled for the selected date, show recent active duties
    // so Live Operations is not an empty room.
    if ((!duties || duties.length === 0) && scope === 'active') {
      const fallback = await admin
        .from('duties')
        .select('*, drivers(id, driver_number, status, staff_members(first_name, last_name)), depots(id, name, latitude, longitude), vehicles(id, registration, operational_status)')
        .eq('company_id', context.companyId)
        .in('status', activeStatuses)
        .order('service_date', { ascending: false })
        .limit(20)
      if (fallback.error) return apiError(500, fallback.error.message)
      duties = fallback.data ?? []
    }

    const dutyIds = (duties ?? []).map((d: Row) => String(d.id))
    const driverIds = [...new Set((duties ?? []).map((d: Row) => String(d.driver_id ?? '')).filter(Boolean))]

    const [{ data: dutyRuns }, { data: livePositions }] = await Promise.all([
      dutyIds.length
        ? admin
            .from('duty_runs')
            .select(
              'duty_id, run_id, sequence, runs(id, run_reference, vehicle_id, status, planned_start_at, planned_end_at, vehicles(id, registration, fleet_number, operational_status))',
            )
            .in('duty_id', dutyIds)
        : Promise.resolve({ data: [] as Row[] }),
      dutyIds.length
        ? admin
            .from('duty_live_positions')
            .select('duty_id, driver_id, latitude, longitude, recorded_at, accuracy_meters')
            .eq('company_id', context.companyId)
            .in('duty_id', dutyIds)
        : Promise.resolve({ data: [] as Row[] }),
    ])

    const runByDuty = new Map<string, Row>()
    for (const link of dutyRuns ?? []) {
      const id = String(link.duty_id)
      if (!runByDuty.has(id) || Number(link.sequence) === 1) runByDuty.set(id, link)
    }

    const positionByDuty = new Map<string, Row>()
    for (const row of livePositions ?? []) {
      positionByDuty.set(String(row.duty_id), row)
    }

    // Fallback: latest position for the driver today when duty row has not been linked yet.
    if (driverIds.length) {
      const { data: driverPositions } = await admin
        .from('duty_live_positions')
        .select('duty_id, driver_id, latitude, longitude, recorded_at, accuracy_meters')
        .eq('company_id', context.companyId)
        .in('driver_id', driverIds)
        .order('recorded_at', { ascending: false })
        .limit(100)
      for (const row of driverPositions ?? []) {
        const driverId = String(row.driver_id ?? '')
        const duty = (duties ?? []).find((d: Row) => String(d.driver_id ?? '') === driverId)
        if (!duty) continue
        const dutyId = String(duty.id)
        if (!positionByDuty.has(dutyId)) positionByDuty.set(dutyId, row)
      }
    }

    const STALE_THRESHOLD_MINUTES = 10

    const vehicles = (duties ?? []).map((duty: Row) => {
      const driver = (duty.drivers as Row | null) ?? null
      const staff = (driver?.staff_members as Row | null) ?? {}
      const depot = (duty.depots as Row | null) ?? null
      const dutyVehicle = (duty.vehicles as Row | null) ?? null
      const link = runByDuty.get(String(duty.id))
      const run = (link?.runs as Row | null) ?? null
      const runVehicle = (run?.vehicles as Row | null) ?? null
      const vehicle = dutyVehicle ?? runVehicle

      const position = positionByDuty.get(String(duty.id))
      const hasLiveGps =
        position?.latitude != null &&
        position?.longitude != null &&
        Number.isFinite(Number(position.latitude)) &&
        Number.isFinite(Number(position.longitude))
      const lastLatitude = hasLiveGps ? Number(position!.latitude) : null
      const lastLongitude = hasLiveGps ? Number(position!.longitude) : null
      const lastPositionAt = hasLiveGps ? String(position!.recorded_at) : null
      const staleMinutes = hasLiveGps && lastPositionAt
        ? Math.max(0, Math.round((Date.now() - new Date(lastPositionAt).getTime()) / 60_000))
        : null
      const isStale = Boolean(hasLiveGps && (staleMinutes ?? 0) > STALE_THRESHOLD_MINUTES)

      const driverName = driver
        ? [staff.first_name, staff.last_name].filter(Boolean).join(' ') || String(driver.driver_number)
        : null

      const plannedStartAt =
        duty.planned_sign_on_at ?? run?.planned_start_at ?? null
      const plannedEndAt = duty.planned_sign_off_at ?? run?.planned_end_at ?? null
      const liveStatus =
        duty.status === 'in_progress'
          ? 'in_progress'
          : duty.status === 'signed_on'
            ? 'assigned'
            : String(duty.status)

      const startMs = plannedStartAt ? new Date(String(plannedStartAt)).getTime() : NaN
      const endMs = plannedEndAt ? new Date(String(plannedEndAt)).getTime() : NaN
      const nowMs = Date.now()
      const notUnderway = ['planned', 'assigned', 'signed_on', 'ready', 'accepted'].includes(liveStatus)
      let delayMinutes = 0
      if (!['completed', 'signed_off', 'cancelled'].includes(String(duty.status))) {
        if (notUnderway && Number.isFinite(startMs) && nowMs > startMs) {
          delayMinutes = Math.max(0, Math.round((nowMs - startMs) / 60_000))
        } else if (Number.isFinite(endMs) && nowMs > endMs) {
          delayMinutes = Math.max(0, Math.round((nowMs - endMs) / 60_000))
        }
      }

      return {
        dutyId: duty.id,
        reference: run?.run_reference ? String(run.run_reference) : `DUTY-${String(duty.id).slice(0, 8).toUpperCase()}`,
        status: liveStatus,
        routeName: run?.run_reference ? String(run.run_reference) : depot?.name ? String(depot.name) : null,
        driverId: duty.driver_id ?? null,
        driverName,
        vehicleRegistration: vehicle?.registration ? String(vehicle.registration) : null,
        lastLatitude,
        lastLongitude,
        lastPositionAt,
        staleMinutes,
        isStale,
        hasLiveGps,
        delayMinutes,
        plannedStartAt: plannedStartAt ? String(plannedStartAt) : null,
        plannedEndAt: plannedEndAt ? String(plannedEndAt) : null,
        staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
        nextStop: null,
        routeTotalStops: 0,
        routeCompletedStops: 0,
        routeProgressPercent: null,
      }
    })

    return json({
      date,
      generatedAt: new Date().toISOString(),
      trackingEnabled: true,
      vehicles,
    })
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Live dispatch failed')
  }
}

async function emptyHub(moduleKey: string) {
  const emptyStaffSummary = {
    total: 0,
    active: 0,
    onDuty: 0,
    invitationsPending: 0,
    accessIssues: 0,
    trainingExpiring: 0,
    unassigned: 0,
  }
  const empty: Record<string, unknown> = {
    maintenance_hub: {
      summary: {
        fleetAvailability: { total: 0, available: 0, inMaintenance: 0, vor: 0, awaitingInspection: 0, awaitingParts: 0 },
        maintenanceRisk: { overdueServices: 0, dueWithin7Days: 0, safetyCriticalDefects: 0, repeatDefectVehicles: 0, motApproaching: 0, tachoApproaching: 0 },
        workshopPosition: { notStarted: 0, inProgress: 0, awaitingParts: 0, awaitingApproval: 0, readyForInspection: 0, readyForRelease: 0 },
      },
      priorityQueue: [],
      fleetRows: [],
      workOrders: [],
      schedule: [],
      defects: [],
      calendar: [],
      suppliers: [],
      parts: [],
      downtime: { averageDowntimeHours: 0, vehiclesOnDowntime: 0, repeatVorEvents: 0, averageApprovalDelayHours: 0, averagePartsWaitHours: 0, recentEvents: [] },
      intelligence: {},
    },
    staff_hub: {
      summary: emptyStaffSummary,
      rows: [],
      invitations: [],
      former: [],
      departments: [],
      roles: [],
      shiftsToday: [],
      openTasks: [],
      pendingHandovers: [],
      controllersOnDuty: [],
      trainingGaps: [],
      trainingCompliance: { compliant: 0, expiringSoon: 0, expired: 0, missing: 0 },
      requirementCatalog: [],
      pendingAccessReviews: [],
      segregationAlerts: [],
      contractorsExpiring: [],
      governanceSummary: { accessReviewsDue: 0, segregationWarnings: 0, contractorsExpiring: 0, mfaNonCompliant: 0, ssoEnabledCount: 0 },
      ssoPolicy: { enabled: false, provider: 'None', enforcedForElevated: false },
      profiles: [],
      teams: [],
      exceptions: [],
    },
    yard_hub: {
      depotId: '',
      depotName: 'All depots',
      shiftLabel: 'Day shift',
      operationalDate: new Date().toISOString().slice(0, 10),
      summary: { onSite: 0, readyForService: 0, workRequired: 0, awaitingInspection: 0, vor: 0, departingSoon: 0, locationUnknown: 0 },
      vehicles: [],
      movements: [],
      auditEvents: [],
      tasks: [],
      exceptions: [],
      handover: null,
      mapMarkers: [],
      depots: [],
      zones: [],
    },
    checks_hub: {
      operationalDate: new Date().toISOString().slice(0, 10),
      summary: {
        vehiclesReady: 0,
        expiringSoon: 0,
        checksInProgress: 0,
        oldestInProgressMinutes: null,
        actionRequired: 0,
        assignedDespiteIssue: 0,
        missingOrOverdue: 0,
        departureDueSoon: 0,
        vehiclesOffRoad: 0,
        awaitingMaintenanceReview: 0,
      },
      overview: [],
      liveChecks: [],
      submitted: [],
      actionQueue: [],
      overdue: [],
      history: [],
      depots: [],
      templates: [],
      intelligence: {
        suspiciousChecksToday: 0,
        recurringDefectVehicles: [],
        driverQualityAlerts: [],
        depotComparison: [],
        templatePerformance: [],
      },
    },
    defects_hub: { summary: {}, defects: [], analytics: {}, rules: [] },
    incidents_hub: { summary: {}, incidents: [], analytics: {}, settings: {} },
  }
  return json(empty[moduleKey] ?? {})
}

async function loadYardOpsTasks(companyId: string, depotId?: string | null) {
  try {
    let query = admin
      .from('yard_tasks')
      .select('*')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(100)
    if (depotId) query = query.eq('depot_id', depotId)
    const { data, error } = await query
    if (error) {
      console.error('yard tasks load failed', error.message)
      return []
    }
    return (data ?? []).map((row: Row) => ({
      id: String(row.id),
      depotId: row.depot_id ? String(row.depot_id) : '',
      vehicleId: row.vehicle_id ? String(row.vehicle_id) : '',
      registrationNumber: String(row.registration_number ?? '—'),
      taskType: String(row.task_type ?? 'move_vehicle'),
      title: String(row.title ?? 'Yard task'),
      priority: String(row.priority ?? 'routine'),
      status: String(row.status ?? 'open'),
      assignedStaffId: row.assigned_staff_id ? String(row.assigned_staff_id) : null,
      assignedStaffName: row.assigned_staff_name ? String(row.assigned_staff_name) : null,
      dueAt: row.due_at ? String(row.due_at) : null,
      instructions: row.instructions ? String(row.instructions) : null,
      evidenceRequired: Boolean(row.evidence_required),
      blockingRelease: Boolean(row.blocking_release),
      syncStatus: String(row.sync_status ?? 'synced'),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      createdBy: String(row.created_by ?? 'System'),
    }))
  } catch (error) {
    console.error('yard tasks load failed', error)
    return []
  }
}

async function loadYardOpsMovements(companyId: string, depotId?: string | null) {
  try {
    let query = admin
      .from('yard_movements')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (depotId) query = query.eq('depot_id', depotId)
    const { data, error } = await query
    if (error) {
      console.error('yard movements load failed', error.message)
      return []
    }
    return (data ?? []).map((row: Row) => ({
      id: String(row.id),
      vehicleId: String(row.vehicle_id),
      registrationNumber: String(row.registration_number ?? '—'),
      fromLocation: String(row.from_location ?? 'Unknown'),
      toLocation: String(row.to_location ?? 'Unknown'),
      reason: String(row.reason ?? ''),
      status: String(row.status ?? 'completed'),
      requestedBy: String(row.requested_by ?? 'System'),
      completedBy: row.completed_by ? String(row.completed_by) : null,
      startedAt: String(row.started_at ?? row.created_at ?? new Date().toISOString()),
      completedAt: row.completed_at ? String(row.completed_at) : null,
      depotId: row.depot_id ? String(row.depot_id) : '',
      depotName: row.depot_name ? String(row.depot_name) : 'Depot',
    }))
  } catch (error) {
    console.error('yard movements load failed', error)
    return []
  }
}

const YARD_TASK_TYPE_LABELS: Record<string, string> = {
  return_inspection: 'Return inspection',
  pre_departure_inspection: 'Pre-departure inspection',
  move_vehicle: 'Move vehicle',
  clean_interior: 'Clean interior',
  clean_exterior: 'Clean exterior',
  refuel: 'Refuel',
  charge: 'Charge',
  check_fluids: 'Check fluids',
  check_tyres: 'Check tyres',
  replenish_equipment: 'Replenish equipment',
  prepare_for_service: 'Prepare for service',
}

async function yardHubData(context: Awaited<ReturnType<typeof authenticate>>, requestedDepot?: string | null) {
  const [accessibleDepots, { data: vehicles }] = await Promise.all([
    loadMembershipDepots(context),
    admin
      .from('vehicles')
      .select('id, registration, fleet_number, make, model, vehicle_class, primary_depot_id, operational_status, updated_at, depots(id, name)')
      .eq('company_id', context.companyId)
      .order('registration')
      .limit(500),
  ])

  const depotList = accessibleDepots.map((d: Row) => ({ id: String(d.id), name: String(d.name ?? 'Depot') }))
  const accessibleIds = new Set(depotList.map((d) => d.id))
  const activeDepot =
    depotList.find((d) => d.id === requestedDepot) ??
    depotList[0] ??
    { id: '', name: 'All depots' }

  const filtered = (vehicles ?? []).filter((v: Row) => {
    const primary = v.primary_depot_id ? String(v.primary_depot_id) : ''
    if (accessibleIds.size && primary && !accessibleIds.has(primary)) return false
    if (!activeDepot.id) return true
    if (requestedDepot && String(requestedDepot).startsWith('depot-')) return true
    return !primary || primary === activeDepot.id
  })

  const [tasks, movements] = await Promise.all([
    loadYardOpsTasks(context.companyId, activeDepot.id || null),
    loadYardOpsMovements(context.companyId, activeDepot.id || null),
  ])

  const openTasksByVehicle = new Map<string, number>()
  for (const task of tasks) {
    if (!['open', 'assigned', 'in_progress', 'awaiting_sync'].includes(task.status)) continue
    if (!task.vehicleId) continue
    openTasksByVehicle.set(task.vehicleId, (openTasksByVehicle.get(task.vehicleId) ?? 0) + 1)
  }

  const vehicleRows = filtered.map((v: Row) => {
    const depot = (v.depots as Row | null) ?? {}
    const op = String(v.operational_status ?? 'available')
    const vor = op === 'vor' || op === 'quarantined'
    const inWorkshop = ['maintenance', 'in_workshop', 'awaiting_parts'].includes(op)
    const inspection = op === 'awaiting_check' || op === 'under_inspection' || op === 'onboarding'
    const vehicleId = String(v.id)
    return {
      vehicleId,
      registrationNumber: v.registration ?? '—',
      fleetNumber: v.fleet_number ?? null,
      vehicleCategory: v.vehicle_class ?? 'vehicle',
      makeModel: [v.make, v.model].filter(Boolean).join(' ') || '—',
      depotId: v.primary_depot_id ?? activeDepot.id,
      depotName: depot.name ?? activeDepot.name,
      zone: inWorkshop ? 'Workshop' : inspection ? 'Inspection' : 'Yard',
      bay: null,
      presenceState: 'on_site',
      activityState: inWorkshop ? 'maintenance' : inspection ? 'inspection' : 'idle',
      readinessState: vor ? 'vor' : inWorkshop ? 'work_required' : inspection ? 'awaiting_inspection' : 'ready_for_service',
      custodyState: inWorkshop ? 'maintenance' : 'yard',
      openTaskCount: openTasksByVehicle.get(vehicleId) ?? 0,
      assignedStaffName: null,
      nextDeparture: null,
      lastMovementAt: null,
      lastMovementBy: null,
      lastUpdatedSource: 'Command',
      lastUpdatedAt: v.updated_at ?? new Date().toISOString(),
      exceptionLabels: vor ? ['VOR'] : [],
      locationConfidence: v.primary_depot_id ? 'confirmed' : 'unknown',
    }
  })

  const summary = {
    onSite: vehicleRows.length,
    readyForService: vehicleRows.filter((v) => v.readinessState === 'ready_for_service').length,
    workRequired: vehicleRows.filter((v) => v.readinessState === 'work_required').length,
    awaitingInspection: vehicleRows.filter((v) => v.readinessState === 'awaiting_inspection').length,
    vor: vehicleRows.filter((v) => v.readinessState === 'vor').length,
    departingSoon: 0,
    locationUnknown: vehicleRows.filter((v) => v.locationConfidence === 'unknown').length,
  }

  return {
    depotId: activeDepot.id,
    depotName: activeDepot.name,
    shiftLabel: 'Day shift',
    operationalDate: new Date().toISOString().slice(0, 10),
    summary,
    vehicles: vehicleRows,
    movements,
    auditEvents: [],
    tasks,
    exceptions: vehicleRows
      .filter((v) => v.readinessState === 'vor')
      .map((v) => ({
        id: `ex-${v.vehicleId}`,
        severity: 'critical',
        vehicleId: v.vehicleId,
        registrationNumber: v.registrationNumber,
        depotId: v.depotId,
        title: `${v.registrationNumber} is VOR`,
        detail: 'Vehicle is off the road',
        detectedAt: v.lastUpdatedAt,
        operationalImpact: 'Cannot enter service',
        ownerName: null,
        recommendedAction: 'Review VOR case and return-to-service',
        escalationStatus: 'open',
      })),
    handover: null,
    mapMarkers: vehicleRows.map((v) => ({
      vehicleId: v.vehicleId,
      registrationNumber: v.registrationNumber,
      zoneId: v.zone === 'Workshop' ? 'workshop' : v.zone === 'Inspection' ? 'inspection' : 'yard',
      bay: v.bay,
      readinessState: v.readinessState,
      activityState: v.activityState,
      openTaskCount: v.openTaskCount,
      nextDeparture: v.nextDeparture,
      locationConfidence: v.locationConfidence,
    })),
    depots: depotList.length ? depotList : [{ id: activeDepot.id || 'default', name: activeDepot.name }],
    zones: [
      { id: 'yard', label: 'Yard', kind: 'bay' },
      { id: 'workshop', label: 'Workshop', kind: 'workshop' },
      { id: 'inspection', label: 'Inspection', kind: 'inspection' },
    ],
    driverMessages: await loadYardDriverMessagesForHub(context.companyId),
    bodyworkReports: await loadYardBodyworkReportsForHub(context.companyId),
    vehicleChecks: await loadYardVehicleChecksForHub(context.companyId),
  }
}

async function createYardTaskRoute(request: Request) {
  const context = await authenticate(request)
  try {
    const input = await readJson<Row>(request)
    const vehicleId = String(input.vehicleId ?? '')
    const actorName = String(input.actorName ?? context.user.email ?? 'Yard user')
    if (!vehicleId) return apiError(400, 'vehicleId is required')

    const { data: vehicle, error: vehicleError } = await admin
      .from('vehicles')
      .select('id, registration, primary_depot_id, depots(name)')
      .eq('company_id', context.companyId)
      .eq('id', vehicleId)
      .maybeSingle()
    if (vehicleError || !vehicle) return apiError(404, 'Vehicle not found')

    const taskType = String(input.taskType ?? 'move_vehicle')
    const title = String(input.title ?? YARD_TASK_TYPE_LABELS[taskType] ?? 'Yard task')
    const depot = (vehicle.depots as Row | null) ?? {}
    const now = new Date().toISOString()

    const { error } = await admin.from('yard_tasks').insert({
      company_id: context.companyId,
      depot_id: vehicle.primary_depot_id ?? null,
      vehicle_id: vehicle.id,
      registration_number: vehicle.registration ?? '—',
      task_type: taskType,
      title,
      priority: String(input.priority ?? 'routine'),
      status: input.assignedStaffName ? 'assigned' : 'open',
      assigned_staff_name: input.assignedStaffName ? String(input.assignedStaffName) : null,
      due_at: input.dueAt ? String(input.dueAt) : null,
      instructions: input.instructions ? String(input.instructions) : null,
      evidence_required: Boolean(input.evidenceRequired),
      blocking_release: Boolean(input.blockingRelease),
      created_by: actorName,
      source_app: 'command',
      created_at: now,
      updated_at: now,
    })
    if (error) return apiError(400, error.message)

    const depotId = vehicle.primary_depot_id ? String(vehicle.primary_depot_id) : null
    return json(await yardHubData(context, depotId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Could not create yard task')
  }
}

async function startYardTaskRoute(request: Request, taskId: string) {
  const context = await authenticate(request)
  try {
    const input = await readJson<Row>(request).catch(() => ({} as Row))
    const actorName = String(input.actorName ?? context.user.email ?? 'Yard user')
    const { data: task, error: loadError } = await admin
      .from('yard_tasks')
      .select('id, depot_id')
      .eq('company_id', context.companyId)
      .eq('id', taskId)
      .maybeSingle()
    if (loadError || !task) return apiError(404, 'Task not found')

    const { error } = await admin
      .from('yard_tasks')
      .update({
        status: 'in_progress',
        assigned_staff_name: input.assignedStaffName ? String(input.assignedStaffName) : actorName,
        source_app: 'yard',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('company_id', context.companyId)
    if (error) return apiError(400, error.message)

    return json(await yardHubData(context, task.depot_id ? String(task.depot_id) : null))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Could not start yard task')
  }
}

async function completeYardTaskRoute(request: Request, taskId: string) {
  const context = await authenticate(request)
  try {
    const input = await readJson<Row>(request)
    const actorName = String(input.actorName ?? context.user.email ?? 'Yard user')
    const { data: task, error: loadError } = await admin
      .from('yard_tasks')
      .select('id, depot_id')
      .eq('company_id', context.companyId)
      .eq('id', taskId)
      .maybeSingle()
    if (loadError || !task) return apiError(404, 'Task not found')

    const now = new Date().toISOString()
    const { error } = await admin
      .from('yard_tasks')
      .update({
        status: 'completed',
        completed_at: now,
        completion_note: input.notes ? String(input.notes) : input.note ? String(input.note) : null,
        source_app: 'yard',
        updated_at: now,
      })
      .eq('id', taskId)
      .eq('company_id', context.companyId)
    if (error) return apiError(400, error.message)

    return json(await yardHubData(context, task.depot_id ? String(task.depot_id) : null))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Could not complete yard task')
  }
}

async function recordYardMovementRoute(request: Request) {
  const context = await authenticate(request)
  try {
    const input = await readJson<Row>(request)
    const vehicleId = String(input.vehicleId ?? '')
    const actorName = String(input.actorName ?? context.user.email ?? 'Yard user')
    const destinationBay = String(input.destinationBay ?? input.toBayId ?? '')
    const reason = String(input.reason ?? input.note ?? 'Yard move')
    if (!vehicleId || !destinationBay) return apiError(400, 'vehicleId and destinationBay are required')

    const { data: vehicle, error: vehicleError } = await admin
      .from('vehicles')
      .select('id, registration, primary_depot_id, depots(name)')
      .eq('company_id', context.companyId)
      .eq('id', vehicleId)
      .maybeSingle()
    if (vehicleError || !vehicle) return apiError(404, 'Vehicle not found')

    const depot = (vehicle.depots as Row | null) ?? {}
    const now = new Date().toISOString()
    const fromLocation = input.fromLocation ? String(input.fromLocation) : input.fromBayId ? String(input.fromBayId) : 'Yard'

    const { error } = await admin.from('yard_movements').insert({
      company_id: context.companyId,
      depot_id: vehicle.primary_depot_id ?? null,
      depot_name: depot.name ? String(depot.name) : null,
      vehicle_id: vehicle.id,
      registration_number: vehicle.registration ?? '—',
      from_location: fromLocation,
      to_location: destinationBay,
      reason,
      status: 'completed',
      requested_by: actorName,
      completed_by: actorName,
      started_at: now,
      completed_at: now,
      note: input.note ? String(input.note) : null,
      source_app: input.sourceApp ? String(input.sourceApp) : 'yard',
      created_at: now,
    })
    if (error) return apiError(400, error.message)

    const depotId = vehicle.primary_depot_id ? String(vehicle.primary_depot_id) : null
    return json(await yardHubData(context, depotId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Could not record yard movement')
  }
}

async function applyYardMutationRoute(request: Request) {
  const context = await authenticate(request)
  try {
    const input = await readJson<Row>(request)
    const type = String(input.type ?? '')
    const payload = (input.payload ?? {}) as Row
    const depotId = String(input.depotId ?? payload.depotId ?? '')
    const actorName = context.user.email ?? 'Yard user'

    if (type === 'vehicle.move') {
      return recordYardMovementRoute(
        new Request(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({
            vehicleId: payload.vehicleId,
            destinationBay: payload.toBayId ?? payload.destinationBay,
            fromBayId: payload.fromBayId,
            reason: payload.reason ?? payload.note ?? 'Yard move',
            note: payload.note,
            actorName,
            sourceApp: 'yard',
          }),
        }),
      )
    }

    if (type === 'task.update') {
      const taskId = String(payload.taskId ?? '')
      const action = String(payload.action ?? '')
      if (!taskId) return apiError(400, 'taskId is required')

      if (action === 'complete') {
        return completeYardTaskRoute(
          new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({ taskId, notes: payload.note, actorName }),
          }),
          taskId,
        )
      }
      if (action === 'accept' || action === 'start') {
        return startYardTaskRoute(
          new Request(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({ actorName, assignedStaffName: payload.assigneeName }),
          }),
          taskId,
        )
      }
    }

    return json({ ok: true, serverId: `ack_${Date.now()}` })
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Yard mutation failed')
  }
}

async function loadMembershipDepots(context: { companyId: string; membershipId: string }): Promise<Row[]> {
  const { data: accessRows } = await admin
    .from('depot_access')
    .select('depot_id, depots(id, company_id, name, code, address, status)')
    .eq('membership_id', context.membershipId)

  const fromAccess = (accessRows ?? [])
    .map((row: Row) => row.depots as Row | null)
    .filter((depot): depot is Row =>
      Boolean(depot && String(depot.company_id) === context.companyId && depot.status !== 'archived'),
    )

  if (fromAccess.length) return fromAccess

  const { data: companyDepots } = await admin
    .from('depots')
    .select('id, company_id, name, code, address, status')
    .eq('company_id', context.companyId)
    .neq('status', 'archived')
    .order('name')
  return companyDepots ?? []
}

async function yardDepots(request: Request) {
  const context = await authenticate(request)
  try {
    const depots = await loadMembershipDepots(context)
    return json(
      depots.map((d) => ({
        id: String(d.id),
        name: String(d.name ?? 'Depot'),
        code: d.code ? String(d.code) : null,
        address: d.address ? String(d.address) : null,
        status: d.status ? String(d.status) : null,
        companyId: String(d.company_id ?? context.companyId),
      })),
    )
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Yard depots failed')
  }
}

async function yardHub(request: Request) {
  const context = await authenticate(request)
  try {
    const url = new URL(request.url)
    const requestedDepot = url.searchParams.get('depotId') ?? url.searchParams.get('depot')
    return json(await yardHubData(context, requestedDepot))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Yard hub failed')
  }
}

async function loadYardBodyworkReportsForHub(companyId: string) {
  try {
    const { data, error } = await admin
      .from('defects')
      .select(
        'id, defect_reference, vehicle_id, description, severity, status, location_on_vehicle, component, reported_at, evidence, vehicles(registration, fleet_number)',
      )
      .eq('company_id', companyId)
      .eq('category', 'bodywork')
      .not('status', 'in', '("closed","rejected")')
      .order('reported_at', { ascending: false })
      .limit(40)
    if (error) {
      console.error('yard bodywork reports failed', error.message)
      return []
    }
    return (data ?? []).map((row: Row) => {
      const vehicle = (row.vehicles as Row | null) ?? {}
      const evidence = (row.evidence as Row | null) ?? {}
      return {
        id: String(row.id),
        defectRef: String(row.defect_reference ?? ''),
        vehicleId: String(row.vehicle_id ?? ''),
        registrationNumber: String(vehicle.registration ?? '—'),
        fleetNumber: vehicle.fleet_number ? String(vehicle.fleet_number) : null,
        description: String(row.description ?? ''),
        severity: String(row.severity ?? 'major'),
        status: String(row.status ?? 'reported'),
        zone: row.location_on_vehicle ? String(row.location_on_vehicle) : evidence.zone ? String(evidence.zone) : null,
        damageType: row.component ? String(row.component) : evidence.damageType ? String(evidence.damageType) : null,
        reportedAt: String(row.reported_at ?? ''),
        photoDataUrl:
          typeof evidence.photoDataUrl === 'string' && evidence.photoDataUrl.startsWith('data:')
            ? evidence.photoDataUrl
            : null,
        photoPath: evidence.photoPath ? String(evidence.photoPath) : null,
        vehicleCheckId: evidence.vehicleCheckId ? String(evidence.vehicleCheckId) : null,
        href: `/defects/${row.id}`,
      }
    })
  } catch (error) {
    console.error('yard bodywork reports failed', error)
    return []
  }
}

async function loadYardDriverMessagesForHub(companyId: string) {
  try {
    const { data, error } = await admin
      .from('messages')
      .select(
        'id, conversation_id, driver_id, subject, body, sent_at, source_app, audience, drivers(staff_members(first_name, last_name))',
      )
      .eq('company_id', companyId)
      .in('audience', ['yard', 'both'])
      .order('sent_at', { ascending: false })
      .limit(40)
    if (error) {
      console.error('yard driver messages failed', error.message)
      return []
    }
    return (data ?? []).map((row: Row) => {
      const staff = ((row.drivers as Row | null)?.staff_members as Row | null) ?? null
      return {
        id: String(row.id),
        conversationId: String(row.conversation_id ?? row.id),
        driverId: row.driver_id ? String(row.driver_id) : null,
        driverName: staff
          ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || 'Driver'
          : 'Driver',
        subject: String(row.subject ?? 'Driver message'),
        body: String(row.body ?? ''),
        sentAt: String(row.sent_at ?? ''),
        sourceApp: String(row.source_app ?? ''),
        audience: normalizeMessageAudience(row.audience),
      }
    })
  } catch (error) {
    console.error('yard driver messages failed', error)
    return []
  }
}

function mapChecksHubOperationalRow(input: {
  checkId: string
  vehicleId: unknown
  registrationNumber: unknown
  fleetNumber: unknown
  make?: unknown
  model?: unknown
  vehicleClass?: unknown
  depotId: unknown
  depotName: unknown
  checkType: unknown
  workStatus: string
  lifecycleStatus: string
  operationalStatus: string
  result: 'pass' | 'fail' | 'pass_with_advisory' | null
  validUntil: string | null
  nextDepartureTime: string | null
  driverName: string | null
  completedAt: string | null
  sourceApp?: unknown
}) {
  const failed = input.result === 'fail'
  const advisory = input.result === 'pass_with_advisory'
  const checkType = String(input.checkType ?? 'driver_pre_use')
  return {
    checkId: input.checkId,
    vehicleId: String(input.vehicleId ?? ''),
    registrationNumber: String(input.registrationNumber ?? '—'),
    fleetNumber: input.fleetNumber != null ? String(input.fleetNumber) : null,
    makeModel: [input.make, input.model].filter(Boolean).join(' ') || '—',
    vehicleCategory: String(input.vehicleClass ?? 'vehicle'),
    depotId: String(input.depotId ?? ''),
    depotName: String(input.depotName ?? '—'),
    operationalStatus: input.operationalStatus,
    lifecycleStatus: input.lifecycleStatus,
    checkType,
    checkTypeLabel: checkType.replace(/_/g, ' '),
    completedBy: input.driverName,
    sourceApplication: input.sourceApp ? String(input.sourceApp) : 'DRIVER',
    startedAt: null as string | null,
    submittedAt: input.completedAt,
    result: input.result,
    defectCount: 0,
    highestDefectSeverity: null as string | null,
    evidenceCount: 0,
    evidenceMissing: false,
    validUntil: input.validUntil,
    workStatus: input.workStatus,
    assignedRunReference: null as string | null,
    nextDepartureTime: input.nextDepartureTime,
    reviewerName: null as string | null,
    reviewStatus: failed ? 'awaiting_review' : input.result === 'pass' || advisory ? 'approved' : null,
    urgencyScore: failed ? 80 : advisory ? 35 : 10,
    exceptionLabels: failed ? ['Failed check'] : advisory ? ['Advisory'] : ([] as string[]),
    syncStatus: 'synced',
    suspiciousFlagCount: 0,
  }
}

async function checksHub(request: Request) {
  const context = await authenticate(request)
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const [{ data: depots }, { data: vehicles }, { data: submittedRows }] = await Promise.all([
      admin.from('depots').select('id, name').eq('company_id', context.companyId).order('name'),
      admin
        .from('vehicles')
        .select(
          'id, registration, fleet_number, make, model, vehicle_class, operational_status, primary_depot_id, depots(id, name)',
        )
        .eq('company_id', context.companyId)
        .limit(500),
      admin
        .from('vehicle_checks')
        .select(
          'id, vehicle_id, driver_id, check_type, result, ops_outcome, submitted_at, source_app, vehicles(registration, fleet_number, make, model, vehicle_class, primary_depot_id, depots(name)), drivers(staff_members(first_name, last_name))',
        )
        .eq('company_id', context.companyId)
        .gte('submitted_at', todayStart.toISOString())
        .order('submitted_at', { ascending: false })
        .limit(200),
    ])

    const depotList = (depots ?? []).map((d: Row) => ({ id: String(d.id), name: String(d.name ?? 'Depot') }))
    const latestByVehicle = new Map<string, Row>()
    for (const row of submittedRows ?? []) {
      const vehicleId = String(row.vehicle_id ?? '')
      if (vehicleId && !latestByVehicle.has(vehicleId)) latestByVehicle.set(vehicleId, row as Row)
    }

    const overview = (vehicles ?? []).map((v: Row) => {
      const depot = (v.depots as Row | null) ?? {}
      const op = String(v.operational_status ?? 'available')
      const vor = op === 'vor' || op === 'quarantined'
      const inProgress = op === 'awaiting_check' || op === 'under_inspection'
      const check = latestByVehicle.get(String(v.id))
      const result = check ? String(check.result ?? '') : ''
      const failed = result === 'fail' || result === 'failed'
      const advisory = result === 'pass_with_advisory'
      const passed =
        result === 'pass' || result === 'passed' || result === 'nil_defect' || result === 'pass_with_advisory'
      const staff = ((check?.drivers as Row | null)?.staff_members as Row | null) ?? null
      const driverName = staff
        ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || null
        : null
      return mapChecksHubOperationalRow({
        checkId: check ? String(check.id) : `chk-${v.id}`,
        vehicleId: v.id,
        registrationNumber: v.registration ?? '—',
        fleetNumber: v.fleet_number ?? null,
        make: v.make,
        model: v.model,
        vehicleClass: v.vehicle_class,
        depotId: v.primary_depot_id ?? null,
        depotName: depot.name ?? '—',
        checkType: check ? String(check.check_type ?? 'driver_pre_use') : 'driver_pre_use',
        workStatus: inProgress ? 'in_progress' : vor || failed ? 'blocked' : passed ? 'completed' : 'assigned',
        lifecycleStatus: vor || failed ? 'expired' : inProgress ? 'in_progress' : passed ? 'approved' : 'assigned',
        operationalStatus: vor || failed ? 'vor' : inProgress ? 'check_in_progress' : 'ready',
        result: failed ? 'fail' : advisory ? 'pass_with_advisory' : passed ? 'pass' : vor ? 'fail' : null,
        validUntil: null,
        nextDepartureTime: null,
        driverName,
        completedAt: check?.submitted_at ? String(check.submitted_at) : null,
        sourceApp: check?.source_app,
      })
    })

    const submitted = (submittedRows ?? []).map((row: Row) => {
      const vehicle = (row.vehicles as Row | null) ?? {}
      const depot = (vehicle.depots as Row | null) ?? {}
      const staff = ((row.drivers as Row | null)?.staff_members as Row | null) ?? null
      const result = String(row.result ?? '')
      const failed = result === 'fail' || result === 'failed'
      const advisory = result === 'pass_with_advisory'
      return mapChecksHubOperationalRow({
        checkId: String(row.id),
        vehicleId: row.vehicle_id,
        registrationNumber: vehicle.registration ?? '—',
        fleetNumber: vehicle.fleet_number ?? null,
        make: vehicle.make,
        model: vehicle.model,
        vehicleClass: vehicle.vehicle_class,
        depotId: vehicle.primary_depot_id ?? null,
        depotName: depot.name ?? '—',
        checkType: String(row.check_type ?? 'driver_pre_use'),
        workStatus: 'completed',
        lifecycleStatus: failed ? 'rejected' : 'approved',
        operationalStatus: failed ? 'vor' : 'ready',
        result: failed ? 'fail' : advisory ? 'pass_with_advisory' : 'pass',
        validUntil: null,
        nextDepartureTime: null,
        driverName: staff
          ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || null
          : null,
        completedAt: row.submitted_at ? String(row.submitted_at) : null,
        sourceApp: row.source_app,
      })
    })

    const summary = {
      vehiclesReady: overview.filter((r) => r.operationalStatus === 'ready').length,
      expiringSoon: 0,
      checksInProgress: overview.filter((r) => r.operationalStatus === 'check_in_progress').length,
      oldestInProgressMinutes: null,
      actionRequired: overview.filter((r) => r.operationalStatus === 'vor' || r.operationalStatus === 'check_in_progress').length,
      assignedDespiteIssue: 0,
      missingOrOverdue: overview.filter((r) => !r.submittedAt && r.operationalStatus === 'ready').length,
      departureDueSoon: 0,
      vehiclesOffRoad: overview.filter((r) => r.operationalStatus === 'vor').length,
      awaitingMaintenanceReview: submitted.filter((r) => r.result === 'fail').length,
    }

    const liveChecks = overview
      .filter((r) => r.operationalStatus === 'check_in_progress')
      .map((r) => ({
        checkId: r.checkId,
        vehicleId: r.vehicleId,
        registrationNumber: r.registrationNumber,
        performedBy: r.completedBy ?? '—',
        checkType: r.checkType,
        checkTypeLabel: r.checkTypeLabel,
        startedAt: r.startedAt ?? r.submittedAt ?? new Date().toISOString(),
        currentSection: 'In progress',
        completionPercent: 0,
        syncStatus: 'pending',
        lastSyncAt: null,
        deviceLabel: 'Driver app',
        nextDepartureTime: r.nextDepartureTime,
        minutesSinceStart: 0,
      }))

    return json({
      operationalDate: new Date().toISOString().slice(0, 10),
      summary,
      overview,
      liveChecks,
      submitted,
      actionQueue: overview.filter((r) => r.operationalStatus === 'vor'),
      overdue: [],
      history: submitted.slice(0, 50),
      depots: depotList,
      templates: [],
      intelligence: {
        suspiciousChecksToday: 0,
        recurringDefectVehicles: [],
        driverQualityAlerts: [],
        depotComparison: [],
        templatePerformance: [],
      },
    })
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Checks hub failed')
  }
}

function mapCheckAnswerLabel(status: unknown) {
  const s = String(status ?? '').toLowerCase()
  if (s === 'pass') return 'Yes / Pass'
  if (s === 'fail') return 'No / Fail'
  if (s === 'advisory') return 'Advisory — needs attention'
  if (s === 'na') return 'Not applicable'
  return String(status ?? '—')
}

function projectCheckDetailFromRow(row: Row) {
  const vehicle = (row.vehicles as Row | null) ?? {}
  const depot = (vehicle.depots as Row | null) ?? {}
  const staff = ((row.drivers as Row | null)?.staff_members as Row | null) ?? null
  const driverName = staff
    ? [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || null
    : null
  const checklist = (row.checklist as Row | null) ?? {}
  const evidence = (row.evidence as Row | null) ?? {}
  const responses = Array.isArray(checklist.responses) ? (checklist.responses as Row[]) : []
  const failedItems = Array.isArray(checklist.failedItems) ? (checklist.failedItems as Row[]) : []
  const photos = Array.isArray(evidence.photos) ? (evidence.photos as Row[]) : []
  const resultRaw = String(row.result ?? '').toLowerCase()
  const failed = resultRaw === 'fail' || resultRaw === 'failed'
  const withAdvisory = resultRaw === 'pass_with_advisory'
  const startedAt = row.started_at ? String(row.started_at) : evidence.startedAt ? String(evidence.startedAt) : null
  const submittedAt = row.submitted_at
    ? String(row.submitted_at)
    : evidence.submittedAt
      ? String(evidence.submittedAt)
      : String(row.created_at ?? '')
  const advisoryItems = Array.isArray(checklist.advisoryItems) ? (checklist.advisoryItems as Row[]) : []

  const sections = responses.map((r, index) => {
    const itemId = String(r.itemId ?? r.key ?? index)
    const fail = failedItems.find((f) => String(f.key ?? f.itemId) === itemId)
    const advisory = advisoryItems.find((f) => String(f.key ?? f.itemId) === itemId)
    const photo =
      (typeof r.photoDataUrl === 'string' && r.photoDataUrl.startsWith('data:')
        ? r.photoDataUrl
        : null) ??
      (typeof fail?.photoDataUrl === 'string' && String(fail.photoDataUrl).startsWith('data:')
        ? String(fail.photoDataUrl)
        : null) ??
      (typeof advisory?.photoDataUrl === 'string' && String(advisory.photoDataUrl).startsWith('data:')
        ? String(advisory.photoDataUrl)
        : null)
    return {
      id: itemId,
      section: String(r.sectionKey ?? r.category ?? 'Checklist'),
      question: String(r.questionTitle ?? r.label ?? itemId),
      answer: mapCheckAnswerLabel(r.responseStatus ?? r.status),
      answeredAt: submittedAt,
      createdDefectId: null,
      notes: r.driverNote
        ? String(r.driverNote)
        : fail?.note
          ? String(fail.note)
          : advisory?.note
            ? String(advisory.note)
            : null,
      photoDataUrl: photo,
      zone: fail?.zone ? String(fail.zone) : r.zone ? String(r.zone) : null,
      damageType: fail?.damageType ? String(fail.damageType) : r.damageType ? String(r.damageType) : null,
    }
  })

  const evidenceItems = [
    ...(evidence.odometerPhotoDataUrl && String(evidence.odometerPhotoDataUrl).startsWith('data:')
      ? [
          {
            id: 'odometer',
            kind: 'odometer' as const,
            label: `Odometer ${row.odometer ?? evidence.odometerReading ?? ''}`.trim(),
            capturedAt: String(evidence.odometerCapturedAt ?? startedAt ?? submittedAt),
            url: String(evidence.odometerPhotoDataUrl),
            sufficient: true,
          },
        ]
      : []),
    ...photos.map((photo, index) => ({
      id: String(photo.id ?? `photo-${index}`),
      kind: String(photo.kind ?? 'photo') as 'photo' | 'video' | 'signature' | 'odometer' | 'fuel' | 'note',
      label: String(photo.label ?? 'Evidence'),
      capturedAt: String(photo.capturedAt ?? submittedAt),
      url: photo.photoDataUrl && String(photo.photoDataUrl).startsWith('data:')
        ? String(photo.photoDataUrl)
        : null,
      sufficient: true,
    })),
  ]

  // Deduplicate odometer if also present in photos array
  const seen = new Set<string>()
  const uniqueEvidence = evidenceItems.filter((item) => {
    const key = `${item.kind}:${item.label}:${item.url?.slice(0, 48) ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    checkId: String(row.id),
    vehicleId: String(row.vehicle_id ?? ''),
    registrationNumber: String(vehicle.registration ?? '—'),
    fleetNumber: vehicle.fleet_number ? String(vehicle.fleet_number) : null,
    makeModel: [vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—',
    vehicleCategory: String(vehicle.vehicle_class ?? 'vehicle'),
    depotId: vehicle.primary_depot_id ? String(vehicle.primary_depot_id) : '',
    depotName: String(depot.name ?? '—'),
    operationalStatus: failed ? 'vor' : 'ready',
    lifecycleStatus: failed ? 'awaiting_review' : withAdvisory ? 'approved' : 'approved',
    checkType: String(row.check_type ?? 'driver_pre_use'),
    checkTypeLabel: String(row.check_type ?? 'Driver pre-use walkaround').replace(/_/g, ' '),
    completedBy: driverName,
    sourceApplication: String(row.source_app ?? 'DRIVER'),
    startedAt,
    submittedAt,
    result: failed ? 'fail' : withAdvisory ? 'pass_with_advisory' : 'pass',
    defectCount: failedItems.length,
    highestDefectSeverity: failedItems.some((f) => String(f.severity) === 'critical')
      ? 'dangerous'
      : failedItems.length
        ? 'major'
        : withAdvisory
          ? 'advisory'
          : null,
    evidenceCount: uniqueEvidence.length,
    evidenceMissing: uniqueEvidence.length === 0,
    validUntil: null,
    workStatus: 'completed',
    assignedRunReference: null,
    nextDepartureTime: null,
    reviewerName: null,
    reviewStatus: failed ? 'awaiting_review' : 'approved',
    urgencyScore: failed ? 80 : withAdvisory ? 35 : 10,
    exceptionLabels: failed ? ['Failed check'] : withAdvisory ? ['Advisory'] : [],
    syncStatus: 'synced',
    suspiciousFlagCount: 0,
    currentLocation: depot.name ? String(depot.name) : null,
    vorStatus: failed,
    currentDriverName: driverName,
    templateVersion: String(row.template_version ?? checklist.templateLabel ?? 'walkaround'),
    odometer: row.odometer ?? evidence.odometerReading ?? null,
    fuelLevel: row.fuel_level ? String(row.fuel_level) : null,
    sections,
    evidence: uniqueEvidence,
    timeline: [
      ...(startedAt
        ? [
            {
              id: 'tl-start',
              action: 'Check started',
              actorName: driverName ?? 'Driver',
              source: 'DRIVER',
              occurredAt: startedAt,
              detail: null,
            },
          ]
        : []),
      {
        id: 'tl-submit',
        action: 'Check submitted',
        actorName: driverName ?? 'Driver',
        source: 'DRIVER',
        occurredAt: submittedAt,
        detail: `Result: ${failed ? 'fail' : 'pass'} · Odometer ${row.odometer ?? '—'}`,
      },
    ],
    defectSummaries: failedItems.map((f, index) => ({
      id: String(f.key ?? index),
      description: String(f.note ?? f.label ?? 'Defect'),
      severity: String(f.severity ?? 'major') === 'critical' ? 'dangerous' : 'major',
    })),
    operationalImpact: null,
    suspiciousFlags: [],
    conditionalRelease: null,
    replacementCandidates: [],
  }
}

async function getCheckDetail(request: Request, checkId: string) {
  const context = await authenticate(request)
  const { data, error } = await admin
    .from('vehicle_checks')
    .select(
      'id, vehicle_id, driver_id, duty_id, check_type, template_version, result, ops_outcome, odometer, fuel_level, started_at, submitted_at, created_at, checklist, evidence, source_app, vehicles(id, registration, fleet_number, make, model, vehicle_class, primary_depot_id, depots(id, name)), drivers(staff_members(first_name, last_name))',
    )
    .eq('company_id', context.companyId)
    .eq('id', checkId)
    .maybeSingle()

  if (error) return apiError(500, error.message, 'database_error')
  if (!data) return apiError(404, 'Vehicle check not found', 'not_found')
  return json(projectCheckDetailFromRow(data as Row))
}

async function loadYardVehicleChecksForHub(companyId: string) {
  try {
    const { data, error } = await admin
      .from('vehicle_checks')
      .select(
        'id, vehicle_id, driver_id, check_type, result, odometer, fuel_level, started_at, submitted_at, checklist, evidence, vehicles(registration, fleet_number), drivers(staff_members(first_name, last_name))',
      )
      .eq('company_id', companyId)
      .order('submitted_at', { ascending: false })
      .limit(30)
    if (error) {
      console.error('yard vehicle checks failed', error.message)
      return []
    }
    return (data ?? []).map((row: Row) => {
      const detail = projectCheckDetailFromRow(row)
      const evidence = (row.evidence as Row | null) ?? {}
      return {
        id: detail.checkId,
        registrationNumber: detail.registrationNumber,
        fleetNumber: detail.fleetNumber,
        driverName: detail.completedBy,
        checkType: detail.checkTypeLabel,
        result: detail.result,
        odometer: detail.odometer,
        fuelLevel: detail.fuelLevel,
        startedAt: detail.startedAt,
        submittedAt: detail.submittedAt,
        sectionCount: detail.sections.length,
        failCount: detail.defectCount,
        evidenceCount: detail.evidenceCount,
        odometerPhotoDataUrl:
          typeof evidence.odometerPhotoDataUrl === 'string' &&
          evidence.odometerPhotoDataUrl.startsWith('data:')
            ? evidence.odometerPhotoDataUrl
            : null,
        href: `/vehicle-checks/${detail.checkId}`,
        sections: detail.sections,
        evidence: detail.evidence,
      }
    })
  } catch (error) {
    console.error('yard vehicle checks failed', error)
    return []
  }
}

function resolveStaffInvitationAppType(applications: unknown, roleKey: string): 'COMMAND' | 'YARD' | 'DRIVER' {
  const apps = Array.isArray(applications) ? applications.map(String) : []
  if (apps.includes('yard') || ['yard_manager', 'yard_operative', 'contractor'].includes(roleKey)) return 'YARD'
  if (apps.includes('driver') || roleKey === 'driver') return 'DRIVER'
  return 'COMMAND'
}

function staffRoleLabel(roleKey: string): string {
  return roleKey.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

async function loadStaffMember(companyId: string, staffId: string) {
  const { data, error } = await admin
    .from('staff_members')
    .select('*, depots(id, name)')
    .eq('company_id', companyId)
    .eq('id', staffId)
    .maybeSingle()
  if (error || !data) throw new Error('Staff member not found')
  return data as Row
}

async function projectStaffProfile(companyId: string, staffId: string, inviteMeta?: Row | null, roleKey = 'dispatcher') {
  const row = await loadStaffMember(companyId, staffId)
  const depot = (row.depots as Row | null) ?? {}
  const email = row.email ? String(row.email).toLowerCase() : ''
  const nowIso = new Date().toISOString()

  let pendingInvite: Row | null = inviteMeta ?? null
  if (!pendingInvite && email) {
    const { data } = await admin
      .from('invitations')
      .select('id, status, expires_at, app_type, created_at')
      .eq('company_id', companyId)
      .eq('email', email)
      .eq('status', 'pending')
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    pendingInvite = data as Row | null
  }

  const hasUser = Boolean(row.user_id)
  const invitePending = Boolean(pendingInvite)
  const accountStatus = hasUser ? 'active' : invitePending ? 'invitation_pending' : 'no_account'

  return {
    id: String(row.id),
    personId: `person-${row.id}`,
    reference: row.employee_number ? String(row.employee_number) : `STF-${String(row.id).slice(0, 8)}`,
    firstName: String(row.first_name ?? ''),
    lastName: String(row.last_name ?? ''),
    preferredName: row.preferred_name ? String(row.preferred_name) : null,
    employeeNumber: row.employee_number ? String(row.employee_number) : null,
    pronouns: null,
    jobTitle: String(row.job_title ?? 'Staff'),
    department: 'Operations',
    departmentId: row.department_id ? String(row.department_id) : 'dept-operations',
    team: null,
    employmentStatus: 'active',
    dutyStatus: 'off_duty',
    contractType: 'full_time',
    startDate: nowIso.slice(0, 10),
    endDate: null,
    lineManagerId: null,
    lineManagerName: null,
    costCentre: null,
    workEmail: email,
    personalEmail: null,
    workPhone: null,
    mobilePhone: row.phone ? String(row.phone) : null,
    preferredContactMethod: 'email' as const,
    emergencyContactName: null,
    emergencyContactPhone: null,
    primaryDepotId: row.primary_depot_id ? String(row.primary_depot_id) : '',
    primaryDepotName: depot.name ? String(depot.name) : '—',
    depotAssignments: row.primary_depot_id
      ? [{
          depotId: String(row.primary_depot_id),
          depotName: depot.name ? String(depot.name) : 'Depot',
          assignmentType: 'primary' as const,
          roleAtDepot: String(row.job_title ?? 'Staff'),
          startDate: nowIso.slice(0, 10),
          endDate: null,
          status: 'active' as const,
        }]
      : [],
    roleAssignments: [{
      roleKey,
      roleLabel: staffRoleLabel(roleKey),
      scopeType: 'depot' as const,
      scopeLabel: depot.name ? String(depot.name) : 'Depot',
      depotIds: row.primary_depot_id ? [String(row.primary_depot_id)] : [],
      elevated: false,
      effectiveFrom: nowIso.slice(0, 10),
      expiresAt: null,
    }],
    applications: [{
      application: pendingInvite?.app_type === 'YARD' ? 'yard' : 'command',
      enabled: hasUser || invitePending,
      status: hasUser ? 'enabled' : invitePending ? 'invitation_pending' : 'disabled',
    }],
    account: {
      userAccountId: row.user_id ? String(row.user_id) : null,
      loginEmail: email,
      accountStatus,
      invitationStatus: invitePending ? 'sent' : hasUser ? 'accepted' : 'not_sent',
      invitationSentAt: pendingInvite?.created_at ? String(pendingInvite.created_at) : null,
      invitationAcceptedAt: hasUser ? nowIso : null,
      invitationExpiresAt: pendingInvite?.expires_at ? String(pendingInvite.expires_at) : null,
      accountCreatedAt: hasUser ? nowIso : null,
      lastLoginAt: null,
      lastFailedLoginAt: null,
      mfaEnabled: false,
      authProvider: 'email',
      activeSessionCount: 0,
      temporaryAccessExpiresAt: null,
      devInvitationToken: inviteMeta?.invitationToken ? String(inviteMeta.invitationToken) : null,
    },
    qualifications: [],
    documents: [],
    documentVersions: [],
    sessions: [],
    devices: [],
    governanceAlerts: [],
    lifecycleWorkflow: [],
    trainingRequirements: [],
    trainingStatus: 'not_required',
    trainingAccessBlocks: [],
    linkedDriverId: null,
    linkedDriverName: null,
    openTaskCount: 0,
    overdueTaskCount: 0,
    tasks: [],
    workingPattern: null,
    shifts: [],
    dutySessions: [],
    currentDutySessionId: null,
    onCall: false,
    overtimeAvailable: false,
    responsibilities: [],
    operationalAlerts: [],
    auditEvents: [],
    createdAt: row.created_at ? String(row.created_at) : nowIso,
    updatedAt: row.updated_at ? String(row.updated_at) : nowIso,
  }
}

async function createStaff(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const workEmail = String(input.workEmail ?? '').trim().toLowerCase()
  const jobTitle = String(input.jobTitle ?? '').trim()
  if (!firstName || !lastName) return apiError(400, 'First and last name are required')
  if (!workEmail.includes('@')) return apiError(400, 'A valid work email is required')
  if (!jobTitle) return apiError(400, 'Job title is required')

  const roleKey = String(input.roleKey ?? 'dispatcher')
  const primaryDepotId = isUuid(input.primaryDepotId) ? String(input.primaryDepotId) : null
  const scopeDepotIds = Array.isArray(input.scopeDepotIds)
    ? input.scopeDepotIds.filter((id: unknown) => isUuid(id)).map(String)
    : primaryDepotId
      ? [primaryDepotId]
      : []

  const { data: staff, error: staffError } = await admin
    .from('staff_members')
    .insert({
      company_id: context.companyId,
      first_name: firstName,
      last_name: lastName,
      preferred_name: input.preferredName ? String(input.preferredName) : null,
      employee_number: input.employeeNumber ? String(input.employeeNumber) : null,
      job_title: jobTitle,
      department_id: isUuid(input.departmentId) ? input.departmentId : null,
      primary_depot_id: primaryDepotId,
      email: workEmail,
      phone: input.mobilePhone ? String(input.mobilePhone) : null,
      employment_status: 'active',
      status: 'active',
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (staffError || !staff) return apiError(400, staffError?.message ?? 'Staff member could not be created')

  let inviteMeta: Row | null = null
  if (input.sendInvitation !== false) {
    try {
      const appType = resolveStaffInvitationAppType(input.applications, roleKey)
      const invite = await createCompanyInvitation({
        companyId: context.companyId,
        invitedBy: context.user.id,
        email: workEmail,
        roleName: roleKey,
        depotIds: scopeDepotIds,
        appType,
        expiresInDays: 7,
      })
      inviteMeta = { ...invite.invitation, invitationToken: invite.invitationToken }
    } catch (inviteError) {
      return apiError(400, inviteError instanceof Error ? inviteError.message : 'Invitation could not be created')
    }
  }

  const profile = await projectStaffProfile(context.companyId, String(staff.id), inviteMeta, roleKey)
  return json(profile, 201)
}

async function getStaffProfile(request: Request, staffId: string) {
  const context = await authenticate(request)
  try {
    const profile = await projectStaffProfile(context.companyId, staffId)
    return json(profile)
  } catch (error) {
    return apiError(404, error instanceof Error ? error.message : 'Staff member not found')
  }
}

async function sendStaffInvitation(request: Request, staffId: string) {
  const context = await authenticate(request)
  try {
    const row = await loadStaffMember(context.companyId, staffId)
    const email = row.email ? String(row.email).trim().toLowerCase() : ''
    if (!email) return apiError(400, 'Add a work email before sending an invitation.')

    const input = await readJson<Row>(request).catch(() => ({} as Row))
    const roleKey = String(input.roleKey ?? 'yard_manager')
    const appType = resolveStaffInvitationAppType(input.applications, roleKey)
    const depotIds = row.primary_depot_id ? [String(row.primary_depot_id)] : []

    const invite = await createCompanyInvitation({
      companyId: context.companyId,
      invitedBy: context.user.id,
      email,
      roleName: roleKey,
      depotIds,
      appType,
      expiresInDays: input.expiresInDays ? Number(input.expiresInDays) : 7,
    })

    const profile = await projectStaffProfile(context.companyId, staffId, {
      ...invite.invitation,
      invitationToken: invite.invitationToken,
    }, roleKey)
    return json(profile)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Invitation could not be sent')
  }
}

async function staffHub(request: Request) {
  const context = await authenticate(request)
  try {
    const { data, error } = await admin
      .from('staff_members')
      .select('*, depots(id, name)')
      .eq('company_id', context.companyId)
      .order('last_name', { ascending: true })
      .limit(500)
    if (error) return apiError(500, error.message)

    const staffIds = (data ?? []).map((row: Row) => String(row.id))
    const { data: linkedDrivers } = staffIds.length
      ? await admin.from('drivers').select('id, staff_id').eq('company_id', context.companyId).in('staff_id', staffIds)
      : { data: [] as Row[] }
    const driverStaffIds = new Set((linkedDrivers ?? []).map((d: Row) => String(d.staff_id)))

    const rows = (data ?? []).map((row: Row) => {
      const depot = (row.depots as Row | null) ?? {}
      const employmentRaw = String(row.employment_status ?? 'active')
      const employmentStatus =
        employmentRaw === 'left' || employmentRaw === 'left_company'
          ? 'left_company'
          : employmentRaw === 'suspended'
            ? 'suspended'
            : 'active'
      const accountStatus = row.user_id ? 'active' : 'no_account'
      return {
        staffId: row.id,
        reference: row.employee_number ?? `STF-${String(row.id).slice(0, 8)}`,
        firstName: row.first_name,
        lastName: row.last_name,
        employeeNumber: row.employee_number ?? null,
        jobTitle: row.job_title ?? 'Staff',
        department: 'Operations',
        primaryDepotName: depot.name ?? '—',
        additionalDepotCount: 0,
        roleLabel: row.user_id ? 'User linked' : 'No account',
        employmentStatus,
        accountStatus,
        dutyStatus: 'off_duty',
        trainingStatus: 'not_required',
        lastLoginAt: null,
        hasDriverProfile: driverStaffIds.has(String(row.id)),
        invitationStatus: row.user_id ? 'accepted' : 'not_sent',
      }
    })

    const active = rows.filter((r) => r.employmentStatus !== 'left_company')
    const former = rows.filter((r) => r.employmentStatus === 'left_company')
    const summary = {
      total: active.length,
      active: active.filter((r) => r.employmentStatus === 'active').length,
      onDuty: 0,
      invitationsPending: active.filter((r) => r.accountStatus === 'no_account').length,
      accessIssues: 0,
      trainingExpiring: 0,
      unassigned: active.filter((r) => r.primaryDepotName === '—').length,
    }

    return json({
      summary,
      rows: active,
      invitations: active.filter((r) => r.accountStatus === 'no_account'),
      former,
      departments: [],
      roles: [],
      shiftsToday: [],
      openTasks: [],
      pendingHandovers: [],
      controllersOnDuty: [],
      trainingGaps: [],
      trainingCompliance: { compliant: active.length, expiringSoon: 0, expired: 0, missing: 0 },
      requirementCatalog: [],
      pendingAccessReviews: [],
      segregationAlerts: [],
      contractorsExpiring: [],
      governanceSummary: {
        accessReviewsDue: 0,
        segregationWarnings: 0,
        contractorsExpiring: 0,
        mfaNonCompliant: 0,
        ssoEnabledCount: 0,
      },
      ssoPolicy: { enabled: false, provider: 'None', enforcedForElevated: false },
    })
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Staff hub failed')
  }
}

async function commandPage(request: Request, path: string) {
  const context = await authenticate(request)
  const { data, error } = await admin
    .from('command_page_snapshots')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('path', path)
    .maybeSingle()
  if (error) return apiError(500, error.message)
  if (!data) {
    return json({
      path,
      title: path,
      summary: 'No operational records yet for this view.',
      items: [],
      metrics: {},
    })
  }
  return json(expandRow(data))
}

async function availability(request: Request) {
  const context = await authenticate(request)
  const [drivers, vehicles, duties] = await Promise.all([
    admin.from('drivers').select('*').eq('company_id', context.companyId).eq('status', 'active'),
    admin.from('vehicles').select('*').eq('company_id', context.companyId).in('operational_status', ['available', 'allocated', 'in_service']),
    admin.from('duties').select('driver_id, depot_id, planned_sign_on_at, planned_sign_off_at, status').eq('company_id', context.companyId).in('status', ['planned', 'signed_on', 'in_progress']),
  ])
  return json({
    generatedAt: new Date().toISOString(),
    drivers: expandRow(drivers.data ?? []),
    vehicles: expandRow(vehicles.data ?? []),
    commitments: expandRow(duties.data ?? []),
  })
}

async function cancellations(request: Request) {
  const context = await authenticate(request)
  const { data, error } = await admin
    .from('bookings')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('status', 'cancelled')
    .order('updated_at', { ascending: false })
  if (error) return apiError(500, error.message)
  return json(expandRow(data ?? []))
}

async function complianceExpiries(request: Request) {
  const context = await authenticate(request)
  const days = Number(new URL(request.url).searchParams.get('days') ?? 30)
  const limit = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
  const { data: drivers } = await admin
    .from('drivers')
    .select('id, driver_number, licence_expiry_date')
    .eq('company_id', context.companyId)

  const items: Row[] = []
  for (const driver of drivers ?? []) {
    const expiry = driver.licence_expiry_date
    if (expiry && expiry <= limit) {
      items.push({
        id: `${driver.id}:licence`,
        entity_type: 'driver',
        entity_id: driver.id,
        entity_label: driver.driver_number,
        document_type: 'Driving licence',
        expiry_date: expiry,
      })
    }
  }
  const today = Date.now()
  const normalized = items.map((item) => {
    const remaining = Math.ceil((new Date(String(item.expiry_date)).getTime() - today) / 86_400_000)
    return { ...item, status: remaining < 0 ? 'expired' : 'expiring_soon', days_until_expiry: remaining }
  })
  return json({ items: expandRow(normalized) })
}

async function complianceDashboard(request: Request) {
  const context = await authenticate(request)
  const companyId = context.companyId
  const [drivers, vehicles, blockedDrivers, blockedVehicles] = await Promise.all([
    admin.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    admin.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['suspended', 'inactive']),
    admin.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('operational_status', ['vor', 'quarantined', 'restricted']),
  ])
  const total = (drivers.count ?? 0) + (vehicles.count ?? 0)
  const blocked = (blockedDrivers.count ?? 0) + (blockedVehicles.count ?? 0)
  return json({
    clearPercent: total === 0 ? 100 : Math.round(((total - blocked) / total) * 100),
    expiring: 0,
    blocked,
  })
}

async function globalSearch(request: Request) {
  const context = await authenticate(request)
  const term = (new URL(request.url).searchParams.get('q') ?? '').trim()
  if (term.length < 2) return json({ results: [] })
  const pattern = `%${term.replace(/[%_]/g, '')}%`
  const [drivers, vehicles, customers, bookings, staff] = await Promise.all([
    admin.from('drivers').select('id, driver_number, status').eq('company_id', context.companyId).ilike('driver_number', pattern).limit(10),
    admin.from('vehicles').select('id, registration, fleet_number, operational_status').eq('company_id', context.companyId).or(`registration.ilike.${pattern},fleet_number.ilike.${pattern}`).limit(10),
    admin.from('customers').select('id, trading_name, legal_name, status').eq('company_id', context.companyId).or(`trading_name.ilike.${pattern},legal_name.ilike.${pattern}`).limit(10),
    admin.from('bookings').select('id, booking_reference, status').eq('company_id', context.companyId).ilike('booking_reference', pattern).limit(10),
    admin.from('staff_members').select('id, first_name, last_name, employment_status').eq('company_id', context.companyId).or(`first_name.ilike.${pattern},last_name.ilike.${pattern}`).limit(10),
  ])
  return json({
    results: [
      ...(drivers.data ?? []).map((row) => ({ type: 'driver', id: row.id, label: row.driver_number, status: row.status, href: `/drivers/${row.id}` })),
      ...(vehicles.data ?? []).map((row) => ({ type: 'vehicle', id: row.id, label: row.registration ?? row.fleet_number, status: row.operational_status, href: `/vehicles/${row.id}` })),
      ...(customers.data ?? []).map((row) => ({ type: 'customer', id: row.id, label: row.trading_name ?? row.legal_name, status: row.status, href: `/customers/${row.id}` })),
      ...(bookings.data ?? []).map((row) => ({ type: 'booking', id: row.id, label: row.booking_reference, status: row.status, href: `/bookings/${row.id}` })),
      ...(staff.data ?? []).map((row) => ({ type: 'staff', id: row.id, label: `${row.first_name} ${row.last_name}`, status: row.employment_status, href: `/staff/${row.id}` })),
    ],
  })
}

async function profile(request: Request) {
  const context = await authenticate(request)
  const { data, error } = await admin.from('users').select('*').eq('id', context.user.id).single()
  if (error) return apiError(404, 'Profile not found')
  return json({ ...(expandRow(data) as Row), email: context.user.email })
}

async function health() {
  const { error } = await admin.from('companies').select('id').limit(1)
  return json({ status: error ? 'degraded' : 'ok', database: error ? error.message : 'connected', surface: 'command-api' }, error ? 503 : 200)
}

async function driverProfiles(request: Request, driverId?: string) {
  try {
    const context = await authenticate(request)
    if (driverId) await assertCompanyScopedDriver(driverId, context.companyId)
    const result = await projectDriverProfile(context.companyId, driverId)
    if (driverId && !result) return apiError(404, 'Driver not found', 'not_found')
    return json(result)
  } catch (error) {
    return toApiErrorResponse(error, 'Driver profile could not be loaded')
  }
}

async function driverSummary(request: Request) {
  try {
    const context = await authenticate(request)
    const profiles = (await projectDriverProfile(context.companyId)) as Row[]
    return json(summariseDrivers(profiles))
  } catch (error) {
    return toApiErrorResponse(error, 'Driver summary failed')
  }
}

async function vehicleProfiles(request: Request, vehicleId?: string) {
  const context = await authenticate(request)
  try {
    if (vehicleId) await assertCompanyScopedVehicle(vehicleId, context.companyId)
    const result = await projectVehicleProfile(context.companyId, vehicleId)
    if (vehicleId && !result) return apiError(404, 'Vehicle not found', 'not_found')
    return json(result)
  } catch (error) {
    return toApiErrorResponse(error, 'Vehicle projection failed')
  }
}

async function vehicleSummary(request: Request) {
  const context = await authenticate(request)
  try {
    const profiles = (await projectVehicleProfile(context.companyId)) as Row[]
    return json(summariseVehicles(profiles))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Vehicle summary failed')
  }
}

async function bookingsList(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await projectBookingList(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Booking projection failed')
  }
}

async function dutiesList(request: Request, dutyId?: string) {
  const context = await authenticate(request)
  const date = new URL(request.url).searchParams.get('date')
  try {
    if (dutyId) await assertCompanyScopedDuty(dutyId, context.companyId)
    const result = await projectDuties(context.companyId, date, dutyId)
    if (dutyId && !result) return apiError(404, 'Duty not found', 'not_found')
    return json(result)
  } catch (error) {
    return toApiErrorResponse(error, 'Duty projection failed')
  }
}

async function dutyTrack(request: Request, dutyId: string) {
  const context = await authenticate(request)
  try {
    await assertCompanyScopedDuty(dutyId, context.companyId)
    const track = await projectDutyTrack(context.companyId, dutyId)
    if (!track) return apiError(404, 'Duty not found', 'not_found')
    return json(track)
  } catch (error) {
    return toApiErrorResponse(error, 'Duty track failed')
  }
}

async function operationalTrips(request: Request, tripId?: string) {
  const context = await authenticate(request)
  try {
    const result = await projectOperationalTrips(context.companyId, tripId)
    if (tripId && !result) return apiError(404, 'Trip not found', 'not_found')
    return json(result)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Trip projection failed')
  }
}

async function operationalTripPosition(request: Request, tripId: string) {
  const context = await authenticate(request)
  try {
    const trip = await projectOperationalTrips(context.companyId, tripId)
    if (!trip) return apiError(404, 'Trip not found', 'not_found')
    return json(toOperationalPosition(trip as Record<string, unknown>))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Trip position failed')
  }
}

async function operationalTripForDuty(request: Request, dutyId: string) {
  const context = await authenticate(request)
  try {
    const trip = await projectOperationalTripByDuty(context.companyId, dutyId)
    if (!trip) return apiError(404, 'Operational trip not found for duty', 'not_found')
    return json(trip)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Duty trip projection failed')
  }
}

async function auditDriver(
  companyId: string,
  actorId: string,
  action: string,
  driverId: string,
  before: Row | null,
  after: Row | null,
  reason?: string,
) {
  await admin.from('audit_events').insert({
    company_id: companyId,
    actor_type: 'user',
    actor_id: actorId,
    action,
    entity_type: 'driver',
    entity_id: driverId,
    source_app: 'COMMAND',
    before_snapshot: before,
    after_snapshot: after,
    reason: reason ?? null,
  })
}

async function createDriver(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  if (!firstName || !lastName) return apiError(400, 'First and last name are required')

  const email = input.email ? String(input.email).trim().toLowerCase() : null
  const phone = input.phone ? String(input.phone).trim() : null

  const { data: staff, error: staffError } = await admin
    .from('staff_members')
    .insert({
      company_id: context.companyId,
      first_name: firstName,
      last_name: lastName,
      preferred_name: input.preferredName ? String(input.preferredName) : null,
      date_of_birth: input.dateOfBirth ? String(input.dateOfBirth) : null,
      employee_number: input.employeeNumber ? String(input.employeeNumber) : null,
      primary_depot_id: isUuid(input.depotId) ? input.depotId : null,
      email,
      phone,
      home_address: input.homeAddress ? String(input.homeAddress) : null,
      emergency_contact: input.emergencyContact ? String(input.emergencyContact) : null,
      employment_status: 'probation',
      status: 'active',
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (staffError || !staff) return apiError(400, staffError?.message ?? 'Staff create failed')

  const driverNumber = String(input.employeeNumber ?? `DRV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`)
  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .insert({
      company_id: context.companyId,
      staff_id: staff.id,
      driver_number: driverNumber,
      status: 'draft',
      operational_status: 'draft',
      onboarding_step: 'personal',
      account_status: 'not_created',
      primary_depot_id: isUuid(input.depotId) ? input.depotId : null,
      employment_type: input.employmentType ?? 'employee',
      licence_expiry_date: input.licenceExpiry ?? null,
      start_date: input.startDate ?? null,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (driverError || !driver) return apiError(400, driverError?.message ?? 'Driver create failed')

  await auditDriver(context.companyId, context.user.id, 'driver.draft_created', String(driver.id), null, {
    driverNumber,
    firstName,
    lastName,
  }, 'No app login created at this stage')

  const profile = await projectDriverProfile(context.companyId, driver.id as string)
  return json(profile, 201)
}

async function updateDriver(request: Request, driverId: string) {
  const context = await authenticate(request)
  try {
    await assertCompanyScopedDriver(driverId, context.companyId)
  } catch (error) {
    return toApiErrorResponse(error, 'Driver not found')
  }
  const input = await readJson<Row>(request)

  const { data: current, error: loadError } = await admin
    .from('drivers')
    .select('*, staff_members(id)')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (loadError || !current) return apiError(404, loadError?.message ?? 'Driver not found')

  const staffId = (current.staff_members as Row | null)?.id ?? current.staff_id
  const { data: currentStaff } = staffId
    ? await admin.from('staff_members').select('email, phone').eq('id', staffId).maybeSingle()
    : { data: null as Row | null }
  const nextEmail = input.email !== undefined
    ? (input.email ? String(input.email).trim().toLowerCase() : null)
    : undefined
  const emailChanged =
    nextEmail !== undefined &&
    (nextEmail ?? '') !== String(currentStaff?.email ?? '').trim().toLowerCase()
  const phoneChanged =
    input.phone !== undefined && String(input.phone ?? '') !== String(currentStaff?.phone ?? '')

  if ((emailChanged || phoneChanged) && !String(input.contactChangeReason ?? '').trim()) {
    return apiError(400, 'A reason is required when changing the driver’s login email or mobile number')
  }

  if (staffId) {
    const staffPatch: Row = {
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
    }
    if (input.firstName != null) staffPatch.first_name = String(input.firstName)
    if (input.lastName != null) staffPatch.last_name = String(input.lastName)
    if (input.preferredName !== undefined) staffPatch.preferred_name = input.preferredName
    if (input.dateOfBirth !== undefined) staffPatch.date_of_birth = input.dateOfBirth
    if (input.email !== undefined) staffPatch.email = nextEmail
    if (input.phone !== undefined) staffPatch.phone = input.phone
    if (input.homeAddress !== undefined) staffPatch.home_address = input.homeAddress
    if (input.emergencyContact !== undefined) staffPatch.emergency_contact = input.emergencyContact
    if (input.employeeNumber !== undefined) staffPatch.employee_number = input.employeeNumber
    await admin.from('staff_members').update(staffPatch).eq('id', staffId)
  }

  // Keep a pending invitation aligned with the driver’s login email on file.
  if (emailChanged && nextEmail && current.invitation_id) {
    await admin.from('invitations').update({
      email: nextEmail,
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
    }).eq('id', current.invitation_id).eq('company_id', context.companyId).eq('status', 'pending')
  }

  let operationalStatus = input.operationalStatus ? String(input.operationalStatus) : String(current.operational_status ?? current.status)
  const onboardingStep = input.onboardingStep ? String(input.onboardingStep) : current.onboarding_step
  if (String(current.operational_status ?? current.status) === 'draft' && onboardingStep && onboardingStep !== 'personal') {
    operationalStatus = 'onboarding'
  }
  if (onboardingStep === 'review') operationalStatus = input.operationalStatus ? String(input.operationalStatus) : 'pending_compliance'

  const driverPatch: Row = {
    updated_by: context.user.id,
    updated_at: new Date().toISOString(),
    onboarding_step: onboardingStep,
    operational_status: operationalStatus,
    status: operationalStatus === 'draft' || operationalStatus === 'onboarding' || operationalStatus === 'pending_compliance'
      ? (operationalStatus === 'draft' ? 'draft' : 'onboarding')
      : current.status,
  }
  if (input.employmentType != null) driverPatch.employment_type = input.employmentType
  if (input.startDate !== undefined) driverPatch.start_date = input.startDate
  if (input.managerName !== undefined) driverPatch.manager_name = input.managerName
  if (input.licenceExpiry !== undefined) driverPatch.licence_expiry_date = input.licenceExpiry
  if (input.licenceCountry !== undefined) driverPatch.licence_country = input.licenceCountry
  if (input.licenceCategories !== undefined) driverPatch.licence_categories = input.licenceCategories
  if (input.cpcExpiry !== undefined) driverPatch.cpc_expiry_date = input.cpcExpiry
  if (input.dbsExpiry !== undefined) driverPatch.dbs_expiry_date = input.dbsExpiry
  if (input.medicalExpiry !== undefined) driverPatch.medical_expiry_date = input.medicalExpiry
  if (input.dqcNumber !== undefined) driverPatch.dqc_number = input.dqcNumber
  if (input.tachoCardNumber !== undefined) driverPatch.tacho_card_number = input.tachoCardNumber
  if (input.tachoCardExpiry !== undefined) driverPatch.tacho_card_expiry = input.tachoCardExpiry
  if (input.rightToWorkStatus !== undefined) driverPatch.right_to_work_status = input.rightToWorkStatus
  if (Array.isArray(input.workPermissionKeys)) driverPatch.work_permission_keys = input.workPermissionKeys.map(String)
  if (Array.isArray(input.secondaryDepotIds)) {
    driverPatch.secondary_depot_ids = input.secondaryDepotIds.filter((id: unknown) => isUuid(id))
  }
  if (isUuid(input.depotId)) driverPatch.primary_depot_id = input.depotId

  const { error: updateError } = await admin.from('drivers').update(driverPatch).eq('id', driverId)
  if (updateError) return apiError(400, updateError.message)

  await auditDriver(
    context.companyId,
    context.user.id,
    emailChanged || phoneChanged ? 'driver.login_contact_updated' : 'driver.updated',
    driverId,
    {
      onboardingStep: current.onboarding_step,
      email: currentStaff?.email ?? null,
      phone: currentStaff?.phone ?? null,
    },
    {
      onboardingStep,
      operationalStatus,
      email: nextEmail !== undefined ? nextEmail : currentStaff?.email ?? null,
      phone: input.phone !== undefined ? input.phone : currentStaff?.phone ?? null,
    },
    String(input.contactChangeReason ?? '').trim() ||
      (onboardingStep ? `Onboarding step: ${onboardingStep}` : undefined),
  )

  const profile = await projectDriverProfile(context.companyId, driverId)
  return json(profile)
}

async function createDriverAppAccount(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const channel = String(input.channel ?? 'email') as 'email' | 'sms' | 'both'
  const resend = Boolean(input.resend)
  const forceResend = Boolean(input.force)

  const { data: driver, error } = await admin
    .from('drivers')
    .select('*, staff_members(id, email, phone, first_name, last_name, user_id)')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (error || !driver) return apiError(404, error?.message ?? 'Driver not found')

  const staff = (driver.staff_members as Row | null) ?? {}
  const email = staff.email ? String(staff.email).trim().toLowerCase() : null
  const phone = staff.phone ? String(staff.phone) : null
  if (channel !== 'sms' && !email) return apiError(400, 'Add an email address before sending the invitation.')
  if (channel !== 'email' && !phone) return apiError(400, 'Driver has no mobile number')
  if (!email) return apiError(400, 'Add an email address before sending the invitation.')

  const fullName = [staff.first_name, staff.last_name].filter(Boolean).join(' ').trim() || email

  // Soft rate-limit resends (15 minutes) unless explicitly forced.
  if (resend && !forceResend && driver.invitation_sent_at) {
    const lastSent = new Date(String(driver.invitation_sent_at)).getTime()
    const elapsed = Date.now() - lastSent
    if (!Number.isNaN(lastSent) && elapsed < 15 * 60_000) {
      const waitMins = Math.ceil((15 * 60_000 - elapsed) / 60_000)
      return apiError(
        429,
        `Invitation was sent recently. Wait about ${waitMins} minute(s) before resending, or use force after confirming delivery failed.`,
        'invite_rate_limited',
      )
    }
  }

  try {
    const existingAuthUser = await findAuthUserByEmail(email)
    const linkedUserId = staff.user_id ? String(staff.user_id) : null
    if (existingAuthUser && linkedUserId === existingAuthUser.id) {
      return apiError(
        400,
        'This driver already has an account. Use password recovery or revoke sessions instead of inviting again.',
      )
    }

    await revokePendingDriverInvitations({
      companyId: context.companyId,
      email,
      actorUserId: context.user.id,
      reason: resend ? 'superseded_by_resend' : 'replaced_before_send',
    })

    const invite = await createCompanyInvitation({
      companyId: context.companyId,
      invitedBy: context.user.id,
      email,
      roleName: 'driver',
      depotIds: driver.primary_depot_id ? [String(driver.primary_depot_id)] : [],
      appType: 'DRIVER',
      expiresInDays: 3,
    })

    let emailDelivery: {
      authUserId: string | null
      redirectTo: string
      appLink: string
      emailDelivered: boolean
    }
    try {
      emailDelivery = await sendDriverInvitationEmail({
        email,
        token: invite.invitationToken,
        driverId,
        companyId: context.companyId,
        invitationId: invite.invitation.id,
        fullName,
        depotId: driver.primary_depot_id ? String(driver.primary_depot_id) : null,
      })
    } catch (sendError) {
      const nowFailed = new Date().toISOString()
      await admin
        .from('invitations')
        .update({
          status: 'revoked',
          revoked_at: nowFailed,
          updated_by: context.user.id,
          updated_at: nowFailed,
        })
        .eq('id', invite.invitation.id)
      await admin.from('invitation_events').insert({
        invitation_id: invite.invitation.id,
        event_type: 'revoked',
        actor_user_id: context.user.id,
        metadata: {
          reason: 'email_delivery_failed',
          error: sendError instanceof Error ? sendError.message : 'unknown',
        },
      })
      await notifyCompanyAdmins({
        companyId: context.companyId,
        type: DRIVER_ONBOARDING_NOTIFICATION.appInviteDeliveryFailed,
        title: 'Driver app invite could not be delivered',
        body: `Invitation to ${fullName} (${email}) failed. Share the link manually or resend after checking the address.`,
        severity: 'critical',
        actionUrl: `/drivers/${driverId}?tab=Access`,
        sourceEntityId: driverId,
      })
      return apiError(502, friendlyInviteError(sendError), 'invite_email_failed')
    }

    const sentAt = new Date().toISOString()
    await admin.from('drivers').update({
      invitation_id: invite.invitation.id,
      invitation_channel: channel,
      invitation_sent_at: sentAt,
      invitation_expires_at: invite.invitation.expiresAt,
      account_status: 'invitation_sent',
      operational_status: 'pending_compliance',
      onboarding_step: 'review',
      updated_by: context.user.id,
      updated_at: sentAt,
    }).eq('id', driverId)

    await admin.from('driver_app_accounts').upsert({
      company_id: context.companyId,
      driver_id: driverId,
      invitation_id: invite.invitation.id,
      account_status: 'invitation_sent',
      invitation_channel: channel,
      invitation_sent_at: sentAt,
      invitation_expires_at: invite.invitation.expiresAt,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    }, { onConflict: 'driver_id' })

    await admin.from('invitation_events').insert({
      invitation_id: invite.invitation.id,
      event_type: 'sent',
      actor_user_id: context.user.id,
      metadata: {
        channel,
        authUserId: emailDelivery.authUserId,
        redirectTo: emailDelivery.redirectTo,
        emailDelivered: emailDelivery.emailDelivered,
        resend,
        existingAuthUser: Boolean(existingAuthUser),
      },
    })

    await auditDriver(
      context.companyId,
      context.user.id,
      resend ? 'driver.app_account_invite_resent' : 'driver.app_account_invited',
      driverId,
      null,
      {
        channel,
        invitationId: invite.invitation.id,
        authUserId: emailDelivery.authUserId,
        redirectTo: emailDelivery.redirectTo,
        emailDelivered: emailDelivery.emailDelivered,
        email,
      },
      emailDelivery.emailDelivered
        ? resend
          ? `Invitation resent to ${email}`
          : `Invitation sent to ${email}`
        : `Invitation ready for ${email} — share the Driver copy link (Auth user already exists)`,
    )

    const profile = await projectDriverProfile(context.companyId, driverId) as Row
    if (profile?.account && typeof profile.account === 'object') {
      ;(profile.account as Row).devInvitationToken = invite.invitationToken
      ;(profile.account as Row).emailDeliveryStatus = emailDelivery.emailDelivered ? 'sent' : 'manual'
      ;(profile.account as Row).inviteUrl = emailDelivery.appLink
    }
    return json(profile, 201)
  } catch (err) {
    return apiError(400, friendlyInviteError(err))
  }
}

async function activateDriver(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request).catch(() => ({} as Row))
  const profile = await projectDriverProfile(context.companyId, driverId) as Row | null
  if (!profile) return apiError(404, 'Driver not found')

  const eligibility = profile.eligibility as Row
  // Ignore onboarding_incomplete — activation is what clears that status (avoid catch-22).
  const failures = ((eligibility?.failures as Row[] | undefined) ?? []).filter(
    (f) => String(f.code) !== 'onboarding_incomplete',
  )
  if (failures.length) {
    return apiError(400, `Cannot activate: ${failures.map((f) => String(f.message)).join('; ')}`)
  }

  const hasRestrictions = Array.isArray(profile.restrictions) && (profile.restrictions as Row[]).some((r) => r.status === 'active')
  const operationalStatus = hasRestrictions ? 'restricted' : 'eligible'
  const now = new Date().toISOString()

  const { error: driverUpdateError } = await admin.from('drivers').update({
    status: 'active',
    operational_status: operationalStatus,
    onboarding_step: 'review',
    updated_by: context.user.id,
    updated_at: now,
  }).eq('id', driverId).eq('company_id', context.companyId)
  if (driverUpdateError) return apiError(400, driverUpdateError.message)

  // Unlock the Driver app shell — account was often still setup_incomplete after document review.
  await admin
    .from('driver_app_accounts')
    .update({
      account_status: 'active',
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('driver_id', driverId)
    .eq('company_id', context.companyId)

  const { data: driverRow } = await admin
    .from('drivers')
    .select('staff_id')
    .eq('id', driverId)
    .maybeSingle()
  if (driverRow?.staff_id) {
    await admin.from('staff_members').update({
      employment_status: 'active',
      updated_by: context.user.id,
      updated_at: now,
    }).eq('id', driverRow.staff_id)
  }

  await admin.from('driver_eligibility_results').insert({
    company_id: context.companyId,
    driver_id: driverId,
    eligible: true,
    blocking_reasons: [],
    warnings: ((eligibility.warnings as Row[]) ?? []).map((w) => String(w.code)),
    ruleset_version: 'command-onboarding-v1',
  })

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.activated',
    driverId,
    { operationalStatus: profile.operationalStatus },
    { operationalStatus },
    input.overrideReason ? String(input.overrideReason) : 'Activated after eligibility review',
  )

  return json(await projectDriverProfile(context.companyId, driverId))
}

async function suspendDriver(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const reason = String(input.reason ?? 'Suspended from Command')
  const keepAppAccess = Boolean(input.keepAppAccess)
  const now = new Date().toISOString()

  const { data: current } = await admin
    .from('drivers')
    .select('id, operational_status, account_status')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (!current) return apiError(404, 'Driver not found')

  await admin.from('drivers').update({
    status: 'suspended',
    operational_status: 'suspended',
    suspend_reason: reason,
    suspend_keep_app_access: keepAppAccess,
    suspend_review_date: input.reviewDate ? String(input.reviewDate) : null,
    suspended_at: now,
    account_status: keepAppAccess ? current.account_status : 'suspended',
    updated_by: context.user.id,
    updated_at: now,
  }).eq('id', driverId)

  if (!keepAppAccess) {
    await admin.from('driver_app_accounts').update({
      account_status: 'suspended',
      updated_by: context.user.id,
      updated_at: now,
    }).eq('driver_id', driverId)
  }

  try {
    await admin.from('operational_exceptions').insert({
      company_id: context.companyId,
      type: 'driver_suspended',
      status: 'open',
      severity: 'high',
      title: 'Driver suspended',
      description: reason,
      source_entity_type: 'driver',
      source_entity_id: driverId,
      created_by: context.user.id,
      source_app: 'COMMAND',
    })
  } catch {
    // Exception stub is best-effort
  }

  await auditDriver(context.companyId, context.user.id, 'driver.suspended', driverId, {
    operationalStatus: current.operational_status,
  }, { operationalStatus: 'suspended', keepAppAccess }, reason)

  return json(await projectDriverProfile(context.companyId, driverId))
}

async function cancelDriverInvitation(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request).catch(() => ({} as Row))
  const reason = String(input.reason ?? 'Revoked by administrator')
  const now = new Date().toISOString()

  const { data: driver } = await admin
    .from('drivers')
    .select('id, invitation_id, account_status')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (!driver) return apiError(404, 'Driver not found')

  if (driver.invitation_id) {
    await admin.from('invitations').update({
      status: 'revoked',
      revoked_at: now,
      updated_by: context.user.id,
      updated_at: now,
    }).eq('id', driver.invitation_id).eq('company_id', context.companyId)

    await admin.from('invitation_events').insert({
      invitation_id: driver.invitation_id,
      event_type: 'revoked',
      actor_user_id: context.user.id,
      metadata: { reason, driverId },
    })
  }

  await admin.from('drivers').update({
    invitation_id: null,
    invitation_sent_at: null,
    invitation_expires_at: null,
    account_status: 'not_created',
    updated_by: context.user.id,
    updated_at: now,
  }).eq('id', driverId)

  await admin.from('driver_app_accounts').update({
    invitation_id: null,
    account_status: 'not_created',
    invitation_sent_at: null,
    invitation_expires_at: null,
    updated_by: context.user.id,
    updated_at: now,
  }).eq('driver_id', driverId)

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.invitation_cancelled',
    driverId,
    { accountStatus: driver.account_status },
    { accountStatus: 'not_created' },
    reason,
  )

  return json(await projectDriverProfile(context.companyId, driverId))
}

async function initiateDriverPasswordReset(request: Request, driverId: string) {
  const context = await authenticate(request)
  const now = new Date().toISOString()

  const { data: driver } = await admin
    .from('drivers')
    .select('id, staff_members(email)')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (!driver) return apiError(404, 'Driver not found')

  const staff = (driver.staff_members as Row | null) ?? {}
  const email = staff.email ? String(staff.email) : null
  if (!email) return apiError(400, 'Driver has no email address for password reset')

  let invite
  try {
    invite = await createCompanyInvitation({
      companyId: context.companyId,
      invitedBy: context.user.id,
      email,
      roleName: 'driver',
      appType: 'DRIVER',
      expiresInDays: 2,
    })
  } catch (err) {
    return apiError(400, err instanceof Error ? err.message : 'Password reset invitation failed')
  }

  await admin.from('drivers').update({
    invitation_id: invite.invitation.id,
    invitation_sent_at: now,
    invitation_expires_at: invite.invitation.expiresAt,
    account_status: 'password_reset_required',
    updated_by: context.user.id,
    updated_at: now,
  }).eq('id', driverId)

  await admin.from('driver_app_accounts').update({
    invitation_id: invite.invitation.id,
    account_status: 'password_reset_required',
    invitation_sent_at: now,
    invitation_expires_at: invite.invitation.expiresAt,
    updated_by: context.user.id,
    updated_at: now,
  }).eq('driver_id', driverId)

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.password_reset_initiated',
    driverId,
    null,
    { accountStatus: 'password_reset_required' },
    'Password reset link created — email delivery may still be pending',
  )

  const profile = await projectDriverProfile(context.companyId, driverId) as Row
  if (profile?.account && typeof profile.account === 'object') {
    ;(profile.account as Row).devInvitationToken = invite.invitationToken
  }
  return json(profile)
}


async function revokeDriverDeviceHandler(request: Request, driverId: string, deviceId: string) {
  const result = await revokeDriverDeviceRecord(request, driverId, deviceId)
  if (result instanceof Response) return result
  return json(await projectDriverProfile(result.companyId, result.driverId))
}

async function revokeDriverSessions(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request).catch(() => ({} as Row))
  const reason = String(input.reason ?? 'Administrator revoked active sessions')
  const now = new Date().toISOString()

  const { data: app } = await admin
    .from('driver_app_accounts')
    .select('id, active_session_count, user_id')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .maybeSingle()

  if (app) {
    await admin.from('driver_app_accounts').update({
      active_session_count: 0,
      updated_by: context.user.id,
      updated_at: now,
    }).eq('id', app.id)

  }

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.sessions_revoked',
    driverId,
    { activeSessionCount: app?.active_session_count ?? 0 },
    { activeSessionCount: 0 },
    reason,
  )

  return json(await projectDriverProfile(context.companyId, driverId))
}

async function addDriverNote(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const body = String(input.body ?? '').trim()
  if (!body) return apiError(400, 'Note body is required')
  const category = String(input.category ?? 'general')
  const visibleToDriver = Boolean(input.visibleToDriver)
  const authorName = String(input.actorName ?? 'Administrator')

  const { data: driver } = await admin
    .from('drivers')
    .select('id')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (!driver) return apiError(404, 'Driver not found')

  await auditDriver(
    context.companyId,
    context.user.id,
    'driver.note_added',
    driverId,
    null,
    { category, body, visibleToDriver, authorName },
    body.slice(0, 200),
  )

  return json(await projectDriverProfile(context.companyId, driverId), 201)
}

async function driverIncidents(request: Request, driverId: string) {
  const context = await authenticate(request)
  const { data, error } = await admin
    .from('incidents')
    .select('id, reference, title, category, severity, status, occurred_at, outcome_summary, incident_type')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .order('occurred_at', { ascending: false })
    .limit(50)
  if (error) return apiError(500, error.message)

  return json(
    (data ?? []).map((row: Row) => ({
      id: row.id,
      incidentRef: row.reference ?? `INC-${String(row.id).slice(0, 8)}`,
      title: row.title ?? 'Incident',
      category: row.category ?? row.incident_type ?? 'operational',
      severity: row.severity ?? 'medium',
      status: row.status ?? 'open',
      occurredAt: row.occurred_at ? new Date(String(row.occurred_at)).toISOString() : new Date().toISOString(),
      outcomeSummary: row.outcome_summary ?? null,
      isAllegation: String(row.status) === 'under_investigation' || String(row.incident_type) === 'safeguarding',
      trainingActionRequired: false,
    })),
  )
}

async function uploadDriverDocument(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const requirementType = String(input.requirementType ?? '')
  const label = String(input.label ?? requirementType)
  if (!requirementType) return apiError(400, 'requirementType is required')

  const { error } = await admin.from('driver_documents').insert({
    company_id: context.companyId,
    driver_id: driverId,
    requirement_type: requirementType,
    label,
    reference_number: input.referenceNumber ?? null,
    expiry_date: input.expiryDate ?? null,
    verification_status: 'awaiting_review',
    file_name: input.fileName ?? null,
    created_by: context.user.id,
    updated_by: context.user.id,
    source_app: 'COMMAND',
  })
  if (error) return apiError(400, error.message)

  // Mirror expiry onto the driver compliance fields used by eligibility
  const expiryPatch: Row = {
    updated_by: context.user.id,
    updated_at: new Date().toISOString(),
  }
  if (input.expiryDate) {
    if (requirementType === 'driving_licence' || requirementType === 'licence') {
      expiryPatch.licence_expiry_date = input.expiryDate
    } else if (requirementType === 'dqc' || requirementType === 'cpc') {
      expiryPatch.cpc_expiry_date = input.expiryDate
    } else if (requirementType === 'dbs') {
      expiryPatch.dbs_expiry_date = input.expiryDate
    } else if (requirementType === 'medical') {
      expiryPatch.medical_expiry_date = input.expiryDate
    }
  }
  if (Object.keys(expiryPatch).length > 2) {
    await admin.from('drivers').update(expiryPatch).eq('id', driverId).eq('company_id', context.companyId)
  }

  await auditDriver(context.companyId, context.user.id, 'driver.document_uploaded', driverId, null, {
    requirementType,
    label,
  })
  // Notify other admins when evidence lands for review (skip the uploader).
  await notifyCompanyAdmins({
    companyId: context.companyId,
    type: DRIVER_ONBOARDING_NOTIFICATION.evidenceSubmitted,
    title: 'Driver evidence ready for review',
    body: `${label} was uploaded and is waiting for review.`,
    severity: 'attention',
    actionUrl: `/drivers/${driverId}?tab=Compliance`,
    sourceEntityId: driverId,
    excludeUserId: context.user.id,
  })
  return json(await projectDriverProfile(context.companyId, driverId), 201)
}

async function getDriverDocumentDownloadUrl(request: Request, driverId: string, documentId: string) {
  const context = await authenticate(request)
  const { data: doc, error: loadError } = await admin
    .from('driver_documents')
    .select('id, file_object_id, file_name, requirement_type, label')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .eq('id', documentId)
    .maybeSingle()
  if (loadError) return apiError(500, loadError.message)
  if (!doc?.file_object_id) {
    return apiError(404, 'No file is attached to this document yet.', 'no_file')
  }

  const { data: fileObj, error: fileError } = await admin
    .from('file_objects')
    .select('storage_key, mime_type, original_filename')
    .eq('company_id', context.companyId)
    .eq('id', String(doc.file_object_id))
    .maybeSingle()
  if (fileError) return apiError(500, fileError.message)
  if (!fileObj?.storage_key) return apiError(404, 'Stored file could not be found.', 'not_found')

  const { data: signed, error: signError } = await admin.storage
    .from('driver-documents')
    .createSignedUrl(String(fileObj.storage_key), 60 * 60)
  if (signError || !signed?.signedUrl) {
    return apiError(400, signError?.message ?? 'Could not open document file.', 'storage_error')
  }

  return json({
    url: signed.signedUrl,
    fileName: doc.file_name ?? fileObj.original_filename ?? `${doc.requirement_type}.jpg`,
    mimeType: fileObj.mime_type ?? 'application/octet-stream',
    label: doc.label ?? null,
  })
}

async function verifyDriverDocument(request: Request, driverId: string, documentId: string) {
  const context = await authenticate(request)
  const { data: doc, error: loadError } = await admin
    .from('driver_documents')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .eq('id', documentId)
    .maybeSingle()
  if (loadError) return apiError(500, loadError.message)
  if (!doc) return apiError(404, 'Document not found', 'not_found')

  const { error } = await admin
    .from('driver_documents')
    .update({
      verification_status: 'verified',
      verified_by: context.user.id,
      verified_at: new Date().toISOString(),
      rejection_reason: null,
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
  if (error) return apiError(400, error.message)

  const requirementType = String(doc.requirement_type ?? '')
  const expiryPatch: Row = {
    updated_by: context.user.id,
    updated_at: new Date().toISOString(),
  }
  if (doc.expiry_date) {
    if (requirementType === 'driving_licence' || requirementType === 'licence') {
      expiryPatch.licence_expiry_date = doc.expiry_date
    } else if (requirementType === 'dqc' || requirementType === 'cpc') {
      expiryPatch.cpc_expiry_date = doc.expiry_date
    } else if (requirementType === 'dbs') {
      expiryPatch.dbs_expiry_date = doc.expiry_date
    } else if (requirementType === 'medical') {
      expiryPatch.medical_expiry_date = doc.expiry_date
    }
  }
  if (Object.keys(expiryPatch).length > 2) {
    await admin.from('drivers').update(expiryPatch).eq('id', driverId).eq('company_id', context.companyId)
  }

  await auditDriver(context.companyId, context.user.id, 'driver.document_verified', driverId, null, {
    documentId,
    requirementType,
  })
  await syncDriverRequirementAfterDocumentVerified({
    companyId: context.companyId,
    driverId,
    userId: context.user.id,
    requirementType,
  })
  await maybeReleaseDriverForActivationTraining({
    companyId: context.companyId,
    driverId,
    actorUserId: context.user.id,
  })
  await notifyCompanyAdmins({
    companyId: context.companyId,
    type: DRIVER_ONBOARDING_NOTIFICATION.evidenceApproved,
    title: 'Onboarding evidence approved',
    body: `${String(requirementType).replace(/_/g, ' ')} verified for driver ${driverId.slice(0, 8)}.`,
    severity: 'info',
    actionUrl: `/drivers/${driverId}?tab=Eligibility`,
    sourceEntityId: driverId,
    excludeUserId: context.user.id,
  })
  return json(await projectDriverProfile(context.companyId, driverId))
}

async function rejectDriverDocument(request: Request, driverId: string, documentId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request).catch(() => ({} as Row))
  const reason = String(input.reason ?? 'Evidence unclear or invalid')
  const actorName = String(input.actorName ?? 'Admin')
  const requestResubmit = input.requestResubmit !== false

  const { data: doc, error: loadError } = await admin
    .from('driver_documents')
    .select('id, requirement_type, label')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .eq('id', documentId)
    .maybeSingle()
  if (loadError) return apiError(500, loadError.message)
  if (!doc) return apiError(404, 'Document not found', 'not_found')

  const { error } = await admin
    .from('driver_documents')
    .update({
      verification_status: 'rejected',
      rejection_reason: reason,
      verified_by: context.user.id,
      verified_at: new Date().toISOString(),
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
  if (error) return apiError(400, error.message)

  const requirementType = String(doc.requirement_type ?? '')
  const label = String(doc.label ?? requirementType.replace(/_/g, ' '))

  await syncDriverRequirementAfterDocumentRejected({
    companyId: context.companyId,
    driverId,
    userId: context.user.id,
    requirementType,
    label,
    reason,
    actorName,
    requestResubmit,
  })

  await auditDriver(context.companyId, context.user.id, 'driver.document_rejected', driverId, null, {
    documentId,
    reason,
    requestResubmit,
  })
  return json(await projectDriverProfile(context.companyId, driverId))
}

async function addDriverRestriction(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const type = String(input.type ?? '')
  if (!type) return apiError(400, 'Restriction type is required')

  const { error } = await admin.from('driver_restrictions').insert({
    company_id: context.companyId,
    driver_id: driverId,
    restriction_type: type,
    label: String(input.label ?? type),
    reason: String(input.reason ?? 'Recorded in Command'),
    status: 'active',
    created_by: context.user.id,
    updated_by: context.user.id,
    source_app: 'COMMAND',
  })
  if (error) return apiError(400, error.message)
  return json(await projectDriverProfile(context.companyId, driverId), 201)
}

/** Catalogue labels/renewal — keep aligned with admin `lib/drivers/training.ts`. */
const TRAINING_RECORD_META: Record<string, { label: string; requiredFor: string; renewalMonths: number | null; documentType?: string }> = {
  company_induction: { label: 'Company induction', requiredFor: 'All drivers', renewalMonths: null },
  driver_app: { label: 'Using Veyvio Driver', requiredFor: 'All drivers', renewalMonths: null },
  daily_vehicle_checks: { label: 'Daily vehicle checks', requiredFor: 'All drivers', renewalMonths: 12 },
  health_safety: { label: 'Health and safety', requiredFor: 'All drivers', renewalMonths: 36 },
  emergency_procedures: { label: 'Emergency / accident procedures', requiredFor: 'All drivers', renewalMonths: 12 },
  manual_handling: { label: 'Manual handling', requiredFor: 'All drivers', renewalMonths: 36, documentType: 'manual_handling' },
  midas_standard: { label: 'MiDAS Standard', requiredFor: 'Minibus / community transport', renewalMonths: 48, documentType: 'midas_standard' },
  safeguarding_adults: { label: 'Safeguarding adults', requiredFor: 'All drivers', renewalMonths: 36, documentType: 'safeguarding_adults' },
  first_aid_efaw: { label: 'Emergency First Aid at Work', requiredFor: 'All drivers', renewalMonths: 36, documentType: 'first_aid' },
  midas_accessible: { label: 'MiDAS Accessible module', requiredFor: 'Wheelchair / accessible transport', renewalMonths: 48, documentType: 'midas_accessible' },
  wheelchair_restraint: { label: 'Wheelchair restraint systems', requiredFor: 'Wheelchair passengers', renewalMonths: 36, documentType: 'wheelchair_training' },
  lift_ramp_operation: { label: 'Lift and ramp operation', requiredFor: 'Accessible vehicles', renewalMonths: 36, documentType: 'wheelchair_training' },
  safeguarding_children: { label: 'Safeguarding children', requiredFor: 'School / SEND transport', renewalMonths: 36, documentType: 'safeguarding_children' },
  send_autism_awareness: { label: 'SEND / autism awareness', requiredFor: 'SEND transport', renewalMonths: 36 },
  behaviour_management: { label: 'Behaviour management', requiredFor: 'SEND / school transport', renewalMonths: 36 },
  infection_prevention: { label: 'Infection prevention and control', requiredFor: 'Hospital transport', renewalMonths: 24 },
  dementia_awareness: { label: 'Dementia awareness', requiredFor: 'Hospital / elderly transport', renewalMonths: 36 },
  driver_cpc: { label: 'Driver CPC (periodic training)', requiredFor: 'PSV / coach', renewalMonths: 60, documentType: 'cpc' },
}

function defaultTrainingExpiryDate(trainingKey: string, completedAt: string): string | null {
  const meta = TRAINING_RECORD_META[trainingKey]
  if (!meta?.renewalMonths) return null
  const base = new Date(`${completedAt}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) return null
  base.setUTCMonth(base.getUTCMonth() + meta.renewalMonths)
  return base.toISOString().slice(0, 10)
}

async function recordDriverTraining(request: Request, driverId: string) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const trainingKey = String(input.trainingKey ?? '')
  const meta = TRAINING_RECORD_META[trainingKey]
  if (!meta) return apiError(400, 'Unknown training course')

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .select('id')
    .eq('company_id', context.companyId)
    .eq('id', driverId)
    .maybeSingle()
  if (driverError || !driver) return apiError(404, 'Driver not found', 'not_found')

  if (input.clear === true) {
    const { error } = await admin
      .from('driver_training')
      .delete()
      .eq('company_id', context.companyId)
      .eq('driver_id', driverId)
      .eq('training_key', trainingKey)
    if (error) return apiError(400, error.message)
    await auditDriver(context.companyId, context.user.id, 'driver.training_cleared', driverId, null, {
      trainingKey,
    })
    return json(await projectDriverProfile(context.companyId, driverId))
  }

  const completedAt = String(input.completedAt ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(completedAt)) {
    return apiError(400, 'completedAt must be YYYY-MM-DD')
  }

  const expiresAt =
    input.expiresAt === undefined || input.expiresAt === null || input.expiresAt === ''
      ? defaultTrainingExpiryDate(trainingKey, completedAt)
      : String(input.expiresAt)
  const trainer = String(input.trainer ?? input.provider ?? '').trim() || null

  const { error } = await admin.from('driver_training').upsert(
    {
      company_id: context.companyId,
      driver_id: driverId,
      training_key: trainingKey,
      label: meta.label,
      required_for: meta.requiredFor,
      status: 'complete',
      completed_at: completedAt,
      expires_at: expiresAt,
      trainer,
      updated_by: context.user.id,
      updated_at: new Date().toISOString(),
      created_by: context.user.id,
      source_app: 'COMMAND',
    },
    { onConflict: 'driver_id,training_key' },
  )
  if (error) return apiError(400, error.message)

  if (input.attachCertificate === true && meta.documentType) {
    await admin.from('driver_documents').insert({
      company_id: context.companyId,
      driver_id: driverId,
      requirement_type: meta.documentType,
      label: `${meta.label} certificate`,
      reference_number: input.certificateNumber ?? null,
      issuing_organisation: input.provider ?? trainer,
      issue_date: completedAt,
      expiry_date: expiresAt,
      verification_status: 'verified',
      verified_by: context.user.id,
      verified_at: new Date().toISOString(),
      notes: input.notes ?? null,
      file_name: `${meta.documentType}-certificate.pdf`,
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
  }

  await auditDriver(context.companyId, context.user.id, 'driver.training_recorded', driverId, null, {
    trainingKey,
    completedAt,
    expiresAt,
  })
  return json(await projectDriverProfile(context.companyId, driverId), 201)
}

async function createVehicle(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  const registration = String(input.registrationNumber ?? '')
  const fleetNumber = String(input.fleetNumber ?? `F-${crypto.randomUUID().slice(0, 4).toUpperCase()}`)
  if (!registration) return apiError(400, 'Registration is required')

  const { data: vehicle, error } = await admin
    .from('vehicles')
    .insert({
      company_id: context.companyId,
      fleet_number: fleetNumber,
      registration,
      make: input.make ?? null,
      model: input.model ?? null,
      vehicle_class: input.vehicleCategory ?? 'minibus',
      fuel_type: input.fuelType ?? 'diesel',
      seat_capacity: input.seatingCapacity ?? 0,
      wheelchair_capacity: input.wheelchairCapacity ?? 0,
      primary_depot_id: input.homeDepotId ?? null,
      operational_status: 'onboarding',
      ownership_type: input.ownershipType ?? 'owned',
      status: 'active',
      created_by: context.user.id,
      updated_by: context.user.id,
      source_app: 'COMMAND',
    })
    .select('id')
    .single()
  if (error || !vehicle) return apiError(400, error?.message ?? 'Vehicle create failed')
  const profile = await projectVehicleProfile(context.companyId, vehicle.id as string)
  return json(profile, 201)
}

async function ensureSeed(request: Request) {
  const context = await authenticate(request)
  try {
    const result = await seedDemoCompany(context.companyId, context.user.id)
    return json(result)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Seed failed')
  }
}

async function signup(request: Request) {
  const input = await readJson<{
    email?: string
    firstName?: string
    lastName?: string
    companyName?: string
    country?: string
    phone?: string
    password?: string
    termsAccepted?: boolean
    privacyAccepted?: boolean
  }>(request)
  try {
    const result = await startCompanySignup({
      email: String(input.email ?? ''),
      firstName: String(input.firstName ?? ''),
      lastName: String(input.lastName ?? ''),
      companyName: String(input.companyName ?? ''),
      country: String(input.country ?? 'GB'),
      phone: input.phone,
      password: String(input.password ?? ''),
      termsAccepted: Boolean(input.termsAccepted),
      privacyAccepted: Boolean(input.privacyAccepted),
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Signup failed')
  }
}

async function verifyEmail(request: Request) {
  const input = await readJson<{ token?: string }>(request)
  if (!input.token) return apiError(400, 'Verification token is required')
  try {
    const result = await verifySignupEmail(
      input.token,
      request.headers.get('x-forwarded-for'),
      request.headers.get('user-agent'),
    )
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Verification failed')
  }
}

async function companyVerification(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  try {
    const result = await submitCompanyVerification({
      companyId: context.companyId,
      userId: context.user.id,
      legalName: String(input.legalName ?? ''),
      tradingName: String(input.tradingName ?? ''),
      companiesHouseNumber: input.companiesHouseNumber ? String(input.companiesHouseNumber) : undefined,
      registeredAddress: (input.registeredAddress as Row) ?? undefined,
      operatingAddress: (input.operatingAddress as Row) ?? undefined,
      operatorLicenceNumber: input.operatorLicenceNumber ? String(input.operatorLicenceNumber) : undefined,
      phone: input.phone ? String(input.phone) : undefined,
      billingContact: (input.billingContact as Row) ?? undefined,
      transportManagerName: input.transportManagerName ? String(input.transportManagerName) : undefined,
      estimatedFleetSize: input.estimatedFleetSize ? Number(input.estimatedFleetSize) : undefined,
      estimatedUserCount: input.estimatedUserCount ? Number(input.estimatedUserCount) : undefined,
    })
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Verification could not be saved')
  }
}

async function contractAcceptance(request: Request) {
  const context = await authenticate(request)
  try {
    const result = await acceptCompanyContracts({
      companyId: context.companyId,
      userId: context.user.id,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      documents: [
        { documentType: 'subscription_agreement', documentVersion: '2026-07-1' },
        { documentType: 'data_processing_agreement', documentVersion: '2026-07-1' },
        { documentType: 'privacy_notice', documentVersion: '2026-07-1' },
        { documentType: 'acceptable_use_policy', documentVersion: '2026-07-1' },
      ],
    })
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Contracts could not be accepted')
  }
}

async function setupComplete(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  try {
    const result = await completeCompanySetup({
      companyId: context.companyId,
      userId: context.user.id,
      timezone: input.timezone ? String(input.timezone) : undefined,
      depotName: input.depotName ? String(input.depotName) : undefined,
      depotCode: input.depotCode ? String(input.depotCode) : undefined,
    })
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Setup could not be completed')
  }
}

async function createInvitation(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  try {
    const result = await createCompanyInvitation({
      companyId: context.companyId,
      invitedBy: context.user.id,
      email: String(input.email ?? ''),
      roleName: input.roleName ? String(input.roleName) : 'dispatcher',
      roleIds: Array.isArray(input.roleIds) ? input.roleIds.map(String) : undefined,
      depotIds: Array.isArray(input.depotIds) ? input.depotIds.map(String) : undefined,
      appType: (input.appType as 'COMMAND' | 'DRIVER' | 'YARD' | undefined) ?? 'COMMAND',
      expiresInDays: input.expiresInDays ? Number(input.expiresInDays) : 7,
    })
    return json({
      ...result,
      // Backward-compatible alias for Command invite UI
      devInvitationToken: result.invitationToken,
    }, 201)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Invitation could not be created')
  }
}

async function invitationsList(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await listCompanyInvitations(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Invitations could not be loaded')
  }
}

async function invitationPreview(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!token) return apiError(400, 'Invitation token is required')
  try {
    return json(await previewInvitation(token))
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Invitation unavailable')
  }
}

async function invitationAccept(request: Request) {
  const input = await readJson<Row>(request)
  try {
    const result = await acceptInvitation({
      token: String(input.token ?? ''),
      password: String(input.password ?? ''),
      firstName: String(input.firstName ?? ''),
      lastName: String(input.lastName ?? ''),
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Invitation could not be accepted')
  }
}

async function forgotPassword(request: Request) {
  const input = await readJson<{ email?: string }>(request)
  const result = await startPasswordReset(
    String(input.email ?? ''),
    request.headers.get('x-forwarded-for'),
    request.headers.get('user-agent'),
  )
  return json(result)
}

async function resetPassword(request: Request) {
  const input = await readJson<{ token?: string; password?: string }>(request)
  try {
    const result = await completePasswordReset(
      String(input.token ?? ''),
      String(input.password ?? ''),
      request.headers.get('x-forwarded-for'),
      request.headers.get('user-agent'),
    )
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Password could not be reset')
  }
}

async function setupMfa(request: Request) {
  const context = await authenticate(request)
  try {
    const input = await readJson<{ code?: string }>(request).catch(() => ({} as { code?: string }))
    if (input.code?.trim()) {
      const result = await confirmMfaForUser(context.user.id, input.code.trim(), context.companyId)
      return json(result)
    }
    const result = await beginMfaForUser(context.user.id, context.companyId)
    return json(result)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'MFA could not be enabled')
  }
}

async function verifyMfa(request: Request) {
  // No Authorization bearer is expected here — the caller has no valid session
  // until the code below is verified. The challenge itself (id + code) is the
  // only credential; the resulting session comes from the token stored
  // server-side when the challenge was created, never from client input.
  const input = await readJson<{ challengeId?: string; code?: string; companyId?: string }>(request)
  if (!input.challengeId || !input.code) return apiError(400, 'MFA challenge and code are required')
  try {
    const { userId, refreshToken } = await verifyMfaLoginChallenge(input.challengeId, input.code)
    const companyId = input.companyId
    if (companyId) {
      return activateCompany(userId, companyId, refreshToken, request)
    }
    const { data: memberships } = await admin
      .from('company_memberships')
      .select('company_id, companies(trading_name, legal_name)')
      .eq('user_id', userId)
      .eq('status', 'active')
    const options = (memberships ?? []).map((membership: Row) => {
      const company = membership.companies as Row | null
      return {
        tenantId: membership.company_id,
        companyId: membership.company_id,
        tenantName: company?.trading_name ?? company?.legal_name ?? 'Company',
        role: 'member',
      }
    })
    if (options.length === 1) {
      return activateCompany(userId, options[0].tenantId as string, refreshToken, request)
    }
    // Multiple companies — MFA has passed, so refresh the verified session now
    // and let the client complete company selection with a real, scoped token.
    const { data: refreshed, error: refreshError } = await publicClient().auth.refreshSession({
      refresh_token: refreshToken,
    })
    if (refreshError || !refreshed.session) {
      return apiError(401, 'Sign in again to select a company', 'session_refresh_failed')
    }
    return json({
      requiresTenantSelection: true,
      memberships: options,
      accessToken: refreshed.session.access_token,
      refreshToken: refreshed.session.refresh_token,
    })
  } catch (error) {
    return apiError(401, error instanceof Error ? error.message : 'MFA verification failed', 'mfa_failed')
  }
}

async function defectsHub(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await projectDefectsHub(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Defects hub failed')
  }
}

async function incidentsHub(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await projectIncidentsHub(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Incidents hub failed')
  }
}

async function maintenanceHub(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await projectMaintenanceHub(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Maintenance hub failed')
  }
}

async function inspectionsHub(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await projectInspectionsHub(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Inspections hub failed')
  }
}

async function fleetResourcesHub(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await projectFleetResourcesHub(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Fleet resources hub failed')
  }
}

async function supportGrantCreate(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  try {
    const result = await createSupportGrant({
      companyId: context.companyId,
      granteeUserId: String(input.granteeUserId ?? context.user.id),
      grantedBy: context.user.id,
      reason: String(input.reason ?? ''),
      ticketReference: input.ticketReference ? String(input.ticketReference) : undefined,
      accessLevel: input.accessLevel ? String(input.accessLevel) : 'read_only',
      durationMinutes: input.durationMinutes ? Number(input.durationMinutes) : 60,
    })
    return json(result, 201)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Support grant failed')
  }
}

async function supportGrantsList(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await listSupportGrants(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Support grants failed')
  }
}

async function retentionList(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await listRetentionPolicies(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Retention policies failed')
  }
}

async function exportCreate(request: Request) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request)
  try {
    const result = await requestCompanyExport({
      companyId: context.companyId,
      userId: context.user.id,
      exportType: input.exportType ? String(input.exportType) : undefined,
    })
    return json(result, 201)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Export failed')
  }
}

async function exportsList(request: Request) {
  const context = await authenticate(request)
  try {
    return json(await listExportJobs(context.companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Exports failed')
  }
}

async function dispatchCommandApi(request: Request): Promise<Response> {
  const path = routePath(request)
  const segments = path.split('/').filter(Boolean)

  // Platform admin (Veyvio staff) — no company module gate
  if (path === 'platform/companies' && request.method === 'GET') return platformCompanies(request)
  if (
    segments[0] === 'platform' &&
    segments[1] === 'companies' &&
    segments[2] &&
    !segments[3] &&
    request.method === 'GET'
  ) {
    return platformCompanyDetail(request, segments[2])
  }
  if (segments[0] === 'platform' && segments[1] === 'companies' && segments[2] && request.method === 'PATCH') {
    return platformPatchCompany(request, segments[2])
  }
  if (path === 'platform/plans' && request.method === 'GET') return platformPlans(request)
  if (path === 'platform/subscriptions' && request.method === 'GET') return platformSubscriptions(request)
  if (path === 'platform/audit' && request.method === 'GET') return platformAudit(request)
  if (path === 'platform/health' && request.method === 'GET') return platformHealth(request)
  if (path === 'platform/feature-flags' && request.method === 'GET') return platformFeatureFlags(request)
  if (
    segments[0] === 'platform' &&
    segments[1] === 'feature-flags' &&
    segments[2] &&
    request.method === 'PATCH'
  ) {
    return platformPatchFeatureFlag(request, segments[2])
  }
  if (path === 'platform/support-grants' && request.method === 'GET') {
    const companyId = new URL(request.url).searchParams.get('companyId')
    if (!companyId) return platformSupportGrantsAll(request)
    return platformSupportGrantsList(request)
  }
  if (path === 'platform/support-grants' && request.method === 'POST') return platformSupportGrant(request)
  if (
    segments[0] === 'platform' &&
    segments[1] === 'support-grants' &&
    segments[2] &&
    segments[3] === 'revoke' &&
    request.method === 'POST'
  ) {
    return platformSupportGrantRevoke(request, segments[2])
  }
  if (path === 'platform/billing/checkout' && request.method === 'POST') return platformCheckout(request)
  if (path === 'platform/billing/webhook' && request.method === 'POST') return platformBillingWebhook(request)
  if (path === 'system/seed-isolation' && request.method === 'POST') return platformSeedIsolation(request)

  // Entitlement gate for licensed modules (skip auth/public/platform/system)
  const moduleKey = moduleForApiPath(path)
  if (
    moduleKey &&
    !path.startsWith('auth/') &&
    !path.startsWith('platform/') &&
    !path.startsWith('system/') &&
    path !== 'health'
  ) {
    try {
      const context = await authenticate(request)
      requireModule(context, moduleKey)
    } catch (error) {
      return toApiErrorResponse(error, 'Access denied')
    }
  }

  if (path === 'health') return health()
  if (path === 'auth/login' && request.method === 'POST') return login(request)
  if (path === 'auth/signup' && request.method === 'POST') return signup(request)
  if (path === 'auth/verify-email' && request.method === 'POST') return verifyEmail(request)
  if (path === 'auth/company-verification' && request.method === 'POST') return companyVerification(request)
  if (path === 'auth/accept-contracts' && request.method === 'POST') return contractAcceptance(request)
  if (path === 'auth/setup-complete' && request.method === 'POST') return setupComplete(request)
  if (path === 'auth/forgot-password' && request.method === 'POST') return forgotPassword(request)
  if (path === 'auth/reset-password' && request.method === 'POST') return resetPassword(request)
  if (path === 'auth/accept-invitation' && request.method === 'POST') return invitationAccept(request)
  if (path === 'auth/invitation-preview' && request.method === 'GET') return invitationPreview(request)
  if (path === 'auth/mfa/enable' && request.method === 'POST') return setupMfa(request)
  // Prefer auth/login/confirm — paths containing "mfa" or "factor" are blocked by some browser privacy filters.
  if (
    (path === 'auth/login/confirm' ||
      path === 'auth/mfa/verify' ||
      path === 'auth/verify-factor') &&
    request.method === 'POST'
  ) {
    return verifyMfa(request)
  }
  if (path === 'settings/invitations' && request.method === 'GET') return invitationsList(request)
  if (path === 'settings/invitations' && request.method === 'POST') return createInvitation(request)
  if (path === 'settings/support-access' && request.method === 'GET') return supportGrantsList(request)
  if (path === 'settings/support-access' && request.method === 'POST') return supportGrantCreate(request)
  if (path === 'settings/data-retention' && request.method === 'GET') return retentionList(request)
  if (path === 'settings/data-export' && request.method === 'GET') return exportsList(request)
  if (path === 'settings/data-export' && request.method === 'POST') return exportCreate(request)
  if (path === 'defects/hub' && request.method === 'GET') return defectsHub(request)
  if (path === 'incidents/hub' && request.method === 'GET') return incidentsHub(request)
  if (path === 'maintenance/hub' && request.method === 'GET') return maintenanceHub(request)
  if (path === 'inspections/hub' && request.method === 'GET') return inspectionsHub(request)
  if (path === 'fleet-resources/hub' && request.method === 'GET') return fleetResourcesHub(request)
  if (segments[0] === 'inspections' && segments[1] && segments[1] !== 'hub' && request.method === 'GET') {
    const context = await authenticate(request)
    try {
      const hub = await projectInspectionsHub(context.companyId)
      const row = hub.register.find((r) => r.id === segments[1])
      if (!row) return apiError(404, 'Inspection not found')
      return json(row)
    } catch (error) {
      return apiError(500, error instanceof Error ? error.message : 'Inspection detail failed')
    }
  }
  if (path === 'auth/select-tenant' && request.method === 'POST') return selectTenant(request)
  if (path === 'auth/select-company' && request.method === 'POST') return selectTenant(request)
  if (path === 'auth/me' && request.method === 'GET') return getMe(request)
  if (path === 'auth/driver-session' && request.method === 'GET') return driverSession(request)
  if (path === 'driver/bootstrap' && request.method === 'GET') return driverBootstrap(request)
  if (path === 'driver/location' && request.method === 'POST') return driverPostLocation(request)
  if (path === 'dashboard' && request.method === 'GET') return dashboard(request)
  if (path === 'users' && request.method === 'GET') return listCompanyUsers(request)
  if (path === 'schools' && request.method === 'GET') return listSchools(request)
  if (path === 'reports/summary' && request.method === 'GET') return reportsSummary(request)
  if (path === 'reports/performance' && request.method === 'GET') return reportsPerformance(request)
  if (path === 'dispatch/live' && request.method === 'GET') return liveDispatch(request)
  if (path === 'company/entitlements' && request.method === 'GET') return companyEntitlements(request)
  if (path === 'company' && ['GET', 'PATCH'].includes(request.method)) return company(request)
  if (path === 'availability' && request.method === 'GET') return availability(request)
  if (path === 'cancellations' && request.method === 'GET') return cancellations(request)
  if (path === 'compliance' && request.method === 'GET') return complianceDashboard(request)
  if (path === 'compliance/expiries' && request.method === 'GET') return complianceExpiries(request)
  if (path === 'compliance/expiring' && request.method === 'GET') return complianceExpiries(request)
  if (path === 'safeguarding' && request.method === 'GET') {
    const context = await authenticate(request)
    const { data, error } = await admin
      .from('incidents')
      .select('*')
      .eq('company_id', context.companyId)
      .eq('incident_type', 'safeguarding')
      .order('occurred_at', { ascending: false })
    if (error) return apiError(500, error.message)
    return json(expandRow(data ?? []))
  }
  if (path === 'exceptions' && request.method === 'GET') return listResource(request, 'exceptions')
  if (path === 'communication/delivery' && request.method === 'GET') return listResource(request, 'messages')
  if (path === 'settings/roles' && request.method === 'GET') return listResource(request, 'roles')
  if (path === 'settings/invitations' && request.method === 'GET') return listResource(request, 'invitations')
  if (path === 'search' && request.method === 'GET') return globalSearch(request)
  if (path === 'profile' && request.method === 'GET') return profile(request)
  if (path === 'system/seed-demo' && request.method === 'POST') return ensureSeed(request)
  if (path === 'maintenance/work-orders' && request.method === 'GET') return listResource(request, 'maintenance')
  if (segments[0] === 'maintenance' && segments[1] === 'work-orders' && segments[2] && request.method === 'GET') {
    return listResource(request, 'maintenance', segments[2])
  }
  if (path === 'notifications/unread-count' && request.method === 'GET') return unreadCount(request)
  if (
    path === 'notifications/read-all' &&
    (request.method === 'PATCH' || request.method === 'POST')
  ) {
    return updateNotification(request)
  }
  if (
    segments[0] === 'notifications' &&
    segments[2] === 'read' &&
    (request.method === 'PATCH' || request.method === 'POST')
  ) {
    return updateNotification(request, segments[1])
  }

  // Driver / vehicle directory projections (must precede generic /drivers/:id)
  if (path === 'drivers/profiles' && request.method === 'GET') return driverProfiles(request)
  if (path === 'drivers/summary' && request.method === 'GET') return driverSummary(request)
  if (segments[0] === 'drivers' && segments[2] === 'profile' && request.method === 'GET') {
    return driverProfiles(request, segments[1])
  }
  if (path === 'drivers' && request.method === 'POST') return createDriver(request)
  if (segments[0] === 'drivers' && segments[1] && !segments[2] && request.method === 'PATCH') {
    return updateDriver(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'account' && request.method === 'POST') {
    return createDriverAppAccount(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'invitation' && request.method === 'POST') {
    return createDriverAppAccount(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'invitation' &&
    segments[3] === 'cancel' &&
    request.method === 'POST'
  ) {
    return cancelDriverInvitation(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'activate' && request.method === 'POST') {
    return activateDriver(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'suspend' && request.method === 'POST') {
    return suspendDriver(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'password-reset' && request.method === 'POST') {
    return initiateDriverPasswordReset(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'sessions' &&
    segments[3] === 'revoke' &&
    request.method === 'POST'
  ) {
    return revokeDriverSessions(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'devices' &&
    segments[3] &&
    request.method === 'DELETE'
  ) {
    return revokeDriverDeviceHandler(request, segments[1], segments[3])
  }
  if (segments[0] === 'drivers' && segments[2] === 'notes' && request.method === 'POST') {
    return addDriverNote(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'incidents' && request.method === 'GET') {
    return driverIncidents(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'documents' &&
    segments[3] &&
    segments[4] === 'download' &&
    request.method === 'GET'
  ) {
    return getDriverDocumentDownloadUrl(request, segments[1], segments[3])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'documents' &&
    segments[3] &&
    segments[4] === 'verify' &&
    request.method === 'POST'
  ) {
    return verifyDriverDocument(request, segments[1], segments[3])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'documents' &&
    segments[3] &&
    segments[4] === 'reject' &&
    request.method === 'POST'
  ) {
    return rejectDriverDocument(request, segments[1], segments[3])
  }
  if (segments[0] === 'drivers' && segments[2] === 'documents' && request.method === 'POST') {
    return uploadDriverDocument(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'training' && request.method === 'POST') {
    return recordDriverTraining(request, segments[1])
  }
  if (segments[0] === 'drivers' && segments[2] === 'holiday' && !segments[3] && request.method === 'GET') {
    return adminDriverHolidayGet(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'holiday' &&
    segments[3] === 'profile' &&
    request.method === 'PATCH'
  ) {
    return adminDriverHolidayPatchProfile(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'holiday' &&
    segments[3] === 'adjustments' &&
    request.method === 'POST'
  ) {
    return adminDriverHolidayAdjust(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'holiday' &&
    segments[3] === 'accruals' &&
    request.method === 'POST'
  ) {
    return adminDriverHolidayAccrue(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'requirements' &&
    !segments[3] &&
    request.method === 'GET'
  ) {
    return listDriverRequirements(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'requirements' &&
    (segments[3] === 'request' || segments[3] === 'request-missing') &&
    request.method === 'POST'
  ) {
    return requestDriverRequirements(request, segments[1])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'requirements' &&
    segments[3] &&
    segments[4] === 'history' &&
    request.method === 'GET'
  ) {
    return driverRequirementHistory(request, segments[1], segments[3])
  }
  if (
    segments[0] === 'drivers' &&
    segments[2] === 'requirements' &&
    segments[3] &&
    request.method === 'POST'
  ) {
    return patchDriverRequirement(request, segments[1], segments[3])
  }
  if (segments[0] === 'drivers' && segments[2] === 'restrictions' && request.method === 'POST') {
    return addDriverRestriction(request, segments[1])
  }
  if (path === 'drivers' && request.method === 'GET') {
    const context = await authenticate(request)
    const profiles = (await projectDriverProfile(context.companyId)) as Row[]
    return json(
      profiles.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        status: p.status,
        email: p.email,
        phone: p.phone,
        depotId: p.depotId,
        depotName: p.depotName,
        licenceExpiry: p.licenceExpiry,
      })),
    )
  }
  if (path === 'vehicles/profiles' && request.method === 'GET') return vehicleProfiles(request)
  if (path === 'vehicles/summary' && request.method === 'GET') return vehicleSummary(request)
  if (segments[0] === 'vehicles' && segments[2] === 'profile' && request.method === 'GET') {
    return vehicleProfiles(request, segments[1])
  }
  if (path === 'vehicles' && request.method === 'POST') return createVehicle(request)
  if (path === 'vehicles' && request.method === 'GET') {
    const context = await authenticate(request)
    const profiles = (await projectVehicleProfile(context.companyId)) as Row[]
    return json(
      profiles.map((p) => ({
        id: p.id,
        registrationNumber: p.registrationNumber,
        fleetNumber: p.fleetNumber,
        status: p.status,
        make: p.make,
        model: p.model,
        vehicleType: p.vehicleCategory,
        seatingCapacity: p.seatingCapacity,
        wheelchairCapacity: p.wheelchairCapacity,
        depotId: p.homeDepotId,
        depotName: p.homeDepotName,
      })),
    )
  }

  if (path === 'bookings' && request.method === 'GET') return bookingsList(request)
  if (path === 'duties' && request.method === 'GET') return dutiesList(request)
  if (path === 'duties' && request.method === 'POST') {
    const context = await authenticate(request)
    return createDraftDuty(context, request)
  }
  if (segments[0] === 'duties' && segments[1] && !segments[2] && request.method === 'GET') {
    return dutiesList(request, segments[1])
  }
  if (segments[0] === 'duties' && segments[1] && segments[2] === 'assign' && request.method === 'POST') {
    const context = await authenticate(request)
    return assignDuty(context, segments[1], request)
  }
  if (segments[0] === 'duties' && segments[1] && segments[2] === 'publish' && request.method === 'POST') {
    const context = await authenticate(request)
    return publishDuty(context, segments[1])
  }
  if (
    segments[0] === 'driver' &&
    segments[1] === 'duties' &&
    segments[2] &&
    segments[3] === 'acknowledge' &&
    request.method === 'POST'
  ) {
    return driverAcknowledgeDuty(request, segments[2])
  }
  if (
    segments[0] === 'driver' &&
    segments[1] === 'duties' &&
    segments[2] &&
    segments[3] === 'sign-on' &&
    request.method === 'POST'
  ) {
    return driverSignOnDuty(request, segments[2])
  }
  if (
    segments[0] === 'driver' &&
    segments[1] === 'duties' &&
    segments[2] &&
    segments[3] === 'sign-off' &&
    request.method === 'POST'
  ) {
    return driverSignOffDuty(request, segments[2])
  }
  if (path === 'driver/devices' && request.method === 'POST') return upsertDriverDevice(request)
  if (path === 'driver/profile' && (request.method === 'PATCH' || request.method === 'POST')) return driverUpdateOnboardingProfile(request)
  if (path === 'driver/onboarding/contact' && request.method === 'POST') return driverUpdateOnboardingContact(request)
  if (path === 'driver/onboarding/progress' && request.method === 'GET') return driverOnboardingProgress(request)
  if (path === 'driver/onboarding/step' && request.method === 'POST') return driverUpdateOnboardingStep(request)
  if (path === 'driver/onboarding/submit' && request.method === 'POST') return driverSubmitOnboardingForReview(request)
  if (path === 'driver/devices/status' && request.method === 'GET') return getDriverDeviceStatus(request)
  if (path === 'driver/security-events' && request.method === 'POST') return postDriverSecurityEvent(request)
  if (path === 'driver/defects' && request.method === 'POST') return driverReportDefect(request)
  if (path === 'driver/incidents' && request.method === 'POST') return driverReportIncident(request)
  if (path === 'driver/vehicle-checks' && request.method === 'GET') return driverListVehicleChecks(request)
  if (path === 'driver/vehicle-checks' && request.method === 'POST') return driverSubmitVehicleCheck(request)
  if (path === 'driver/documents' && request.method === 'GET') return driverListDocuments(request)
  if (path === 'driver/documents' && request.method === 'POST') return driverSubmitDocument(request)
  if (path === 'driver/training' && request.method === 'GET') return listDriverTrainingCentre(request)
  if (path === 'driver/training/progress' && request.method === 'POST') {
    return updateDriverTrainingProgress(request)
  }
  if (path === 'driver/holiday/balance' && request.method === 'GET') return driverHolidayBalance(request)
  if (path === 'driver/holiday/requests' && request.method === 'GET') {
    return driverHolidayListRequests(request)
  }
  if (path === 'driver/holiday/requests' && request.method === 'POST') {
    return driverHolidaySubmitRequest(request)
  }
  if (path === 'driver/messages' && request.method === 'GET') return driverListMessages(request)
  if (path === 'driver/messages' && request.method === 'POST') return driverReplyMessage(request)
  if (path === 'driver/messages/start' && request.method === 'POST') return driverStartMessage(request)
  if (
    segments[0] === 'driver' &&
    segments[1] === 'messages' &&
    segments[2] &&
    segments[3] === 'read' &&
    request.method === 'POST'
  ) {
    return driverMarkMessageRead(request, segments[2])
  }
  if (
    segments[0] === 'driver' &&
    segments[1] === 'messages' &&
    segments[2] &&
    !segments[3] &&
    request.method === 'GET'
  ) {
    return driverGetMessageThread(request, segments[2])
  }
  if (path === 'yard/messages' && request.method === 'GET') return listYardDriverMessages(request)
  if (path === 'yard/messages' && request.method === 'POST') return replyYardDriverMessage(request)
  if (path === 'messages' && request.method === 'GET') return listOpsMessages(request)
  if (path === 'messages' && request.method === 'POST') return createOpsMessage(request)
  if (segments[0] === 'messages' && segments[1] && segments[2] === 'read' && request.method === 'PATCH') {
    return markOpsMessageRead(request, segments[1])
  }
  if (segments[0] === 'duties' && segments[2] === 'track' && request.method === 'GET') {
    return dutyTrack(request, segments[1])
  }
  if (path === 'operational-trips' && request.method === 'GET') return operationalTrips(request)
  if (
    segments[0] === 'operational-trips' &&
    segments[1] &&
    segments[2] === 'position' &&
    request.method === 'GET'
  ) {
    return operationalTripPosition(request, segments[1])
  }
  if (segments[0] === 'operational-trips' && segments[1] && !segments[2] && request.method === 'GET') {
    return operationalTrips(request, segments[1])
  }
  if (segments[0] === 'duties' && segments[1] && segments[2] === 'operational-trip' && request.method === 'GET') {
    return operationalTripForDuty(request, segments[1])
  }

  if (path === 'attendance/hub' && request.method === 'GET') return attendanceHub(request)
  if (path === 'attendance/leave' && request.method === 'GET') return attendanceLeaveList(request)
  if (path === 'attendance/leave' && request.method === 'PUT') return attendanceLeaveUpsert(request)
  if (path === 'attendance/profile' && request.method === 'GET') return attendanceProfile(request)
  if (path === 'attendance/classify' && request.method === 'POST') return attendanceClassify(request)
  if (path === 'attendance/cover-candidates' && request.method === 'GET') {
    return attendanceCoverCandidates(request)
  }
  if (path === 'attendance/assign-cover' && request.method === 'POST') {
    return attendanceAssignCover(request)
  }

  if (path === 'staff/hub' && request.method === 'GET') return staffHub(request)
  if (path === 'staff' && request.method === 'POST') return createStaff(request)
  if (segments[0] === 'staff' && segments[1] && !segments[2] && request.method === 'GET') {
    return getStaffProfile(request, segments[1])
  }
  if (segments[0] === 'staff' && segments[2] === 'invitation' && request.method === 'POST') {
    return sendStaffInvitation(request, segments[1])
  }
  if (path === 'yard/hub' && request.method === 'GET') return yardHub(request)
  if (path === 'yard/depots' && request.method === 'GET') return yardDepots(request)
  if (path === 'yard/movements' && request.method === 'POST') return recordYardMovementRoute(request)
  if (path === 'yard/mutations' && request.method === 'POST') return applyYardMutationRoute(request)
  if (path === 'yard/tasks' && request.method === 'POST') return createYardTaskRoute(request)
  if (segments[0] === 'yard' && segments[1] === 'tasks' && segments[2] && segments[3] === 'complete' && request.method === 'POST') {
    return completeYardTaskRoute(request, segments[2])
  }
  if (segments[0] === 'yard' && segments[1] === 'tasks' && segments[2] && segments[3] === 'start' && request.method === 'POST') {
    return startYardTaskRoute(request, segments[2])
  }
  if (path === 'checks/hub' && request.method === 'GET') return checksHub(request)
  if (segments[0] === 'checks' && segments[1] && request.method === 'GET') {
    return getCheckDetail(request, segments[1])
  }

  if (request.method === 'GET' && (path === '' || path === 'overview' || path === 'live-operations')) {
    return commandPage(request, path === '' ? '/' : `/${path}`)
  }

  if (request.method === 'GET' && LIST_RESOURCES[segments[0]] !== undefined) {
    return listResource(request, segments[0], segments.length === 2 ? segments[1] : undefined)
  }

  if (request.method === 'GET' && segments.length >= 1) {
    return commandPage(request, `/${path}`)
  }

  return apiError(404, 'API route not found', 'not_found')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  try {
    // Must await: bare `return handler()` skips try/catch and Safari shows "Load failed" (no CORS).
    return await dispatchCommandApi(request)
  } catch (error) {
    console.error(error)
    return toApiErrorResponse(error)
  }
})
