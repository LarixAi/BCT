import { admin, authenticate } from './supabase.ts'
import { apiError, json, readJson } from './http.ts'
import { requirePlatformRole, writePlatformAudit } from './tenant-guards.ts'
import { createSaasCheckoutSession, handleSaasStripeWebhook, saasBillingConfigured } from './saas-billing.ts'
import { seedIsolationTenants } from './seed-isolation.ts'
import { createSupportGrant, listSupportGrants, revokeSupportGrant } from './tenant-auth.ts'
import { applySubscriptionLifecycle } from './subscription-lifecycle.ts'
import { resolveEntitlements } from './entitlements.ts'

type Row = Record<string, unknown>

export async function platformCompanies(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)
  const { data, error } = await admin
    .from('companies')
    .select('id, legal_name, trading_name, tenant_status, subscription_status, timezone, created_at, activated_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return apiError(500, error.message)

  const companyIds = (data ?? []).map((c) => c.id)
  const { data: subs } = companyIds.length
    ? await admin
        .from('company_subscriptions')
        .select('company_id, status, plan_code, current_period_end, trial_ends_at, grace_period_ends_at')
        .in('company_id', companyIds)
    : { data: [] as Row[] }

  const subByCompany = new Map((subs ?? []).map((s) => [String(s.company_id), s]))

  return json(
    (data ?? []).map((c) => {
      const sub = subByCompany.get(String(c.id))
      return {
        id: c.id,
        legalName: c.legal_name,
        tradingName: c.trading_name,
        tenantStatus: c.tenant_status,
        subscriptionStatus: sub?.status ?? c.subscription_status,
        planCode: sub?.plan_code ?? 'command_standard',
        currentPeriodEnd: sub?.current_period_end ?? null,
        trialEndsAt: sub?.trial_ends_at ?? null,
        timezone: c.timezone,
        createdAt: c.created_at,
        activatedAt: c.activated_at,
      }
    }),
  )
}

export async function platformCompanyDetail(request: Request, companyId: string) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)

  const { data: company, error } = await admin
    .from('companies')
    .select('id, legal_name, trading_name, tenant_status, subscription_status, timezone, created_at, activated_at')
    .eq('id', companyId)
    .maybeSingle()
  if (error) return apiError(500, error.message)
  if (!company) return apiError(404, 'Company not found', 'not_found')

  const [{ data: sub }, { data: overrides }, grants, entitlements, { data: events }] =
    await Promise.all([
      admin
        .from('company_subscriptions')
        .select(
          'status, plan_code, current_period_end, trial_ends_at, grace_period_ends_at, provider_customer_ref, stripe_subscription_id',
        )
        .eq('company_id', companyId)
        .maybeSingle(),
      admin
        .from('company_entitlement_overrides')
        .select('module_key, enabled, reason, created_at')
        .eq('company_id', companyId)
        .order('module_key'),
      listSupportGrants(companyId).catch(() => []),
      resolveEntitlements(companyId),
      admin
        .from('subscription_events')
        .select(
          'id, event_type, source, from_status, to_status, from_plan_code, to_plan_code, from_tenant_status, to_tenant_status, actor_user_id, created_at',
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(25),
    ])

  return json({
    id: company.id,
    legalName: company.legal_name,
    tradingName: company.trading_name,
    tenantStatus: entitlements.tenantStatus || company.tenant_status,
    subscriptionStatus: sub?.status ?? company.subscription_status,
    planCode: sub?.plan_code ?? 'command_standard',
    currentPeriodEnd: sub?.current_period_end ?? null,
    trialEndsAt: sub?.trial_ends_at ?? null,
    gracePeriodEndsAt: sub?.grace_period_ends_at ?? null,
    providerCustomerRef: sub?.provider_customer_ref ?? null,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    timezone: company.timezone,
    createdAt: company.created_at,
    activatedAt: company.activated_at,
    entitlements: {
      planCode: entitlements.planCode,
      subscriptionStatus: entitlements.subscriptionStatus,
      tenantStatus: entitlements.tenantStatus,
      enabledModules: entitlements.enabledModules,
      usageLimits: entitlements.usageLimits,
    },
    subscriptionEvents: (events ?? []).map((row) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      source: String(row.source),
      fromStatus: row.from_status ? String(row.from_status) : null,
      toStatus: row.to_status ? String(row.to_status) : null,
      fromPlanCode: row.from_plan_code ? String(row.from_plan_code) : null,
      toPlanCode: row.to_plan_code ? String(row.to_plan_code) : null,
      fromTenantStatus: row.from_tenant_status ? String(row.from_tenant_status) : null,
      toTenantStatus: row.to_tenant_status ? String(row.to_tenant_status) : null,
      actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
    })),
    moduleOverrides: (overrides ?? []).map((row) => ({
      moduleKey: String(row.module_key),
      enabled: Boolean(row.enabled),
      reason: row.reason ? String(row.reason) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
    })),
    supportGrants: grants,
  })
}

