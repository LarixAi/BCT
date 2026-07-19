export function canViewDrivers(permissions: string[]) {
  return (
    permissions.includes('drivers.view') ||
    permissions.includes('drivers.read') ||
    permissions.includes('drivers.manage')
  )
}

export function canCreateDriver(permissions: string[]) {
  return (
    permissions.includes('drivers.create') ||
    permissions.includes('drivers.edit') ||
    permissions.includes('drivers.manage')
  )
}

export function canEditDriver(permissions: string[]) {
  return permissions.includes('drivers.edit') || permissions.includes('drivers.manage')
}

export function canInviteDriver(permissions: string[]) {
  return (
    permissions.includes('drivers.invite') ||
    permissions.includes('drivers.manage_access') ||
    permissions.includes('drivers.manage')
  )
}

export function canManageDriverAccess(permissions: string[]) {
  return permissions.includes('drivers.manage_access') || permissions.includes('drivers.manage')
}

export function canRestrictDriver(permissions: string[]) {
  return (
    permissions.includes('drivers.restrict') ||
    permissions.includes('drivers.edit') ||
    permissions.includes('drivers.manage')
  )
}

export function canSuspendDriver(permissions: string[]) {
  return (
    permissions.includes('drivers.suspend') ||
    permissions.includes('drivers.manage_access') ||
    permissions.includes('drivers.manage')
  )
}

export function canOffboardDriver(permissions: string[]) {
  return permissions.includes('drivers.manage_access') || permissions.includes('drivers.manage')
}

export function canUnlockDriver(permissions: string[]) {
  return (
    permissions.includes('drivers.manage_access') ||
    permissions.includes('drivers.suspend') ||
    permissions.includes('drivers.manage')
  )
}

export function canViewSensitiveDriverData(permissions: string[]) {
  return (
    permissions.includes('drivers.view_sensitive') ||
    permissions.includes('compliance.view') ||
    permissions.includes('drivers.manage')
  )
}

export function canVerifyDriverDocuments(permissions: string[]) {
  return (
    permissions.includes('compliance.verify') ||
    permissions.includes('drivers.edit') ||
    permissions.includes('drivers.manage')
  )
}

export function canManageEligibilityOverrides(permissions: string[]) {
  return (
    permissions.includes('transfer.override') ||
    permissions.includes('compliance.verify') ||
    permissions.includes('drivers.manage')
  )
}

export function maskLicenceNumber(licence: string | null | undefined, canView: boolean) {
  if (!licence) return '—'
  if (canView) return licence
  return `••••${licence.slice(-4)}`
}
