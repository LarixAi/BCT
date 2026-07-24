import { tenantKeys } from '@/lib/tenant/tenant-keys'

let activeCompanyId = ''

/** Updated by AuthProvider whenever the active workspace company changes. */
export function setScopedCompanyId(companyId: string) {
  activeCompanyId = companyId
}

export function getScopedCompanyId(): string {
  return activeCompanyId
}

/** Prefix query keys with the active company — safe to call outside React hooks. */
export function tKey(parts: readonly unknown[]) {
  const [domain, ...rest] = parts
  return tenantKeys.generic(activeCompanyId || '_none', String(domain), ...rest)
}