function subscriptionStatusForTenantPatch(tenantStatus: string): string | undefined {
  switch (tenantStatus) {
    case 'ACTIVE':
      return 'active'
    case 'READ_ONLY':
      return 'past_due'
    case 'SUSPENDED':
    case 'CLOSED':
    case 'CLOSING':
      return 'unpaid'
    case 'PENDING_PAYMENT':
      return 'incomplete'
    default:
      return undefined
  }
}

export async function platformPatchCompany(request: Request, companyId: string) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin', 'platform_billing'])
  const input = await readJson<{
    tenantStatus?: string
    planCode?: string
    subscriptionStatus?: string
    moduleOverrides?: Array<{ moduleKey: string; enabled: boolean; reason?: string }>
    usageLimits?: Array<{ limitKey: string; limitValue: number | null; reason?: string }>
  }>(request)

  const mappedSubStatus =
    input.subscriptionStatus ??
    (input.tenantStatus ? subscriptionStatusForTenantPatch(input.tenantStatus) : undefined)

  if (input.planCode || mappedSubStatus || input.tenantStatus) {
    await applySubscriptionLifecycle({
      companyId,
      planCode: input.planCode,
      status: mappedSubStatus,
      tenantStatusOverride: input.tenantStatus ?? null,
      source: 'platform',
      actorUserId: context.user.id,
      eventType: 'platform.company.subscription_patch',
      detail: input as Row,
    })
  }

  if (input.moduleOverrides?.length) {
    for (const override of input.moduleOverrides) {
      await admin.from('company_entitlement_overrides').upsert({
        company_id: companyId,
        module_key: override.moduleKey,
        enabled: override.enabled,
        reason: override.reason ?? null,
        created_by: context.user.id,
      }, { onConflict: 'company_id,module_key' })
    }
  }

  if (input.usageLimits?.length) {
    for (const limit of input.usageLimits) {
      await admin.from('company_usage_limits').upsert({
        company_id: companyId,
        limit_key: limit.limitKey,
        limit_value: limit.limitValue,
        reason: limit.reason ?? null,
        updated_by: context.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,limit_key' })
    }
  }

  await writePlatformAudit({
    actorUserId: context.user.id,
    action: 'platform.company.updated',
    targetCompanyId: companyId,
    detail: input as Row,
  })

  return json({ ok: true, entitlements: await resolveEntitlements(companyId) })
}

/** Authenticated company session — commercial entitlements without UI. */
export async function companyEntitlements(request: Request) {
  const context = await authenticate(request)
  return json(await resolveEntitlements(context.companyId))
}

export async function platformPlans(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)
  const { data: plans, error } = await admin
    .from('subscription_plans')
    .select('code, name, description, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) return apiError(500, error.message)
  const { data: features } = await admin.from('plan_features').select('plan_code, module_key, enabled')
  const byPlan = new Map<string, string[]>()
  for (const row of features ?? []) {
    if (!row.enabled) continue
    const list = byPlan.get(String(row.plan_code)) ?? []
    list.push(String(row.module_key))
    byPlan.set(String(row.plan_code), list)
  }
  return json(
    (plans ?? []).map((p) => ({
      code: p.code,
      name: p.name,
      description: p.description,
      modules: byPlan.get(String(p.code)) ?? [],
    })),
  )
}

export async function platformCheckout(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin', 'platform_billing'])
  const input = await readJson<{ companyId?: string; planCode?: string }>(request)
  if (!input.companyId || !input.planCode) return apiError(400, 'companyId and planCode are required')
  try {
    const session = await createSaasCheckoutSession({
      companyId: input.companyId,
      planCode: input.planCode,
      customerEmail: context.user.email ?? 'billing@veyvio.com',
    })
    if ('placeholder' in session && session.placeholder) {
      return json({ ...session, configured: false })
    }
    await writePlatformAudit({
      actorUserId: context.user.id,
      action: 'platform.billing.checkout_created',
      targetCompanyId: input.companyId,
      detail: { planCode: input.planCode, sessionId: session.sessionId },
    })
    return json({ ...session, configured: saasBillingConfigured() })
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const httpErr = error as { status: number; message: string; code?: string }
      return apiError(httpErr.status, httpErr.message, httpErr.code)
    }
    return apiError(500, error instanceof Error ? error.message : 'Checkout failed')
  }
}

