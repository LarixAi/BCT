export function canViewDrivers(permissions: string[]) {
  return permissions.includes('drivers.view')
}

export function canCreateDriver(permissions: string[]) {
  return permissions.includes('drivers.create') || permissions.includes('drivers.edit')
}

export function canEditDriver(permissions: string[]) {
  return permissions.includes('drivers.edit')
}

export function canInviteDriver(permissions: string[]) {
  return permissions.includes('drivers.invite') || permissions.includes('drivers.manage_access')
}

export function canManageDriverAccess(permissions: string[]) {
  return permissions.includes('drivers.manage_access')
}

export function canRestrictDriver(permissions: string[]) {
  return permissions.includes('drivers.restrict') || permissions.includes('drivers.edit')
}

export function canSuspendDriver(permissions: string[]) {
  return permissions.includes('drivers.suspend') || permissions.includes('drivers.edit')
}

export function canViewSensitiveDriverData(permissions: string[]) {
  return permissions.includes('drivers.view_sensitive') || permissions.includes('compliance.view')
}

export function canVerifyDriverDocuments(permissions: string[]) {
  return permissions.includes('compliance.verify') || permissions.includes('drivers.edit')
}

export function canManageEligibilityOverrides(permissions: string[]) {
  return permissions.includes('transfer.override') || permissions.includes('compliance.verify')
}

export function maskLicenceNumber(licence: string | null | undefined, canView: boolean) {
  if (!licence) return '—'
  if (canView) return licence
  return `••••${licence.slice(-4)}`
}
