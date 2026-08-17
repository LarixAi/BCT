/**
 * Wave 3F — explicit DB authority markers for Command Edge.
 *
 * Today both helpers still return the shared service-role client. The point of
 * this module is to force call sites to declare *why* they need privileged
 * access, and to give UserScopedDb a stable import surface for the RLS cutover.
 *
 * Do not import bare `admin` in new modules — use these helpers or tenant-db.
 */
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { admin, type RequestContext } from './supabase.ts'

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

/**
 * Future: JWT-bound client that respects RLS.
 * FIX-P0-011 is locked; this remains disabled until authenticated mutation
 * grants exist. Do not use for writes while PostgREST INSERT is fail-closed.
 */
export function userScopedDb(_context: RequestContext, _reason: string): SupabaseClient {
  throw new Error(
    'userScopedDb is not enabled yet — authenticated PostgREST writes remain fail-closed; company-scoped service-role is still the Command write path',
  )
}