export async function platformBillingWebhook(request: Request) {
  const raw = await request.text()
  try {
    const result = await handleSaasStripeWebhook(raw, request.headers.get('stripe-signature'))
    return json(result)
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      const httpErr = error as { status: number; message: string; code?: string }
      return apiError(httpErr.status, httpErr.message, httpErr.code)
    }
    return apiError(500, error instanceof Error ? error.message : 'Webhook failed')
  }
}

export async function platformSeedIsolation(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin'])
  try {
    const result = await seedIsolationTenants()
    await writePlatformAudit({
      actorUserId: context.user.id,
      action: 'platform.seed.isolation',
      detail: { orgCount: result.orgs.length },
    })
    return json(result)
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Isolation seed failed')
  }
}

export async function platformAudit(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)
  const { data, error } = await admin
    .from('platform_audit_logs')
    .select('id, actor_user_id, action, target_company_id, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return apiError(500, error.message)
  return json(data ?? [])
}

export async function platformSupportGrant(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin', 'platform_support'])
  const input = await readJson<{
    companyId?: string
    granteeUserId?: string
    reason?: string
    ticketReference?: string
    accessLevel?: string
    durationMinutes?: number
  }>(request)
  if (!input.companyId || !input.reason?.trim()) {
    return apiError(400, 'companyId and reason are required')
  }
  try {
    const result = await createSupportGrant({
      companyId: input.companyId,
      granteeUserId: String(input.granteeUserId ?? context.user.id),
      grantedBy: context.user.id,
      reason: String(input.reason),
      ticketReference: input.ticketReference,
      accessLevel: input.accessLevel ?? 'read_only',
      durationMinutes: input.durationMinutes ?? 60,
    })
    await writePlatformAudit({
      actorUserId: context.user.id,
      action: 'platform.support_grant.created',
      targetCompanyId: input.companyId,
      detail: {
        granteeUserId: input.granteeUserId ?? context.user.id,
        reason: input.reason,
        ticketReference: input.ticketReference ?? null,
      },
    })
    return json(result, 201)
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Support grant failed')
  }
}

export async function platformSupportGrantsList(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)
  const companyId = new URL(request.url).searchParams.get('companyId')
  if (!companyId) return apiError(400, 'companyId is required')
  try {
    return json(await listSupportGrants(companyId))
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : 'Support grants failed')
  }
}

export async function platformSupportGrantRevoke(request: Request, grantId: string) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin', 'platform_support'])
  try {
    const result = await revokeSupportGrant({
      grantId,
      actorUserId: context.user.id,
    })
    await writePlatformAudit({
      actorUserId: context.user.id,
      action: 'platform.support_grant.revoked',
      targetCompanyId: String(result.companyId),
      detail: { grantId },
    })
    return json({ ok: true, ...result })
  } catch (error) {
    return apiError(400, error instanceof Error ? error.message : 'Revoke failed')
  }
}

export async function platformSubscriptions(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)
  const { data: subs, error } = await admin
    .from('company_subscriptions')
    .select(
      'company_id, status, plan_code, current_period_end, trial_ends_at, grace_period_ends_at, provider_customer_ref, updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(300)
  if (error) return apiError(500, error.message)

  const companyIds = [...new Set((subs ?? []).map((s) => String(s.company_id)))]
  const { data: companies } = companyIds.length
    ? await admin
        .from('companies')
        .select('id, trading_name, legal_name, tenant_status')
        .in('id', companyIds)
    : { data: [] as Row[] }
  const companyById = new Map((companies ?? []).map((c) => [String(c.id), c]))

  return json(
    (subs ?? []).map((sub) => {
      const company = companyById.get(String(sub.company_id))
      return {
        companyId: String(sub.company_id),
        tradingName: company?.trading_name ?? null,
        legalName: company?.legal_name ?? null,
        tenantStatus: company?.tenant_status ?? null,
        subscriptionStatus: String(sub.status),
        planCode: String(sub.plan_code),
        currentPeriodEnd: sub.current_period_end ?? null,
        trialEndsAt: sub.trial_ends_at ?? null,
        gracePeriodEndsAt: sub.grace_period_ends_at ?? null,
        providerCustomerRef: sub.provider_customer_ref ?? null,
        updatedAt: sub.updated_at ?? null,
      }
    }),
  )
}

