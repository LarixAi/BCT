/**
 * Wave 3F — explicit DB authority markers for Command Edge.
 *
 * privilegedDb / companyScopedServiceDb* still return the shared service-role
 * client. userScopedDb returns a JWT-bound PostgREST client (RLS).
 *
 * Do not import bare `admin` in new modules — use these helpers or tenant-db.
 */
import { AsyncLocalStorage } from 'node:async_hooks'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { admin, publicClient, type RequestContext } from './supabase.ts'

/** Bound by command-api authenticate so shared helpers can prefer userScopedDb. */
const activeRequestContext = new AsyncLocalStorage<RequestContext>()

export function enterActiveRequestContext(context: RequestContext): void {
  activeRequestContext.enterWith(context)
}

export function getActiveRequestContext(): RequestContext | undefined {
  return activeRequestContext.getStore()
}

export type DbAuthorityClass =
  | 'privileged'
  | 'company_scoped_service_role'
  | 'user_scoped_rls'

/** Service-role client for platform / Auth Admin / secrets / signing / seeds. */
export function privilegedDb(reason: string): SupabaseClient {
  if (!String(reason || '').trim()) {
    throw new Error('privilegedDb requires a non-empty reason')
  }
  return admin
}

/**
 * Transitional company-scoped service-role client.
 * Callers must still apply company_id filters / assertCompanyScoped*.
 * Prefer tenant-db helpers for ordinary CRUD.
 */
export function companyScopedServiceDb(
  context: RequestContext,
  reason: string,
): SupabaseClient {
  if (!context?.companyId) {
    throw new Error('companyScopedServiceDb requires an authenticated company context')
  }
  if (!String(reason || '').trim()) {
    throw new Error('companyScopedServiceDb requires a non-empty reason')
  }
  return admin
}

/**
 * Same authority as companyScopedServiceDb for helpers that take companyId
 * rather than a full RequestContext (AdBlue refill persistence).
 */
export function companyScopedServiceDbForCompany(companyId: string, reason: string): SupabaseClient {
  if (!String(companyId || '').trim()) {
    throw new Error('companyScopedServiceDbForCompany requires companyId')
  }
  if (!String(reason || '').trim()) {
    throw new Error('companyScopedServiceDbForCompany requires a non-empty reason')
  }
  return admin
}

/** Named capability: immutable audit_events writer (F-10). */
export function auditWriterDb(companyId: string, reason: string): SupabaseClient {
  return companyScopedServiceDbForCompany(companyId, `auditWriter:${reason}`)
}

/** Named capability: domain_events writer (F-09). */
export function domainEventWriterDb(companyId: string, reason: string): SupabaseClient {
  return companyScopedServiceDbForCompany(companyId, `domainEventWriter:${reason}`)
}

/** Named capability: FCM / push token reads (F-29 — never creates business state). */
export function pushSenderDb(companyId: string, reason: string): SupabaseClient {
  return companyScopedServiceDbForCompany(companyId, `pushSender:${reason}`)
}

/** Named capability: override_audit_events writer (F-07). */
export function overrideAuditWriterDb(companyId: string, reason: string): SupabaseClient {
  return companyScopedServiceDbForCompany(companyId, `overrideAuditWriter:${reason}`)
}

/** Named capability: entitlement / subscription resolution (billing read path). */
export function entitlementReaderDb(companyId: string, reason: string): SupabaseClient {
  return companyScopedServiceDbForCompany(companyId, `entitlementReader:${reason}`)
}

/** Named capability: platform catalogue + platform_users (no tenant JWT). */
export function platformAdminDb(reason: string): SupabaseClient {
  return privilegedDb(`platformAdmin:${reason}`)
}

/**
 * Named capability: multi-table projection reads when no membership JWT is bound
 * (companyId-only / background helpers). Prefer resolveTenantDb on request paths.
 */
export function projectionReaderDb(companyId: string, reason: string): SupabaseClient {
  return companyScopedServiceDbForCompany(companyId, `projectionReader:${reason}`)
}

/**
 * Ordinary tenant CRUD resolver.
 * Prefer explicit RequestContext, else ALS-bound request context from command-api
 * authenticate. Membership JWT → userScopedDb (RLS). Support → company-scoped
 * service-role. JWT-less callers (cron / companyId-only) → company-scoped service-role
 * with a reason tag — documented residual for non-request contexts only.
 */
export function resolveTenantDb(
  companyId: string,
  reason: string,
  explicitContext?: RequestContext | null,
): SupabaseClient {
  if (!String(companyId || '').trim()) {
    throw new Error('resolveTenantDb requires companyId')
  }
  if (!String(reason || '').trim()) {
    throw new Error('resolveTenantDb requires a non-empty reason')
  }
  const context = explicitContext ?? getActiveRequestContext()
  if (context?.companyId === companyId) {
    if (context.workspaceAuthority === 'support') {
      return companyScopedServiceDb(context, `${reason}:support`)
    }
    if (context.accessToken) {
      return userScopedDb(context, reason)
    }
  }
  return companyScopedServiceDbForCompany(companyId, reason)
}

/** Projection reads — same ALS preference as ordinary tenant CRUD. */
export function resolveProjectionDb(companyId: string, reason = 'projections'): SupabaseClient {
  return resolveTenantDb(companyId, `projectionReader:${reason}`)
}

/**
 * JWT-bound PostgREST client (anon key + user Bearer). RLS is the write authority.
 * Membership-only: support-grant sessions must keep using companyScopedServiceDb*.
 */
export function userScopedDb(context: RequestContext, reason: string): SupabaseClient {
  if (!String(reason || '').trim()) {
    throw new Error('userScopedDb requires a non-empty reason')
  }
  if (!context?.companyId) {
    throw new Error('userScopedDb requires an authenticated company context')
  }
  if (!context.accessToken) {
    throw new Error('userScopedDb requires a user access token')
  }
  if (context.workspaceAuthority === 'support') {
    throw new Error(
      'userScopedDb is membership-only — support-grant writes must use companyScopedServiceDb',
    )
  }
  return publicClient(context.accessToken)
}
