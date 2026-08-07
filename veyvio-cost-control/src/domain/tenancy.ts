import type { OrganisationId } from './types'

/** Tenant isolation helpers — Blueprint §12.2. Every read/write must carry organisation_id. */

export class TenancyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenancyError'
  }
}

export function requireOrganisationId(organisationId: OrganisationId | null | undefined): OrganisationId {
  if (!organisationId || !String(organisationId).trim()) {
    throw new TenancyError('organisation_id is required on every tenant-owned operation')
  }
  return organisationId
}

export function assertSameOrganisation(
  expected: OrganisationId,
  actual: OrganisationId,
  entityLabel = 'record',
): void {
  const a = requireOrganisationId(expected)
  const b = requireOrganisationId(actual)
  if (a !== b) {
    throw new TenancyError(`Cross-tenant access blocked: ${entityLabel} belongs to another organisation`)
  }
}

export function filterByOrganisation<T extends { organisationId: OrganisationId }>(
  rows: T[],
  organisationId: OrganisationId,
): T[] {
  const org = requireOrganisationId(organisationId)
  return rows.filter((r) => r.organisationId === org)
}

export function findInOrganisation<T extends { id: string; organisationId: OrganisationId }>(
  rows: T[],
  organisationId: OrganisationId,
  id: string,
  entityLabel = 'record',
): T {
  const org = requireOrganisationId(organisationId)
  const row = rows.find((r) => r.id === id)
  if (!row) throw new TenancyError(`${entityLabel} not found`)
  assertSameOrganisation(org, row.organisationId, entityLabel)
  return row
}