export async function platformSupportGrantsAll(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin', 'platform_support'])
  const { data, error } = await admin
    .from('privileged_access_grants')
    .select(
      'id, company_id, grantee_user_id, granted_by, reason, ticket_reference, access_level, starts_at, expires_at, revoked_at',
    )
    .order('starts_at', { ascending: false })
    .limit(100)
  if (error) return apiError(500, error.message)

  const companyIds = [...new Set((data ?? []).map((g) => String(g.company_id)))]
  const { data: companies } = companyIds.length
    ? await admin.from('companies').select('id, trading_name, legal_name').in('id', companyIds)
    : { data: [] as Row[] }
  const companyById = new Map((companies ?? []).map((c) => [String(c.id), c]))

  return json(
    (data ?? []).map((grant) => {
      const company = companyById.get(String(grant.company_id))
      return {
        id: String(grant.id),
        companyId: String(grant.company_id),
        tradingName: company?.trading_name ?? null,
        legalName: company?.legal_name ?? null,
        granteeUserId: String(grant.grantee_user_id),
        grantedBy: grant.granted_by ? String(grant.granted_by) : null,
        reason: String(grant.reason ?? ''),
        ticketReference: grant.ticket_reference ? String(grant.ticket_reference) : null,
        accessLevel: String(grant.access_level ?? 'read_only'),
        startsAt: grant.starts_at ? String(grant.starts_at) : null,
        expiresAt: grant.expires_at ? String(grant.expires_at) : null,
        revokedAt: grant.revoked_at ? String(grant.revoked_at) : null,
      }
    }),
  )
}

export async function platformHealth(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)

  const [
    { count: companyCount, error: companyError },
    { count: activeSubs, error: subError },
    { count: flagCount, error: flagError },
    { data: dbPing, error: pingError },
  ] = await Promise.all([
    admin.from('companies').select('*', { count: 'exact', head: true }),
    admin.from('company_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('platform_feature_flags').select('*', { count: 'exact', head: true }),
    admin.from('subscription_plans').select('code').limit(1),
  ])

  const databaseOk = !companyError && !subError && !flagError && !pingError && Boolean(dbPing)
  return json({
    status: databaseOk ? 'ok' : 'degraded',
    surface: 'veyvio-platform',
    checkedAt: new Date().toISOString(),
    billingMode: Deno.env.get('VEYVIO_SAAS_BILLING_MODE') ?? 'placeholder',
    counts: {
      companies: companyCount ?? 0,
      activeSubscriptions: activeSubs ?? 0,
      featureFlags: flagCount ?? 0,
    },
    database: databaseOk ? 'connected' : 'error',
  })
}

export async function platformFeatureFlags(request: Request) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id)
  const { data, error } = await admin
    .from('platform_feature_flags')
    .select('flag_key, description, enabled, updated_at, updated_by')
    .order('flag_key')
  if (error) return apiError(500, error.message)
  return json(
    (data ?? []).map((row) => ({
      key: String(row.flag_key),
      description: String(row.description ?? ''),
      enabled: Boolean(row.enabled),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
      updatedBy: row.updated_by ? String(row.updated_by) : null,
    })),
  )
}

export async function platformPatchFeatureFlag(request: Request, flagKey: string) {
  const context = await authenticate(request, false)
  await requirePlatformRole(context.user.id, ['platform_admin'])
  const input = await readJson<{ enabled?: boolean; description?: string }>(request)
  if (typeof input.enabled !== 'boolean' && input.description === undefined) {
    return apiError(400, 'enabled or description is required')
  }
  const patch: Row = { updated_at: new Date().toISOString(), updated_by: context.user.id }
  if (typeof input.enabled === 'boolean') patch.enabled = input.enabled
  if (input.description !== undefined) patch.description = input.description

  const { data, error } = await admin
    .from('platform_feature_flags')
    .update(patch)
    .eq('flag_key', flagKey)
    .select('flag_key, description, enabled, updated_at')
    .maybeSingle()
  if (error) return apiError(500, error.message)
  if (!data) return apiError(404, 'Feature flag not found', 'not_found')

  await writePlatformAudit({
    actorUserId: context.user.id,
    action: 'platform.feature_flag.updated',
    detail: { flagKey, ...input },
  })

  return json({
    key: String(data.flag_key),
    description: String(data.description ?? ''),
    enabled: Boolean(data.enabled),
    updatedAt: data.updated_at ? String(data.updated_at) : null,
  })
}
