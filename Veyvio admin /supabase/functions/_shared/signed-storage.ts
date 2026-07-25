/**
 * F-13 — tenant-scoped storage paths + signed URL helper.
 * Aligns with migration `storage_company_prefix` (`{companyId}/…`).
 */
import { admin } from './supabase.ts'
import { HttpError } from './http.ts'

export function buildTenantStoragePath(companyId: string, ...segments: string[]): string {
  const company = String(companyId ?? '').trim()
  if (!company) throw new HttpError(400, 'companyId is required for storage paths', 'invalid_storage_path')
  const parts = segments
    .map((s) => String(s ?? '').trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .flatMap((s) => s.split('/'))
    .filter((p) => p && p !== '.' && p !== '..')
  if (!parts.length) throw new HttpError(400, 'storage path segments required', 'invalid_storage_path')
  return [company, ...parts].join('/')
}

export function assertTenantStorageKey(companyId: string, storageKey: string): string {
  const key = String(storageKey ?? '').replace(/^\/+/, '')
  const prefix = `${String(companyId).trim()}/`
  const orgPrefix = `org/${String(companyId).trim()}/`
  if (!key || key.includes('..')) {
    throw new HttpError(400, 'Invalid storage key', 'invalid_storage_path')
  }
  if (!key.startsWith(prefix) && !key.startsWith(orgPrefix)) {
    throw new HttpError(403, 'Storage key is outside this company', 'tenant_storage_forbidden')
  }
  return key
}

export async function createTenantSignedUrl(input: {
  bucket: string
  storageKey: string
  companyId: string
  expiresInSeconds?: number
}): Promise<{ signedUrl: string; storageKey: string; expiresInSeconds: number }> {
  const storageKey = assertTenantStorageKey(input.companyId, input.storageKey)
  const expiresInSeconds = input.expiresInSeconds ?? 60 * 60
  const { data, error } = await admin.storage
    .from(input.bucket)
    .createSignedUrl(storageKey, expiresInSeconds)
  if (error || !data?.signedUrl) {
    throw new HttpError(400, error?.message ?? 'Could not create signed URL', 'storage_error')
  }
  return { signedUrl: data.signedUrl, storageKey, expiresInSeconds }
}
