/** Tenant-scoped React Query keys — always prefix with active company id. */
export const tenantKeys = {
  root: (companyId: string) => ['company', companyId] as const,
  vehicles: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'vehicles', ...parts] as const,
  drivers: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'drivers', ...parts] as const,
  bookings: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'bookings', ...parts] as const,
  duties: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'duties', ...parts] as const,
  dispatch: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'dispatch', ...parts] as const,
  liveOps: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'live-ops', ...parts] as const,
  notifications: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'notifications', ...parts] as const,
  yard: (companyId: string, depotId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'depot', depotId, 'yard', ...parts] as const,
  dialARide: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'dial-a-ride', ...parts] as const,
  schoolRoutes: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'school-routes', ...parts] as const,
  depots: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'depots', ...parts] as const,
  defects: (companyId: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), 'defects', ...parts] as const,
  generic: (companyId: string, domain: string, ...parts: unknown[]) =>
    [...tenantKeys.root(companyId), domain, ...parts] as const,
}

export function isTenantScopedQueryKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'company' && typeof key[1] === 'string' && key[1].length > 0
}
