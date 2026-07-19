export function canViewStaff(permissions: string[]): boolean {
  return (
    permissions.includes('staff.view') ||
    permissions.includes('staff.manage') ||
    permissions.includes('settings.users.manage') ||
    permissions.includes('drivers.manage')
  )
}

export function canCreateStaff(permissions: string[]): boolean {
  return (
    permissions.includes('staff.create') ||
    permissions.includes('staff.manage') ||
    permissions.includes('settings.users.manage')
  )
}

export function canEditStaff(permissions: string[]): boolean {
  return permissions.includes('staff.edit') || permissions.includes('staff.manage')
}

export function canManageStaffAccess(permissions: string[]): boolean {
  return permissions.includes('staff.manage_access') || permissions.includes('staff.manage')
}

export function canInviteStaff(permissions: string[]): boolean {
  return permissions.includes('staff.invite') || permissions.includes('staff.manage_access') || permissions.includes('staff.manage')
}

export function canSuspendStaff(permissions: string[]): boolean {
  return permissions.includes('staff.suspend') || permissions.includes('staff.manage')
}

export function canManageStaffDuty(permissions: string[]): boolean {
  return permissions.includes('staff.manage_duty') || permissions.includes('staff.manage') || permissions.includes('staff.edit')
}

export function canAssignStaffTasks(permissions: string[]): boolean {
  return permissions.includes('staff.assign_tasks') || permissions.includes('staff.manage')
}

export function canViewSensitiveStaffData(permissions: string[]): boolean {
  return permissions.includes('staff.view_sensitive') || permissions.includes('staff.manage')
}

export function canVerifyStaffTraining(permissions: string[]): boolean {
  return permissions.includes('staff.verify_training') || permissions.includes('staff.manage_training') || permissions.includes('staff.manage')
}

export function canManageStaffTraining(permissions: string[]): boolean {
  return permissions.includes('staff.manage_training') || permissions.includes('staff.manage')
}

export function canReviewStaffAccess(permissions: string[]): boolean {
  return permissions.includes('staff.review_access') || permissions.includes('staff.manage_access') || permissions.includes('staff.manage')
}

export function canManageStaffDocuments(permissions: string[]): boolean {
  return permissions.includes('staff.manage_documents') || permissions.includes('staff.manage')
}

export function canManageStaffLifecycle(permissions: string[]): boolean {
  return permissions.includes('staff.manage_lifecycle') || permissions.includes('staff.manage')
}
